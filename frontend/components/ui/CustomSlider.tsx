'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface CustomSliderProps {
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Current value */
  value: number;
  /** Step size */
  step?: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Label displayed above */
  label?: string;
  /** Unit suffix (e.g., "days") */
  unit?: string;
}

/**
 * Custom gold-themed range slider.
 * Used for check-in interval selection.
 */
export function CustomSlider({
  min,
  max,
  value,
  step = 1,
  onChange,
  label,
  unit = '',
}: CustomSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const newValue = Math.round((min + x * (max - min)) / step) * step;
      onChange(Math.min(max, Math.max(min, newValue)));
    },
    [min, max, step, onChange]
  );

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-vault-muted">{label}</span>
          <span className="font-mono text-sm text-vault-gold">
            {value} {unit}
          </span>
        </div>
      )}

      <div
        ref={trackRef}
        className="relative h-8 flex items-center cursor-pointer group"
        onClick={handleTrackClick}
        data-interactive
      >
        {/* Track background */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          <div className="w-full h-1 bg-vault-border rounded-full">
            {/* Filled portion */}
            <div
              className="h-full bg-vault-gold rounded-full transition-all duration-100"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Thumb */}
        <motion.div
          className="absolute w-5 h-5 rounded-full bg-vault-gold border-2 border-vault-bg shadow-gold-glow"
          style={{ left: `calc(${percentage}% - 10px)` }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.95 }}
        />

        {/* Hidden native input for accessibility */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label={label}
        />
      </div>

      {/* Tick labels */}
      <div className="flex justify-between mt-1 px-1">
        <span className="text-[10px] text-vault-muted">
          {min} {unit}
        </span>
        <span className="text-[10px] text-vault-muted">
          {max} {unit}
        </span>
      </div>
    </div>
  );
}
