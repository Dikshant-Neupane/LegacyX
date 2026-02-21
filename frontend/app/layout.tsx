import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from '@/components/layout/Providers';
import { Header } from '@/components/layout/Header';
import { CustomCursor } from '@/components/ui/CustomCursor';

export const metadata: Metadata = {
  title: 'LegacyX — Your digital legacy, encrypted forever.',
  description:
    'A Solana-powered self-sovereign digital legacy vault. Store your documents, passwords, and files — encrypted and blockchain-secured. Only you can access it. Not even we can touch it.',
  keywords: [
    'Solana',
    'digital vault',
    'legacy',
    'encryption',
    'blockchain',
    'Phantom Wallet',
    'dead man switch',
    'IPFS',
  ],
  openGraph: {
    title: 'LegacyX — Not even we can touch it.',
    description:
      'Encrypted digital legacy vault on Solana. Store everything. When you pass, your beneficiary gets access automatically.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-vault-bg text-vault-text font-body min-h-screen antialiased">
        <Providers>
          <CustomCursor />
          <Header />
          <main className="pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
