import { NextRequest, NextResponse } from 'next/server';
import { socialRecoverySchema } from '@/lib/services/types';
import { verifyPhantomSignature } from '@/lib/services/auth';
import { solanaService } from '@/lib/services/solana';
import { notificationService } from '@/lib/services/notification';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = socialRecoverySchema.parse(json);

    const isValid = verifyPhantomSignature(body.guardianPubkey, body.signature, body.message);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Phantom Wallet signature' }, { status: 401 });
    }

    // First, read vault to get owner pubkey from the vault PDA
    const { exists, vault } = await solanaService.getVaultAccount(body.vaultPubkey);
    if (!exists || !vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    const { transaction } = await solanaService.buildSocialRecoveryTx({
      guardianPubkey: body.guardianPubkey,
      vaultOwnerPubkey: vault.owner,
      proposedNewOwner: body.proposedNewOwner,
    });

    // Notify other guardians about the recovery attempt
    vault.guardianPubkeys
      .filter((g) => g !== body.guardianPubkey)
      .forEach((guardian) => {
        notificationService.requestGuardianSign(guardian, vault.pubkey, body.proposedNewOwner);
      });

    return NextResponse.json({
      success: true,
      transaction,
      recovery: {
        vault: body.vaultPubkey,
        proposedNewOwner: body.proposedNewOwner,
        signedBy: body.guardianPubkey,
        threshold: vault.recoveryThreshold,
        totalGuardians: vault.guardianCount,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      }, { status: 400 });
    }
    console.error('[recovery/sign]', error);
    return NextResponse.json({ error: 'Failed to build social recovery transaction' }, { status: 500 });
  }
}
