/**
 * Storage Service — Stub
 * 
 * SoulVault uses IPFS (web3.storage / Pinata) instead of Arweave.
 * This file is a stub to prevent import errors from legacy API routes.
 * Actual IPFS upload logic will be added in Step 3 (Dashboard).
 */

export const arweaveService = {
  async upload(_data: Buffer, _contentType?: string): Promise<string> {
    throw new Error('Storage service not configured. Use IPFS upload instead.');
  },

  getUrl(cid: string): string {
    return `https://w3s.link/ipfs/${cid}`;
  },
};
