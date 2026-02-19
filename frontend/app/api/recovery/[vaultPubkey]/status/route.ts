import { NextRequest, NextResponse } from 'next/server';
import { solanaService } from '@/lib/services/solana';

export async function GET(
  request: NextRequest,
  { params }: { params: { vaultPubkey: string } }
) {
  try {
    const { vaultPubkey } = params;

    const { exists, vault } = await solanaService.getVaultAccount(vaultPubkey);
    if (!exists || !vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      recovery: {
        vault: vaultPubkey,
        guardianCount: vault.guardianCount,
        threshold: vault.recoveryThreshold,
        guardians: vault.guardianPubkeys,
      },
    });
  } catch (error) {
    console.error('[recovery/[vaultPubkey]/status]', error);
    return NextResponse.json({ error: 'Failed to fetch recovery status' }, { status: 500 });
  }
}
