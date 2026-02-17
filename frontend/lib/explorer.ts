// ============================================================================
// EXPLORER URL BUILDERS
// Generates links for Solscan, Solana Explorer, and Orb by Helius
// ============================================================================

const CLUSTER = 'devnet';

// --- Solscan ---
const SOLSCAN_BASE = 'https://solscan.io';

export function getSolscanTxUrl(signature: string): string {
  return `${SOLSCAN_BASE}/tx/${signature}?cluster=${CLUSTER}`;
}

export function getSolscanAccountUrl(address: string): string {
  return `${SOLSCAN_BASE}/account/${address}?cluster=${CLUSTER}`;
}

export function getSolscanTokenUrl(mintAddress: string): string {
  return `${SOLSCAN_BASE}/token/${mintAddress}?cluster=${CLUSTER}`;
}

// --- Solana Explorer (Official) ---
const EXPLORER_BASE = 'https://explorer.solana.com';

export function getSolanaExplorerTxUrl(signature: string): string {
  return `${EXPLORER_BASE}/tx/${signature}?cluster=${CLUSTER}`;
}

export function getSolanaExplorerAccountUrl(address: string): string {
  return `${EXPLORER_BASE}/address/${address}?cluster=${CLUSTER}`;
}

// --- Orb by Helius ---
const ORB_BASE = 'https://orb.helius.dev';

export function getOrbTxUrl(signature: string): string {
  return `${ORB_BASE}/?tx=${signature}&cluster=${CLUSTER}`;
}

// --- Combined Links Object ---
export function getExplorerLinks(signature: string) {
  return {
    solscan: getSolscanTxUrl(signature),
    explorer: getSolanaExplorerTxUrl(signature),
    orb: getOrbTxUrl(signature),
  };
}

export function getAccountLinks(address: string) {
  return {
    solscan: getSolscanAccountUrl(address),
    explorer: getSolanaExplorerAccountUrl(address),
  };
}
