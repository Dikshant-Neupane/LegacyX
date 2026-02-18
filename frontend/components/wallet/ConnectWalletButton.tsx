'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useEffect, useRef } from 'react';

export function ConnectWalletButton() {
  const { select, wallets, connect, connecting, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const connectingRef = useRef(false);

  // Auto-connect once a wallet is selected
  useEffect(() => {
    if (wallet && !connecting && connectingRef.current) {
      connectingRef.current = false;
      connect().catch((err) => {
        console.error('Wallet connection failed:', err);
      });
    }
  }, [wallet, connecting, connect]);

  const handleConnect = useCallback(async () => {
    // If Phantom is installed, select it directly
    const phantom = wallets.find(
      (w) => w.adapter.name === 'Phantom'
    );
    if (phantom) {
      connectingRef.current = true;
      select(phantom.adapter.name);
      // connect() fires from the useEffect above after wallet is registered
    } else {
      // Fallback: show the wallet modal
      setVisible(true);
    }
  }, [wallets, select, setVisible]);

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="btn-gold text-sm"
      data-interactive
    >
      {/* Phantom ghost icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="64" cy="64" r="64" fill="currentColor" fillOpacity="0.15" />
        <path
          d="M110.584 64.916C110.584 90.5 89.667 105.834 64 105.834C38.333 105.834 17.416 85.542 17.416 59.958C17.416 34.375 38.333 14.083 64 14.083C89.667 14.083 110.584 39.333 110.584 64.916Z"
          fill="currentColor"
          fillOpacity="0.3"
        />
        <circle cx="47" cy="56" r="7" fill="currentColor" />
        <circle cx="81" cy="56" r="7" fill="currentColor" />
      </svg>
      {connecting ? 'Connecting...' : 'Connect Phantom'}
    </button>
  );
}
