'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useVault } from '@/hooks/useVault';

export function Footer() {
  const { connected } = useWallet();
  const { hasVault, loading, error } = useVault();

  // Show vault link when confirmed, loading, or if there was an error (can't confirm absence)
  const showVaultLink = hasVault || loading || !!error;

  return (
    <footer className="border-t border-vault-border py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Wordmark */}
        <span className="font-display font-bold text-vault-text">
          Soul<span className="text-vault-gold">Vault</span>
        </span>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-vault-muted hover:text-vault-text transition-colors"
            data-interactive
          >
            Home
          </Link>
          {connected && showVaultLink && (
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
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-vault-muted hover:text-vault-text transition-colors"
            data-interactive
          >
            GitHub
          </a>
        </nav>

        {/* Powered by */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-vault-muted">
            Powered by Solana. Encrypted by you.
          </span>
        </div>
      </div>
    </footer>
  );
}
