'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletAddress } from '@/components/wallet/WalletAddress';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { useVault } from '@/hooks/useVault';

export function Header() {
  const { connected } = useWallet();
  const { hasVault, loading, error } = useVault();

  // Only show "Your Vault" link when vault is confirmed to exist
  const showVaultLink = hasVault && !loading;

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-sm bg-vault-bg/80 border-b border-vault-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-body font-bold text-lg text-vault-text tracking-tight gold-hover-glow px-2 py-1 rounded"
          data-interactive
        >
          LegacyX
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {/* MVP Auth Links - always visible */}
          <Link
            href="/dashboard"
            className="text-sm text-vault-muted hover:text-vault-text transition-colors"
            data-interactive
          >
            Dashboard
          </Link>
          {connected && (
            <>
              {showVaultLink && (
                <Link
                  href="/vault"
                  className={`text-sm transition-colors ${loading ? 'text-vault-muted/50' : 'text-vault-muted hover:text-vault-text'}`}
                  data-interactive
                >
                  Your Vault
                </Link>
              )}
              <Link
                href="/vault/create"
                className="text-sm text-vault-muted hover:text-vault-text transition-colors"
                data-interactive
              >
                Create Vault
              </Link>
              <Link
                href="/vault/messages"
                className="text-sm text-vault-muted hover:text-vault-text transition-colors"
                data-interactive
              >
                Messages
              </Link>
              <Link
                href="/identity"
                className="text-sm text-vault-muted hover:text-vault-text transition-colors"
                data-interactive
              >
                Identity
              </Link>
            </>
          )}
        </nav>

        {/* Wallet */}
        <div className="flex items-center gap-4">
          {connected ? <WalletAddress /> : <ConnectWalletButton />}
        </div>
      </div>
    </header>
  );
}
