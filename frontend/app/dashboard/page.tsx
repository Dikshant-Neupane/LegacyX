'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { CountdownRing } from '@/components/ui/CountdownRing';
import { VaultCertificate } from '@/components/ui/VaultCertificate';
import { NumberMorph } from '@/components/ui/NumberMorph';
import { useVault } from '@/hooks/useVault';
import { vaultApi } from '@/lib/api';
import Link from 'next/link';

const VaultOrb = dynamic(
  () => import('@/components/vault/VaultOrb').then((m) => m.VaultOrb),
  { ssr: false }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDaysRemaining(lastCheckIn: number, checkInInterval: number): number {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - lastCheckIn;
  const remaining = checkInInterval - elapsed; // checkInInterval is already in seconds
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

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const { vault, loading, error, hasVault, checkIn, checkingIn, txProgress, refresh } = useVault();
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; title: string; message: string; createdAt: number; read: boolean }>>([]);

  // Redirect to landing if not connected
  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  // Fetch notifications
  useEffect(() => {
    if (publicKey && hasVault) {
      vaultApi.getNotifications(publicKey.toBase58()).then((res) => {
        setNotifications(res.notifications || []);
      }).catch(() => {});
    }
  }, [publicKey, hasVault]);

  const handleCheckIn = async () => {
    const sig = await checkIn();
    if (sig) {
      setCheckInSuccess(true);
      setTimeout(() => setCheckInSuccess(false), 3000);
    }
  };

  if (!connected) return null;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex flex-col items-center justify-center">
        <div className="w-24 h-24 mb-6">
          <VaultOrb size="small" />
        </div>
        <p className="text-vault-muted text-sm animate-pulse">Loading vault data...</p>
      </div>
    );
  }

  // No vault — redirect to create
  if (!hasVault) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex flex-col items-center justify-center">
        <div className="vault-card p-12 text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6">
            <VaultOrb size="small" />
          </div>
          <h2 className="font-display text-2xl text-vault-text mb-4">
            No Vault Found
          </h2>
          <p className="text-vault-muted text-sm mb-8">
            You don&apos;t have a vault yet. Create one to start preserving your legacy.
          </p>
          <Link href="/vault/create" className="btn-gold" data-interactive>
            Create Your Vault
          </Link>
        </div>
      </div>
    );
  }

  const daysRemaining = computeDaysRemaining(vault!.lastCheckIn, vault!.checkInInterval);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* ─── Header ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-2">
            <p className="text-vault-muted text-xs uppercase tracking-[0.3em]">
              Vault Dashboard
            </p>
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                vault!.status === 'Active'
                  ? 'bg-vault-green/10 text-vault-green'
                  : vault!.status === 'Triggered'
                    ? 'bg-vault-amber/10 text-vault-amber'
                    : vault!.status === 'Released'
                      ? 'bg-vault-red/10 text-vault-red'
                      : 'bg-vault-muted/10 text-vault-muted'
              }`}
            >
              {vault!.status}
            </span>
          </div>
          <h1 className="font-display text-section text-vault-text">
            {vault!.vaultName}
          </h1>
          {error && (
            <p className="text-vault-red text-xs mt-2">{error}</p>
          )}
        </motion.div>

        {/* ─── Main Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column — Vault Health */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-8"
          >
            {/* Orb + Countdown */}
            <div className="vault-card p-8 flex flex-col items-center">
              <div className="w-48 h-48 mb-6">
                <VaultOrb size="dashboard" />
              </div>

              <CountdownRing
                daysRemaining={daysRemaining}
                totalDays={vault!.checkInInterval}
                size={180}
              />

              {/* Check-In Button */}
              <motion.button
                onClick={handleCheckIn}
                disabled={checkingIn || vault!.status !== 'Active'}
                className={`mt-8 w-full py-4 rounded-lg font-body text-sm uppercase tracking-widest transition-all duration-300 ${
                  checkInSuccess
                    ? 'bg-vault-green/20 text-vault-green border border-vault-green/30'
                    : vault!.status !== 'Active'
                      ? 'bg-vault-muted/10 text-vault-muted cursor-not-allowed'
                      : 'btn-gold'
                }`}
                whileTap={{ scale: 0.98 }}
                data-interactive
              >
                {checkingIn
                  ? txProgress?.status === 'signing'
                    ? 'Signing...'
                    : txProgress?.status === 'confirming'
                      ? 'Confirming...'
                      : 'Processing...'
                  : checkInSuccess
                    ? '✓ Alive & Well'
                    : vault!.status !== 'Active'
                      ? 'Vault Inactive'
                      : 'I Am Alive'}
              </motion.button>

              <p className="text-vault-muted text-[10px] mt-3 text-center">
                Last check-in: {formatTimestamp(vault!.lastCheckIn)}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Files', value: vault!.fileCount, icon: '◇' },
                { label: 'Heirs', value: vault!.heirCount, icon: '◆' },
                { label: 'Guardians', value: vault!.guardianCount, icon: '⬡' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="vault-card p-4 text-center"
                >
                  <span className="text-vault-gold text-lg">{stat.icon}</span>
                  <NumberMorph
                    value={stat.value}
                    className="block font-display text-2xl text-vault-text mt-1"
                  />
                  <span className="text-vault-muted text-[10px] uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Vault Links */}
            {vault!.links && (
              <div className="vault-card p-4">
                <p className="text-vault-muted text-[10px] uppercase tracking-wider mb-2">
                  Explorer
                </p>
                <div className="flex gap-3">
                  <a
                    href={vault!.links.solscan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-vault-gold text-xs hover:underline"
                  >
                    Solscan ↗
                  </a>
                  <a
                    href={vault!.links.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-vault-gold text-xs hover:underline"
                  >
                    Explorer ↗
                  </a>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column — Content & Activity */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-8"
          >
            {/* Action Bar */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Upload File', href: '/vault/create', icon: '↑' },
                { label: 'Add Heir', href: '/vault/create', icon: '+' },
                { label: 'Write Message', href: '/vault/messages', icon: '✎' },
                { label: 'Identity Proof', href: '/identity', icon: '⬡' },
                { label: 'Conditions', href: '/vault/conditions', icon: '⚙' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="btn-ghost text-xs flex items-center gap-2"
                  data-interactive
                >
                  <span className="text-vault-gold">{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>

            {/* Vault Contents — Arweave CIDs */}
            <div className="vault-card">
              <div className="p-6 border-b border-vault-border flex items-center justify-between">
                <h2 className="font-heading text-lg text-vault-text">
                  Vault Contents
                </h2>
                <span className="text-vault-muted text-xs">
                  {vault!.fileCount} encrypted items
                </span>
              </div>
              <div className="divide-y divide-vault-border">
                {vault!.arweaveCids.length > 0 ? (
                  vault!.arweaveCids.map((cid, i) => (
                    <motion.div
                      key={cid}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="p-4 flex items-center justify-between hover:bg-vault-raised/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-vault-raised flex items-center justify-center">
                          <span className="text-vault-gold text-xs">🔒</span>
                        </div>
                        <div>
                          <p className="text-sm text-vault-text font-mono">
                            {shortenCid(cid)}
                          </p>
                          <p className="text-[10px] text-vault-muted">
                            Encrypted · Arweave
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://arweave.net/${cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-vault-gold text-[10px] hover:underline"
                      >
                        View ↗
                      </a>
                    </motion.div>
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

            {/* Notifications / Activity */}
            <div className="vault-card">
              <div className="p-6 border-b border-vault-border flex items-center justify-between">
                <h2 className="font-heading text-lg text-vault-text">
                  Activity
                </h2>
                <button
                  onClick={refresh}
                  className="text-vault-gold text-[10px] hover:underline"
                  data-interactive
                >
                  Refresh
                </button>
              </div>
              <div className="p-4 space-y-3">
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          n.type === 'check_in_reminder'
                            ? 'bg-vault-amber'
                            : n.type === 'vault_released'
                              ? 'bg-vault-green'
                              : 'bg-vault-gold'
                        }`}
                      />
                      <span className="text-sm text-vault-text flex-1">
                        {n.title}
                      </span>
                      <span className="text-[10px] text-vault-muted">
                        {formatTimestamp(Math.floor(n.createdAt / 1000))}
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-vault-muted text-sm text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </div>

            {/* Heirs List */}
            {vault!.heirPubkeys.length > 0 && (
              <div className="vault-card">
                <div className="p-6 border-b border-vault-border">
                  <h2 className="font-heading text-lg text-vault-text">
                    Designated Heirs
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  {vault!.heirPubkeys.map((heir, i) => (
                    <div key={heir} className="flex items-center gap-3">
                      <span className="text-vault-gold text-xs">◆</span>
                      <span className="text-sm text-vault-text font-mono">
                        {heir.slice(0, 8)}...{heir.slice(-6)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificate */}
            <VaultCertificate
              vaultName={vault!.vaultName}
              ownerAddress={publicKey?.toBase58() || ''}
              createdAt={formatTimestamp(vault!.createdAt)}
              status={vault!.status}
              checkInDays={vault!.checkInInterval}
              heirCount={vault!.heirCount}
              fileCount={vault!.fileCount}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
