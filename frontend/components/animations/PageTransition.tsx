'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { type ReactNode, useRef, useEffect, useState } from 'react';

/**
 * PageTransition — shows a gold line sweep on route change but does NOT
 * unmount/remount the page content. This prevents re-triggering hooks
 * and avoids the "flash" where vault data reloads with animation on every
 * navigation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [showLine, setShowLine] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Only trigger the line animation when pathname actually changes
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setShowLine(true);
    }
  }, [pathname]);

  return (
    <>
      {/* Gold line sweep on route change */}
      {showLine && (
        <motion.div
          className="page-transition-line"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          onAnimationComplete={() => setShowLine(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: 2,
            zIndex: 99998,
          }}
        />
      )}

      {/* Page content — no unmount/remount, just a soft fade on pathname change */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </>
  );
}
