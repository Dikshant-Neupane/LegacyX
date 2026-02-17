'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface CountdownRingProps {
  /** Days remaining until vault triggers */
  daysRemaining: number;
  /** Total check-in interval in days */
  totalDays: number;
  /** Ring size in pixels */
  size?: number;
}

export function CountdownRing({
  daysRemaining,
  totalDays,
  size = 200,
}: CountdownRingProps) {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const percentage = Math.min(daysRemaining / totalDays, 1);
  const isWarning = percentage < 0.3;
  const isCritical = percentage < 0.1;

  const strokeColor = isCritical
    ? '#C0392B'
    : isWarning
      ? '#D4782A'
      : '#C9A96E';

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = (size - 16) / 2;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Background ring
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201, 169, 110, 0.1)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Progress ring
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * percentage;

    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow effect
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [mounted, percentage, strokeColor, size]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="absolute inset-0"
      />
      <div className="text-center z-10">
        <motion.span
          key={daysRemaining}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="block font-display text-4xl"
          style={{ color: strokeColor }}
        >
          {daysRemaining}
        </motion.span>
        <span className="text-vault-muted text-xs font-body uppercase tracking-widest">
          days left
        </span>
      </div>
    </div>
  );
}
