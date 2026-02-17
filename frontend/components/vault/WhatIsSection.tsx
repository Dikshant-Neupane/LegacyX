'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';

const features = [
  {
    title: 'Regret Vault',
    description: 'Your final words. Voice, video, or text. One read then gone forever.',
    icon: '🔐',
  },
  {
    title: 'Conditional Inheritance',
    description: 'Assets unlock only when your conditions are met. No lawyers. No fees.',
    icon: '⚖️',
  },
  {
    title: 'Whistleblower Switch',
    description: 'Truth auto-releases to 1,000 wallets if you stop checking in. Unstoppable.',
    icon: '📡',
  },
  {
    title: 'Soul Wallet',
    description: 'Your memory and voice preserved. Your bloodline holds the key.',
    icon: '🧬',
  },
  {
    title: 'Proof of You',
    description: 'Biometric hash on-chain. Cryptographic proof you are real. Not a deepfake.',
    icon: '🛡️',
  },
];

export function WhatIsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section ref={ref} className="py-32 px-6 max-w-7xl mx-auto">
      <motion.h2
        className="font-heading text-section text-center mb-20"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        What is LegacyX
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        {/* Feature list — left column */}
        <div className="space-y-2">
          {features.map((feature, i) => (
            <motion.button
              key={i}
              className={`w-full text-left p-6 rounded-xl transition-all duration-300 ${
                activeIndex === i
                  ? 'bg-vault-raised border border-vault-gold/20'
                  : 'border border-transparent hover:bg-vault-surface'
              }`}
              onClick={() => setActiveIndex(i)}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              data-interactive
            >
              <div className="flex items-start gap-4">
                {/* Custom gold bullet */}
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 transition-colors ${
                    activeIndex === i ? 'bg-vault-gold' : 'bg-vault-border'
                  }`}
                />
                <div>
                  <h3
                    className={`font-body font-semibold text-lg mb-1 transition-colors ${
                      activeIndex === i ? 'text-vault-gold' : 'text-vault-text'
                    }`}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-vault-muted text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Interactive vault diagram — right column */}
        <motion.div
          className="relative bg-vault-surface border border-vault-border rounded-2xl p-12 min-h-[400px] flex items-center justify-center"
          initial={{ opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Simplified vault visual that morphs per feature */}
          <div className="text-center">
            <motion.div
              key={activeIndex}
              className="text-6xl mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {features[activeIndex].icon}
            </motion.div>
            <motion.h3
              key={`title-${activeIndex}`}
              className="font-heading text-2xl text-vault-gold mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {features[activeIndex].title}
            </motion.h3>
            <motion.p
              key={`desc-${activeIndex}`}
              className="text-vault-muted text-sm max-w-xs mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {features[activeIndex].description}
            </motion.p>

            {/* Decorative vault rings */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-vault-gold/10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-vault-gold/5" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-vault-gold/[0.02]" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
