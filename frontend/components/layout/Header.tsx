'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletAddress } from '@/components/wallet/WalletAddress';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { useVault } from '@/hooks/useVault';

export function Header() {
  const { connected } = useWallet();
  const { hasVault, loading } = useVault();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md bg-vault-bg/80 border-b border-vault-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-display font-bold text-xl text-vault-text tracking-tight hover:text-vault-gold transition-colors"
          onClick={() => setMobileOpen(false)}
        >
          Soul<span className="text-vault-gold">Vault</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {connected && (
            <>
              {hasVault && !loading ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm text-vault-muted hover:text-vault-text transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/vault"
                    className="text-sm text-vault-gold hover:text-vault-text transition-colors font-medium"
                  >
                    Your Vault
                  </Link>
                  <Link
                    href="/vault/backup"
                    className="text-sm text-vault-muted hover:text-vault-text transition-colors"
                  >
                    Backup
                  </Link>
                </>
              ) : (
                <Link
                  href="/vault/create"
                  className="text-sm text-vault-muted hover:text-vault-text transition-colors"
                >
                  Create Vault
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Right — Wallet + Hamburger */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            {connected ? <WalletAddress /> : <ConnectWalletButton />}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-vault-muted hover:text-vault-text transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-vault-border bg-vault-bg/95 backdrop-blur-md">
          <div className="px-6 py-4 space-y-4">
            {connected ? (
              <>
                {hasVault && !loading ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="block text-sm text-vault-muted hover:text-vault-text transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/vault"
                      className="block text-sm text-vault-gold hover:text-vault-text transition-colors font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Your Vault
                    </Link>
                    <Link
                      href="/vault/backup"
                      className="block text-sm text-vault-muted hover:text-vault-text transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      Backup
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/vault/create"
                    className="block text-sm text-vault-muted hover:text-vault-text transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Create Vault
                  </Link>
                )}
                <div className="pt-2 border-t border-vault-border">
                  <WalletAddress />
                </div>
              </>
            ) : (
              <ConnectWalletButton />
            )}
          </div>
        </div>
      )}
    </header>
  );
}
