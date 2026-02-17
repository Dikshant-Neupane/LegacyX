'use client';

import { motion } from 'framer-motion';

interface VaultCertificateProps {
  vaultName: string;
  ownerAddress: string;
  createdAt: string;
  status: 'Active' | 'Triggered' | 'Released' | 'Burned';
  checkInDays: number;
  heirCount: number;
  fileCount: number;
}

/**
 * 3D-tiltable certificate card — like a premium membership card.
 * CSS 3D transform on hover. Gold foil stamp effect.
 */
export function VaultCertificate({
  vaultName,
  ownerAddress,
  createdAt,
  status,
  checkInDays,
  heirCount,
  fileCount,
}: VaultCertificateProps) {
  const statusColors: Record<string, string> = {
    Active: '#C9A96E',
    Triggered: '#D4782A',
    Released: '#4A9B6F',
    Burned: '#C0392B',
  };

  return (
    <motion.div
      className="certificate-card group relative w-full max-w-md mx-auto"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="relative bg-vault-surface border border-vault-border rounded-xl p-8 overflow-hidden">
        {/* Topographic pattern background */}
        <div className="absolute inset-0 opacity-[0.03] bg-topographic" />

        {/* Gold foil border accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold-gradient" />

        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-vault-muted text-[10px] uppercase tracking-[0.3em] font-body">
                Certificate of Vault
              </p>
              <h3 className="font-display text-2xl text-vault-text mt-1">
                {vaultName}
              </h3>
            </div>
            {/* Wax seal */}
            <div
              className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: statusColors[status] }}
            >
              <span
                className="font-display text-xs font-bold"
                style={{ color: statusColors[status] }}
              >
                {status === 'Active' ? '✦' : status === 'Burned' ? '🔥' : status === 'Released' ? '🔓' : '⚡'}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-vault-border mb-6" />

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-vault-muted text-[10px] uppercase tracking-wider mb-1">
                Owner
              </p>
              <p className="font-mono text-xs text-vault-text">
                {ownerAddress.slice(0, 4)}...{ownerAddress.slice(-4)}
              </p>
            </div>
            <div>
              <p className="text-vault-muted text-[10px] uppercase tracking-wider mb-1">
                Created
              </p>
              <p className="text-xs text-vault-text">{createdAt}</p>
            </div>
            <div>
              <p className="text-vault-muted text-[10px] uppercase tracking-wider mb-1">
                Check-In
              </p>
              <p className="text-xs text-vault-text">
                Every {checkInDays} days
              </p>
            </div>
            <div>
              <p className="text-vault-muted text-[10px] uppercase tracking-wider mb-1">
                Status
              </p>
              <p
                className="text-xs font-semibold"
                style={{ color: statusColors[status] }}
              >
                {status}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 pt-4 border-t border-vault-border">
            <div className="flex items-center gap-2">
              <span className="text-vault-gold text-lg">◆</span>
              <span className="text-xs text-vault-muted">
                {heirCount} {heirCount === 1 ? 'Heir' : 'Heirs'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-vault-gold text-lg">◇</span>
              <span className="text-xs text-vault-muted">
                {fileCount} {fileCount === 1 ? 'File' : 'Files'}
              </span>
            </div>
          </div>
        </div>

        {/* Hover glow */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shadow-gold-hover" />
      </div>
    </motion.div>
  );
}
