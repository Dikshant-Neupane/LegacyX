'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname}>
        {/* Gold line sweep */}
        <motion.div
          className="page-transition-line"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          exit={{ width: '0%' }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          onAnimationComplete={() => {
            // Line disappears after sweep
          }}
          style={{ position: 'fixed', top: 0, left: 0, height: 2, zIndex: 99998 }}
        />

        {/* Page content fade-in */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, delay: 0.35 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
