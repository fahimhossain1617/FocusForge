"use client";

import * as React from "react";
import styles from "./ai-agent.module.css";

export interface AuroraBarsProps {
  className?: string;
  active?: boolean;
}

/**
 * FocusForge AI Agent — Pure CSS Aurora Bars Animated Gradient Background
 * - Inspired by Unlumen UI Aurora Bars (Northern Lights drifting effect)
 * - 100% Pure CSS Keyframe Animation with 60fps GPU acceleration (transforms & opacity)
 * - 7 undulating vertical aurora pillars/bars with soft luminous sapphire & cyan gradients
 * - Sits behind existing UI elements with zero pointer interference
 */
export function AuroraBars({
  className = "",
  active = true,
}: AuroraBarsProps) {
  if (!active) return null;

  return (
    <div
      className={`${styles.auroraBarsContainer} ${className}`.trim()}
      aria-hidden="true"
    >
      {/* Base ambient horizon glow */}
      <div className={styles.auroraHorizonGlow} />

      {/* Undulating Aurora Bar Pillars */}
      <div className={`${styles.auroraPillar} ${styles.pillar1}`} />
      <div className={`${styles.auroraPillar} ${styles.pillar2}`} />
      <div className={`${styles.auroraPillar} ${styles.pillar3}`} />
      <div className={`${styles.auroraPillar} ${styles.pillar4}`} />
      <div className={`${styles.auroraPillar} ${styles.pillar5}`} />
      <div className={`${styles.auroraPillar} ${styles.pillar6}`} />
      <div className={`${styles.auroraPillar} ${styles.pillar7}`} />
    </div>
  );
}

export default AuroraBars;
