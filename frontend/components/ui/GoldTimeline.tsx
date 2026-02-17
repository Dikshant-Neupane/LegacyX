'use client';

import { motion } from 'framer-motion';

interface GoldTimelineProps {
  /** Array of step labels */
  steps: string[];
  /** Currently active step (0-indexed) */
  currentStep: number;
}

/**
 * Vertical gold timeline for multi-step flows.
 * Gold thread connecting completed steps, with step indicators.
 */
export function GoldTimeline({ steps, currentStep }: GoldTimelineProps) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="flex items-start gap-4">
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              {/* Step indicator */}
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isCompleted
                    ? '#C9A96E'
                    : isActive
                      ? '#C9A96E'
                      : 'transparent',
                  borderColor: isCompleted || isActive
                    ? '#C9A96E'
                    : '#2A2A28',
                }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              >
                {isCompleted ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0A0A08"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span
                    className={`text-xs font-mono ${
                      isActive ? 'text-vault-bg' : 'text-vault-muted'
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
              </motion.div>

              {/* Connecting thread */}
              {!isLast && (
                <div className="relative w-px h-16">
                  {/* Background line */}
                  <div className="absolute inset-0 bg-vault-border" />
                  {/* Gold fill */}
                  <motion.div
                    initial={false}
                    animate={{
                      height: isCompleted ? '100%' : '0%',
                    }}
                    transition={{ duration: 0.4 }}
                    className="absolute top-0 left-0 right-0 bg-vault-gold"
                  />
                </div>
              )}
            </div>

            {/* Step content */}
            <div className="pt-1 pb-8">
              <p
                className={`text-sm font-body transition-colors duration-300 ${
                  isActive
                    ? 'text-vault-gold font-medium'
                    : isCompleted
                      ? 'text-vault-text'
                      : 'text-vault-muted'
                }`}
              >
                {step}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
