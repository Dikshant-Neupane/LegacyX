'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { getSolscanAccountUrl } from '@/lib/explorer';

export function WalletAddress() {
  const { publicKey, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  if (!publicKey) return null;

  const address = publicKey.toBase58();
  const truncated = `${address.slice(0, 4)}...${address.slice(-4)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <a
        href={getSolscanAccountUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-sm text-vault-muted hover:text-vault-gold transition-colors"
        data-interactive
      >
        {truncated}
      </a>
      <button
        onClick={handleCopy}
        className="text-vault-muted hover:text-vault-gold transition-colors p-1"
        data-interactive
        title="Copy address"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
      <button
        onClick={disconnect}
        className="text-xs text-vault-muted hover:text-vault-red transition-colors ml-1"
        data-interactive
      >
        Disconnect
      </button>
    </div>
  );
}
