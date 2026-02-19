import { NextRequest, NextResponse } from 'next/server';
import { checkInSchema } from '@/lib/services/types';
import { verifyPhantomSignature } from '@/lib/services/auth';
import { solanaService } from '@/lib/services/solana';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = checkInSchema.parse(json);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Phantom Wallet signature' }, { status: 401 });
    }

    const { transaction } = await solanaService.buildCheckInTx(body.ownerPubkey);

    return NextResponse.json({
      success: true,
      transaction,
      checkInAt: new Date().toISOString(),
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
    console.error('[vault/checkin]', error);
    return NextResponse.json({ error: 'Failed to build check-in transaction' }, { status: 500 });
  }
}
