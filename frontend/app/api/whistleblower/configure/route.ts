import { NextRequest, NextResponse } from 'next/server';
import { configureWhistleblowerSchema } from '@/lib/services/types';
import { verifyPhantomSignature } from '@/lib/services/auth';
import { solanaService } from '@/lib/services/solana';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = configureWhistleblowerSchema.parse(json);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Phantom Wallet signature' }, { status: 401 });
    }

    const { transaction } = await solanaService.buildConfigureWhistleblowerTx({
      ownerPubkey: body.ownerPubkey,
      broadcastWallets: body.broadcastWallets,
    });

    return NextResponse.json({
      success: true,
      transaction,
      whistleblower: {
        vault: body.vaultPubkey,
        walletCount: body.broadcastWallets.length,
        configured: true,
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
    console.error('[whistleblower/configure]', error);
    return NextResponse.json({ error: 'Failed to build whistleblower configuration transaction' }, { status: 500 });
  }
}
