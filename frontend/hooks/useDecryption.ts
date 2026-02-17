'use client';

import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { vaultApi } from '@/lib/api';
import {
  decryptVaultContents,
  decryptSingleMessage,
  reconstructVaultKey,
  type DecryptedFile,
  type DecryptedMessage,
  type DecryptionProgress,
} from '@/lib/decryption';
import { deriveVaultKey, generateSalt } from '@/lib/encryption';
import type { KeyShard } from '@/lib/keyManagement';

interface UseDecryptionReturn {
  /** Decrypt all vault contents using guardian shards */
  decryptWithShards: (vaultPubkey: string, shards: KeyShard[]) => Promise<DecryptedFile[]>;
  /** Decrypt a single message by CID */
  decryptMessage: (cid: string) => Promise<DecryptedMessage | null>;
  /** Current decryption progress */
  progress: DecryptionProgress | null;
  /** Whether decryption is in progress */
  decrypting: boolean;
  /** Any error from decryption */
  error: string | null;
  /** Decrypted files from last operation */
  decryptedFiles: DecryptedFile[];
}

/**
 * Hook for heir-side decryption of vault contents.
 * Used when a vault has been released and heirs need to access files.
 */
export function useDecryption(): UseDecryptionReturn {
  const { publicKey, signMessage } = useWallet();
  const [progress, setProgress] = useState<DecryptionProgress | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptedFiles, setDecryptedFiles] = useState<DecryptedFile[]>([]);
  const keyRef = useRef<CryptoKey | null>(null);

  /**
   * Decrypt all vault contents using guardian key shards (social recovery).
   * 1. Reconstructs vault key from Shamir shards
   * 2. Fetches vault data to get CIDs
   * 3. Downloads and decrypts each file
   */
  const decryptWithShards = useCallback(
    async (vaultPubkey: string, shards: KeyShard[]): Promise<DecryptedFile[]> => {
      setDecrypting(true);
      setError(null);
      setProgress({ phase: 'reconstructing', current: 0, total: 0 });

      try {
        // 1. Fetch vault to get CIDs and encrypted key shards
        const vaultResult = await vaultApi.get(vaultPubkey);
        if (!vaultResult.vault) {
          throw new Error('Vault not found');
        }

        const { arweaveCids, encryptedKeyShards } = vaultResult.vault;

        if (arweaveCids.length === 0) {
          setProgress({ phase: 'complete', current: 0, total: 0 });
          return [];
        }

        // 2. Reconstruct vault key from Shamir shards
        // Salt is encoded in encryptedKeyShards[0] or derived from vault data
        const salt = new Uint8Array(16); // Default salt; in production parse from vault
        const vaultKey = await reconstructVaultKey(shards, salt);
        keyRef.current = vaultKey;

        // 3. Download and decrypt all CIDs
        const files = await decryptVaultContents(arweaveCids, vaultKey, setProgress);
        setDecryptedFiles(files);
        return files;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Decryption failed';
        setError(msg);
        setProgress({ phase: 'failed', current: 0, total: 0, error: msg });
        return [];
      } finally {
        setDecrypting(false);
      }
    },
    [],
  );

  /**
   * Decrypt a single message CID (requires key to be already reconstructed).
   */
  const decryptMessageFn = useCallback(
    async (cid: string): Promise<DecryptedMessage | null> => {
      if (!keyRef.current) {
        setError('No decryption key — reconstruct from shards first');
        return null;
      }

      try {
        return await decryptSingleMessage(cid, keyRef.current);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Message decryption failed';
        setError(msg);
        return null;
      }
    },
    [],
  );

  return {
    decryptWithShards,
    decryptMessage: decryptMessageFn,
    progress,
    decrypting,
    error,
    decryptedFiles,
  };
}
