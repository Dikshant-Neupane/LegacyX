import { NextRequest, NextResponse } from 'next/server';
import { addHeirSchema } from '@/lib/services/types';
import { verifyPhantomSignature } from '@/lib/services/auth';
import { solanaService } from '@/lib/services/solana';
import { notificationService } from '@/lib/services/notification';
import { PublicKey } from '@solana/web3.js';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = addHeirSchema.parse(json);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Phantom Wallet signature' }, { status: 401 });
    }

    const { transaction } = await solanaService.buildAddHeirTx({
      ownerPubkey: body.ownerPubkey,
      heirPubkey: body.heirPubkey,
    });

    const [vaultPda] = solanaService.deriveVaultPda(new PublicKey(body.ownerPubkey));
    notificationService.notifyHeirAdded(body.heirPubkey, vaultPda.toBase58(), body.ownerPubkey);

    return NextResponse.json({ success: true, transaction });
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
    console.error('[vault/add-heir]', error);
    return NextResponse.json({ error: 'Failed to build add heir transaction' }, { status: 500 });
  }
}
