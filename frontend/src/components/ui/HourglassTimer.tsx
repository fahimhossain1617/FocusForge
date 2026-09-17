"use client";

import React from "react";
import { RealisticHourglass } from "./RealisticHourglass";

interface HourglassTimerProps {
  progress: number; // 0 to 1
  display: string; // e.g. "14:56"
  isRunning: boolean;
  size?: number; // default 210
  color?: string; // default #3B82F6
  trackColor?: string; // default rgba(59, 130, 246, 0.18)
}

export const HourglassTimer: React.FC<HourglassTimerProps> = ({
  progress,
  display,
  isRunning,
  size = 210,
  color = "#3B82F6",
  trackColor = "rgba(59, 130, 246, 0.18)",
}) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Clamped progress between 0 and 1
  const safeProgress = Math.min(1, Math.max(0, progress));
  const dashOffset = circumference * (1 - safeProgress);

  const innerDiscSize = size - strokeWidth * 2 - 12;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Circular Timer Ring with Central Realistic Hourglass */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* SVG Progress Ring */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 -rotate-90 transform"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />

          {/* Active Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: isRunning ? "stroke-dashoffset 0.8s linear" : "none",
            }}
          />
        </svg>

        {/* Center Navy-Glass Disc with Ultra-Realistic Physical Hourglass */}
        <div
          className="relative rounded-full flex items-center justify-center shadow-inner overflow-hidden border border-blue-500/20"
          style={{
            width: innerDiscSize,
            height: innerDiscSize,
            background: "radial-gradient(circle at 50% 28%, #162444 0%, #0D162A 60%, #070B14 100%)",
            boxShadow: "inset 0 3px 14px rgba(0, 0, 0, 0.75), 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 24px rgba(59, 130, 246, 0.14)",
          }}
        >
          {/* Soft inner blue glass highlight reflection */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-400/15 via-transparent to-transparent pointer-events-none rounded-full" />

          {/* Ultra-Realistic Physical Hourglass (Clean, No Side Sticks) */}
          <div className="relative z-10 flex items-center justify-center">
            <RealisticHourglass
              progress={safeProgress}
              isRunning={isRunning}
              width={124}
              height={148}
            />
          </div>
        </div>
      </div>

      {/* Countdown Timer Display (Large, clean, high-readability typography below circular timer) */}
      <div className="mt-5 text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight text-white select-none">
        {display}
      </div>
    </div>
  );
};
