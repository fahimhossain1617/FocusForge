'use client';

import React, { useEffect, useRef } from 'react';
import { useVoiceAmplitude } from '@/hooks/useVoiceAmplitude';
import styles from './VoiceReactiveGlow.module.css';

export interface VoiceReactiveGlowProps {
  /** Whether voice dictation/recognition mode is active */
  active: boolean;
  /** Optional Tailwind rounded utility or custom class (e.g., 'rounded-2xl', 'rounded-full') */
  rounded?: string;
  /** Optional additional CSS class */
  className?: string;
}

export default function VoiceReactiveGlow({
  active,
  rounded = '',
  className = '',
}: VoiceReactiveGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerBaseRef = useRef<HTMLDivElement>(null);
  const layerSecRef = useRef<HTMLDivElement>(null);
  const layerRimRef = useRef<HTMLDivElement>(null);

  const { getAmplitude } = useVoiceAmplitude(active);

  useEffect(() => {
    let animId: number | null = null;
    let time = 0;
    let lastStamp = performance.now();

    const isReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tick = (now: number) => {
      const dt = Math.min((now - lastStamp) / 1000, 0.1);
      lastStamp = now;

      // Real microphone amplitude: smoothed 0.0 to 1.0
      const amp = getAmplitude();

      // Voice amplitude gently accelerates the organic time integration (speed multiplier: 1.0 to 1.8)
      const speedMultiplier = 1.0 + amp * 0.8;
      time += dt * speedMultiplier;

      // Non-repeating multi-frequency continuous waveforms for organic, cloud-like movement
      if (!isReducedMotion) {
        // Layer 1: Slow organic drift left -> right
        const x1 = Math.sin(time * 0.42) * 7 + Math.cos(time * 0.19) * 3.5;
        const y1 = Math.cos(time * 0.34) * 3 + Math.sin(time * 0.15) * 1.5;
        const scale1 = 1.0 + amp * 0.02; // ultra-subtle scale bloom
        if (layerBaseRef.current) {
          layerBaseRef.current.style.transform = `translate3d(${x1.toFixed(2)}px, ${y1.toFixed(2)}px, 0) scale(${scale1.toFixed(4)})`;
        }

        // Layer 2: Slow organic drift right -> left
        const x2 = -Math.sin(time * 0.49) * 8 + Math.cos(time * 0.27) * 3;
        const y2 = -Math.cos(time * 0.38) * 3.5 + Math.sin(time * 0.21) * 1.5;
        if (layerSecRef.current) {
          layerSecRef.current.style.transform = `translate3d(${x2.toFixed(2)}px, ${y2.toFixed(2)}px, 0)`;
        }

        // Layer 3: Subtle vertical/diagonal float
        const x3 = Math.cos(time * 0.58) * 3;
        const y3 = Math.sin(time * 0.46) * 2.5;
        if (layerRimRef.current) {
          layerRimRef.current.style.transform = `translate3d(${x3.toFixed(2)}px, ${y3.toFixed(2)}px, 0)`;
        }
      }

      // Voice-to-Opacity Mapping (soft capped atmospheric illumination)
      // Silence: subtle blurry presence (0.20 to 0.25)
      // Normal speech: soft visible radiance (0.35 to 0.55)
      // Loud speech: energized capped glow (up to 0.65 max)
      const baseOpacity = 0.22 + amp * 0.35;
      const secOpacity = 0.18 + amp * 0.30;
      const rimOpacity = 0.20 + amp * 0.32;

      if (layerBaseRef.current) {
        layerBaseRef.current.style.opacity = Math.min(baseOpacity, 0.68).toFixed(3);
      }
      if (layerSecRef.current) {
        layerSecRef.current.style.opacity = Math.min(secOpacity, 0.62).toFixed(3);
      }
      if (layerRimRef.current) {
        layerRimRef.current.style.opacity = Math.min(rimOpacity, 0.65).toFixed(3);
      }


      if (active) {
        animId = requestAnimationFrame(tick);
      }
    };

    if (active) {
      animId = requestAnimationFrame(tick);
    } else {
      // Reset transforms when deactivated
      if (layerBaseRef.current) {
        layerBaseRef.current.style.transform = 'translate3d(0, 0, 0)';
        layerBaseRef.current.style.opacity = '0';
      }
      if (layerSecRef.current) {
        layerSecRef.current.style.transform = 'translate3d(0, 0, 0)';
        layerSecRef.current.style.opacity = '0';
      }
      if (layerRimRef.current) {
        layerRimRef.current.style.transform = 'translate3d(0, 0, 0)';
        layerRimRef.current.style.opacity = '0';
      }
    }

    return () => {
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [active, getAmplitude]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`${styles.ambientGlowContainer} ${active ? styles.ambientGlowActive : ''} ${rounded} ${className}`}
    >
      {/* Layer 1: Atmospheric Base Glow (Broad soft diffusion) */}
      <div ref={layerBaseRef} className={`${styles.glowLayerBase} ${rounded}`} />

      {/* Layer 2: Secondary Organic Cloud Layer */}
      <div ref={layerSecRef} className={`${styles.glowLayerSecondary} ${rounded}`} />

      {/* Layer 3: Perimeter Rim Radiance */}
      <div ref={layerRimRef} className={`${styles.glowLayerRim} ${rounded}`} />
    </div>
  );
}
