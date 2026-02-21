/**
 * SoulVault — Vault Backup & Export
 *
 * Generates a downloadable JSON backup of vault metadata.
 * This backup contains ONLY public on-chain data — no private keys,
 * no encryption keys, no decrypted file contents.
 *
 * SECURITY:
 * - No sensitive material is included in the backup.
 * - IPFS CIDs are public content addresses — the files themselves
 *   are AES-256-GCM encrypted, so CIDs alone reveal nothing.
 * - The backup is integrity-checked with a SHA-256 hash.
 * - No localStorage or cookies are used.
 */

import type { VaultData } from '@/contexts/VaultContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultBackup {
  /** Backup format version */
  version: 1;
  /** ISO timestamp when backup was created */
  exportedAt: string;
  /** Network the vault is on */
  network: 'devnet' | 'mainnet-beta';
  /** SHA-256 hash of the vault data (integrity check) */
  integrityHash: string;
  /** The vault data snapshot */
  vault: {
    pubkey: string;
    owner: string;
    vaultName: string;
    status: string;
    checkInIntervalDays: number;
    lastCheckIn: string;
    createdAt: string;
    beneficiary: string | null;
    ipfsCids: string[];
    fileCount: number;
  };
}

// ─── Hash ─────────────────────────────────────────────────────────────────────

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Generate Backup ──────────────────────────────────────────────────────────

export async function generateVaultBackup(vault: VaultData): Promise<VaultBackup> {
  const vaultSnapshot = {
    pubkey: vault.pubkey,
    owner: vault.owner,
    vaultName: vault.vaultName,
    status: vault.status,
    checkInIntervalDays: Math.ceil(vault.checkInInterval / 86400),
    lastCheckIn: new Date(vault.lastCheckIn * 1000).toISOString(),
    createdAt: new Date(vault.createdAt * 1000).toISOString(),
    beneficiary: vault.beneficiary,
    ipfsCids: vault.ipfsCids,
    fileCount: vault.fileCount,
  };

  const integrityHash = await sha256Hex(JSON.stringify(vaultSnapshot));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    network: 'devnet',
    integrityHash,
    vault: vaultSnapshot,
  };
}

// ─── Download ─────────────────────────────────────────────────────────────────

export function downloadBackup(backup: VaultBackup): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `soulvault-backup-${backup.vault.vaultName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export async function verifyBackupIntegrity(backup: VaultBackup): Promise<boolean> {
  const hash = await sha256Hex(JSON.stringify(backup.vault));
  return hash === backup.integrityHash;
}
