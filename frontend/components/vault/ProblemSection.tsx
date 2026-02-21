'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const stats = [
  { number: '70', suffix: '%', text: 'of digital assets are lost forever when someone dies.' },
  { number: '1', suffix: ' in 3', text: 'Your deepfake exists right now. You cannot prove it is not you.' },
  { number: '0', suffix: '', text: 'Your final words exist only inside your head.' },
];

function StatBlock({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20%' });

  return (
    <div ref={ref} className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      {/* Large number with morph animation */}
      <motion.div
        className="font-display text-[120px] md:text-[180px] text-vault-gold leading-none mb-6 relative"
        initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
        animate={isInView ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {stat.number}
        <span className="text-[60px] md:text-[90px]">{stat.suffix}</span>
        {/* Gold glow behind number */}
        <div className="absolute inset-0 blur-[60px] bg-vault-gold/10 rounded-full pointer-events-none" />
      </motion.div>

      {/* Description text */}
      <motion.p
        className="font-body text-lg md:text-xl text-vault-muted max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {stat.text}
      </motion.p>

      {/* Gold divider line */}
      {index < stats.length - 1 && (
        <motion.div
          className="w-full max-w-xs h-px mt-16"
          style={{ background: 'linear-gradient(90deg, transparent, #C9A96E, transparent)' }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 0.4 } : {}}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </div>
  );
}

export function ProblemSection() {
  return (
    <section className="py-20">
      {stats.map((stat, i) => (
        <StatBlock key={i} stat={stat} index={i} />
      ))}
    </section>
  );
}
