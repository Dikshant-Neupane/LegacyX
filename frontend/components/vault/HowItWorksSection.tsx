'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  {
    number: '01',
    title: 'Connect Phantom Wallet',
    description: 'Your wallet is your identity. No email, no password, no middleman.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Create & Fill Your Vault',
    description: 'Upload files, add notes, save links. Everything is encrypted in your browser before it leaves.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Set Your Beneficiary',
    description: 'Choose who gets access and when. Miss a check-in, and the dead man\'s switch activates.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Check In Periodically',
    description: 'One click resets the timer. If you stop checking in, your beneficiary gets the keys.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
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
      delay: 0.15 + i * 0.12,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} id="how-it-works" className="py-24 sm:py-32 px-4 sm:px-6 max-w-7xl mx-auto">
      <motion.h2
        className="font-heading text-section text-center mb-12 sm:mb-20"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        How It Works
      </motion.h2>

      {/* Steps — horizontal on desktop, vertical on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
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
            className="flex flex-col items-center text-center group"
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            {/* Step number + icon */}
            <div className="relative mb-8">
              <span className="font-heading text-[48px] sm:text-[64px] text-vault-gold leading-none transition-transform duration-300 group-hover:scale-110 inline-block">
                {step.number}
              </span>
              {/* Animated icon beneath number */}
              <motion.div
                className="mt-2 flex justify-center opacity-60 group-hover:opacity-100 transition-opacity"
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.12, type: 'spring', stiffness: 200 }}
              >
                {step.icon}
              </motion.div>
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
