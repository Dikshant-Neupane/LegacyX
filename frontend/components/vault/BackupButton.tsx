'use client';

import { useState, useCallback } from 'react';
import { generateVaultBackup, downloadBackup, verifyBackupIntegrity, type VaultBackup } from '@/lib/backup';
import type { VaultData } from '@/contexts/VaultContext';

interface BackupButtonProps {
  vault: VaultData;
  className?: string;
}

/**
 * BackupButton — Generates and downloads a JSON backup of vault metadata.
 *
 * SECURITY: Only public on-chain data is exported. No keys or decrypted content.
 */
export function BackupButton({ vault, className = '' }: BackupButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const backup = await generateVaultBackup(vault);
      downloadBackup(backup);
    } catch (err) {
      console.error('Backup failed:', err);
    } finally {
      setExporting(false);
    }
  }, [vault]);

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {exporting ? 'Exporting...' : 'Export Backup'}
    </button>
  );
}

// ─── Verify Section ───────────────────────────────────────────────────────────

interface VerifyBackupProps {
  className?: string;
}

/**
 * VerifyBackup — Drop or select a backup JSON file to verify integrity.
 */
export function VerifyBackup({ className = '' }: VerifyBackupProps) {
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid' | 'error'>('idle');
  const [backupInfo, setBackupInfo] = useState<VaultBackup | null>(null);

  const handleFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as VaultBackup;

      // Basic shape validation
      if (!parsed.version || !parsed.integrityHash || !parsed.vault) {
        setStatus('error');
        return;
      }

      setBackupInfo(parsed);
      const valid = await verifyBackupIntegrity(parsed);
      setStatus(valid ? 'valid' : 'invalid');
    } catch {
      setStatus('error');
      setBackupInfo(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          status === 'valid'
            ? 'border-vault-green/40 bg-vault-green/5'
            : status === 'invalid'
            ? 'border-vault-red/40 bg-vault-red/5'
            : 'border-vault-border hover:border-vault-gold/40'
        }`}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`mx-auto mb-3 ${
            status === 'valid' ? 'text-vault-green' : status === 'invalid' ? 'text-vault-red' : 'text-vault-muted'
          }`}
        >
          {status === 'valid' ? (
            <polyline points="20 6 9 17 4 12" />
          ) : status === 'invalid' ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </>
          )}
        </svg>

        {status === 'idle' && (
          <>
            <p className="text-vault-muted text-sm mb-2">
              Drop a backup file here to verify its integrity
            </p>
            <label className="text-vault-gold text-xs cursor-pointer hover:underline">
              or click to select
              <input
                type="file"
                accept=".json"
                onChange={handleSelect}
                className="hidden"
              />
            </label>
          </>
        )}

        {status === 'valid' && (
          <div>
            <p className="text-vault-green text-sm font-medium mb-1">Backup Verified ✓</p>
            <p className="text-vault-muted text-xs">
              Integrity hash matches. This backup has not been tampered with.
            </p>
          </div>
        )}

        {status === 'invalid' && (
          <div>
            <p className="text-vault-red text-sm font-medium mb-1">Integrity Check Failed</p>
            <p className="text-vault-muted text-xs">
              The backup data has been modified or is corrupted.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="text-vault-red text-sm font-medium mb-1">Invalid File</p>
            <p className="text-vault-muted text-xs">
              This file is not a valid LegacyX backup.
            </p>
          </div>
        )}
      </div>

      {/* Backup details */}
      {backupInfo && status === 'valid' && (
        <div className="mt-4 vault-card p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-vault-muted">Vault Name</span>
            <span className="text-vault-text">{backupInfo.vault.vaultName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-vault-muted">Owner</span>
            <span className="text-vault-text font-mono">
              {backupInfo.vault.owner.slice(0, 8)}...{backupInfo.vault.owner.slice(-6)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-vault-muted">Exported</span>
            <span className="text-vault-text">
              {new Date(backupInfo.exportedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-vault-muted">Files</span>
            <span className="text-vault-text">{backupInfo.vault.fileCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-vault-muted">Network</span>
            <span className="text-vault-text">{backupInfo.network}</span>
          </div>
          <div className="pt-2 border-t border-vault-border">
            <p className="text-[10px] text-vault-muted font-mono break-all">
              Hash: {backupInfo.integrityHash}
            </p>
          </div>
        </div>
      )}

      {/* Reset */}
      {status !== 'idle' && (
        <button
          onClick={() => { setStatus('idle'); setBackupInfo(null); }}
          className="mt-3 text-xs text-vault-muted hover:text-vault-gold transition-colors"
        >
          Verify another file
        </button>
      )}
    </div>
  );
}
