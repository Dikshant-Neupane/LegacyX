'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileParticleDissolveProps {
  /** Whether the dissolve animation is active */
  active: boolean;
  /** File name being encrypted */
  fileName?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Particle dissolve effect — plays when a file is being encrypted.
 * A card "shatters" into golden particles that float upward and vanish.
 */
export function FileParticleDissolve({
  active,
  fileName,
  onComplete,
}: FileParticleDissolveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    decay: number;
  }

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 300 * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    // Generate particles
    const particles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: 50 + Math.random() * 200,
        y: 50 + Math.random() * 100,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 4 - 1,
        size: Math.random() * 3 + 1,
        alpha: 1,
        decay: 0.005 + Math.random() * 0.015,
      });
    }
    particlesRef.current = particles;

    let startTime = Date.now();

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, 300, 200);

      let alive = false;
      for (const p of particlesRef.current) {
        if (p.alpha <= 0) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02; // slight upward drift
        p.alpha -= p.decay;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 169, 110, ${Math.max(0, p.alpha)})`;
        ctx.fill();
      }

      if (alive && Date.now() - startTime < 3000) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    }

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <canvas
            ref={canvasRef}
            style={{ width: 300, height: 200 }}
            className="opacity-90"
          />
          {fileName && (
            <p className="text-vault-muted text-sm font-mono">
              Encrypting {fileName}...
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
