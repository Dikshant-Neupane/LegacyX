'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const stats = [
  { value: '$20B+', label: 'in crypto lost forever due to inaccessible wallets' },
  { value: '89%', label: 'of crypto holders have no digital succession plan' },
  { value: '4M+', label: 'Bitcoin wallets presumed permanently lost' },
];

export function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} className="py-24 sm:py-32 px-6 max-w-5xl mx-auto">
      {/* Section title */}
      <motion.div
        className="text-center mb-16"
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={fadeUp}
      >
        <span className="font-mono text-xs text-vault-gold uppercase tracking-[0.25em] mb-4 block">
          The Problem
        </span>
        <h2 className="font-heading text-section mb-6">
          When you die, your digital life{' '}
          <span className="text-vault-gold">dies with you.</span>
        </h2>
        <p className="font-body text-vault-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Your crypto wallet keys, passwords, private documents, and family records
          become permanently inaccessible. Your loved ones inherit nothing —
          not because you didn&apos;t plan, but because <em>no tool existed</em> to do it trustlessly on-chain.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-16"
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      >
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className="vault-card text-center p-6 sm:p-8"
            variants={fadeUp}
          >
            <div className="font-display text-3xl sm:text-4xl text-vault-gold mb-2">{stat.value}</div>
            <p className="text-vault-muted text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Emotional hook */}
      <motion.blockquote
        className="text-center border-l-2 border-vault-gold pl-6 py-2 max-w-xl mx-auto"
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={fadeUp}
      >
        <p className="font-body text-vault-muted italic text-base leading-relaxed">
          &ldquo;What happens to your family&apos;s financial access, your crypto holdings,
          and your most private documents when you can no longer log in?&rdquo;
        </p>
        <footer className="mt-3 text-xs text-vault-gold font-mono">
          LegacyX solves this — trustlessly, on Solana.
        </footer>
      </motion.blockquote>
    </section>
  );
}
