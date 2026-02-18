'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface BiometricCaptureRingProps {
  /** Whether capture is in progress */
  capturing: boolean;
  /** Type of biometric being captured */
  type: 'face' | 'voice';
  /** Capture progress (0-1) */
  progress?: number;
  /** Callback when capture ring animation completes */
  onAnimationComplete?: () => void;
}

/**
 * Animated ring that surrounds the biometric capture area.
 * Pulses gold during capture, fills as progress increases.
 * SVG-based scan ring with rotating arc.
 */
export function BiometricCaptureRing({
  capturing,
  type,
  progress = 0,
  onAnimationComplete,
}: BiometricCaptureRingProps) {
  const ringSize = 280;
  const strokeWidth = 3;
  const radius = (ringSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - progress);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: ringSize, height: ringSize }}
    >
      <svg
        width={ringSize}
        height={ringSize}
        viewBox={`0 0 ${ringSize} ${ringSize}`}
        className="absolute inset-0"
      >
        {/* Background ring */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(201, 169, 110, 0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Progress ring */}
        <motion.circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke="#C9A96E"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
          initial={false}
          animate={{ strokeDashoffset: progressOffset }}
          transition={{ duration: 0.3 }}
        />

        {/* Scan ring (rotating arc) */}
        {capturing && (
          <motion.circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius - 8}
            fill="none"
            stroke="rgba(201, 169, 110, 0.3)"
            strokeWidth={1}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: 'center' }}
          />
        )}
      </svg>

      {/* Center content slot */}
      <div className="relative z-10 w-[220px] h-[220px] rounded-full overflow-hidden bg-vault-surface flex items-center justify-center">
        {/* Placeholder for video/audio visualization */}
        <div className="text-center">
          {capturing ? (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-vault-gold text-sm font-body">
                {type === 'face' ? 'Scanning...' : 'Recording...'}
              </span>
            </motion.div>
          ) : (
            <span className="text-vault-muted text-sm">
              {type === 'face' ? 'Position face' : 'Ready to record'}
            </span>
          )}
        </div>
      </div>

      {/* Sonar ping when capturing */}
      {capturing && (
        <motion.div
          className="absolute inset-0 rounded-full border border-vault-gold"
          animate={{
            scale: [1, 2.5],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      )}
    </div>
  );
}
