'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface BurnAfterReadToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}

/**
 * Toggle for "Burn After Read" feature on regret vault messages.
 * Message auto-destructs after heir reads it once.
 * Gold flame animation when enabled.
 */
export function BurnAfterReadToggle({
  enabled,
  onChange,
  label = 'Burn After Read',
}: BurnAfterReadToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-3 group"
      data-interactive
    >
      {/* Toggle track */}
      <div
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
          enabled ? 'bg-vault-red/30' : 'bg-vault-border'
        }`}
      >
        {/* Thumb */}
        <motion.div
          animate={{ x: enabled ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-colors duration-300 ${
            enabled ? 'bg-vault-red' : 'bg-vault-muted'
          }`}
        />

        {/* Flame effect when enabled */}
        {enabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-2 right-0"
          >
            <FlameIcon size={16} />
          </motion.div>
        )}
      </div>

      <span
        className={`text-sm transition-colors ${
          enabled ? 'text-vault-red' : 'text-vault-muted'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Flame Icon ───────────────────────────────────────────────────────────────

interface FlameIconProps {
  size?: number;
  className?: string;
}

export function FlameIcon({ size = 24, className = '' }: FlameIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-flame ${className}`}
    >
      <path
        d="M12 2C12 2 4 10 4 15C4 19.4183 7.58172 23 12 23C16.4183 23 20 19.4183 20 15C20 10 12 2 12 2Z"
        fill="#C0392B"
        fillOpacity="0.6"
      />
      <path
        d="M12 8C12 8 8 13 8 16C8 18.2091 9.79086 20 12 20C14.2091 20 16 18.2091 16 16C16 13 12 8 12 8Z"
        fill="#D4782A"
        fillOpacity="0.8"
      />
      <path
        d="M12 13C12 13 10 15.5 10 17C10 18.1046 10.8954 19 12 19C13.1046 19 14 18.1046 14 17C14 15.5 12 13 12 13Z"
        fill="#C9A96E"
      />
    </svg>
  );
}
