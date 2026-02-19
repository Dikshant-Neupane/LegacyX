/**
 * Arweave Upload Service
 *
 * SECURITY: This service receives ONLY pre-encrypted blobs from the client.
 * It NEVER receives, processes, or stores raw user data.
 * The server is intentionally blind to file content.
 */

import Arweave from 'arweave';

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
});

export const arweaveService = {
  /**
   * Upload an encrypted blob to Arweave.
   * Returns the permanent CID (Arweave transaction ID).
   *
   * @param encryptedData - AES-256-GCM encrypted binary data
   * @param contentType - MIME type (always application/octet-stream for encrypted)
   */
  async upload(encryptedData: Buffer, contentType = 'application/octet-stream'): Promise<string> {
    const jwk = JSON.parse(process.env.ARWEAVE_KEY || '{}');

    const transaction = await arweave.createTransaction(
      { data: encryptedData },
      jwk,
    );

    transaction.addTag('Content-Type', contentType);
    transaction.addTag('App-Name', 'LegacyX');
    transaction.addTag('App-Version', '0.1.0');
    transaction.addTag('Encryption', 'AES-256-GCM');

    await arweave.transactions.sign(transaction, jwk);
    const result = await arweave.transactions.post(transaction);

    if (result.status !== 200 && result.status !== 202) {
      throw new Error(`Arweave upload failed with status ${result.status}`);
    }

    return transaction.id;
  },

  /**
   * Get the permanent URL for an Arweave CID.
   */
  getUrl(cid: string): string {
    return `https://arweave.net/${cid}`;
  },

  /**
   * Check if an Arweave transaction is confirmed.
   */
  async getStatus(cid: string) {
    return arweave.transactions.getStatus(cid);
  },
};
