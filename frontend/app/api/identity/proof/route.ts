import { NextRequest, NextResponse } from 'next/server';
import { identityProofSchema } from '@/lib/services/types';
import { verifyPhantomSignature } from '@/lib/services/auth';
import { solanaService } from '@/lib/services/solana';
import { explorerLinkBuilder } from '@/lib/services/explorerLinks';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = identityProofSchema.parse(json);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Phantom Wallet signature' }, { status: 401 });
    }

    const faceHashBuf = Buffer.from(body.faceHash, 'hex');
    const voiceHashBuf = Buffer.from(body.voiceHash, 'hex');

    const { transaction, identityPda } = await solanaService.buildIdentityProofTx({
      ownerPubkey: body.ownerPubkey,
      faceHash: faceHashBuf,
      voiceHash: voiceHashBuf,
    });

    return NextResponse.json({
      success: true,
      transaction,
      identityPda,
      identityProof: {
        owner: body.ownerPubkey,
        faceHash: body.faceHash,
        voiceHash: body.voiceHash,
      },
      links: explorerLinkBuilder.getAccountLinks(identityPda),
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
    console.error('[identity/proof]', error);
    return NextResponse.json({ error: 'Failed to build identity proof transaction' }, { status: 500 });
  }
}
