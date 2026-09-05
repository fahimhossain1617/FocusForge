"use client";

import React, { useEffect, useRef } from "react";
import styles from "./voice-assistant.module.css";

interface VoiceBottomArcProps {
  amplitudeRef: React.RefObject<number>;
  isListening?: boolean;
  isLight?: boolean;
  className?: string;
}

export const VoiceBottomArc: React.FC<VoiceBottomArcProps> = ({
  amplitudeRef,
  isListening = true,
  isLight = false,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glowLayerRef = useRef<HTMLDivElement | null>(null);
  const crestLayerRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    let animId: number;
    let time = 0;
    let smoothedAmp = 0;

    const tick = () => {
      time += 0.02;
      const targetAmp = amplitudeRef.current || 0;
      smoothedAmp += (targetAmp - smoothedAmp) * 0.12;

      // Subtle breathing + audio response
      const breathe = Math.sin(time * 1.4) * 0.05;
      const totalIntensity = 0.75 + breathe + smoothedAmp * 0.45;
      const scaleY = 1.0 + smoothedAmp * 0.15 + Math.sin(time * 0.8) * 0.03;

      if (glowLayerRef.current) {
        glowLayerRef.current.style.opacity = Math.min(1.0, totalIntensity).toString();
        glowLayerRef.current.style.transform = `scaleY(${scaleY})`;
      }

      if (crestLayerRef.current) {
        crestLayerRef.current.style.opacity = Math.min(1.0, 0.65 + smoothedAmp * 0.45).toString();
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [amplitudeRef]);

  return (
    <div className={`${styles.bottomArcContainer} ${className}`} ref={containerRef}>
      {/* 1. Deep atmospheric diffused glow reaching toward the orb */}
      <div className={styles.bottomUpwardGlow} ref={glowLayerRef} />

      {/* 2. Precision curved SVG Horizon with gradient strokes & blurs */}
      <svg
        className={styles.bottomArcSvg}
        viewBox="0 0 1440 380"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Radiant linear/radial gradients for soft atmospheric blending */}
          <linearGradient id="arcStrokeGrad" x1="0%" y1="100%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isLight ? "rgba(37, 99, 235, 0)" : "rgba(30, 64, 175, 0)"} />
            <stop offset="18%" stopColor={isLight ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.28)"} />
            <stop offset="50%" stopColor={isLight ? "rgba(29, 78, 216, 0.85)" : "rgba(147, 197, 253, 0.82)"} />
            <stop offset="82%" stopColor={isLight ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.28)"} />
            <stop offset="100%" stopColor={isLight ? "rgba(37, 99, 235, 0)" : "rgba(30, 64, 175, 0)"} />
          </linearGradient>

          <radialGradient id="arcFillGrad" cx="50%" cy="100%" r="85%">
            <stop offset="0%" stopColor={isLight ? "rgba(59, 130, 246, 0.18)" : "rgba(37, 99, 235, 0.25)"} />
            <stop offset="45%" stopColor={isLight ? "rgba(37, 99, 235, 0.08)" : "rgba(30, 64, 175, 0.14)"} />
            <stop offset="75%" stopColor={isLight ? "rgba(241, 245, 249, 0.02)" : "rgba(15, 23, 42, 0.04)"} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <radialGradient id="centerBurstGrad" cx="50%" cy="95%" r="45%">
            <stop offset="0%" stopColor={isLight ? "rgba(37, 99, 235, 0.28)" : "rgba(96, 165, 250, 0.42)"} />
            <stop offset="45%" stopColor={isLight ? "rgba(59, 130, 246, 0.10)" : "rgba(37, 99, 235, 0.18)"} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Deep ambient glow filter */}
          <filter id="arcGlowFilter" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle soft-focus crest filter for smooth atmospheric blending */}
          <filter id="crestSoftFilter" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" />
          </filter>
        </defs>

        {/* Ambient fill beneath the curve */}
        <path
          d="M -100 380 Q 720 120 1540 380 L 1540 400 L -100 400 Z"
          fill="url(#arcFillGrad)"
        />

        {/* Center gentle energy burst */}
        <path
          d="M 200 380 Q 720 160 1240 380 L 1240 400 L 200 400 Z"
          fill="url(#centerBurstGrad)"
        />

        {/* Soft diffused base glow curve */}
        <path
          d="M -60 380 Q 720 125 1500 380"
          stroke="url(#arcStrokeGrad)"
          strokeWidth="8"
          filter="url(#arcGlowFilter)"
          opacity="0.65"
        />

        {/* Subtle, softly blurred crest horizon line */}
        <path
          ref={crestLayerRef}
          d="M -40 380 Q 720 126 1480 380"
          stroke="url(#arcStrokeGrad)"
          strokeWidth="1.8"
          filter="url(#crestSoftFilter)"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
