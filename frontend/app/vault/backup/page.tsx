'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useVault } from '@/hooks/useVault';
import { BackupButton, VerifyBackup } from '@/components/vault/BackupButton';
import Link from 'next/link';

export default function BackupPage() {
  const { connected } = useWallet();
  const router = useRouter();
  const { vault, loading, hasVault } = useVault();

  useEffect(() => {
    if (!connected) router.push('/');
  }, [connected, router]);

  if (!connected) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-vault-muted">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (!hasVault) {
    router.push('/vault/create');
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <Link href="/vault" className="text-vault-muted text-xs hover:text-vault-gold transition-colors mb-4 block">
            ← Back to Vault
          </Link>
          <h1 className="font-display text-3xl text-vault-text mb-2">Vault Backup</h1>
          <p className="text-vault-muted text-sm">
            Export a JSON snapshot of your vault metadata for safekeeping, or verify a previous backup.
          </p>
        </motion.div>

        {/* Export Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="vault-card mb-8"
        >
          <div className="p-6 border-b border-vault-border">
            <h2 className="font-display text-lg text-vault-text">Export Backup</h2>
          </div>
          <div className="p-6">
            <p className="text-vault-muted text-sm mb-6">
              Download a JSON file containing your vault configuration, beneficiary, and IPFS CID references.
              This file does <strong className="text-vault-text">not</strong> contain private keys or decrypted file contents.
            </p>

            <div className="vault-card p-4 mb-6 space-y-2 bg-vault-surface/50">
              <div className="flex justify-between text-xs">
                <span className="text-vault-muted">Vault</span>
                <span className="text-vault-text">{vault!.vaultName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-vault-muted">Status</span>
                <span className={`${
                  vault!.status === 'Active' ? 'text-vault-green' :
                  vault!.status === 'Triggered' ? 'text-vault-amber' : 'text-vault-red'
                }`}>{vault!.status}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-vault-muted">Files</span>
                <span className="text-vault-text">{vault!.fileCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-vault-muted">Beneficiary</span>
                <span className="text-vault-text font-mono">
                  {vault!.beneficiary
                    ? `${vault!.beneficiary.slice(0, 8)}...${vault!.beneficiary.slice(-6)}`
                    : 'Not set'}
                </span>
              </div>
            </div>

            <BackupButton vault={vault!} className="btn-gold w-full justify-center" />
          </div>
        </motion.div>

        {/* What's included */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="vault-card mb-8"
        >
          <div className="p-6 border-b border-vault-border">
            <h2 className="font-display text-lg text-vault-text">What&apos;s Included</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-vault-green text-xs uppercase tracking-wider font-mono">Included ✓</h3>
                <ul className="text-sm text-vault-muted space-y-1">
                  <li>• Vault PDA address</li>
                  <li>• Owner wallet address</li>
                  <li>• Vault name &amp; status</li>
                  <li>• Check-in period</li>
                  <li>• Beneficiary address</li>
                  <li>• IPFS CID references</li>
                  <li>• Integrity hash (SHA-256)</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-vault-red text-xs uppercase tracking-wider font-mono">Never Included ✗</h3>
                <ul className="text-sm text-vault-muted space-y-1">
                  <li>• Private keys</li>
                  <li>• Encryption keys</li>
                  <li>• Decrypted file contents</li>
                  <li>• Seed phrases</li>
                  <li>• Passwords</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Verify Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="vault-card"
        >
          <div className="p-6 border-b border-vault-border">
            <h2 className="font-display text-lg text-vault-text">Verify Backup</h2>
          </div>
          <div className="p-6">
            <p className="text-vault-muted text-sm mb-4">
              Check that a backup file hasn&apos;t been tampered with by verifying its integrity hash.
            </p>
            <VerifyBackup />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
