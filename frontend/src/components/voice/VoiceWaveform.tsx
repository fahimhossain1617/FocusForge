'use client';

import React, { useEffect, useRef } from 'react';
import { useVoiceAmplitude } from '@/hooks/useVoiceAmplitude';

export interface VoiceWaveformProps {
  /** Whether voice dictation/recognition is active */
  active: boolean;
  /** Optional language indicator for status text */
  isBengali?: boolean;
  /** Custom status label */
  statusLabel?: string;
  /** Optional container class */
  className?: string;
}

export default function VoiceWaveform({
  active,
  className = '',
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { getAmplitude, getFrequencyData } = useVoiceAmplitude(active);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let time = 0;
    let lastStamp = performance.now();

    // Per-bar smoothed height array
    const barHeights: number[] = [];
    // Half-array storing outward propagating wave ripple amplitudes
    const rippleHistory: number[] = [];
    const rawFreqArray = new Uint8Array(128);

    const handleResize = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(Math.floor(rect.width * dpr), 10);
      canvas.height = Math.max(Math.floor(rect.height * dpr), 10);
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    const render = (now: number) => {
      const dt = Math.min((now - lastStamp) / 1000, 0.08);
      lastStamp = now;

      // Real microphone overall amplitude (0.0 to 1.0)
      const amp = getAmplitude();

      // Real audio spectrum bins from Web Audio API AnalyserNode
      const freqData = getFrequencyData(rawFreqArray);

      // Core voice fundamental frequency energy (~120Hz to 600Hz, bins 1 to 4)
      let vocalCoreEnergy = 0;
      if (freqData && freqData.length > 0) {
        const bin1 = (freqData[1] || 0) / 255;
        const bin2 = (freqData[2] || 0) / 255;
        const bin3 = (freqData[3] || 0) / 255;
        vocalCoreEnergy = Math.pow(Math.max(bin1, bin2, bin3), 1.15);
      }

      const isSpeaking = amp > 0.035;

      // Propagation time advance (speeds up dynamically with speech energy)
      time += dt * (2.2 + amp * 2.8);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Dark/light mode detection
      const isDark =
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') !== 'light';

      const barWidth = 2.4;
      const gap = 3.2;
      const step = barWidth + gap;

      const totalBars = Math.max(Math.floor((width - 16) / step), 14);
      const startX = (width - totalBars * step) / 2 + barWidth / 2;
      const centerY = height / 2;
      const centerIdx = (totalBars - 1) / 2;
      const halfCount = Math.ceil(totalBars / 2) + 2;

      // Maintain arrays size
      while (barHeights.length < totalBars) {
        barHeights.push(3.0);
      }
      if (barHeights.length > totalBars) {
        barHeights.length = totalBars;
      }

      while (rippleHistory.length < halfCount) {
        rippleHistory.push(0);
      }
      if (rippleHistory.length > halfCount) {
        rippleHistory.length = halfCount;
      }

      // ── OUTWARD WAVE PROPAGATION ENGINE ──
      // Instant new impulse born at the center (r = 0)
      const inputCenterImpulse = isSpeaking ? (vocalCoreEnergy * 0.65 + amp * 0.35) : 0;
      
      // Interpolate the center ring
      rippleHistory[0] += (inputCenterImpulse - rippleHistory[0]) * Math.min(dt * 24, 1.0);

      // Ripple propagation from center outward: travels all the way to outer edges
      const propagationSpeed = 14.0; // speed of wave traveling outward
      for (let r = halfCount - 1; r >= 1; r--) {
        const sourceVal = rippleHistory[r - 1] * 0.985; // minimal dissipation so wave travels full length
        rippleHistory[r] += (sourceVal - rippleHistory[r]) * Math.min(dt * propagationSpeed, 1.0);
      }

      ctx.fillStyle = isDark
        ? 'rgba(255, 255, 255, 0.94)'
        : 'rgba(30, 41, 59, 0.90)';

      for (let i = 0; i < totalBars; i++) {
        const x = startX + i * step;

        // Normalized distance from center (0.0 = center, 1.0 = outer edges)
        const distFromCenter = Math.abs(i - centerIdx) / Math.max(centerIdx, 1);

        // Smooth gradual decay from big in the center to smaller at the outer edges
        // (Center = 1.0, Outer Edge = ~0.30 so the full wave is visible across all bars)
        const envelope = 1.0 - Math.pow(distFromCenter, 1.1) * 0.70;

        // Distance in terms of ripple rings
        const ringIdx = Math.min(
          Math.floor(distFromCenter * (halfCount - 1)),
          halfCount - 1
        );
        const ringAmp = rippleHistory[ringIdx] || 0;

        let targetHeight = 3.0;

        if (!isSpeaking && ringAmp < 0.02) {
          // ── SILENCE STATE ──
          // Subtle breathing wave radiating outward across full width
          const idleWave = Math.cos(time * 1.8 - distFromCenter * Math.PI * 1.8) * 0.45;
          targetHeight = 3.0 + Math.max(idleWave, 0) * (1.0 - distFromCenter * 0.35);
        } else {
          // ── ACTIVE SPEECH WITH FULL-WIDTH TRAVELING UNDULATION (ঢেউ) ──
          // Wave phase rolling outward from center to left & right simultaneously
          const wavePhase = time * 3.6 - distFromCenter * 6.5;
          const undulation = Math.sin(wavePhase);
          
          // Organic crests and troughs
          const crestTrough = undulation > 0 
            ? Math.pow(undulation, 1.2) 
            : -Math.pow(-undulation, 1.2) * 0.35;

          const maxAvailableHeight = height * 0.82;
          
          // Wave traveling outward across full width, big at center and smoothly smaller towards edges
          const waveExpansion = ringAmp * maxAvailableHeight * envelope * (0.65 + 0.35 * crestTrough);

          targetHeight = 3.0 + waveExpansion;
        }

        // Smooth per-bar interpolation
        const currentH = barHeights[i] || 3.0;
        const smoothSpeed = isSpeaking ? 20 : 10;
        const newH = currentH + (targetHeight - currentH) * Math.min(dt * smoothSpeed, 1.0);
        barHeights[i] = newH;

        let barHeight = Math.max(newH, 2.4);
        barHeight = Math.min(barHeight, height - 2);

        const y = centerY - barHeight / 2;
        const radius = barWidth / 2;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x - radius, y, barWidth, barHeight, radius);
        } else {
          ctx.rect(x - radius, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      ctx.restore();

      if (active) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [active, getAmplitude, getFrequencyData]);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center pointer-events-none select-none overflow-hidden ${className}`}
      style={{ minHeight: '22px', maxHeight: '32px' }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}


