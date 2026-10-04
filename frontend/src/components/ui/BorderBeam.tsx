"use client";

import React from "react";
import styles from "./BorderBeam.module.css";

export interface BorderBeamProps {
  /**
   * Stroke width in pixels. Default is 2px.
   */
  borderWidth?: number;
  /**
   * Corner radius in pixels or inherit.
   */
  borderRadius?: number;
  /**
   * Duration for one full perimeter loop in seconds. Default is 10s.
   */
  duration?: number;
  /**
   * Length of the beam (retained for backward compatibility).
   */
  beamLength?: number;
  /**
   * Custom CSS class.
   */
  className?: string;
}

export default function BorderBeam({
  borderWidth = 2,
  duration = 10,
  className = "",
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.borderBeamContainer} ${className}`}
      style={{
        padding: `${borderWidth}px`,
        borderRadius: "inherit",
      }}
    >
      <div
        className={styles.rotatingBeam}
        style={{
          ["--beam-duration" as any]: `${duration}s`,
        }}
      />
    </div>
  );
}
