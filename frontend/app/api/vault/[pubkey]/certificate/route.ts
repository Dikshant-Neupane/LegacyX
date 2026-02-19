import { NextRequest, NextResponse } from 'next/server';
import { solanaService } from '@/lib/services/solana';
import { explorerLinkBuilder } from '@/lib/services/explorerLinks';

export async function GET(
  request: NextRequest,
  { params }: { params: { pubkey: string } }
) {
  try {
    const { pubkey } = params;

    const { exists, vault } = await solanaService.getVaultAccount(pubkey);

    if (!exists || !vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    if (!vault.certificateMint) {
      return NextResponse.json({ error: 'No certificate minted for this vault' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      certificate: {
        vaultPubkey: vault.pubkey,
        owner: vault.owner,
        mintAddress: vault.certificateMint,
        createdAt: vault.createdAt,
        links: {
          ...explorerLinkBuilder.getAccountLinks(vault.pubkey),
          certificate: explorerLinkBuilder.getTokenLinks(vault.certificateMint),
        },
      },
    });
  } catch (error) {
    console.error('[vault/[pubkey]/certificate]', error);
    return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 });
  }
}
