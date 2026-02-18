'use client';

import { useMemo, type ReactNode } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';
import { LenisProvider } from '@/components/layout/LenisProvider';

export function Providers({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      clusterApiUrl('devnet'),
    []
  );

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed', disableRetryOnRateLimit: false }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <LenisProvider>{children}</LenisProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
