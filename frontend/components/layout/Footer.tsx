'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-vault-border py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Wordmark */}
        <span className="font-body font-bold text-vault-text">
          LegacyX
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
          <Link
            href="/dashboard"
            className="text-sm text-vault-muted hover:text-vault-text transition-colors"
            data-interactive
          >
            Dashboard
          </Link>
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
            Built in Nepal. Powered by Solana.
          </span>
        </div>
      </div>
    </footer>
  );
}
