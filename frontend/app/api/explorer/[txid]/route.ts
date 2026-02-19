import { NextRequest, NextResponse } from 'next/server';
import { explorerLinkBuilder } from '@/lib/services/explorerLinks';

export async function GET(
  request: NextRequest,
  { params }: { params: { txid: string } }
) {
  const { txid } = params;

  return NextResponse.json({
    success: true,
    links: explorerLinkBuilder.getTransactionLinks(txid),
  });
}
