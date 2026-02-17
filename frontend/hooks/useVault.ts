'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { vaultApi, signAuthMessage } from '@/lib/api';
import { signAndSendTransaction, getExplorerLinks, type TransactionProgress } from '@/lib/transactions';

export interface VaultData {
  pubkey: string;
  owner: string;
  vaultName: string;
  status: 'Active' | 'Triggered' | 'Released' | 'Burned';
  checkInInterval: number;
  lastCheckIn: number;
  triggeredAt: number;
  createdAt: number;
  heirPubkeys: string[];
  guardianPubkeys: string[];
  recoveryThreshold: number;
  arweaveCids: string[];
  encryptedKeyShards: string[];
  fileCount: number;
  heirCount: number;
  guardianCount: number;
  whistleblowerEnabled: boolean;
  certificateMint: string | null;
  links?: { solscan: string; explorer: string };
}

interface UseVaultReturn {
  vault: VaultData | null;
  loading: boolean;
  error: string | null;
  hasVault: boolean;
  refresh: () => Promise<void>;
  checkIn: () => Promise<string | null>;
  checkingIn: boolean;
  txProgress: TransactionProgress | null;
}

export function useVault(): UseVaultReturn {
  const { publicKey, connected, signMessage, signTransaction } = useWallet();
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [txProgress, setTxProgress] = useState<TransactionProgress | null>(null);

  const fetchVault = useCallback(async () => {
    if (!publicKey) {
      setVault(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await vaultApi.get(publicKey.toBase58());
      if (result.success && result.vault) {
        setVault({
          ...result.vault,
          links: result.links,
        });
      } else {
        setVault(null);
      }
    } catch (err: unknown) {
      // 404 means no vault — not an error
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        setVault(null);
      } else {
        setError('Failed to fetch vault data');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  const checkIn = useCallback(async (): Promise<string | null> => {
    if (!publicKey || !signMessage || !signTransaction) return null;

    setCheckingIn(true);
    setTxProgress(null);
    setError(null);

    try {
      // 1. Sign auth message with Phantom
      const { signature, message } = await signAuthMessage(signMessage, 'Check-In');

      // 2. Get unsigned transaction from backend
      const result = await vaultApi.checkIn({
        ownerPubkey: publicKey.toBase58(),
        signature,
        message,
      });

      // 3. Sign and send the transaction
      const txSig = await signAndSendTransaction(
        result.transaction,
        signTransaction,
        setTxProgress,
      );

      // 4. Refresh vault data
      await fetchVault();

      return txSig;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Check-in failed';
      setError(msg);
      setTxProgress({ status: 'failed', error: msg });
      return null;
    } finally {
      setCheckingIn(false);
    }
  }, [publicKey, signMessage, signTransaction, fetchVault]);

  useEffect(() => {
    if (connected) {
      fetchVault();
    } else {
      setVault(null);
    }
  }, [connected, fetchVault]);

  return {
    vault,
    loading,
    error,
    hasVault: vault !== null,
    refresh: fetchVault,
    checkIn,
    checkingIn,
    txProgress,
  };
}
