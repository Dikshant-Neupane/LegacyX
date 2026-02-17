'use client';

import { useEffect, useState } from 'react';
import { getExplorerLinks } from '@/lib/explorer';

interface TransactionBadgeProps {
  signature: string;
  label?: string;
}

/**
 * TransactionBadge — appears after every on-chain action.
 * Typewriter hash reveal + Solscan, Solana Explorer, and Orb links.
 */
export function TransactionBadge({ signature, label }: TransactionBadgeProps) {
  const [displayedHash, setDisplayedHash] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const links = getExplorerLinks(signature);
  const truncatedSig = `${signature.slice(0, 8)}...${signature.slice(-8)}`;

  // Typewriter effect — 30ms per character
  useEffect(() => {
    let index = 0;
    const chars = truncatedSig;
    const interval = setInterval(() => {
      if (index <= chars.length) {
        setDisplayedHash(chars.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [truncatedSig]);

  return (
    <div className="mt-3 p-3 bg-vault-surface border border-vault-border rounded-lg">
      {label && (
        <p className="text-xs text-vault-muted mb-1">{label}</p>
      )}

      {/* Transaction hash with typewriter */}
      <div className="font-mono text-sm text-vault-gold mb-2">
        {isComplete ? (
          <a
            href={links.solscan}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            data-interactive
          >
            {truncatedSig}
          </a>
        ) : (
          <span>
            {displayedHash}
            <span className="animate-pulse">|</span>
          </span>
        )}
      </div>

      {/* Explorer links */}
      {isComplete && (
        <div className="flex items-center gap-3">
          <a
            href={links.solscan}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-vault-muted hover:text-vault-gold transition-colors flex items-center gap-1"
            data-interactive
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Solscan
          </a>
          <a
            href={links.explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-vault-muted hover:text-vault-gold transition-colors flex items-center gap-1"
            data-interactive
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Explorer
          </a>
          <a
            href={links.orb}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-vault-muted hover:text-vault-gold transition-colors flex items-center gap-1"
            data-interactive
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            Orb
          </a>
        </div>
      )}
    </div>
  );
}
