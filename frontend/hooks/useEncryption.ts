'use client';

import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { encryptFile, encryptMessage, type EncryptedBlob } from '@/lib/encryption';
import { createVaultKey, restoreVaultKey, type VaultKeyBundle } from '@/lib/keyManagement';
import { vaultApi, signAuthMessage } from '@/lib/api';
import { signAndSendTransaction, type TransactionProgress } from '@/lib/transactions';

interface UploadResult {
  arweaveCid: string;
  arweaveUrl: string;
  txSignature: string;
}

interface UseEncryptionReturn {
  hasKey: boolean;
  createKey: () => Promise<VaultKeyBundle>;
  restoreKey: (salt: Uint8Array) => Promise<void>;
  encryptVaultFile: (file: File) => Promise<EncryptedBlob & { fileName: string; mimeType: string }>;
  encryptVaultMessage: (message: string) => Promise<EncryptedBlob>;
  encryptAndUpload: (file: File) => Promise<UploadResult>;
  encryptMessageAndUpload: (text: string) => Promise<UploadResult>;
  encrypting: boolean;
  uploading: boolean;
  txProgress: TransactionProgress | null;
}

/**
 * Hook for managing vault encryption + upload within React components.
 * Handles: key derivation -> AES-256-GCM encryption -> Arweave upload -> on-chain CID storage.
 */
export function useEncryption(): UseEncryptionReturn {
  const { publicKey, signMessage, signTransaction } = useWallet();
  const keyRef = useRef<CryptoKey | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [txProgress, setTxProgress] = useState<TransactionProgress | null>(null);

  const createKey = useCallback(async (): Promise<VaultKeyBundle> => {
    if (!signMessage) throw new Error('Wallet not connected');
    const bundle = await createVaultKey(signMessage);
    keyRef.current = bundle.key;
    return bundle;
  }, [signMessage]);

  const restoreKey = useCallback(
    async (salt: Uint8Array) => {
      if (!signMessage) throw new Error('Wallet not connected');
      keyRef.current = await restoreVaultKey(signMessage, salt);
    },
    [signMessage],
  );

  const encryptVaultFile = useCallback(
    async (file: File) => {
      if (!keyRef.current) throw new Error('No vault key — call createKey or restoreKey first');
      setEncrypting(true);
      try {
        return await encryptFile(keyRef.current, file);
      } finally {
        setEncrypting(false);
      }
    },
    [],
  );

  const encryptVaultMessage = useCallback(
    async (msg: string) => {
      if (!keyRef.current) throw new Error('No vault key — call createKey or restoreKey first');
      setEncrypting(true);
      try {
        return await encryptMessage(keyRef.current, msg);
      } finally {
        setEncrypting(false);
      }
    },
    [],
  );

  /**
   * Full pipeline: encrypt file in browser → upload encrypted blob to Arweave via backend
   * → sign add_file transaction to store CID on-chain.
   */
  const encryptAndUpload = useCallback(
    async (file: File): Promise<UploadResult> => {
      if (!publicKey || !signMessage || !signTransaction) {
        throw new Error('Wallet not connected');
      }
      if (!keyRef.current) throw new Error('No vault key');

      setEncrypting(true);
      setUploading(false);
      setTxProgress(null);

      try {
        // 1. Encrypt the file in the browser
        const encrypted = await encryptFile(keyRef.current, file);
        setEncrypting(false);
        setUploading(true);

        // 2. Encrypted blob is already base64-encoded
        const encryptedBase64 = encrypted.data;

        // 3. Sign auth message
        const { signature, message } = await signAuthMessage(signMessage, 'Upload');

        // 4. Upload encrypted data to Arweave via backend
        const result = await vaultApi.upload({
          ownerPubkey: publicKey.toBase58(),
          encryptedData: encryptedBase64,
          contentType: file.type || 'application/octet-stream',
          signature,
          message,
        });

        // 5. Sign and send the add_file transaction
        const txSig = await signAndSendTransaction(result.transaction, signTransaction, setTxProgress);

        return {
          arweaveCid: result.arweaveCid,
          arweaveUrl: result.arweaveUrl,
          txSignature: txSig,
        };
      } finally {
        setEncrypting(false);
        setUploading(false);
      }
    },
    [publicKey, signMessage, signTransaction],
  );

  /**
   * Full pipeline for text messages: encrypt → upload → store CID on-chain.
   */
  const encryptMessageAndUpload = useCallback(
    async (text: string): Promise<UploadResult> => {
      if (!publicKey || !signMessage || !signTransaction) {
        throw new Error('Wallet not connected');
      }
      if (!keyRef.current) throw new Error('No vault key');

      setEncrypting(true);
      setUploading(false);
      setTxProgress(null);

      try {
        // 1. Encrypt the text in the browser
        const encrypted = await encryptMessage(keyRef.current, text);
        setEncrypting(false);
        setUploading(true);

        // 2. Encrypted blob is already base64-encoded
        const encryptedBase64 = encrypted.data;

        // 3. Sign auth
        const { signature, message } = await signAuthMessage(signMessage, 'Upload');

        // 4. Upload
        const result = await vaultApi.upload({
          ownerPubkey: publicKey.toBase58(),
          encryptedData: encryptedBase64,
          contentType: 'text/plain',
          signature,
          message,
        });

        // 5. Sign tx
        const txSig = await signAndSendTransaction(result.transaction, signTransaction, setTxProgress);

        return {
          arweaveCid: result.arweaveCid,
          arweaveUrl: result.arweaveUrl,
          txSignature: txSig,
        };
      } finally {
        setEncrypting(false);
        setUploading(false);
      }
    },
    [publicKey, signMessage, signTransaction],
  );

  return {
    hasKey: keyRef.current !== null,
    createKey,
    restoreKey,
    encryptVaultFile,
    encryptVaultMessage,
    encryptAndUpload,
    encryptMessageAndUpload,
    encrypting,
    uploading,
    txProgress,
  };
}
