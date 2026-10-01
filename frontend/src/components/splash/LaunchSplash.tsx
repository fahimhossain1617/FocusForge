"use client";

import React from "react";

export interface LaunchSplashProps {
  onComplete?: () => void;
}

/**
 * LaunchSplash is now rendered statically in layout.tsx head/body for zero-latency instant frame paint.
 * This React component is kept as a no-op placeholder for backwards compatibility.
 */
export default function LaunchSplash({ onComplete }: LaunchSplashProps) {
  React.useEffect(() => {
    if (onComplete) onComplete();
  }, [onComplete]);

  return null;
}
