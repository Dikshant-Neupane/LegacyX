import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from '@/components/layout/Providers';
import { CustomCursor } from '@/components/ui/CustomCursor';
import { GrainOverlay } from '@/components/ui/GrainOverlay';
import { PageTransition } from '@/components/animations/PageTransition';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'LegacyX — Your life, encrypted. Your legacy, permanent.',
  description:
    'A Solana-powered digital life vault. Store your assets, secrets, final words, and identity proof — governed by unstoppable smart contracts. Not even we can touch it.',
  keywords: [
    'Solana',
    'digital vault',
    'inheritance',
    'encryption',
    'blockchain',
    'identity proof',
    'Phantom Wallet',
  ],
  openGraph: {
    title: 'LegacyX — Not even we can touch it.',
    description:
      'Encrypted digital life vault on Solana. Final words, conditional inheritance, whistleblower protection, identity proof.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="lenis">
      <body className="bg-vault-bg text-vault-text font-body min-h-screen antialiased">
        <Providers>
          <CustomCursor />
          <Header />
          <PageTransition>
            <main>{children}</main>
          </PageTransition>
        </Providers>
      </body>
    </html>
  );
}
