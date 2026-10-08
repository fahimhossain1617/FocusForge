"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import styles from "./BorderBeam.module.css";

export interface BorderBeamProps {
  /**
   * Border stroke width in pixels. Default is 1.5px.
   */
  borderWidth?: number;
  /**
   * Duration for one full loop in seconds. Default is 12s.
   */
  duration?: number;
  /**
   * Size / length of the beam as percentage of perimeter (0-100). Default is 25.
   */
  beamPercentage?: number;
  /**
   * Gradient colors. Default is cyan (#38bdf8) to indigo (#818cf8).
   */
  colorFrom?: string;
  colorTo?: string;
  /**
   * Custom CSS class.
   */
  className?: string;
  /**
   * Explicit corner border radius in pixels. If not specified, defaults to (height / 2).
   */
  borderRadius?: number;
}

export default function BorderBeam({
  borderWidth = 1.5,
  duration = 12,
  beamPercentage = 25,
  colorFrom = "#38bdf8",
  colorTo = "#818cf8",
  className = "",
  borderRadius,
}: BorderBeamProps) {
  const rawId = useId();
  const safeId = "bb-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const updateSize = () => {
      const parent = svgEl.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        setSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (svgEl.parentElement) {
      resizeObserver.observe(svgEl.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const dashArray = `${beamPercentage} ${100 - beamPercentage}`;
  // Calculate corner radius: use explicit borderRadius if provided, or height / 2 for pure capsule pills
  const maxPillRadius = size.height > 0 ? Math.max(0, (size.height - borderWidth) / 2) : 24;
  const cornerRadius = borderRadius !== undefined ? Math.min(borderRadius, maxPillRadius) : maxPillRadius;
  const rectWidth = size.width > 0 ? Math.max(0, size.width - borderWidth) : 0;
  const rectHeight = size.height > 0 ? Math.max(0, size.height - borderWidth) : 0;

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className={`${styles.borderBeamSvg} ${className}`}
      style={
        {
          "--beam-duration": `${duration}s`,
          "--beam-dash": dashArray,
        } as React.CSSProperties
      }
    >
      <defs>
        <linearGradient id={safeId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorFrom} stopOpacity="1" />
          <stop offset="50%" stopColor={colorTo} stopOpacity="0.85" />
          <stop offset="100%" stopColor={colorFrom} stopOpacity="0.15" />
        </linearGradient>
        <filter id={`${safeId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {size.width > 0 && size.height > 0 && (
        <rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={rectWidth}
          height={rectHeight}
          rx={cornerRadius}
          ry={cornerRadius}
          fill="none"
          stroke={`url(#${safeId})`}
          strokeWidth={borderWidth}
          strokeLinecap="round"
          pathLength="100"
          className={styles.beamRect}
          filter={`url(#${safeId}-glow)`}
        />
      )}
    </svg>
  );
}
