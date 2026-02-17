/**
 * LegacyX Decryption Service
 *
 * Handles the heir-side decryption flow:
 * 1. Heir connects Phantom wallet
 * 2. Fetches encrypted CIDs from vault
 * 3. Downloads encrypted blobs from Arweave
 * 4. Reconstructs vault master key from Shamir shards (if social recovery)
 *    or derives it from heir's signature + stored salt
 * 5. Decrypts files/messages in the browser
 *
 * "Only your heirs can read it — not even us."
 */

import {
  decrypt,
  unpackEncryptedBlob,
  type EncryptedBlob,
} from './encryption';
import { reconstructSecret, type KeyShard } from './keyManagement';
import { deriveVaultKey } from './encryption';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DecryptedFile {
  data: ArrayBuffer;
  hash: string;
  cid: string;
}

export interface DecryptedMessage {
  title: string;
  body: string;
  burnAfterRead: boolean;
  createdAt: number;
  cid: string;
}

export interface DecryptionProgress {
  phase: 'fetching' | 'reconstructing' | 'decrypting' | 'complete' | 'failed';
  current: number;
  total: number;
  error?: string;
}

// ─── Arweave Fetching ─────────────────────────────────────────────────────────

const ARWEAVE_GATEWAY = process.env.NEXT_PUBLIC_ARWEAVE_GATEWAY || 'https://arweave.net';

/**
 * Download an encrypted blob from Arweave by CID.
 */
export async function fetchFromArweave(cid: string): Promise<string> {
  const response = await fetch(`${ARWEAVE_GATEWAY}/${cid}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from Arweave: ${cid} (${response.status})`);
  }
  return response.text();
}

/**
 * Parse an Arweave response into an EncryptedBlob.
 * The blob is stored as JSON: { data, hash, size }
 */
export function parseArweaveBlob(raw: string): EncryptedBlob {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.data && parsed.hash !== undefined) {
      return parsed as EncryptedBlob;
    }
  } catch {
    // Not JSON — treat as raw base64
  }

  // Fallback: raw base64 data
  return {
    data: raw,
    hash: '',
    size: raw.length,
  };
}

// ─── Key Reconstruction ───────────────────────────────────────────────────────

/**
 * Reconstruct the vault master key from Shamir shards.
 * Used in social recovery when guardians provide their shards.
 *
 * @param shards - Array of KeyShards from guardians (must meet threshold)
 * @param salt - Salt stored on-chain with the vault
 * @param secretLength - Length of the original secret (derived key material)
 */
export async function reconstructVaultKey(
  shards: KeyShard[],
  salt: Uint8Array,
): Promise<CryptoKey> {
  // Reconstruct the signature bytes from shards
  // The secret stored in shards is the raw wallet signature
  const signatureBytes = reconstructSecret(shards, 64); // Ed25519 signature = 64 bytes
  return deriveVaultKey(signatureBytes, salt);
}

// ─── Decryption Pipeline ──────────────────────────────────────────────────────

/**
 * Full decryption pipeline for a vault's contents.
 * Downloads all CIDs from Arweave, decrypts each with the vault key.
 *
 * @param cids - Arweave CID strings from the vault account
 * @param vaultKey - Reconstructed CryptoKey
 * @param onProgress - Progress callback
 */
export async function decryptVaultContents(
  cids: string[],
  vaultKey: CryptoKey,
  onProgress?: (progress: DecryptionProgress) => void,
): Promise<DecryptedFile[]> {
  const results: DecryptedFile[] = [];
  const total = cids.length;

  onProgress?.({ phase: 'fetching', current: 0, total });

  for (let i = 0; i < cids.length; i++) {
    try {
      onProgress?.({ phase: 'fetching', current: i + 1, total });

      // 1. Download from Arweave
      const raw = await fetchFromArweave(cids[i]);
      const blob = parseArweaveBlob(raw);

      onProgress?.({ phase: 'decrypting', current: i + 1, total });

      // 2. Unpack and decrypt
      const payload = unpackEncryptedBlob(blob);
      const plaintext = await decrypt(vaultKey, payload);

      results.push({
        data: plaintext,
        hash: blob.hash,
        cid: cids[i],
      });
    } catch (err) {
      console.error(`Failed to decrypt CID ${cids[i]}:`, err);
      // Continue with remaining files
    }
  }

  onProgress?.({ phase: 'complete', current: total, total });
  return results;
}

/**
 * Decrypt a single CID as a text message (for the Regret Vault).
 */
export async function decryptSingleMessage(
  cid: string,
  vaultKey: CryptoKey,
): Promise<DecryptedMessage> {
  const raw = await fetchFromArweave(cid);
  const blob = parseArweaveBlob(raw);
  const payload = unpackEncryptedBlob(blob);
  const plaintext = await decrypt(vaultKey, payload);
  const text = new TextDecoder().decode(plaintext);

  try {
    // Try parsing as structured message
    const parsed = JSON.parse(text);
    return {
      title: parsed.title || 'Untitled',
      body: parsed.body || text,
      burnAfterRead: parsed.burnAfterRead || false,
      createdAt: parsed.createdAt || Date.now(),
      cid,
    };
  } catch {
    // Plain text message
    return {
      title: 'Message',
      body: text,
      burnAfterRead: false,
      createdAt: Date.now(),
      cid,
    };
  }
}

/**
 * Verify that decrypted data matches its integrity hash.
 */
export async function verifyIntegrity(
  data: ArrayBuffer,
  expectedHash: string,
): Promise<boolean> {
  if (!expectedHash) return true; // No hash stored
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const actualHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return actualHash === expectedHash;
}
