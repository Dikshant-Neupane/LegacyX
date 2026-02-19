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

    return NextResponse.json({
      success: true,
      vault,
      links: explorerLinkBuilder.getAccountLinks(vault.pubkey),
    });
  } catch (error) {
    console.error('[vault/[pubkey]]', error);
    return NextResponse.json({ error: 'Failed to fetch vault data' }, { status: 500 });
  }
}
