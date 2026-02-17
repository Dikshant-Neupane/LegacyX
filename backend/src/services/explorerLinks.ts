/**
 * Explorer Link Builder Service
 *
 * Generates formatted links for Solscan, Solana Explorer, and Orb by Helius
 * for any transaction or account address.
 */

const CLUSTER = process.env.SOLANA_CLUSTER || 'devnet';

export const explorerLinkBuilder = {
  getTransactionLinks(signature: string) {
    return {
      solscan: `https://solscan.io/tx/${signature}?cluster=${CLUSTER}`,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`,
      orb: `https://orb.helius.dev/?tx=${signature}&cluster=${CLUSTER}`,
    };
  },

  getAccountLinks(address: string) {
    return {
      solscan: `https://solscan.io/account/${address}?cluster=${CLUSTER}`,
      explorer: `https://explorer.solana.com/address/${address}?cluster=${CLUSTER}`,
    };
  },

  getTokenLinks(mintAddress: string) {
    return {
      solscan: `https://solscan.io/token/${mintAddress}?cluster=${CLUSTER}`,
      explorer: `https://explorer.solana.com/address/${mintAddress}?cluster=${CLUSTER}`,
    };
  },
};
