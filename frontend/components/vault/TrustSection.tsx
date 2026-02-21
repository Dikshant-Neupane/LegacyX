'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const pillars = [
  {
    keyword: 'Client-Side Encryption',
    description: 'AES-256-GCM encryption happens entirely in your browser. We never see your data, not even once.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1" />
      </svg>
    ),
  },
  {
    keyword: 'Stored on IPFS',
    description: 'Your encrypted files live on the decentralized web. Even if we shut down, your data survives.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    keyword: 'Secured by Solana',
    description: 'Vault ownership and the dead man\'s switch are governed by an on-chain smart contract. Verifiable by anyone.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      delay: 0.1 + i * 0.15,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export function TrustSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 max-w-7xl mx-auto">
      <motion.h2
        className="font-heading text-section text-center mb-12 sm:mb-20"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        Why You Can Trust It
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {pillars.map((pillar, i) => (
          <motion.div
            key={i}
            className="shimmer-border vault-card flex flex-col items-center text-center p-8 group hover:border-vault-gold/20 transition-all duration-300"
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            {/* Icon */}
            <motion.div
              className="mb-5 p-3 rounded-xl bg-vault-gold/5 border border-vault-gold/10 group-hover:shadow-gold-glow transition-shadow duration-300"
              initial={{ scale: 0, rotate: -10 }}
              animate={isInView ? { scale: 1, rotate: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.15, type: 'spring', stiffness: 180 }}
            >
              {pillar.icon}
            </motion.div>

            {/* Key phrase in mono */}
            <h3 className="font-mono text-vault-gold text-sm tracking-wide uppercase mb-4">
              {pillar.keyword}
            </h3>

            {/* Description */}
            <p className="font-body text-vault-muted text-base leading-relaxed">
              {pillar.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Trust badges */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-12 sm:mt-16 opacity-40 hover:opacity-70 transition-opacity duration-500"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 0.4 } : {}}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <span className="font-mono text-xs text-vault-muted">Phantom</span>
        <span className="text-vault-border">•</span>
        <span className="font-mono text-xs text-vault-muted">Solana</span>
        <span className="text-vault-border">•</span>
        <span className="font-mono text-xs text-vault-muted">IPFS</span>
        <span className="text-vault-border">•</span>
        <span className="font-mono text-xs text-vault-muted">AES-256</span>
      </motion.div>
    </section>
  );
}
