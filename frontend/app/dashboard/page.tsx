'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { motion } from 'framer-motion';
import { useVault } from '@/hooks/useVault';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { buildCheckInInstruction } from '@/lib/instructions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDaysRemaining(lastCheckIn: number, interval: number): number {
  const now = Math.floor(Date.now() / 1000);
  const remaining = interval - (now - lastCheckIn);
  return Math.max(0, Math.ceil(remaining / 86400));
}

function formatDate(unix: number): string {
  if (!unix) return 'Never';
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function timeAgo(unix: number): string {
  if (!unix) return 'Never';
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Stagger variants ────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { vault, loading, hasVault, error, refresh } = useVault();

  const [checkingIn, setCheckingIn] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  const flash = (type: 'success' | 'error', msg: string) => {
    setTxStatus({ type, msg });
    setTimeout(() => setTxStatus(null), 4000);
  };

  // Fetch SOL balance
  useEffect(() => {
    if (!publicKey || !connection) return;
    connection.getBalance(publicKey).then((bal) => setSolBalance(bal / 1e9)).catch(() => {});
  }, [publicKey, connection]);

  const handleCheckIn = async () => {
    if (!publicKey || !sendTransaction) return;
    setCheckingIn(true);
    try {
      const ix = buildCheckInInstruction(publicKey);
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');
      flash('success', 'Check-in confirmed on-chain.');
      await refresh();
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  // ─── Not Connected ──────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="font-display text-3xl mb-4">Connect Your Wallet</h1>
        <p className="text-vault-muted mb-8">
          Connect your Phantom wallet to access your SoulVault dashboard.
        </p>
        <ConnectWalletButton />
      </div>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-vault-muted">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
          </svg>
          Loading dashboard...
        </div>
      </div>
    );
  }

  // ─── No Vault ───────────────────────────────────────────────────────────
  if (!hasVault) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="vault-card p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="font-display text-2xl mb-3">No Vault Found</h2>
          <p className="text-vault-muted text-sm mb-8">
            You don&apos;t have a SoulVault yet. Create one to start securing your digital legacy.
          </p>
          <Link href="/vault/create" className="btn-gold">
            Create Your Vault
          </Link>
        </div>
      </div>
    );
  }

  const daysRemaining = computeDaysRemaining(vault!.lastCheckIn, vault!.checkInInterval);
  const totalDays = Math.ceil(vault!.checkInInterval / 86400);
  const progressPct = Math.round((daysRemaining / totalDays) * 100);
  const healthColor = daysRemaining > 7 ? 'vault-green' : daysRemaining > 3 ? 'vault-amber' : 'vault-red';

  // ─── Dashboard (Overview Hub) ─────────────────────────────────────────
  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Toast */}
        {txStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-sm font-medium shadow-lg ${
              txStatus.type === 'success'
                ? 'bg-vault-green/20 text-vault-green border border-vault-green/30'
                : 'bg-vault-red/20 text-vault-red border border-vault-red/30'
            }`}
          >
            {txStatus.msg}
          </motion.div>
        )}

        {/* ─── Welcome Banner ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="vault-card p-8 mb-8 relative overflow-hidden"
        >
          {/* Decorative gradient */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-vault-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-vault-muted text-xs uppercase tracking-[0.3em] mb-1">Welcome back</p>
              <h1 className="font-display text-3xl text-vault-text mb-2">{vault!.vaultName}</h1>
              <p className="text-vault-muted text-sm">
                {publicKey ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}` : ''}
                {solBalance !== null && (
                  <span className="ml-3 text-vault-gold">{solBalance.toFixed(3)} SOL</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full border text-xs font-mono border-${healthColor}/30 text-${healthColor}`}>
                {vault!.status}
              </span>
              <span className="text-vault-muted text-[10px]">Solana Devnet</span>
            </div>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="border border-vault-red/30 bg-vault-red/10 text-vault-red px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* ─── Stats Row ──────────────────────────────────────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          <motion.div variants={item} className="vault-card p-5 text-center">
            <span className="block font-display text-3xl text-vault-text">{daysRemaining}</span>
            <span className="text-vault-muted text-[10px] uppercase tracking-wider">Days Left</span>
            <div className="mt-2 h-1 bg-vault-border rounded-full overflow-hidden">
              <div className={`h-full bg-${healthColor} rounded-full transition-all`} style={{ width: `${progressPct}%` }} />
            </div>
          </motion.div>
          <motion.div variants={item} className="vault-card p-5 text-center">
            <span className="block font-display text-3xl text-vault-text">{vault!.fileCount}</span>
            <span className="text-vault-muted text-[10px] uppercase tracking-wider">Files Stored</span>
            <p className="text-vault-muted text-[10px] mt-2">{vault!.fileCount}/50 capacity</p>
          </motion.div>
          <motion.div variants={item} className="vault-card p-5 text-center">
            <span className="block font-display text-3xl text-vault-text">{totalDays}</span>
            <span className="text-vault-muted text-[10px] uppercase tracking-wider">Day Period</span>
            <p className="text-vault-muted text-[10px] mt-2">Check-in cycle</p>
          </motion.div>
          <motion.div variants={item} className="vault-card p-5 text-center">
            <span className={`block font-display text-3xl ${vault!.beneficiary ? 'text-vault-green' : 'text-vault-amber'}`}>
              {vault!.beneficiary ? '✓' : '—'}
            </span>
            <span className="text-vault-muted text-[10px] uppercase tracking-wider">Beneficiary</span>
            <p className="text-vault-muted text-[10px] mt-2">
              {vault!.beneficiary ? `${vault!.beneficiary.slice(0, 4)}...${vault!.beneficiary.slice(-4)}` : 'Not set'}
            </p>
          </motion.div>
        </motion.div>

        {/* ─── Main Grid — Quick Check-in + Navigation Cards ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Check-In Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="vault-card p-8 text-center lg:col-span-1"
          >
            <div className="relative w-28 h-28 mx-auto mb-5">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-vault-border" />
                <circle
                  cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - daysRemaining / totalDays)}`}
                  strokeLinecap="round"
                  className={`text-${healthColor}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl text-vault-text">{daysRemaining}</span>
                <span className="text-vault-muted text-[9px]">days</span>
              </div>
            </div>
            <button
              onClick={handleCheckIn}
              disabled={vault!.status === 'Released' || checkingIn}
              className={`w-full py-3 rounded-lg text-sm uppercase tracking-widest transition-all ${
                vault!.status === 'Released'
                  ? 'bg-vault-muted/10 text-vault-muted cursor-not-allowed'
                  : vault!.status === 'Triggered'
                  ? 'bg-vault-amber/20 text-vault-amber border border-vault-amber/30 hover:bg-vault-amber/30'
                  : 'btn-gold'
              }`}
            >
              {checkingIn ? 'Confirming...' : vault!.status === 'Released' ? 'Released' : 'I Am Alive'}
            </button>
            <p className="text-vault-muted text-[10px] mt-3">
              Last: {timeAgo(vault!.lastCheckIn)}
            </p>
          </motion.div>

          {/* Navigation Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {/* Open Vault */}
            <Link href="/vault" className="vault-card p-6 group hover:border-vault-gold/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-vault-gold/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-lg text-vault-text mb-1 group-hover:text-vault-gold transition-colors">
                    Manage Vault
                  </h3>
                  <p className="text-vault-muted text-xs">
                    Add files, set beneficiary, manage your vault contents and settings.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-vault-gold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Open vault →
              </div>
            </Link>

            {/* Backup */}
            <Link href="/vault/backup" className="vault-card p-6 group hover:border-vault-gold/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-vault-gold/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-lg text-vault-text mb-1 group-hover:text-vault-gold transition-colors">
                    Backup &amp; Export
                  </h3>
                  <p className="text-vault-muted text-xs">
                    Download encrypted vault backup and verify integrity hashes.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-vault-gold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Go to backup →
              </div>
            </Link>

            {/* Explorer */}
            <Link href="/identity" className="vault-card p-6 group hover:border-vault-gold/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-vault-gold/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-lg text-vault-text mb-1 group-hover:text-vault-gold transition-colors">
                    Identity
                  </h3>
                  <p className="text-vault-muted text-xs">
                    Manage your on-chain identity and connected profiles.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-vault-gold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                View identity →
              </div>
            </Link>

            {/* Legacy */}
            <Link href="/legacy" className="vault-card p-6 group hover:border-vault-gold/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-vault-gold/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-lg text-vault-text mb-1 group-hover:text-vault-gold transition-colors">
                    Legacy Plan
                  </h3>
                  <p className="text-vault-muted text-xs">
                    Configure release conditions and legacy distribution settings.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-vault-gold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                View plan →
              </div>
            </Link>
          </motion.div>
        </div>

        {/* ─── Vault Details / Activity ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vault Summary */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="vault-card"
          >
            <div className="p-6 border-b border-vault-border">
              <h2 className="font-display text-lg text-vault-text">Vault Summary</h2>
            </div>
            <div className="p-6 space-y-4">
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
                <span className="text-vault-text">{formatDate(vault!.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-vault-muted">Last Check-in</span>
                <span className="text-vault-text">{formatDate(vault!.lastCheckIn)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-vault-muted">Network</span>
                <span className="text-vault-text">Solana Devnet</span>
              </div>
            </div>
          </motion.div>

          {/* Security Checklist */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="vault-card"
          >
            <div className="p-6 border-b border-vault-border">
              <h2 className="font-display text-lg text-vault-text">Security Checklist</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Vault created', done: true },
                { label: 'Beneficiary set', done: !!vault!.beneficiary },
                { label: 'Files stored', done: vault!.fileCount > 0 },
                { label: 'Recent check-in', done: daysRemaining > 7 },
                { label: 'Backup exported', done: false },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done ? 'bg-vault-green/20' : 'bg-vault-border'
                  }`}>
                    {done ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-vault-green">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-vault-muted/50" />
                    )}
                  </div>
                  <span className={`text-sm ${done ? 'text-vault-text' : 'text-vault-muted'}`}>
                    {label}
                  </span>
                  {!done && (
                    <span className="text-[10px] text-vault-amber ml-auto">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
