import { NextRequest, NextResponse } from 'next/server';
import { createVaultSchema } from '@/lib/services/types';
import { verifyPhantomSignature } from '@/lib/services/auth';
import { solanaService } from '@/lib/services/solana';
import { notificationService } from '@/lib/services/notification';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = createVaultSchema.parse(json);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Phantom Wallet signature' }, { status: 401 });
    }

    const { transaction, vaultPda } = await solanaService.buildCreateVaultTx({
      ownerPubkey: body.ownerPubkey,
      vaultName: body.vaultName,
      checkInInterval: body.checkInInterval,
      heirPubkeys: body.heirPubkeys,
      guardianPubkeys: body.guardianPubkeys,
      recoveryThreshold: body.recoveryThreshold,
    });

    // Notify heirs they've been added
    body.heirPubkeys.forEach((heir) => {
      notificationService.notifyHeirAdded(heir, vaultPda, body.ownerPubkey);
    });

    return NextResponse.json({
      success: true,
      transaction,
      vaultPda,
      vault: {
        owner: body.ownerPubkey,
        name: body.vaultName,
        checkInInterval: body.checkInInterval,
        heirCount: body.heirPubkeys.length,
        guardianCount: body.guardianPubkeys.length,
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
    console.error('[vault/create]', error);
    return NextResponse.json({ error: 'Failed to build create vault transaction' }, { status: 500 });
  }
}
