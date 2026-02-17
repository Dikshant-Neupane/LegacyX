'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const pillars = [
  {
    keyword: 'Encrypted on your device',
    description: 'We never see your data, not even once.',
  },
  {
    keyword: 'Permanent on Arweave',
    description: 'Your vault exists forever, even if we shut down tomorrow.',
  },
  {
    keyword: 'Verified on Solana',
    description: 'Anyone can verify your vault on Solscan in one click.',
  },
];

export function TrustSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} className="py-32 px-6 max-w-7xl mx-auto">
      <motion.h2
        className="font-heading text-section text-center mb-20"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        Why You Can Trust It
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {pillars.map((pillar, i) => (
          <motion.div
            key={i}
            className="shimmer-border vault-card flex flex-col items-center text-center p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 * i }}
          >
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
        className="flex items-center justify-center gap-8 mt-16 opacity-40 hover:opacity-70 transition-opacity"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 0.4 } : {}}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <span className="font-mono text-xs text-vault-muted">Phantom</span>
        <span className="text-vault-border">•</span>
        <span className="font-mono text-xs text-vault-muted">Solana</span>
        <span className="text-vault-border">•</span>
        <span className="font-mono text-xs text-vault-muted">Arweave</span>
        <span className="text-vault-border">•</span>
        <span className="font-mono text-xs text-vault-muted">Solscan</span>
      </motion.div>
    </section>
  );
}
