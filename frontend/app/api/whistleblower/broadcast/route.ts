import { NextRequest, NextResponse } from 'next/server';
import { checkInSchema } from '@/lib/services/types';
import { verifyPhantomSignature } from '@/lib/services/auth';
import { solanaService } from '@/lib/services/solana';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = checkInSchema.parse(json); // any signer can trigger

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Phantom Wallet signature' }, { status: 401 });
    }

    // Read vault to get CID count for notification
    const { exists, vault } = await solanaService.getVaultAccount(body.ownerPubkey);
    if (!exists || !vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      broadcast: {
        vault: vault.pubkey,
        cidCount: vault.fileCount,
        status: 'broadcast_ready',
        message: 'Sign and submit the transaction to execute irreversible broadcast',
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
    console.error('[whistleblower/broadcast]', error);
    return NextResponse.json({ error: 'Failed to prepare whistleblower broadcast' }, { status: 500 });
  }
}
