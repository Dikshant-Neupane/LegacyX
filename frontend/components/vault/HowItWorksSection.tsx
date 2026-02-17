'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  {
    number: '01',
    title: 'Connect Phantom Wallet',
    description: 'Your identity is your wallet, nothing else.',
  },
  {
    number: '02',
    title: 'Build Your Vault',
    description: 'Upload files, record messages, set conditions, assign heirs.',
  },
  {
    number: '03',
    title: 'Check In Monthly',
    description: 'Miss a check-in and your vault releases exactly as you configured.',
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} id="how-it-works" className="py-32 px-6 max-w-7xl mx-auto">
      <motion.h2
        className="font-heading text-section text-center mb-20"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        How It Works
      </motion.h2>

      {/* Steps — horizontal on desktop, vertical on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {/* Gold connecting thread (desktop only) */}
        <motion.div
          className="hidden md:block absolute top-[60px] left-[16.6%] right-[16.6%] h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #C9A96E, transparent)' }}
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />

        {steps.map((step, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
          >
            {/* Step number */}
            <div className="relative mb-8">
              <span className="font-heading text-[64px] text-vault-gold leading-none">
                {step.number}
              </span>
              {/* Node circle */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-vault-gold hidden md:block" />
            </div>

            {/* Step title */}
            <h3 className="font-body font-semibold text-xl text-vault-text mb-3">
              {step.title}
            </h3>

            {/* Step description */}
            <p className="font-body text-base text-vault-muted max-w-xs">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
