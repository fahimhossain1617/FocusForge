"use client";

import React, { useEffect, useRef } from "react";
import styles from "./BorderBeam.module.css";

export interface BorderBeamProps {
  /**
   * Stroke width in pixels. Default is 3.2px (prominent and refined).
   */
  borderWidth?: number;
  /**
   * Corner radius in pixels. Default is 20px.
   */
  borderRadius?: number;
  /**
   * Duration for one full perimeter loop in seconds. Default is 8s.
   */
  duration?: number;
  /**
   * Length of the beam in pixels. Default is 220px.
   */
  beamLength?: number;
  /**
   * Custom CSS class.
   */
  className?: string;
}

/**
 * Computes exact (x, y) coordinate on a rounded rectangle perimeter at distance s.
 * Guarantees strictly constant linear speed across all straight edges and 4 rounded corners.
 */
function getPointOnRoundedRect(s: number, w: number, h: number, r: number): [number, number] {
  const wStraight = Math.max(0, w - 2 * r);
  const hStraight = Math.max(0, h - 2 * r);
  const arc = 0.5 * Math.PI * r;
  const L = 2 * wStraight + 2 * hStraight + 4 * arc;

  if (L <= 0) return [0, 0];
  let dist = ((s % L) + L) % L;

  // 1. Top straight: left to right
  if (dist < wStraight) {
    return [r + dist, 0];
  }
  dist -= wStraight;

  // 2. Top-right corner arc
  if (dist < arc) {
    const angle = -Math.PI / 2 + (dist / arc) * (Math.PI / 2);
    return [w - r + r * Math.cos(angle), r + r * Math.sin(angle)];
  }
  dist -= arc;

  // 3. Right straight: top to bottom
  if (dist < hStraight) {
    return [w, r + dist];
  }
  dist -= hStraight;

  // 4. Bottom-right corner arc
  if (dist < arc) {
    const angle = (dist / arc) * (Math.PI / 2);
    return [w - r + r * Math.cos(angle), h - r + r * Math.sin(angle)];
  }
  dist -= arc;

  // 5. Bottom straight: right to left
  if (dist < wStraight) {
    return [w - r - dist, h];
  }
  dist -= wStraight;

  // 6. Bottom-left corner arc
  if (dist < arc) {
    const angle = Math.PI / 2 + (dist / arc) * (Math.PI / 2);
    return [r + r * Math.cos(angle), h - r + r * Math.sin(angle)];
  }
  dist -= arc;

  // 7. Left straight: bottom to top
  if (dist < hStraight) {
    return [0, h - r - dist];
  }
  dist -= hStraight;

  // 8. Top-left corner arc
  const angle = Math.PI + (dist / arc) * (Math.PI / 2);
  return [r + r * Math.cos(angle), r + r * Math.sin(angle)];
}

export default function BorderBeam({
  borderWidth = 3.2,
  borderRadius = 20,
  duration = 13,
  beamLength = 360,
  className = "",
}: BorderBeamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animFrameId: number;
    let width = 0;
    let height = 0;
    let perimeter = 0;
    let progress = 0;
    let lastTime: number | null = null;
    let isLight = document.documentElement.classList.contains("light") || document.documentElement.dataset.theme === "light";

    // Watch for theme changes
    const themeObserver = new MutationObserver(() => {
      isLight = document.documentElement.classList.contains("light") || document.documentElement.dataset.theme === "light";
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    // Handle container resize & Retina DPI
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;

      if (width <= 0 || height <= 0) return;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      const r = Math.min(borderRadius, width / 2, height / 2);
      const wStraight = Math.max(0, width - 2 * r);
      const hStraight = Math.max(0, height - 2 * r);
      perimeter = 2 * wStraight + 2 * hStraight + 2 * Math.PI * r;
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    // Animation Render Loop
    const render = (now: number) => {
      if (lastTime === null) lastTime = now;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (perimeter > 0 && width > 0 && height > 0) {
        progress = (progress + dt / duration) % 1;

        ctx.clearRect(0, 0, width, height);

        const halfB = borderWidth / 2;
        const drawW = width - borderWidth;
        const drawH = height - borderWidth;
        const r = Math.max(0, Math.min(borderRadius - halfB, drawW / 2, drawH / 2));

        const curBeamLen = Math.min(beamLength, perimeter * 0.45);
        const headDist = progress * perimeter;
        const tailDist = headDist - curBeamLen;

        const [hx, hy] = getPointOnRoundedRect(headDist, drawW, drawH, r);
        const [tx, ty] = getPointOnRoundedRect(tailDist, drawW, drawH, r);

        // Linear gradient between head and tail
        const grad = ctx.createLinearGradient(
          tx + halfB,
          ty + halfB,
          hx + halfB,
          hy + halfB
        );

        if (isLight) {
          // Light Mode: White + Light Purple + Deep Purple
          grad.addColorStop(0, "rgba(109, 40, 217, 0)");
          grad.addColorStop(0.15, "rgba(88, 28, 135, 0.9)");
          grad.addColorStop(0.38, "#7c3aed");
          grad.addColorStop(0.6, "#9333ea");
          grad.addColorStop(0.78, "#a855f7");
          grad.addColorStop(0.9, "#c084fc");
          grad.addColorStop(0.97, "#e9d5ff");
          grad.addColorStop(1, "#ffffff");

          ctx.shadowColor = "rgba(168, 85, 247, 0.42)";
          ctx.shadowBlur = 6;
        } else {
          // Dark Mode: Dark Navy Blue + Deep Black + Electric Blue
          grad.addColorStop(0, "rgba(2, 6, 23, 0)");
          grad.addColorStop(0.15, "rgba(2, 6, 23, 0.95)");
          grad.addColorStop(0.38, "#0f172a");
          grad.addColorStop(0.6, "#1d4ed8");
          grad.addColorStop(0.8, "#2563eb");
          grad.addColorStop(0.93, "#3b82f6");
          grad.addColorStop(0.98, "#60a5fa");
          grad.addColorStop(1, "#93c5fd");

          ctx.shadowColor = "rgba(59, 130, 246, 0.52)";
          ctx.shadowBlur = 7;
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = borderWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Set exact stroke dash along perimeter
        ctx.setLineDash([curBeamLen, Math.max(0, perimeter - curBeamLen)]);
        ctx.lineDashOffset = -headDist + curBeamLen;

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(halfB, halfB, drawW, drawH, r);
        } else {
          // Universal fallback
          ctx.moveTo(halfB + r, halfB);
          ctx.lineTo(halfB + drawW - r, halfB);
          ctx.arcTo(halfB + drawW, halfB, halfB + drawW, halfB + r, r);
          ctx.lineTo(halfB + drawW, halfB + drawH - r);
          ctx.arcTo(halfB + drawW, halfB + drawH, halfB + drawW - r, halfB + drawH, r);
          ctx.lineTo(halfB + r, halfB + drawH);
          ctx.arcTo(halfB, halfB + drawH, halfB, halfB + drawH - r, r);
          ctx.lineTo(halfB, halfB + r);
          ctx.arcTo(halfB, halfB, halfB + r, halfB, r);
          ctx.closePath();
        }
        ctx.stroke();
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, [borderWidth, borderRadius, duration, beamLength]);

  return (
    <div
      ref={containerRef}
      className={`${styles.borderBeamContainer} ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className={styles.beamCanvas} />
    </div>
  );
}
