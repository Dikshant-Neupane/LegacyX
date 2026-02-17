'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function OrbMesh({ size }: { size: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Generate particle positions for orbiting particles
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.8 + Math.random() * 0.5;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003; // 0.3 degrees per frame
      meshRef.current.rotation.x += 0.001;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y -= 0.002;
      pointsRef.current.rotation.z += 0.001;
    }
  });

  const wireframeRadius = size === 'hero' ? 1.4 : size === 'dashboard' ? 1.2 : 1.0;

  return (
    <group>
      {/* Wireframe sphere — dark gold */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[wireframeRadius, 32, 32]} />
        <meshBasicMaterial
          color="#C9A96E"
          wireframe
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[wireframeRadius * 0.95, 32, 32]} />
        <meshBasicMaterial
          color="#C9A96E"
          transparent
          opacity={0.03}
        />
      </mesh>

      {/* Orbiting particles — encrypted files */}
      <Points ref={pointsRef} positions={positions} stride={3}>
        <PointMaterial
          transparent
          color="#C9A96E"
          size={0.03}
          sizeAttenuation
          depthWrite={false}
          opacity={0.6}
        />
      </Points>
    </group>
  );
}

interface VaultOrbProps {
  size?: 'hero' | 'dashboard' | 'small';
  className?: string;
}

export function VaultOrb({ size = 'hero', className = '' }: VaultOrbProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <OrbMesh size={size} />
      </Canvas>
    </div>
  );
}
