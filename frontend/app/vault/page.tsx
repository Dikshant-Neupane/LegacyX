'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Transaction, PublicKey } from '@solana/web3.js';
import { useVault } from '@/hooks/useVault';
import {
  buildCheckInInstruction,
  buildSetBeneficiaryInstruction,
  buildAddFileInstruction,
} from '@/lib/instructions';
import { BackupButton } from '@/components/vault/BackupButton';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDaysRemaining(lastCheckIn: number, checkInInterval: number): number {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - lastCheckIn;
  const remaining = checkInInterval - elapsed;
  return Math.max(0, Math.ceil(remaining / 86400));
}

function formatTimestamp(unix: number): string {
  if (!unix) return 'Never';
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function shortenCid(cid: string): string {
  if (cid.length <= 16) return cid;
  return `${cid.slice(0, 8)}...${cid.slice(-6)}`;
}

function isValidSolanaAddress(addr: string): boolean {
  try { new PublicKey(addr); return addr.length >= 32 && addr.length <= 44; }
  catch { return false; }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function YourVaultPage() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { vault, loading, error, hasVault, refresh } = useVault();
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  // Toast
  const [txStatus, setTxStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const flash = (type: 'success' | 'error', msg: string) => {
    setTxStatus({ type, msg });
    setTimeout(() => setTxStatus(null), 4000);
  };

  // Beneficiary form
  const [showBenForm, setShowBenForm] = useState(false);
  const [benAddress, setBenAddress] = useState('');
  const [settingBen, setSettingBen] = useState(false);

  // Add file form
  const [showFileForm, setShowFileForm] = useState(false);
  const [ipfsCid, setIpfsCid] = useState('');
  const [addingFile, setAddingFile] = useState(false);

  // Redirect if not connected
  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-vault-muted">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
          </svg>
          Loading vault...
        </div>
      </div>
    );
  }

  // No vault
  if (!hasVault) {
    if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <div className="vault-card p-12 text-center max-w-md">
            <h2 className="font-display text-2xl mb-4">Connection Error</h2>
            <p className="text-vault-red text-sm mb-6">{error}</p>
            <button onClick={refresh} className="btn-gold">Retry</button>
          </div>
        </div>
      );
    }
    router.push('/vault/create');
    return null;
  }

  const daysRemaining = computeDaysRemaining(vault!.lastCheckIn, vault!.checkInInterval);

  // ─── Check-In Handler ─────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (!publicKey || !sendTransaction) return;
    try {
      const ix = buildCheckInInstruction(publicKey);
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');
      setCheckInSuccess(true);
      flash('success', 'Check-in confirmed on-chain.');
      await refresh();
      setTimeout(() => setCheckInSuccess(false), 3000);
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Check-in failed');
    }
  };

  // ─── Set Beneficiary ──────────────────────────────────────────────────
  const handleSetBeneficiary = async () => {
    if (!publicKey || !sendTransaction || !isValidSolanaAddress(benAddress)) return;
    if (benAddress === publicKey.toBase58()) {
      flash('error', 'Beneficiary cannot be your own wallet.');
      return;
    }
    setSettingBen(true);
    try {
      const ben = new PublicKey(benAddress);
      const ix = buildSetBeneficiaryInstruction({ owner: publicKey, beneficiary: ben });
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');
      flash('success', 'Beneficiary updated on-chain.');
      setShowBenForm(false);
      setBenAddress('');
      await refresh();
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Failed to set beneficiary');
    } finally {
      setSettingBen(false);
    }
  };

  // ─── Add File ─────────────────────────────────────────────────────────
  const handleAddFile = async () => {
    if (!publicKey || !sendTransaction || !ipfsCid.trim()) return;
    if (ipfsCid.trim().length > 64) {
      flash('error', 'CID must be 64 characters or fewer.');
      return;
    }
    setAddingFile(true);
    try {
      const ix = buildAddFileInstruction({ owner: publicKey, ipfsCid: ipfsCid.trim() });
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');
      flash('success', 'File CID stored on-chain.');
      setShowFileForm(false);
      setIpfsCid('');
      await refresh();
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Failed to add file');
    } finally {
      setAddingFile(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Toast */}
        {txStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-sm font-medium shadow-lg ${
              txStatus.type === 'success'
                ? 'bg-vault-green/20 text-vault-green border border-vault-green/30'
                : 'bg-vault-red/20 text-vault-red border border-vault-red/30'
            }`}
          >
            {txStatus.msg}
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-2">
            <p className="text-vault-muted text-xs uppercase tracking-[0.3em]">
              Your Vault
            </p>
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                vault!.status === 'Active'
                  ? 'bg-vault-green/10 text-vault-green'
                  : vault!.status === 'Triggered'
                  ? 'bg-vault-amber/10 text-vault-amber'
                  : 'bg-vault-red/10 text-vault-red'
              }`}
            >
              {vault!.status}
            </span>
          </div>
          <h1 className="font-display text-3xl text-vault-text">{vault!.vaultName}</h1>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column — Vault Health */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Dead Man's Switch Card */}
            <div className="vault-card p-8 text-center">
              <h3 className="font-mono text-xs text-vault-gold uppercase tracking-wider mb-6">
                Dead Man&apos;s Switch
              </h3>
              <div className="relative w-40 h-40 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-vault-border" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - daysRemaining / Math.ceil(vault!.checkInInterval / 86400))}`}
                    strokeLinecap="round"
                    className={daysRemaining > 7 ? 'text-vault-green' : daysRemaining > 3 ? 'text-vault-amber' : 'text-vault-red'}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl text-vault-text">{daysRemaining}</span>
                  <span className="text-vault-muted text-xs">days left</span>
                </div>
              </div>

              <button
                onClick={handleCheckIn}
                disabled={vault!.status === 'Released'}
                className={`w-full py-4 rounded-lg text-sm uppercase tracking-widest transition-all ${
                  checkInSuccess
                    ? 'bg-vault-green/20 text-vault-green border border-vault-green/30'
                    : vault!.status === 'Released'
                    ? 'bg-vault-muted/10 text-vault-muted cursor-not-allowed'
                    : vault!.status === 'Triggered'
                    ? 'bg-vault-amber/20 text-vault-amber border border-vault-amber/30 hover:bg-vault-amber/30'
                    : 'btn-gold'
                }`}
              >
                {checkInSuccess ? '✓ Alive & Well' : vault!.status === 'Released' ? 'Vault Released' : vault!.status === 'Triggered' ? 'Emergency Check-In' : 'I Am Alive'}
              </button>

              <p className="text-vault-muted text-[10px] mt-3">
                Last check-in: {formatTimestamp(vault!.lastCheckIn)}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="vault-card p-4 text-center">
                <span className="block font-display text-2xl text-vault-text">{vault!.fileCount}</span>
                <span className="text-vault-muted text-[10px] uppercase tracking-wider">Files</span>
              </div>
              <div className="vault-card p-4 text-center">
                <span className="block font-display text-2xl text-vault-text">
                  {Math.ceil(vault!.checkInInterval / 86400)}
                </span>
                <span className="text-vault-muted text-[10px] uppercase tracking-wider">Day Period</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column — Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Beneficiary */}
            <div className="vault-card">
              <div className="p-6 border-b border-vault-border flex items-center justify-between">
                <h2 className="font-display text-lg text-vault-text">Beneficiary</h2>
                <button
                  onClick={() => setShowBenForm(!showBenForm)}
                  className="text-xs text-vault-gold hover:underline"
                >
                  {vault!.beneficiary ? 'Change' : 'Set'}
                </button>
              </div>
              <div className="p-6">
                {vault!.beneficiary ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-vault-gold/10 flex items-center justify-center">
                      <span className="text-vault-gold text-xs">◆</span>
                    </div>
                    <span className="text-sm text-vault-text font-mono">
                      {vault!.beneficiary.slice(0, 8)}...{vault!.beneficiary.slice(-6)}
                    </span>
                  </div>
                ) : (
                  <p className="text-vault-muted text-sm">
                    No beneficiary set. Click &quot;Set&quot; above to add one.
                  </p>
                )}

                {/* Inline Beneficiary Form */}
                {showBenForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-vault-border"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={benAddress}
                        onChange={(e) => setBenAddress(e.target.value.trim())}
                        placeholder="Beneficiary wallet address"
                        className="flex-1 bg-vault-surface border border-vault-border rounded-lg px-3 py-2
                                   text-vault-text placeholder-vault-muted/40 font-mono text-xs
                                   focus:border-vault-gold focus:outline-none transition-colors"
                      />
                      <button
                        onClick={handleSetBeneficiary}
                        disabled={settingBen || !isValidSolanaAddress(benAddress)}
                        className="btn-gold text-xs px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {settingBen ? '...' : 'Save'}
                      </button>
                    </div>
                    {benAddress && !isValidSolanaAddress(benAddress) && (
                      <p className="text-vault-red text-[10px] mt-1">Invalid Solana address</p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Vault Contents — IPFS CIDs */}
            <div className="vault-card">
              <div className="p-6 border-b border-vault-border flex items-center justify-between">
                <h2 className="font-display text-lg text-vault-text">Vault Contents</h2>
                <button
                  onClick={() => setShowFileForm(!showFileForm)}
                  disabled={vault!.status !== 'Active'}
                  className="text-xs text-vault-gold hover:underline disabled:text-vault-muted disabled:no-underline"
                >
                  + Add File
                </button>
              </div>

              {/* Add File Form */}
              {showFileForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-6 border-b border-vault-border bg-vault-surface/50"
                >
                  <p className="text-vault-muted text-xs mb-3">
                    Enter the IPFS CID of your encrypted file.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ipfsCid}
                      onChange={(e) => setIpfsCid(e.target.value.trim())}
                      placeholder="QmX... or bafy..."
                      maxLength={64}
                      className="flex-1 bg-vault-surface border border-vault-border rounded-lg px-3 py-2
                                 text-vault-text placeholder-vault-muted/40 font-mono text-xs
                                 focus:border-vault-gold focus:outline-none transition-colors"
                    />
                    <button
                      onClick={handleAddFile}
                      disabled={addingFile || !ipfsCid.trim()}
                      className="btn-gold text-xs px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {addingFile ? 'Storing...' : 'Store'}
                    </button>
                  </div>
                  <p className="text-vault-muted text-[10px] mt-2">
                    {vault!.fileCount}/50 files · Max 64 characters
                  </p>
                </motion.div>
              )}

              <div className="divide-y divide-vault-border">
                {vault!.ipfsCids.length > 0 ? (
                  vault!.ipfsCids.map((cid) => (
                    <div
                      key={cid}
                      className="p-4 flex items-center justify-between hover:bg-vault-raised/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-vault-raised flex items-center justify-center">
                          <span className="text-vault-gold text-xs">🔒</span>
                        </div>
                        <div>
                          <p className="text-sm text-vault-text font-mono">{shortenCid(cid)}</p>
                          <p className="text-[10px] text-vault-muted">Encrypted · IPFS</p>
                        </div>
                      </div>
                      <a
                        href={`https://w3s.link/ipfs/${cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-vault-gold text-[10px] hover:underline"
                      >
                        View ↗
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-vault-muted text-sm">
                      No files stored yet. Upload your first encrypted file.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Vault Details */}
            <div className="vault-card">
              <div className="p-6 border-b border-vault-border flex items-center justify-between">
                <h2 className="font-display text-lg text-vault-text">Vault Details</h2>
                <BackupButton vault={vault!} className="text-xs text-vault-gold hover:underline" />
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Vault PDA</span>
                  <span className="text-vault-text font-mono text-xs">
                    {vault!.pubkey.slice(0, 8)}...{vault!.pubkey.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Owner</span>
                  <span className="text-vault-text font-mono text-xs">
                    {publicKey ? `${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-6)}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Created</span>
                  <span className="text-vault-text">{formatTimestamp(vault!.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Network</span>
                  <span className="text-vault-text">Solana Devnet</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
