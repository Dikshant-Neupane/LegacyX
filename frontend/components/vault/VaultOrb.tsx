'use client';

import { useEffect, useRef } from 'react';

/**
 * VaultOrb — Animated golden globe with latitude/longitude grid lines,
 * glow effects, and orbiting particles. Pure CSS + Canvas — no Three.js.
 */

interface VaultOrbProps {
  size?: 'hero' | 'dashboard' | 'small';
  className?: string;
}

const SIZE_MAP = {
  hero: 220,
  dashboard: 140,
  small: 80,
} as const;

export function VaultOrb({ size = 'hero', className = '' }: VaultOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const px = SIZE_MAP[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    ctx.scale(dpr, dpr);

    const cx = px / 2;
    const cy = px / 2;
    const r = px * 0.38;

    // Particles orbiting the globe
    const particles = Array.from({ length: size === 'small' ? 4 : 8 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / (size === 'small' ? 4 : 8),
      speed: 0.003 + Math.random() * 0.004,
      dist: r + 8 + Math.random() * (size === 'small' ? 6 : 14),
      size: 1 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;

    function draw() {
      t += 0.012;
      ctx!.clearRect(0, 0, px, px);

      // Outer glow
      const glowGrad = ctx!.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.6);
      glowGrad.addColorStop(0, 'rgba(201, 169, 110, 0.0)');
      glowGrad.addColorStop(0.6, 'rgba(201, 169, 110, 0.04)');
      glowGrad.addColorStop(1, 'rgba(201, 169, 110, 0)');
      ctx!.fillStyle = glowGrad;
      ctx!.fillRect(0, 0, px, px);

      // Globe body gradient
      const bodyGrad = ctx!.createRadialGradient(
        cx - r * 0.3,
        cy - r * 0.3,
        0,
        cx,
        cy,
        r
      );
      bodyGrad.addColorStop(0, 'rgba(218, 195, 140, 0.18)');
      bodyGrad.addColorStop(0.5, 'rgba(201, 169, 110, 0.10)');
      bodyGrad.addColorStop(0.85, 'rgba(160, 130, 80, 0.06)');
      bodyGrad.addColorStop(1, 'rgba(120, 100, 60, 0.02)');

      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fillStyle = bodyGrad;
      ctx!.fill();

      // Border ring
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.strokeStyle = 'rgba(201, 169, 110, 0.25)';
      ctx!.lineWidth = 1.2;
      ctx!.stroke();

      // Longitude lines (rotating)
      const longCount = size === 'small' ? 4 : 7;
      for (let i = 0; i < longCount; i++) {
        const angle = (Math.PI / longCount) * i + t * 0.4;
        drawLongitude(ctx!, cx, cy, r, angle);
      }

      // Latitude lines
      const latCount = size === 'small' ? 3 : 5;
      for (let i = 1; i < latCount; i++) {
        const fraction = i / latCount;
        const y = cy - r + 2 * r * fraction;
        const latR = Math.sqrt(r * r - (y - cy) * (y - cy));
        ctx!.beginPath();
        ctx!.ellipse(cx, y, latR, latR * 0.15, 0, 0, Math.PI * 2);
        ctx!.strokeStyle = 'rgba(201, 169, 110, 0.12)';
        ctx!.lineWidth = 0.7;
        ctx!.stroke();
      }

      // Specular highlight
      const specGrad = ctx!.createRadialGradient(
        cx - r * 0.25,
        cy - r * 0.35,
        0,
        cx - r * 0.25,
        cy - r * 0.35,
        r * 0.5
      );
      specGrad.addColorStop(0, 'rgba(255, 245, 220, 0.12)');
      specGrad.addColorStop(1, 'rgba(255, 245, 220, 0)');
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fillStyle = specGrad;
      ctx!.fill();

      // Orbiting particles
      for (const p of particles) {
        p.angle += p.speed;
        const pFloat = Math.sin(t * 2 + p.phase) * 3;
        const pX = cx + Math.cos(p.angle) * p.dist;
        const pY = cy + Math.sin(p.angle) * (p.dist * 0.35) + pFloat;
        const opacity = 0.3 + 0.4 * Math.sin(t * 3 + p.phase);

        ctx!.beginPath();
        ctx!.arc(pX, pY, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(201, 169, 110, ${opacity})`;
        ctx!.fill();
      }

      // Inner pulsing glow
      const pulseR = r * (0.6 + 0.08 * Math.sin(t * 1.5));
      const innerGlow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
      innerGlow.addColorStop(0, `rgba(201, 169, 110, ${0.06 + 0.03 * Math.sin(t * 1.5)})`);
      innerGlow.addColorStop(1, 'rgba(201, 169, 110, 0)');
      ctx!.beginPath();
      ctx!.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx!.fillStyle = innerGlow;
      ctx!.fill();

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [px, size]);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
    >
      {/* Ambient halo */}
      <div
        className="absolute inset-0 rounded-full animate-pulse-gold"
        style={{
          background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: px, height: px }}
        className="relative z-10"
      />
    </div>
  );
}

/** Draw a single longitude ellipse at the given rotation angle */
function drawLongitude(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  angle: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();

  // Projected ellipse width depends on viewing angle
  const w = r * Math.abs(Math.cos(angle));
  ctx.ellipse(0, 0, w, r, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(201, 169, 110, 0.12)';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.restore();
}
