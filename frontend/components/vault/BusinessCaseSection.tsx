'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const tiers = [
  {
    name: 'Free',
    price: '0 SOL',
    features: ['1 vault', '5 files', '30-day check-in', 'AES-256 encryption'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '0.5 SOL / year',
    features: ['1 vault', '50 files', 'Custom check-in intervals', 'Priority IPFS pinning', 'Backup & export'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Contact us',
    features: ['Multi-vault support', 'Unlimited files', 'Multi-sig beneficiary', 'Audit logs', 'White-label API'],
    highlight: false,
  },
];

const revenue = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
    title: 'Subscription Revenue',
    desc: 'Annual SOL-denominated subscriptions for premium storage, custom intervals, and advanced features.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Protocol Fees',
    desc: 'Micro-fees on vault creation and file uploads flow to the protocol treasury — fully transparent on-chain.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vault-gold">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a4 4 0 00-8 0v2" />
      </svg>
    ),
    title: 'Enterprise & API Licensing',
    desc: 'White-label vault infrastructure for law firms, estate planners, and crypto custodians.',
  },
];

export function BusinessCaseSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} className="py-24 sm:py-32 px-6 max-w-6xl mx-auto">
      <motion.div
        className="text-center mb-16"
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={fadeUp}
      >
        <span className="font-mono text-xs text-vault-gold uppercase tracking-[0.25em] mb-4 block">
          Business Model
        </span>
        <h2 className="font-heading text-section mb-4">
          Sustainable, <span className="text-vault-gold">on-chain</span> revenue.
        </h2>
        <p className="font-body text-vault-muted text-base sm:text-lg max-w-2xl mx-auto">
          LegacyX is built for long-term sustainability — not hype.
          Revenue flows through SOL subscriptions, protocol fees, and enterprise licensing.
        </p>
      </motion.div>

      {/* Revenue streams */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20"
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      >
        {revenue.map((item, i) => (
          <motion.div
            key={i}
            className="vault-card p-6 space-y-3"
            variants={fadeUp}
          >
            <div className="p-2 rounded-lg bg-vault-gold/5 border border-vault-gold/10 w-fit">
              {item.icon}
            </div>
            <h3 className="font-body font-semibold text-vault-text">{item.title}</h3>
            <p className="text-vault-muted text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Pricing tiers */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      >
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            className={`vault-card p-6 sm:p-8 flex flex-col ${
              tier.highlight
                ? 'border-vault-gold/40 ring-1 ring-vault-gold/20 relative overflow-hidden'
                : ''
            }`}
            variants={fadeUp}
          >
            {tier.highlight && (
              <span className="absolute top-0 right-0 bg-vault-gold text-vault-bg text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </span>
            )}
            <h3 className="font-mono text-xs text-vault-gold uppercase tracking-wider mb-2">
              {tier.name}
            </h3>
            <div className="font-display text-2xl sm:text-3xl text-vault-text mb-6">
              {tier.price}
            </div>
            <ul className="space-y-2 flex-1">
              {tier.features.map((f, fi) => (
                <li key={fi} className="flex items-center gap-2 text-sm text-vault-muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-vault-green shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
