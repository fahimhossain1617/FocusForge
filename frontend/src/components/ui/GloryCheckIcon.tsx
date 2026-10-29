"use client";

import React, { useId, useState } from "react";

interface GloryCheckIconProps {
  checked: boolean;
  onChange?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: number;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}

/**
 * Glory AI Check Icon
 * Expressive 3D pearl-orb character checkbox (no extra box around the character):
 * - Unchecked: Slightly worried/sad expression
 * - Hover / Focus: Subtle blue aura ring glow, attentive look
 * - Clicking / Completed: Happy & proud (^ ^ eyes, joyful smile, rosy cheeks + bottom-right blue check badge)
 */
export default function GloryCheckIcon({
  checked,
  onChange,
  size = 30,
  className = "",
  disabled = false,
  title,
  ariaLabel,
}: GloryCheckIconProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [isHovered, setIsHovered] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  const sphereGradId = `glory_sphere_${rawId}`;
  const checkGradId = `glory_check_${rawId}`;
  const glowFilterId = `glory_glow_${rawId}`;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel || title || (checked ? "Completed" : "Mark as completed")}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressing(false);
      }}
      onMouseDown={() => setIsPressing(true)}
      onMouseUp={() => setIsPressing(false)}
      onClick={(e) => {
        if (disabled) return;
        onChange?.(e);
      }}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className={`group relative inline-flex items-center justify-center p-0 bg-transparent border-none outline-none select-none shrink-0 cursor-pointer transition-transform duration-200 active:scale-90 focus-visible:ring-0 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        className="overflow-visible block pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          {/* 3D Pearl-White Orb Radial Gradient */}
          <radialGradient id={sphereGradId} cx="34%" cy="28%" r="70%" fx="30%" fy="24%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="48%" stopColor="#F5F8FF" />
            <stop offset="78%" stopColor="#D8E3F8" />
            <stop offset="100%" stopColor="#B3C6EC" />
          </radialGradient>

          {/* Completed Blue Check Badge Gradient */}
          <linearGradient id={checkGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Soft Drop Shadow & Blue Aura Filter */}
          <filter id={glowFilterId} x="-35%" y="-35%" width="170%" height="170%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="2.2"
              floodColor={checked || isHovered ? "#2563EB" : "#0F172A"}
              floodOpacity={checked || isHovered ? "0.38" : "0.22"}
            />
          </filter>
        </defs>

        {/* Hover / Focus / Active Subtle Blue Ring Glow */}
        <circle
          cx="20"
          cy="20"
          r="17.8"
          fill="none"
          stroke="#3B82F6"
          strokeWidth={isHovered || isPressing ? "1.8" : "0"}
          className="transition-all duration-200"
          opacity={isHovered || isPressing ? (checked ? 0.55 : 0.85) : 0}
        />

        {/* Main 3D Character Sphere */}
        <circle
          cx="20"
          cy="20"
          r="16.2"
          fill={`url(#${sphereGradId})`}
          filter={`url(#${glowFilterId})`}
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="0.6"
        />

        {/* Top-Left Glossy Specular Highlight on Orb */}
        <ellipse
          cx="14.2"
          cy="11.2"
          rx="4.8"
          ry="2.5"
          transform="rotate(-28 14.2 11.2)"
          fill="#FFFFFF"
          opacity="0.75"
        />

        {/* Pink Rosy Cheeks (Blush) */}
        <ellipse
          cx="11.2"
          cy="22.6"
          rx="2.6"
          ry="1.45"
          fill="#FB7185"
          opacity={checked ? "0.68" : "0.52"}
        />
        <ellipse
          cx="28.8"
          cy="22.6"
          rx="2.6"
          ry="1.45"
          fill="#FB7185"
          opacity={checked ? "0.68" : "0.52"}
        />

        {checked ? (
          /* ================= COMPLETED STATE: Happy & Proud ================= */
          <g className="transition-opacity duration-200">
            {/* Left Happy Arched Eye (^ ) */}
            <path
              d="M 11.8 18.8 Q 14.3 15.2 16.8 18.8"
              fill="none"
              stroke="#172554"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
            {/* Right Happy Arched Eye ( ^) */}
            <path
              d="M 23.2 18.8 Q 25.7 15.2 28.2 18.8"
              fill="none"
              stroke="#172554"
              strokeWidth="2.1"
              strokeLinecap="round"
            />

            {/* Joyful Open Smile with Pink Tongue */}
            <path
              d="M 16.8 22.2 Q 20 27.2 23.2 22.2 Z"
              fill="#172554"
            />
            <path
              d="M 18.1 24.1 Q 20 26.3 21.9 24.1 Q 20 23.3 18.1 24.1 Z"
              fill="#FB7185"
            />

            {/* Bottom-Right Blue Checkmark Badge */}
            <g>
              <circle
                cx="30.2"
                cy="30.2"
                r="7.2"
                fill={`url(#${checkGradId})`}
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
              <path
                d="M 27.1 30.2 L 29.3 32.4 L 33.5 28.0"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        ) : (
          /* ================= UNCHECKED / HOVER STATE: Worried / Attentive ================= */
          <g className="transition-opacity duration-200">
            {/* Worried / Soft Eyebrows */}
            <path
              d={
                isHovered
                  ? "M 11.8 14.2 Q 14.2 13.0 16.2 13.8"
                  : "M 11.5 14.8 Q 14.0 13.6 16.2 13.0"
              }
              fill="none"
              stroke="#64748B"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
            <path
              d={
                isHovered
                  ? "M 28.2 14.2 Q 25.8 13.0 23.8 13.8"
                  : "M 28.5 14.8 Q 26.0 13.6 23.8 13.0"
              }
              fill="none"
              stroke="#64748B"
              strokeWidth="1.35"
              strokeLinecap="round"
            />

            {/* Left Glossy Dark-Blue Eye */}
            <ellipse cx="14.4" cy="18.8" rx="2.55" ry="2.95" fill="#0F172A" />
            <ellipse cx="14.4" cy="19.1" rx="1.9" ry="2.1" fill="#1E3A8A" opacity="0.65" />
            <circle cx="13.5" cy="17.6" r="1.05" fill="#FFFFFF" />
            <circle cx="15.3" cy="20.1" r="0.48" fill="#FFFFFF" opacity="0.85" />

            {/* Right Glossy Dark-Blue Eye */}
            <ellipse cx="25.6" cy="18.8" rx="2.55" ry="2.95" fill="#0F172A" />
            <ellipse cx="25.6" cy="19.1" rx="1.9" ry="2.1" fill="#1E3A8A" opacity="0.65" />
            <circle cx="24.7" cy="17.6" r="1.05" fill="#FFFFFF" />
            <circle cx="26.5" cy="20.1" r="0.48" fill="#FFFFFF" opacity="0.85" />

            {/* Mouth: Tiny attentive 'o' on hover, worried little frown when unchecked */}
            {isHovered ? (
              <ellipse cx="20" cy="24.2" rx="1.15" ry="1.05" fill="#0F172A" />
            ) : (
              <path
                d="M 18.2 24.9 Q 20 23.5 21.8 24.9"
                fill="none"
                stroke="#1E293B"
                strokeWidth="1.55"
                strokeLinecap="round"
              />
            )}
          </g>
        )}
      </svg>
    </button>
  );
}

