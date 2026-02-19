import { NextRequest, NextResponse } from 'next/server';
import { solanaService } from '@/lib/services/solana';
import { explorerLinkBuilder } from '@/lib/services/explorerLinks';
import { PublicKey, Connection } from '@solana/web3.js';

export async function GET(
  request: NextRequest,
  { params }: { params: { pubkey: string } }
) {
  try {
    const { pubkey } = params;

    const owner = new PublicKey(pubkey);
    const [identityPda] = solanaService.deriveIdentityPda(owner);
    const connection = solanaService.getConnection();
    const accountInfo = await connection.getAccountInfo(identityPda);

    if (!accountInfo) {
      return NextResponse.json({ error: 'Identity proof not found' }, { status: 404 });
    }

    // Parse identity proof data (skip 8-byte discriminator)
    const data = accountInfo.data as Buffer;
    let offset = 8;
    const ownerKey = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
    offset += 32;
    const faceHash = data.subarray(offset, offset + 32).toString('hex');
    offset += 32;
    const voiceHash = data.subarray(offset, offset + 32).toString('hex');
    offset += 32;
    const provedAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    const isActive = data.readUInt8(offset) === 1;

    return NextResponse.json({
      success: true,
      identityProof: {
        pda: identityPda.toBase58(),
        owner: ownerKey,
        faceHash,
        voiceHash,
        provedAt,
        isActive,
      },
      links: explorerLinkBuilder.getAccountLinks(identityPda.toBase58()),
    });
  } catch (error) {
    console.error('[identity/[pubkey]]', error);
    return NextResponse.json({ error: 'Failed to fetch identity proof' }, { status: 500 });
  }
}
