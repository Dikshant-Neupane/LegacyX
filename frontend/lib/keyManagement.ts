/**
 * LegacyX Key Management
 *
 * Handles vault key derivation from Phantom wallet signatures,
 * Shamir's Secret Sharing for social recovery, and key shard distribution.
 *
 * Security Model:
 * - Master key is NEVER stored persistently
 * - Key is re-derived on each session from a fresh wallet signature
 * - Shamir's Secret Sharing splits key into shards for guardians
 * - Threshold of k-of-n shards required to reconstruct
 */

import { deriveVaultKey, generateSalt } from './encryption';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeyShard {
  index: number;
  data: string; // Base64-encoded shard
}

export interface VaultKeyBundle {
  /** CryptoKey for this session (NOT exportable) */
  key: CryptoKey;
  /** Salt used for key derivation (store on-chain) */
  salt: Uint8Array;
}

export interface ShamirConfig {
  /** Total number of shards */
  totalShards: number;
  /** Minimum shards needed to reconstruct */
  threshold: number;
}

// ─── Vault Key Sessions ───────────────────────────────────────────────────────

/**
 * Create a new vault key from a Phantom wallet signature.
 * Called when creating a new vault.
 *
 * @param signMessage - Phantom's signMessage function
 * @returns VaultKeyBundle with derived key and salt
 */
export async function createVaultKey(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<VaultKeyBundle> {
  const salt = generateSalt();

  // Create a deterministic message for signing
  const message = new TextEncoder().encode(
    `LegacyX Vault Key Derivation\nSalt: ${arrayToHex(salt)}\nTimestamp: ${Date.now()}`
  );

  const signature = await signMessage(message);
  const key = await deriveVaultKey(signature, salt);

  return { key, salt };
}

/**
 * Restore vault key for an existing vault.
 * Called on each session to re-derive the key.
 *
 * @param signMessage - Phantom's signMessage function
 * @param salt - Salt stored on-chain with the vault PDA
 */
export async function restoreVaultKey(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  salt: Uint8Array
): Promise<CryptoKey> {
  const message = new TextEncoder().encode(
    `LegacyX Vault Key Restore\nSalt: ${arrayToHex(salt)}`
  );

  const signature = await signMessage(message);
  return deriveVaultKey(signature, salt);
}

// ─── Shamir's Secret Sharing ──────────────────────────────────────────────────
//
// Simplified GF(256) implementation for splitting/reconstructing secrets.
// In production, use a battle-tested library (e.g., secrets.js-grempe).
// This implementation is for the hackathon prototype.

const GF256 = {
  // GF(256) with irreducible polynomial x^8 + x^4 + x^3 + x + 1 (0x11B)
  exp: new Uint8Array(512),
  log: new Uint8Array(256),

  init() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.exp[i] = x;
      this.log[x] = i;
      x = x ^ (x << 1);
      if (x >= 256) x ^= 0x11b;
    }
    for (let i = 255; i < 512; i++) {
      this.exp[i] = this.exp[i - 255];
    }
  },

  mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.exp[this.log[a] + this.log[b]];
  },

  div(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero');
    if (a === 0) return 0;
    return this.exp[this.log[a] + 255 - this.log[b]];
  },
};

// Initialize GF(256) lookup tables
GF256.init();

/**
 * Split a secret into n shards with threshold k.
 * Uses Shamir's Secret Sharing over GF(256).
 *
 * @param secret - Secret bytes to split
 * @param n - Total number of shards
 * @param k - Threshold (minimum shards to reconstruct)
 * @returns Array of n KeyShards
 */
export function splitSecret(
  secret: Uint8Array,
  n: number,
  k: number
): KeyShard[] {
  if (k > n) throw new Error('Threshold cannot exceed total shards');
  if (n > 255) throw new Error('Maximum 255 shards supported');
  if (k < 2) throw new Error('Threshold must be at least 2');

  const shards: Uint8Array[] = Array.from({ length: n }, () =>
    new Uint8Array(secret.length)
  );

  for (let byteIndex = 0; byteIndex < secret.length; byteIndex++) {
    // Generate random polynomial coefficients (degree k-1)
    const coefficients = new Uint8Array(k);
    coefficients[0] = secret[byteIndex]; // constant term = secret byte
    crypto.getRandomValues(coefficients.subarray(1));

    // Evaluate polynomial at points 1..n
    for (let i = 0; i < n; i++) {
      const x = i + 1;
      let y = 0;
      for (let j = k - 1; j >= 0; j--) {
        y = GF256.mul(y, x) ^ coefficients[j];
      }
      shards[i][byteIndex] = y;
    }
  }

  return shards.map((data, index) => ({
    index: index + 1,
    data: uint8ArrayToBase64(data),
  }));
}

/**
 * Reconstruct a secret from k or more shards.
 * Uses Lagrange interpolation over GF(256).
 */
export function reconstructSecret(shards: KeyShard[], secretLength: number): Uint8Array {
  if (shards.length < 2) throw new Error('Need at least 2 shards');

  const xs = shards.map((s) => s.index);
  const ys = shards.map((s) => base64ToUint8Array(s.data));
  const secret = new Uint8Array(secretLength);

  for (let byteIndex = 0; byteIndex < secretLength; byteIndex++) {
    let value = 0;

    for (let i = 0; i < shards.length; i++) {
      let lagrange = 1;

      for (let j = 0; j < shards.length; j++) {
        if (i === j) continue;
        // lagrange *= x_j / (x_j - x_i)  in GF(256)
        lagrange = GF256.mul(
          lagrange,
          GF256.div(xs[j], xs[j] ^ xs[i])
        );
      }

      value ^= GF256.mul(ys[i][byteIndex], lagrange);
    }

    secret[byteIndex] = value;
  }

  return secret;
}

/**
 * Encrypt key shards for distribution to guardians.
 * Each guardian receives their shard encrypted with their public key.
 * (Placeholder — in production, use guardian's Solana pubkey for X25519 exchange)
 */
export async function encryptShardForGuardian(
  _shard: KeyShard,
  _guardianPubkey: string
): Promise<string> {
  // BLOCKED: Guardian shard encryption not yet implemented.
  // Must use X25519 key exchange with guardian's Solana pubkey before enabling.
  throw new Error('encryptShardForGuardian is not implemented — shard distribution is disabled');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function arrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
