"use client";

import React, { useEffect, useRef } from "react";

interface RealisticHourglassProps {
  progress: number; // 0 to 1
  isRunning: boolean;
  width?: number; // default 130
  height?: number; // default 155
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export const RealisticHourglass: React.FC<RealisticHourglassProps> = ({
  progress,
  isRunning,
  width = 130,
  height = 155,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const splashRef = useRef<SplashParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize falling particles pool
  useEffect(() => {
    const colors = ["#FEF3C7", "#FDE68A", "#F59E0B", "#FCD34D", "#D97706"];
    const particles: Particle[] = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: 65 + (Math.random() - 0.5) * 2.2,
        y: 78 + Math.random() * 50,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 2.3 + Math.random() * 1.8,
        size: 0.8 + Math.random() * 0.9,
        alpha: 0.6 + Math.random() * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI Scaling for ultra-crisp edges
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Clamped progress
    const p = Math.min(1, Math.max(0, progress));

    const drawHourglass = () => {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = 65;
      const topPlateY = 14;
      const bottomPlateY = 135;
      const neckY = 78;
      const neckHalfW = 3.2;

      // ==========================================
      // 1. SOFT AMBIENT DROP SHADOW BENEATH BASE
      // ==========================================
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, bottomPlateY + 11, 36, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.filter = "blur(5px)";
      ctx.fill();
      ctx.restore();

      // ==========================================
      // 2. INNER GLASS PATH DEFINITIONS (Clean, Pillar-Free)
      // ==========================================
      const getTopChamberPath = () => {
        const path = new Path2D();
        path.moveTo(cx - 24, 24);
        path.lineTo(cx + 24, 24);
        path.bezierCurveTo(cx + 29, 36, cx + 30, 55, cx + neckHalfW, neckY);
        path.lineTo(cx - neckHalfW, neckY);
        path.bezierCurveTo(cx - 30, 55, cx - 29, 36, cx - 24, 24);
        path.closePath();
        return path;
      };

      const getBottomChamberPath = () => {
        const path = new Path2D();
        path.moveTo(cx - neckHalfW, neckY);
        path.lineTo(cx + neckHalfW, neckY);
        path.bezierCurveTo(cx + 30, 101, cx + 29, 120, cx + 24, 132);
        path.lineTo(cx - 24, 132);
        path.bezierCurveTo(cx - 29, 120, cx - 30, 101, cx - neckHalfW, neckY);
        path.closePath();
        return path;
      };

      // ==========================================
      // 3. GLASS INTERIOR AMBIENT BLUE/SAPPHIRE CAUSTICS
      // ==========================================
      ctx.save();
      const glassBgGrad = ctx.createRadialGradient(cx, neckY, 4, cx, neckY, 48);
      glassBgGrad.addColorStop(0, "rgba(59, 130, 246, 0.14)");
      glassBgGrad.addColorStop(0.6, "rgba(30, 58, 138, 0.06)");
      glassBgGrad.addColorStop(1, "rgba(15, 23, 42, 0.02)");

      ctx.fillStyle = glassBgGrad;
      ctx.fill(getTopChamberPath());
      ctx.fill(getBottomChamberPath());
      ctx.restore();

      // ==========================================
      // 4. TOP CHAMBER DYNAMIC SAND
      // ==========================================
      const topEmptyPercent = p; // 0 = full, 1 = empty
      const topSandY = 24 + topEmptyPercent * 51;
      const topSandRemaining = 1 - p;

      if (topSandRemaining > 0.005) {
        ctx.save();
        ctx.clip(getTopChamberPath());

        // Rich Golden Sand Body
        const sandGrad = ctx.createLinearGradient(0, topSandY, 0, neckY);
        sandGrad.addColorStop(0, "#FDE68A");
        sandGrad.addColorStop(0.25, "#F59E0B");
        sandGrad.addColorStop(0.7, "#D97706");
        sandGrad.addColorStop(1, "#B45309");

        ctx.fillStyle = sandGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 34, topSandY);

        // Dynamic Funnel Slope towards opening when active
        const funnelDip = isRunning && topEmptyPercent < 0.96 ? Math.min(8, topSandRemaining * 10) : 1.5;
        ctx.quadraticCurveTo(cx, topSandY + funnelDip, cx + 34, topSandY);
        ctx.lineTo(cx + 34, neckY + 2);
        ctx.lineTo(cx - 34, neckY + 2);
        ctx.closePath();
        ctx.fill();

        // Top Sand Surface Rim Shading
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, topSandY, 22 * Math.max(0.2, 1 - topEmptyPercent * 0.7), 2.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 245, 210, 0.4)";
        ctx.fill();

        // Crater shadow in center of top funnel
        ctx.beginPath();
        ctx.ellipse(cx, topSandY + funnelDip * 0.6, 5.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(146, 64, 14, 0.45)";
        ctx.fill();
        ctx.restore();

        ctx.restore();
      }

      // ==========================================
      // 5. BOTTOM CHAMBER DYNAMIC ACCUMULATION MOUND
      // ==========================================
      const bottomFill = p; // 0 = empty, 1 = full
      const maxMoundHeight = 49;
      const moundHeight = bottomFill * maxMoundHeight;
      const moundPeakY = 132 - moundHeight;

      if (bottomFill > 0.005) {
        ctx.save();
        ctx.clip(getBottomChamberPath());

        const bSandGrad = ctx.createLinearGradient(0, moundPeakY, 0, 132);
        bSandGrad.addColorStop(0, "#FEF3C7");
        bSandGrad.addColorStop(0.2, "#FBBF24");
        bSandGrad.addColorStop(0.65, "#D97706");
        bSandGrad.addColorStop(1, "#92400E");

        ctx.fillStyle = bSandGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 34, 134);

        // Realistic conical sand dune shape
        const moundWidth = Math.min(29, 9 + bottomFill * 21);
        ctx.lineTo(cx - moundWidth, 132);
        ctx.quadraticCurveTo(cx - moundWidth * 0.45, moundPeakY + 4, cx, moundPeakY);
        ctx.quadraticCurveTo(cx + moundWidth * 0.45, moundPeakY + 4, cx + moundWidth, 132);
        ctx.lineTo(cx + 34, 134);
        ctx.closePath();
        ctx.fill();

        // Highlight crest on peak
        ctx.beginPath();
        ctx.ellipse(cx, moundPeakY + 1.2, 4.2, 1.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 250, 220, 0.6)";
        ctx.fill();

        ctx.restore();
      }

      // ==========================================
      // 6. REALISTIC FALLING SAND STREAM & PARTICLES
      // ==========================================
      if (isRunning && p < 0.995) {
        ctx.save();
        const streamEnd = Math.max(neckY + 4, moundPeakY);

        // Central Falling Stream Core
        const streamGrad = ctx.createLinearGradient(0, neckY, 0, streamEnd);
        streamGrad.addColorStop(0, "#FEF3C7");
        streamGrad.addColorStop(0.5, "#F59E0B");
        streamGrad.addColorStop(1, "#FDE68A");

        ctx.strokeStyle = streamGrad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, neckY);
        ctx.lineTo(cx, streamEnd);
        ctx.stroke();

        // Outer stream soft glow
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(cx, neckY);
        ctx.lineTo(cx, streamEnd);
        ctx.stroke();

        // Falling Individual Particles
        particlesRef.current.forEach((pt) => {
          pt.y += pt.vy;
          pt.x += pt.vx;

          if (pt.y >= streamEnd) {
            pt.y = neckY + Math.random() * 2;
            pt.x = cx + (Math.random() - 0.5) * 2;
            pt.vy = 2.4 + Math.random() * 2.0;

            // Spawn impact splash particle
            if (splashRef.current.length < 15 && Math.random() > 0.4) {
              splashRef.current.push({
                x: cx + (Math.random() - 0.5) * 2.2,
                y: streamEnd - 0.5,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -Math.random() * 1.3,
                size: 0.7 + Math.random() * 0.7,
                life: 0,
                maxLife: 10 + Math.random() * 8,
                color: Math.random() > 0.5 ? "#FFFBEB" : "#FBBF24",
              });
            }
          }

          ctx.fillStyle = pt.color;
          ctx.globalAlpha = pt.alpha;
          ctx.fillRect(pt.x, pt.y, pt.size, pt.size * 1.3);
        });

        // Impact splash particles
        splashRef.current = splashRef.current.filter((sp) => {
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.15;
          sp.life++;

          const alpha = 1 - sp.life / sp.maxLife;
          if (alpha > 0) {
            ctx.fillStyle = sp.color;
            ctx.globalAlpha = alpha;
            ctx.fillRect(sp.x, sp.y, sp.size, sp.size);
            return true;
          }
          return false;
        });

        ctx.restore();
      }

      // ==========================================
      // 7. ULTRA-REALISTIC CRYSTAL GLASS REFLECTIONS
      // ==========================================
      ctx.save();
      const drawFullGlassOutline = () => {
        ctx.beginPath();
        ctx.moveTo(cx - 24, 24);
        ctx.lineTo(cx + 24, 24);
        ctx.bezierCurveTo(cx + 29, 36, cx + 30, 55, cx + neckHalfW, neckY);
        ctx.bezierCurveTo(cx + 30, 101, cx + 29, 120, cx + 24, 132);
        ctx.lineTo(cx - 24, 132);
        ctx.bezierCurveTo(cx - 29, 120, cx - 30, 101, cx - neckHalfW, neckY);
        ctx.bezierCurveTo(cx - 30, 55, cx - 29, 36, cx - 24, 24);
        ctx.closePath();
      };

      // Glass Edge Refraction / Caustic Border
      drawFullGlassOutline();
      ctx.strokeStyle = "rgba(147, 197, 253, 0.4)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Subtle outer glass shadow
      drawFullGlassOutline();
      ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // --- PRIMARY SPECULAR HIGHLIGHT (Left curved streak) ---
      ctx.beginPath();
      ctx.moveTo(cx - 20, 27);
      ctx.bezierCurveTo(cx - 26, 38, cx - 26, 52, cx - 7, neckY - 8);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.stroke();

      // Lower Left highlight
      ctx.beginPath();
      ctx.moveTo(cx - 7, neckY + 8);
      ctx.bezierCurveTo(cx - 26, 104, cx - 26, 118, cx - 20, 129);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.stroke();

      // Secondary fine highlight on right edge
      ctx.beginPath();
      ctx.moveTo(cx + 20, 28);
      ctx.bezierCurveTo(cx + 26, 40, cx + 24, 52, cx + 8, neckY - 10);
      ctx.strokeStyle = "rgba(96, 165, 250, 0.45)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 8, neckY + 10);
      ctx.bezierCurveTo(cx + 24, 104, cx + 26, 116, cx + 20, 128);
      ctx.strokeStyle = "rgba(96, 165, 250, 0.45)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Neck glass gleam
      ctx.beginPath();
      ctx.arc(cx - 1.5, neckY, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fill();
      ctx.restore();

      // ==========================================
      // 8. PREMIUM OBSIDIAN/NAVY-SLATE END CAPS (Top & Bottom)
      // Matches Focus Forge dark navy/blue glass theme!
      // ==========================================
      const drawPlate = (py: number, isBottom: boolean) => {
        ctx.save();
        const pWidth = 68;
        const pHeight = 9.5;
        const px = cx - pWidth / 2;

        // Luxury Dark Obsidian/Sapphire Slate Gradient
        const plateGrad = ctx.createLinearGradient(px, 0, px + pWidth, 0);
        plateGrad.addColorStop(0, "#0B1322");
        plateGrad.addColorStop(0.2, "#14223A");
        plateGrad.addColorStop(0.5, "#223961");
        plateGrad.addColorStop(0.8, "#14223A");
        plateGrad.addColorStop(1, "#0B1322");

        // Main beveled rounded plate
        ctx.fillStyle = plateGrad;
        ctx.beginPath();
        ctx.roundRect(px, py, pWidth, pHeight, 4.5);
        ctx.fill();

        // Border stroke matching theme
        ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Top highlight reflection line on plate
        const edgeY = isBottom ? py + 1.2 : py + 1.5;
        ctx.strokeStyle = "rgba(147, 197, 253, 0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px + 6, edgeY);
        ctx.lineTo(px + pWidth - 6, edgeY);
        ctx.stroke();

        // Recessed inner ring holding the glass
        const innerW = 48;
        const innerH = 3.5;
        const innerY = isBottom ? py - innerH + 1 : py + pHeight - 1;
        ctx.fillStyle = "#070C16";
        ctx.beginPath();
        ctx.roundRect(cx - innerW / 2, innerY, innerW, innerH, 1.5);
        ctx.fill();

        // Inner holding ring border
        ctx.strokeStyle = "rgba(59, 130, 246, 0.25)";
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.restore();
      };

      // Top Plate
      drawPlate(topPlateY, false);
      // Bottom Plate
      drawPlate(bottomPlateY, true);

      ctx.restore();
    };

    // Animation Loop
    if (isRunning) {
      let isSubscribed = true;
      const loop = () => {
        if (!isSubscribed) return;
        drawHourglass();
        animFrameRef.current = requestAnimationFrame(loop);
      };
      loop();

      return () => {
        isSubscribed = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    } else {
      drawHourglass();
    }
  }, [progress, isRunning, width, height]);

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{
        animation: "hourglass-float 4.2s ease-in-out infinite",
        animationPlayState: isRunning ? "running" : "paused",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width,
          height,
          display: "block",
        }}
      />
      <style jsx>{`
        @keyframes hourglass-float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
};
