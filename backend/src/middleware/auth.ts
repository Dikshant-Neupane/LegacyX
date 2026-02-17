import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Verify that a message was signed by the specified Phantom Wallet.
 *
 * SECURITY: This is the SOLE authentication method for all API requests.
 * Every authenticated endpoint MUST call this before processing.
 *
 * @param publicKeyBase58 - The signer's Phantom Wallet public key (base58)
 * @param signatureBase58 - The Ed25519 signature (base58)
 * @param message - The original message that was signed
 * @returns true if signature is valid
 */
export function verifyPhantomSignature(
  publicKeyBase58: string,
  signatureBase58: string,
  message: string,
): boolean {
  try {
    const publicKey = bs58.decode(publicKeyBase58);
    const signature = bs58.decode(signatureBase58);
    const messageBytes = new TextEncoder().encode(message);

    return nacl.sign.detached.verify(messageBytes, signature, publicKey);
  } catch {
    return false;
  }
}
