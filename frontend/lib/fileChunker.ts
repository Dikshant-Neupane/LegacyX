/**
 * LegacyX File Chunker
 *
 * Handles large file splitting into chunks for encrypted upload.
 * Each chunk is independently encrypted before being sent to Arweave.
 *
 * Max file size: 100MB
 * Chunk size: 5MB (optimal for Arweave bundling)
 */

import { encryptFile, type EncryptedBlob } from './encryption';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'video/mp4',
  'video/webm',
  'application/json',
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileChunk {
  index: number;
  totalChunks: number;
  data: Blob;
  size: number;
}

export interface EncryptedChunk extends EncryptedBlob {
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
}

export interface ChunkedUploadManifest {
  fileName: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
  chunks: {
    index: number;
    arweaveCid: string;
    hash: string;
    size: number;
  }[];
}

export interface UploadProgress {
  chunksCompleted: number;
  totalChunks: number;
  bytesUploaded: number;
  totalBytes: number;
  /** 0 to 1 */
  percentage: number;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
    return {
      valid: false,
      error: `File type "${file.type}" not supported. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Split a File into chunks of CHUNK_SIZE.
 */
export function chunkFile(file: File): FileChunk[] {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const chunks: FileChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);

    chunks.push({
      index: i,
      totalChunks,
      data: blob,
      size: end - start,
    });
  }

  return chunks;
}

/**
 * Encrypt all chunks of a file using the vault key.
 * Returns encrypted chunks ready for Arweave upload.
 *
 * @param key - AES-256-GCM CryptoKey
 * @param file - File to chunk and encrypt
 * @param onProgress - Progress callback
 */
export async function encryptFileChunked(
  key: CryptoKey,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<EncryptedChunk[]> {
  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const chunks = chunkFile(file);
  const encryptedChunks: EncryptedChunk[] = [];

  for (const chunk of chunks) {
    // Convert blob to File for encryption
    const chunkFile = new File([chunk.data], `${file.name}.chunk.${chunk.index}`, {
      type: file.type,
    });

    const encrypted = await encryptFile(key, chunkFile);

    encryptedChunks.push({
      ...encrypted,
      chunkIndex: chunk.index,
      totalChunks: chunk.totalChunks,
      fileName: file.name,
    });

    onProgress?.({
      chunksCompleted: chunk.index + 1,
      totalChunks: chunk.totalChunks,
      bytesUploaded: Math.min((chunk.index + 1) * CHUNK_SIZE, file.size),
      totalBytes: file.size,
      percentage: (chunk.index + 1) / chunk.totalChunks,
    });
  }

  return encryptedChunks;
}

// ─── Upload Manifest ──────────────────────────────────────────────────────────

/**
 * Create a manifest after all chunks are uploaded to Arweave.
 * This manifest is itself encrypted and stored as a vault entry.
 */
export function createUploadManifest(
  file: File,
  chunks: { index: number; arweaveCid: string; hash: string; size: number }[]
): ChunkedUploadManifest {
  return {
    fileName: file.name,
    mimeType: file.type,
    totalSize: file.size,
    totalChunks: chunks.length,
    chunks: chunks.sort((a, b) => a.index - b.index),
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Get a human-friendly file type label.
 */
export function getFileTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'Image',
    'image/png': 'Image',
    'image/gif': 'Image',
    'image/webp': 'Image',
    'application/pdf': 'Document',
    'text/plain': 'Text',
    'audio/mpeg': 'Audio',
    'audio/wav': 'Audio',
    'audio/webm': 'Audio',
    'video/mp4': 'Video',
    'video/webm': 'Video',
    'application/json': 'Data',
  };
  return map[mimeType] || 'File';
}
