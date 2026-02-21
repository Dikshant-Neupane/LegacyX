'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { useVault } from '@/hooks/useVault';
import { VaultOrb } from '@/components/vault/VaultOrb';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export function HeroSection() {
  const { connected } = useWallet();
  const { hasVault } = useVault();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-vault-gold/5 blur-[120px]" />
      </div>

      {/* Floating gold particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-vault-gold/30"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.15, 0.4, 0.15],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.7,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Golden Globe */}
        <motion.div className="mb-6" variants={fadeUp}>
          <VaultOrb size="hero" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="font-display text-hero mb-6"
          variants={fadeUp}
        >
          Your digital legacy,{' '}
          <span className="text-vault-gold">encrypted forever.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="font-body text-subtitle text-vault-muted max-w-[520px] mb-10"
          variants={fadeUp}
        >
          Store your documents, passwords, and files in a blockchain-secured vault.
          Only you can access it. When you pass, your beneficiary gets access automatically.
          <span className="block mt-2 text-vault-gold/80 text-sm font-medium">
            Not even we can touch it.
          </span>
        </motion.p>

        {/* CTA */}
        <motion.div
          className="flex items-center gap-4 flex-wrap justify-center"
          variants={fadeUp}
        >
          {connected ? (
            hasVault ? (
              <Link href="/vault" className="btn-gold">
                Open Your Vault
              </Link>
            ) : (
              <Link href="/vault/create" className="btn-gold">
                Create Your Vault
              </Link>
            )
          ) : (
            <ConnectWalletButton />
          )}
          <a href="#how-it-works" className="btn-ghost">
            How It Works
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="mt-16 flex items-center gap-6 text-xs text-vault-muted"
          variants={fadeUp}
        >
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-vault-green">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            AES-256 Encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-vault-green">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Solana Devnet
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-vault-green">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            IPFS Storage
          </span>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.4 }}
      >
        <span className="text-xs text-vault-muted tracking-widest uppercase">
          Scroll
        </span>
        <motion.svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-vault-muted"
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </motion.div>
    </section>
  );
}
