import { NextRequest, NextResponse } from 'next/server';
import { burnMessageSchema } from '@/lib/services/types';
import { verifyPhantomSignature } from '@/lib/services/auth';
import { solanaService } from '@/lib/services/solana';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = burnMessageSchema.parse(json);

    const isValid = verifyPhantomSignature(body.heirPubkey, body.signature, body.message);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Phantom Wallet signature' }, { status: 401 });
    }

    const { transaction } = await solanaService.buildBurnMessageTx({
      heirPubkey: body.heirPubkey,
      vaultOwnerPubkey: body.vaultOwnerPubkey,
      cidToBurn: body.cidToBurn,
    });

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
    console.error('[vault/burn]', error);
    return NextResponse.json({ error: 'Failed to build burn message transaction' }, { status: 500 });
  }
}
