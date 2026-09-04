"use client";

import React, { useEffect, useRef } from "react";

interface VoiceOrbCanvasProps {
  amplitudeRef: React.RefObject<number>;
  isListening?: boolean;
  isSpeaking?: boolean;
  isThinking?: boolean;
  isLight?: boolean;
  className?: string;
}

interface SpherePoint {
  theta: number; // latitude angle [-pi/2 .. pi/2]
  phi: number;   // longitude angle [0 .. 2*pi]
  ringIdx: number;
  ptIdx: number;
}

export const VoiceOrbCanvas: React.FC<VoiceOrbCanvasProps> = ({
  amplitudeRef,
  isListening = true,
  isSpeaking = false,
  isThinking = false,
  isLight,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1));
    let height = (canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      height = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    };

    window.addEventListener("resize", handleResize);

    // Generate ultra high-density sphere lattice (44 rings x 72 points = 3168 points)
    const latRings = 44;
    const ptsPerRing = 72;
    const spherePoints: SpherePoint[] = [];

    for (let i = 0; i < latRings; i++) {
      // theta from -pi/2 to pi/2 (avoid direct pole singularity)
      const u = (i + 0.5) / latRings;
      const theta = (u - 0.5) * Math.PI * 0.94;

      for (let j = 0; j < ptsPerRing; j++) {
        const v = j / ptsPerRing;
        const phi = v * Math.PI * 2;
        spherePoints.push({
          theta,
          phi,
          ringIdx: i,
          ptIdx: j,
        });
      }
    }

    let time = 0;
    let angleY = 0;
    let angleX = 0.22;
    let smoothedAmp = 0;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = () => {
      // Audio amplitude tracking with smooth damping
      const targetAmp = amplitudeRef.current || 0;
      smoothedAmp += (targetAmp - smoothedAmp) * 0.12;

      const lightMode = isLight !== undefined ? isLight : (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light");
      const dpr = window.devicePixelRatio || 1;
      const centerX = width / 2;
      const centerY = height / 2;

      // Base radius responsive to canvas dimension - perfectly refined and balanced size
      const minDim = Math.min(width, height) / dpr;
      const baseRadius = Math.min(minDim * 0.30, 155) * dpr;

      // Organic expansion when user/AI is vocal
      const vocalExpansion = 1.0 + smoothedAmp * 0.14 + Math.sin(time * 1.8) * 0.015;
      const radius = baseRadius * vocalExpansion;

      ctx.clearRect(0, 0, width, height);

      // Rotation speeds
      const rotSpeed = prefersReducedMotion ? 0.002 : 0.006 + smoothedAmp * 0.012;
      angleY += rotSpeed;
      angleX = 0.22 + Math.sin(time * 0.5) * 0.05;
      time += 0.016;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const fov = radius * 3.6;
      const cameraDistance = radius * 4.0;

      // 1. Atmospheric halo around orb - strictly contained within canvas to blend completely with background
      const outerGlowRadius = radius * (1.25 + smoothedAmp * 0.15);
      const outerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.35,
        centerX,
        centerY,
        outerGlowRadius
      );
      if (lightMode) {
        outerGlow.addColorStop(0, `rgba(59, 130, 246, ${0.12 + smoothedAmp * 0.12})`);
        outerGlow.addColorStop(0.5, `rgba(37, 99, 235, ${0.05 + smoothedAmp * 0.05})`);
        outerGlow.addColorStop(0.85, `rgba(14, 165, 233, ${0.01 + smoothedAmp * 0.02})`);
        outerGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      } else {
        outerGlow.addColorStop(0, `rgba(37, 99, 235, ${0.18 + smoothedAmp * 0.15})`);
        outerGlow.addColorStop(0.5, `rgba(30, 64, 175, ${0.08 + smoothedAmp * 0.08})`);
        outerGlow.addColorStop(0.85, `rgba(14, 165, 233, ${0.015 + smoothedAmp * 0.03})`);
        outerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Project all 3D points with organic wave distortion & twisting
      interface Projected {
        px: number;
        py: number;
        pz: number;
        depthAlpha: number;
        intensity: number;
        ringIdx: number;
        ptIdx: number;
      }

      const projectedList: Projected[] = [];

      for (let k = 0; k < spherePoints.length; k++) {
        const pt = spherePoints[k];

        // Complex quantum harmonic wave distortion
        // Gives that distinctive flowing swirl seen on top & sides of the reference image
        const wave1 = Math.sin(pt.phi * 2.0 + pt.theta * 3.0 + time * 2.2);
        const wave2 = Math.cos(pt.phi * 3.0 - time * 1.6);
        const wave3 = Math.sin(pt.theta * 4.0 + time * 2.8);

        const distortionAmp = (0.07 + smoothedAmp * 0.14) * (prefersReducedMotion ? 0.2 : 1.0);
        const totalDistortion = (wave1 * 0.55 + wave2 * 0.3 + wave3 * 0.15) * distortionAmp;

        // Swirl twist around latitude
        const swirlAngle = pt.phi + Math.cos(pt.theta) * 0.35;

        const curR = radius * (1.0 + totalDistortion);
        const cosTheta = Math.cos(pt.theta);
        const sinTheta = Math.sin(pt.theta);

        const x0 = curR * cosTheta * Math.sin(swirlAngle);
        const y0 = curR * sinTheta;
        const z0 = curR * cosTheta * Math.cos(swirlAngle);

        // Y rotation
        const x1 = x0 * cosY + z0 * sinY;
        const z1 = -x0 * sinY + z0 * cosY;

        // X rotation
        const y2 = y0 * cosX - z1 * sinX;
        const z2 = y0 * sinX + z1 * cosX;

        // Perspective
        const zDist = z2 + cameraDistance;
        const scale = fov / zDist;
        const px = centerX + x1 * scale;
        const py = centerY + y2 * scale;

        // Depth Alpha & Highlight Intensity
        const normalizedZ = (z2 + radius) / (radius * 2);
        const depthAlpha = Math.max(0.04, Math.min(1.0, Math.pow(normalizedZ, 1.7)));

        // Crest intensity: points near crests of the wave glow brighter
        const crestFactor = Math.max(0, totalDistortion / distortionAmp);
        const intensity = depthAlpha * (0.6 + crestFactor * 0.4);

        projectedList.push({
          px,
          py,
          pz: z2,
          depthAlpha,
          intensity,
          ringIdx: pt.ringIdx,
          ptIdx: pt.ptIdx,
        });
      }

      // 2. Draw Latitude Contour Ribbons (undulating horizontal wave lines)
      ctx.lineWidth = Math.max(0.8 * dpr, 0.8);

      for (let i = 0; i < latRings; i++) {
        ctx.beginPath();
        const startIdx = i * ptsPerRing;
        const p0 = projectedList[startIdx];
        if (!p0) continue;

        ctx.moveTo(p0.px, p0.py);

        let avgAlpha = p0.depthAlpha;
        for (let j = 1; j < ptsPerRing; j++) {
          const p = projectedList[startIdx + j];
          ctx.lineTo(p.px, p.py);
          avgAlpha += p.depthAlpha;
        }
        ctx.closePath();

        avgAlpha /= ptsPerRing;
        if (avgAlpha > 0.1) {
          const lineAlpha = (0.04 + avgAlpha * 0.38 + smoothedAmp * 0.16);
          // Brilliant cyan/blue contours
          ctx.strokeStyle = lightMode
            ? `rgba(2, 132, 199, ${Math.min(lineAlpha * 1.1, 0.75)})`
            : `rgba(56, 189, 248, ${Math.min(lineAlpha, 0.75)})`;
          ctx.stroke();
        }
      }

      // 3. Draw Longitude Wave Strands (flowing vertical filaments)
      for (let j = 0; j < ptsPerRing; j += 2) {
        ctx.beginPath();
        let started = false;
        let avgAlpha = 0;
        let count = 0;

        for (let i = 0; i < latRings; i++) {
          const idx = i * ptsPerRing + j;
          const p = projectedList[idx];
          if (!p) continue;
          avgAlpha += p.depthAlpha;
          count++;

          if (!started) {
            ctx.moveTo(p.px, p.py);
            started = true;
          } else {
            ctx.lineTo(p.px, p.py);
          }
        }

        if (count > 0) {
          avgAlpha /= count;
          if (avgAlpha > 0.12) {
            const lineAlpha = (0.03 + avgAlpha * 0.28 + smoothedAmp * 0.12);
            ctx.strokeStyle = lightMode
              ? `rgba(37, 99, 235, ${Math.min(lineAlpha * 1.15, 0.65)})`
              : `rgba(96, 165, 250, ${Math.min(lineAlpha, 0.6)})`;
            ctx.stroke();
          }
        }
      }

      // 4. Draw Luminous Quantum Particles at mesh intersections
      for (let k = 0; k < projectedList.length; k++) {
        const p = projectedList[k];

        // Skip dim back points to optimize render performance
        if (p.depthAlpha < 0.16) continue;

        const ptRadius = (0.75 + p.intensity * 1.6 + smoothedAmp * 0.9) * dpr;
        const alpha = lightMode
          ? Math.min(0.98, p.intensity * (0.65 + smoothedAmp * 0.35))
          : Math.min(0.98, p.intensity * (0.55 + smoothedAmp * 0.45));

        // Center front points are electric white/cyan, edges are deep sapphire
        const isBrightCore = p.intensity > 0.65;
        let r: number, g: number, b: number;
        if (lightMode) {
          r = isBrightCore ? 29 : 37;
          g = isBrightCore ? 78 : 99;
          b = isBrightCore ? 216 : 235;
        } else {
          r = isBrightCore ? 210 : 59;
          g = isBrightCore ? 235 : 130;
          b = 255;
        }

        ctx.beginPath();
        ctx.arc(p.px, p.py, ptRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();
      }

      // 5. Outer Refractive Glass Spherical Rim
      const rimGrad = ctx.createRadialGradient(
        centerX - radius * 0.1,
        centerY - radius * 0.1,
        radius * 0.88,
        centerX,
        centerY,
        radius * 1.05
      );
      if (lightMode) {
        rimGrad.addColorStop(0, "rgba(59, 130, 246, 0)");
        rimGrad.addColorStop(0.75, `rgba(37, 99, 235, ${0.18 + smoothedAmp * 0.16})`);
        rimGrad.addColorStop(0.96, `rgba(29, 78, 216, ${0.32 + smoothedAmp * 0.25})`);
        rimGrad.addColorStop(1, "rgba(241, 245, 249, 0)");
      } else {
        rimGrad.addColorStop(0, "rgba(30, 64, 175, 0)");
        rimGrad.addColorStop(0.75, `rgba(56, 189, 248, ${0.16 + smoothedAmp * 0.16})`);
        rimGrad.addColorStop(0.96, `rgba(147, 197, 253, ${0.32 + smoothedAmp * 0.32})`);
        rimGrad.addColorStop(1, "rgba(2, 6, 23, 0)");
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.03, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // 6. Central AI Core - Radiant Halo & Microphone (proportional to new refined size)
      const coreSize = Math.max(13 * dpr, radius * 0.125);
      const corePulse = 1.0 + smoothedAmp * 0.38 + Math.sin(time * 3.2) * 0.06;

      // Multistage radial bloom for AI core
      const coreHalo = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        coreSize * 3.0 * corePulse
      );
      if (lightMode) {
        coreHalo.addColorStop(0, `rgba(255, 255, 255, 1)`);
        coreHalo.addColorStop(0.28, `rgba(59, 130, 246, ${0.9 + smoothedAmp * 0.1})`);
        coreHalo.addColorStop(0.6, `rgba(37, 99, 235, ${0.48 + smoothedAmp * 0.25})`);
        coreHalo.addColorStop(1, "rgba(29, 78, 216, 0)");
      } else {
        coreHalo.addColorStop(0, `rgba(255, 255, 255, ${0.95 + smoothedAmp * 0.05})`);
        coreHalo.addColorStop(0.25, `rgba(147, 197, 253, ${0.8 + smoothedAmp * 0.2})`);
        coreHalo.addColorStop(0.55, `rgba(59, 130, 246, ${0.38 + smoothedAmp * 0.3})`);
        coreHalo.addColorStop(1, "rgba(30, 58, 138, 0)");
      }

      ctx.fillStyle = coreHalo;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreSize * 3.0 * corePulse, 0, Math.PI * 2);
      ctx.fill();

      // Crisp glowing vector microphone inside AI core
      const micIconSize = Math.max(10 * dpr, coreSize * 0.85);
      drawMicrophoneVector(ctx, centerX, centerY, micIconSize);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [amplitudeRef, isListening, isSpeaking, isThinking, isLight]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * Draws a sharp, clean vector microphone icon at the center of the AI sphere
 */
function drawMicrophoneVector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
) {
  ctx.save();
  ctx.translate(cx, cy);

  const w = size * 0.38;
  const h = size * 0.72;
  const r = w / 2;

  // Crisp white fill
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.6, size * 0.11);
  ctx.lineCap = "round";

  // Mic capsule body
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.fill();

  // Mic cradle arc
  ctx.beginPath();
  const arcRadius = w * 0.95;
  ctx.arc(0, -h * 0.05, arcRadius, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.stroke();

  // Mic vertical stem
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.05 + arcRadius);
  ctx.lineTo(0, -h * 0.05 + arcRadius + size * 0.28);
  ctx.stroke();

  // Mic horizontal foot
  ctx.beginPath();
  const footW = size * 0.36;
  ctx.moveTo(-footW / 2, -h * 0.05 + arcRadius + size * 0.28);
  ctx.lineTo(footW / 2, -h * 0.05 + arcRadius + size * 0.28);
  ctx.stroke();

  ctx.restore();
}
