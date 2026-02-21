'use client';

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { LEGACYX_PROGRAM_ID, deriveVaultPDA } from '@/lib/solana';
import { deserializeVaultAccount } from '@/lib/deserialize';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultData {
  /** PDA address of the vault account */
  pubkey: string;
  /** Owner wallet address */
  owner: string;
  /** Vault display name */
  vaultName: string;
  /** Current vault status */
  status: 'Active' | 'Triggered' | 'Released';
  /** Check-in interval in seconds */
  checkInInterval: number;
  /** Last check-in UNIX timestamp */
  lastCheckIn: number;
  /** Vault creation UNIX timestamp */
  createdAt: number;
  /** Beneficiary wallet address (1 for MVP) */
  beneficiary: string | null;
  /** IPFS CIDs stored on-chain (encrypted) */
  ipfsCids: string[];
  /** Number of files stored */
  fileCount: number;
}

export interface VaultContextValue {
  /** On-chain vault data, null if no vault exists */
  vault: VaultData | null;
  /** Whether vault data is being loaded */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether the connected wallet owns a vault */
  hasVault: boolean;
  /** Re-fetch vault data from on-chain */
  refresh: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const VaultContext = createContext<VaultContextValue>({
  vault: null,
  loading: true,
  error: null,
  hasVault: false,
  refresh: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * VaultProvider — Reads vault state directly from the Solana blockchain.
 *
 * SECURITY:
 * - No centralized backend calls
 * - All state is derived from on-chain program accounts
 * - No sensitive data is stored in React state (only public on-chain data)
 */
export function VaultProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVault = useCallback(async () => {
    if (!publicKey) {
      setVault(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [vaultPDA] = deriveVaultPDA(publicKey);

      // Check if the vault account exists on-chain
      const accountInfo = await connection.getAccountInfo(vaultPDA);

      if (!accountInfo || accountInfo.owner.toBase58() !== LEGACYX_PROGRAM_ID.toBase58()) {
        // No vault exists for this wallet
        setVault(null);
      } else {
        // Vault account exists — decode the Borsh-serialized data
        const decoded = deserializeVaultAccount(accountInfo.data);
        if (decoded) {
          setVault({
            pubkey: vaultPDA.toBase58(),
            owner: decoded.owner,
            vaultName: decoded.vaultName,
            status: decoded.status,
            checkInInterval: decoded.checkInInterval,
            lastCheckIn: decoded.lastCheckIn,
            createdAt: decoded.createdAt,
            beneficiary: decoded.beneficiary,
            ipfsCids: decoded.ipfsCids,
            fileCount: decoded.fileCount,
          });
        } else {
          // Account exists but data is malformed
          setVault(null);
          setError('Failed to decode vault account data');
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch vault data';
      setError(message);
      setVault(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected) {
      fetchVault();
    } else {
      setVault(null);
      setLoading(false);
      setError(null);
    }
  }, [connected, fetchVault]);

  return (
    <VaultContext.Provider
      value={{
        vault,
        loading,
        error,
        hasVault: vault !== null,
        refresh: fetchVault,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}
