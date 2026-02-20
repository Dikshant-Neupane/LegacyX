'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Lazy load Three.js orb to avoid SSR issues
const VaultOrb = dynamic(() => import('@/components/vault/VaultOrb').then(m => ({ default: m.VaultOrb })), {
  ssr: false,
  loading: () => <div className="w-[320px] h-[320px] md:w-[320px] md:h-[320px] sm:w-[220px] sm:h-[220px]" />,
});

export function HeroSection() {
  const headline = 'Your life, encrypted. Your legacy, permanent.';
  const words = headline.split(' ');

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 topo-bg overflow-hidden">
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
        {/* Headline — word by word clip-path reveal */}
        <h1 className="font-display text-hero mb-6">
          {words.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block mr-[0.3em]"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{
                duration: 0.4,
                delay: 0.3 + i * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Subheadline */}
        <motion.p
          className="font-body text-subtitle text-vault-muted max-w-[520px] mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
        >
          Everything you own digitally — sealed on Solana. Released exactly when
          and how you decide. Not even we can touch it.
        </motion.p>

        {/* Vault Orb */}
        <motion.div
          className="w-[220px] h-[220px] md:w-[320px] md:h-[320px] mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.0, duration: 0.6 }}
        >
          <VaultOrb size="hero" />
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="flex items-center gap-4 flex-wrap justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.4 }}
        >
          <Link href="/register" className="btn-gold" data-interactive>
            Get Started
          </Link>
          <Link href="/login" className="btn-ghost" data-interactive>
            Sign In
          </Link>
          <Link href="#how-it-works" className="btn-ghost" data-interactive>
            See How It Works
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.0, duration: 0.4 }}
      >
        <span className="text-caption text-vault-muted tracking-widest uppercase">
          Scroll to explore
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
