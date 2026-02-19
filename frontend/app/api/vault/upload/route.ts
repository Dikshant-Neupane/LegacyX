import { NextRequest, NextResponse } from 'next/server';
import { uploadFileSchema } from '@/lib/services/types';
import { verifyPhantomSignature } from '@/lib/services/auth';
import { solanaService } from '@/lib/services/solana';
import { arweaveService } from '@/lib/services/arweave';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = uploadFileSchema.parse(json);

    const isValid = verifyPhantomSignature(body.ownerPubkey, body.signature, body.message);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Phantom Wallet signature' }, { status: 401 });
    }

    // Upload pre-encrypted blob to Arweave
    const encryptedBuffer = Buffer.from(body.encryptedData, 'base64');
    const arweaveCid = await arweaveService.upload(encryptedBuffer, body.contentType);
    const arweaveUrl = arweaveService.getUrl(arweaveCid);

    // Build add_file tx to store CID on-chain
    const { transaction } = await solanaService.buildAddFileTx({
      ownerPubkey: body.ownerPubkey,
      arweaveCid,
      encryptedKeyShard: body.encryptedKeyShard,
    });

    return NextResponse.json({
      success: true,
      transaction,
      arweaveCid,
      arweaveUrl,
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
    console.error('[vault/upload]', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
