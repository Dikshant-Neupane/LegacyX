'use client';

import { useMemo, type ReactNode } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl, type Cluster } from '@solana/web3.js';
import { VaultProvider } from '@/contexts/VaultContext';

// Import wallet adapter default styles
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * LegacyX Providers
 *
 * Wraps the app with:
 * 1. Solana ConnectionProvider (devnet, switchable via env)
 * 2. WalletProvider with Phantom only
 * 3. WalletModalProvider for the connect dialog
 * 4. VaultProvider for on-chain vault state
 *
 * SECURITY: No centralized backend. All state is on-chain or client-side.
 */
export function Providers({ children }: { children: ReactNode }) {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as Cluster;

  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      clusterApiUrl(network),
    [network]
  );

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <VaultProvider>
            {children}
          </VaultProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
