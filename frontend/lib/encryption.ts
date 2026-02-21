/**
 * SoulVault Encryption Library
 *
 * Client-side AES-256-GCM encryption using SubtleCrypto Web API.
 * The server NEVER sees plaintext data — encryption happens entirely in the browser.
 *
 * Flow:
 * 1. User's Phantom wallet signature → HKDF → vault master key
 * 2. Master key encrypts files/messages with AES-256-GCM
 * 3. Only encrypted blobs leave the browser → IPFS
 *
 * SECURITY:
 * - No key material is ever sent to any server
 * - AES-256-GCM provides authenticated encryption (tamper detection)
 * - Each encrypt() call uses a fresh random IV (12 bytes) and salt (16 bytes)
 * - Plaintext integrity is verified via SHA-256 hash on decrypt
 * - HKDF with unique info string prevents cross-application key reuse
 *
 * "Not even we can touch it."
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const SALT_LENGTH = 16;
const HKDF_INFO = new TextEncoder().encode('SoulVault-v1');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
  /** SHA-256 hash of the original plaintext for integrity verification */
  plaintextHash: string;
}

export interface EncryptedBlob {
  /** Base64-encoded ciphertext + iv + salt packed together */
  data: string;
  /** SHA-256 hash of original for verification */
  hash: string;
  /** Size of encrypted payload in bytes */
  size: number;
}

// ─── Key Derivation ───────────────────────────────────────────────────────────

/**
 * Derive a vault master key from a Phantom wallet signature.
 * Uses HKDF with SHA-256 to derive a 256-bit AES key.
 *
 * @param signatureBytes - Raw Ed25519 signature bytes from Phantom
 * @param salt - Random salt (store alongside vault PDA)
 */
export async function deriveVaultKey(
  signatureBytes: Uint8Array,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import signature as raw key material for HKDF
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    signatureBytes as BufferSource,
    'HKDF',
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      info: HKDF_INFO as BufferSource,
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a fresh encryption salt.
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a fresh IV for AES-GCM.
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypt plaintext data using AES-256-GCM.
 *
 * @param key - CryptoKey derived from vault master key
 * @param plaintext - Data to encrypt (ArrayBuffer or string)
 * @returns EncryptedPayload with ciphertext, IV, salt, and integrity hash
 */
export async function encrypt(
  key: CryptoKey,
  plaintext: ArrayBuffer | string
): Promise<EncryptedPayload> {
  const data =
    typeof plaintext === 'string'
      ? new TextEncoder().encode(plaintext)
      : new Uint8Array(plaintext);

  const iv = generateIV();
  const salt = generateSalt();

  // Compute integrity hash before encryption
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const plaintextHash = arrayBufferToHex(hashBuffer);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    data as BufferSource
  );

  return { ciphertext, iv, salt, plaintextHash };
}

/**
 * Decrypt ciphertext back to plaintext.
 *
 * @param key - Same CryptoKey used for encryption
 * @param payload - EncryptedPayload returned from encrypt()
 * @returns Decrypted ArrayBuffer
 */
export async function decrypt(
  key: CryptoKey,
  payload: EncryptedPayload
): Promise<ArrayBuffer> {
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: payload.iv as BufferSource },
    key,
    payload.ciphertext
  );

  // Verify integrity
  const hashBuffer = await crypto.subtle.digest('SHA-256', plaintext);
  const hash = arrayBufferToHex(hashBuffer);
  if (hash !== payload.plaintextHash) {
    throw new Error('Integrity check failed — data may have been tampered with');
  }

  return plaintext;
}

// ─── Packing / Unpacking ──────────────────────────────────────────────────────

/**
 * Pack an EncryptedPayload into a single EncryptedBlob for upload.
 * Format: [salt (16 bytes)] [iv (12 bytes)] [ciphertext (remaining)]
 */
export function packEncryptedPayload(payload: EncryptedPayload): EncryptedBlob {
  const ciphertextArray = new Uint8Array(payload.ciphertext);
  const packed = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + ciphertextArray.length
  );

  packed.set(payload.salt, 0);
  packed.set(payload.iv, SALT_LENGTH);
  packed.set(ciphertextArray, SALT_LENGTH + IV_LENGTH);

  return {
    data: arrayBufferToBase64(packed.buffer),
    hash: payload.plaintextHash,
    size: packed.length,
  };
}

/**
 * Unpack an EncryptedBlob back into EncryptedPayload for decryption.
 */
export function unpackEncryptedBlob(blob: EncryptedBlob): EncryptedPayload {
  const packed = base64ToArrayBuffer(blob.data);
  const bytes = new Uint8Array(packed);

  const salt = bytes.slice(0, SALT_LENGTH);
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = bytes.slice(SALT_LENGTH + IV_LENGTH).buffer;

  return {
    ciphertext,
    iv,
    salt,
    plaintextHash: blob.hash,
  };
}

// ─── File Encryption Helpers ──────────────────────────────────────────────────

/**
 * Encrypt a file from a File/Blob input.
 * Reads the file into memory, encrypts, and returns a packed blob.
 */
export async function encryptFile(
  key: CryptoKey,
  file: File
): Promise<EncryptedBlob & { fileName: string; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const payload = await encrypt(key, arrayBuffer);
  const blob = packEncryptedPayload(payload);

  return {
    ...blob,
    fileName: file.name,
    mimeType: file.type,
  };
}

/**
 * Encrypt a text message (final words, notes, etc.)
 */
export async function encryptMessage(
  key: CryptoKey,
  message: string
): Promise<EncryptedBlob> {
  const payload = await encrypt(key, message);
  return packEncryptedPayload(payload);
}

/**
 * Decrypt a blob and return it as a string (for text messages).
 */
export async function decryptMessage(
  key: CryptoKey,
  blob: EncryptedBlob
): Promise<string> {
  const payload = unpackEncryptedBlob(blob);
  const plaintext = await decrypt(key, payload);
  return new TextDecoder().decode(plaintext);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Hash arbitrary data with SHA-256 and return hex string.
 * Used for identity proofs (hash-only anchoring).
 */
export async function sha256Hash(data: ArrayBuffer | string): Promise<string> {
  const buffer =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer as BufferSource);
  return arrayBufferToHex(hash);
}
