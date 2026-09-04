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
          {/* Main radiant linear/radial gradients matching FocusForge's palette */}
          <linearGradient id="arcStrokeGrad" x1="0%" y1="100%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isLight ? "rgba(37, 99, 235, 0.06)" : "rgba(30, 64, 175, 0.08)"} />
            <stop offset="25%" stopColor={isLight ? "rgba(37, 99, 235, 0.65)" : "rgba(37, 99, 235, 0.5)"} />
            <stop offset="50%" stopColor={isLight ? "rgba(29, 78, 216, 0.95)" : "rgba(147, 197, 253, 0.95)"} />
            <stop offset="75%" stopColor={isLight ? "rgba(37, 99, 235, 0.65)" : "rgba(37, 99, 235, 0.5)"} />
            <stop offset="100%" stopColor={isLight ? "rgba(37, 99, 235, 0.06)" : "rgba(30, 64, 175, 0.08)"} />
          </linearGradient>

          <radialGradient id="arcFillGrad" cx="50%" cy="100%" r="85%">
            <stop offset="0%" stopColor={isLight ? "rgba(59, 130, 246, 0.26)" : "rgba(37, 99, 235, 0.42)"} />
            <stop offset="45%" stopColor={isLight ? "rgba(37, 99, 235, 0.12)" : "rgba(30, 64, 175, 0.22)"} />
            <stop offset="75%" stopColor={isLight ? "rgba(241, 245, 249, 0.04)" : "rgba(15, 23, 42, 0.08)"} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <radialGradient id="centerBurstGrad" cx="50%" cy="95%" r="45%">
            <stop offset="0%" stopColor={isLight ? "rgba(37, 99, 235, 0.42)" : "rgba(96, 165, 250, 0.65)"} />
            <stop offset="40%" stopColor={isLight ? "rgba(59, 130, 246, 0.16)" : "rgba(37, 99, 235, 0.3)"} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <filter id="arcGlowFilter" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient fill beneath the curve */}
        <path
          d="M -100 380 Q 720 120 1540 380 L 1540 400 L -100 400 Z"
          fill="url(#arcFillGrad)"
        />

        {/* Center intense energy burst */}
        <path
          d="M 200 380 Q 720 160 1240 380 L 1240 400 L 200 400 Z"
          fill="url(#centerBurstGrad)"
        />

        {/* Soft glowing base curve */}
        <path
          d="M -60 380 Q 720 125 1500 380"
          stroke="url(#arcStrokeGrad)"
          strokeWidth="10"
          filter="url(#arcGlowFilter)"
          opacity="0.8"
        />

        {/* Sharp, luminous crest horizon line */}
        <path
          ref={crestLayerRef}
          d="M -40 380 Q 720 126 1480 380"
          stroke="url(#arcStrokeGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
