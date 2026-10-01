"use client";

import React, { useMemo } from "react";
import type { OrbMood } from "../ai-agent/useOrbMood";

export interface NotificationOrbAvatarProps {
  mood?: OrbMood | string;
  size?: number; // default 56
  isDoneCheering?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

export function NotificationOrbAvatar({
  mood = "attentive",
  size = 56,
  isDoneCheering = false,
  reducedMotion = false,
  className = "",
}: NotificationOrbAvatarProps) {
  // If user tapped "Done", temporarily force celebrating/cheering
  const effectiveMood: OrbMood = (isDoneCheering ? "celebrating" : mood) as OrbMood;

  // Head tilt angle based on emotion
  const headAngle = useMemo(() => {
    if (effectiveMood === "curious") return 6.5;
    if (effectiveMood === "thinking") return 5.5;
    if (effectiveMood === "sad" || effectiveMood === "error") return -4.5;
    if (effectiveMood === "sulky") return -3.0;
    if (effectiveMood === "playful" || effectiveMood === "excited" || effectiveMood === "celebrating") return 4.5;
    if (effectiveMood === "proud") return -4.0;
    if (effectiveMood === "caring" || effectiveMood === "supportive" || effectiveMood === "concerned") return 3.5;
    return 0;
  }, [effectiveMood]);

  const chipRadius = Math.round(size * 0.28); // 28% corner radius per design spec

  return (
    <div
      className={`shrink-0 flex items-center justify-center select-none relative bg-transparent ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      aria-label={`Orb reaction: ${effectiveMood}`}
    >
      <div
        className={`w-full h-full flex items-center justify-center ${
          reducedMotion ? "" : "transition-transform duration-300 ease-out"
        }`}
        style={{
          transform: !reducedMotion && isDoneCheering ? "scale(1.08)" : "scale(1)",
        }}
      >
        <svg
          viewBox="50 35 180 185"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ambient Shadow Glow */}
            <radialGradient id="notifSphereAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#1e3a8a" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>

            {/* Vibrant Cobalt 3D Sphere Body */}
            <radialGradient id="notifCobalt" cx="36%" cy="26%" r="74%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="38%" stopColor="#1d4ed8" stopOpacity="1" />
              <stop offset="78%" stopColor="#1e3a8a" stopOpacity="1" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
            </radialGradient>

            {/* Elegant Soft Top-Left Specular Shine */}
            <linearGradient id="notifSpecular" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#93c5fd" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>

            {/* Soft Pastel Pink Cheek Blush */}
            <radialGradient id="notifPinkBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff3366" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#ff4d79" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ff4d79" stopOpacity="0" />
            </radialGradient>

            {/* Glowing Golden Sparkle Star for Proud */}
            <linearGradient id="notifGoldStar" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            {/* Glowing Pink Heart */}
            <radialGradient id="notifPinkHeart" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ff7597" />
              <stop offset="50%" stopColor="#ff2d60" />
              <stop offset="100%" stopColor="#be123c" />
            </radialGradient>

            {/* Deep Glossy Eye Gradient */}
            <radialGradient id="notifEyeGrad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#080d1a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Hand Gradient */}
            <radialGradient id="notifHandGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="65%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Soft Glow Filter */}
            <filter id="notifGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Floor Drop Shadow */}
          <ellipse cx="140" cy="214" rx="60" ry="8" fill="rgba(0, 0, 0, 0.45)" />

          {/* 2. Soft Ambient Halo Glow */}
          <circle cx="140" cy="126" r="98" fill="url(#notifSphereAura)" />

          {/* 3. Luxury Cobalt Sphere Body & Head Group */}
          <g transform={`rotate(${headAngle}, 140, 126)`}>
            {/* Main 3D Sphere */}
            <circle
              cx="140"
              cy="126"
              r="76"
              fill="url(#notifCobalt)"
              stroke="rgba(96, 165, 250, 0.35)"
              strokeWidth="1.5"
            />

            {/* Top-Left Glossy Specular Sheen */}
            <path
              d="M 88 78 C 100 54, 140 48, 184 62 C 148 55, 108 62, 88 78 Z"
              fill="url(#notifSpecular)"
            />
            <ellipse
              cx="106"
              cy="78"
              rx="15"
              ry="9"
              fill="url(#notifSpecular)"
              transform="rotate(-28, 106, 78)"
            />
            <circle cx="102" cy="74" r="4.5" fill="#ffffff" opacity="0.6" filter="url(#notifGlow)" />

            {/* Cheek Blushes */}
            <ellipse cx="94" cy="130" rx="11" ry="6.5" fill="url(#notifPinkBlush)" filter="url(#notifGlow)" />
            <ellipse cx="186" cy="130" rx="11" ry="6.5" fill="url(#notifPinkBlush)" filter="url(#notifGlow)" />

            {/* REALISTIC EYEBROWS */}
            <g stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round" opacity="0.9">
              {effectiveMood === "sad" || effectiveMood === "error" || effectiveMood === "concerned" ? (
                <>
                  <path d="M 98 94 Q 112 88 124 94" fill="none" />
                  <path d="M 156 94 Q 168 88 182 94" fill="none" />
                </>
              ) : effectiveMood === "curious" ? (
                <>
                  <path d="M 98 83 Q 112 74 124 84" fill="none" />
                  <path d="M 156 93 Q 168 90 180 94" fill="none" />
                </>
              ) : effectiveMood === "sulky" ? (
                <>
                  <line x1="98" y1="93" x2="124" y2="93" />
                  <path d="M 156 88 Q 168 81 180 88" fill="none" />
                </>
              ) : effectiveMood === "playful" || effectiveMood === "excited" || effectiveMood === "celebrating" ? (
                <>
                  <path d="M 98 88 Q 112 82 124 88" fill="none" />
                  <path d="M 156 88 Q 168 82 180 88" fill="none" />
                </>
              ) : effectiveMood === "sleepy" ? (
                <>
                  <path d="M 100 96 Q 112 99 124 97" fill="none" />
                  <path d="M 156 97 Q 168 99 180 96" fill="none" />
                </>
              ) : effectiveMood === "thinking" ? (
                <>
                  <path d="M 98 94 Q 112 90 124 95" fill="none" />
                  <path d="M 156 87 Q 168 80 180 87" fill="none" />
                </>
              ) : effectiveMood === "proud" ? (
                <>
                  <path d="M 99 86 Q 112 79 125 86" fill="none" />
                  <path d="M 155 86 Q 168 79 181 86" fill="none" />
                </>
              ) : (
                <>
                  <path d="M 100 91 Q 112 85 124 91" fill="none" />
                  <path d="M 156 91 Q 168 85 180 91" fill="none" />
                </>
              )}
            </g>

            {/* REALISTIC EYES */}
            {effectiveMood === "playful" ? (
              /* Playful / Wink: Left eye open, Right eye winking */
              <g>
                <ellipse cx="112" cy="112" rx="13.5" ry="15.5" fill="url(#notifEyeGrad)" />
                <ellipse cx="112" cy="116" rx="9" ry="5" fill="#0284c7" opacity="0.38" />
                <circle cx="115.5" cy="107.5" r="4.3" fill="#ffffff" filter="url(#notifGlow)" />
                <circle cx="108.5" cy="115" r="1.8" fill="#ffffff" opacity="0.85" />

                <path
                  d="M 152 114 Q 166 126 180 114"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                />
                <line x1="180" y1="114" x2="186" y2="108" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : effectiveMood === "sleepy" ? (
              /* Sleepy: Peaceful sleeping curves */
              <g>
                <path
                  d="M 98 114 Q 112 122 126 114"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 154 114 Q 168 122 182 114"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
            ) : effectiveMood === "happy" || effectiveMood === "celebrating" ? (
              /* Happy / Celebrating: Arched joyful curved eyes ^ ^ */
              <g>
                <path
                  d="M 98 114 Q 112 98 126 114"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M 154 114 Q 168 98 182 114"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>
            ) : effectiveMood === "sulky" ? (
              /* Sulky: Side-eye glance */
              <g>
                <ellipse cx="112" cy="112" rx="13.5" ry="14" fill="url(#notifEyeGrad)" />
                <line x1="97" y1="107" x2="127" y2="107" stroke="#38bdf8" strokeWidth="2.4" />
                <circle cx="116" cy="113" r="5" fill="#0284c7" />
                <circle cx="118" cy="111" r="2.8" fill="#ffffff" filter="url(#notifGlow)" />

                <ellipse cx="168" cy="112" rx="13.5" ry="14" fill="url(#notifEyeGrad)" />
                <line x1="153" y1="107" x2="183" y2="107" stroke="#38bdf8" strokeWidth="2.4" />
                <circle cx="172" cy="113" r="5" fill="#0284c7" />
                <circle cx="174" cy="111" r="2.8" fill="#ffffff" filter="url(#notifGlow)" />
              </g>
            ) : (
              /* Open Expressive Eyes with Highlights */
              <g>
                <ellipse cx="112" cy="112" rx="13.5" ry="15.5" fill="url(#notifEyeGrad)" />
                <ellipse cx="112" cy="116" rx="9" ry="5" fill="#0284c7" opacity="0.35" />
                <circle cx="112" cy="112" r="7.5" fill="#0369a1" opacity="0.4" />
                <circle cx="115.5" cy="107.5" r="4.3" fill="#ffffff" filter="url(#notifGlow)" />
                <circle cx="108.5" cy="115" r="1.8" fill="#ffffff" opacity="0.85" />

                <ellipse cx="168" cy="112" rx="13.5" ry="15.5" fill="url(#notifEyeGrad)" />
                <ellipse cx="168" cy="116" rx="9" ry="5" fill="#0284c7" opacity="0.35" />
                <circle cx="168" cy="112" r="7.5" fill="#0369a1" opacity="0.4" />
                <circle cx="171.5" cy="107.5" r="4.3" fill="#ffffff" filter="url(#notifGlow)" />
                <circle cx="164.5" cy="115" r="1.8" fill="#ffffff" opacity="0.85" />
              </g>
            )}

            {/* REALISTIC MOUTHS */}
            {effectiveMood === "curious" ? (
              <ellipse cx="140" cy="128" rx="3.5" ry="4" fill="#0b1328" stroke="#60a5fa" strokeWidth="1.2" />
            ) : effectiveMood === "sulky" ? (
              <path d="M 132 133 Q 140 125 148 133" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
            ) : effectiveMood === "playful" ? (
              <g>
                <path d="M 131 123 Q 140 133 149 123" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M 135 126 Q 140 140 145 126 Z" fill="#ff4d79" stroke="#e11d48" strokeWidth="0.8" />
              </g>
            ) : effectiveMood === "sleepy" ? (
              <g>
                <ellipse cx="140" cy="129" rx="6.5" ry="8" fill="#090e21" stroke="#60a5fa" strokeWidth="1.5" />
                <ellipse cx="140" cy="133.5" rx="4.2" ry="2.8" fill="#ff4d79" />
              </g>
            ) : effectiveMood === "happy" || effectiveMood === "celebrating" ? (
              <path d="M 132 125 Q 140 138 148 125 Z" fill="#ff4d79" stroke="#38bdf8" strokeWidth="1.8" />
            ) : effectiveMood === "proud" ? (
              <path d="M 133 125 Q 140 132 149 124" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />
            ) : (
              <path d="M 133 125 Q 140 131 147 125" fill="none" stroke="#93c5fd" strokeWidth="2.4" strokeLinecap="round" />
            )}

            {/* EMOTION ACCESSORIES */}
            {/* Curious: Question mark ? */}
            {effectiveMood === "curious" && (
              <text x="194" y="66" fill="#38bdf8" fontSize="22" fontWeight="bold" fontFamily="sans-serif" filter="url(#notifGlow)">
                ?
              </text>
            )}

            {/* Sulky: Comic Puff */}
            {effectiveMood === "sulky" && (
              <g transform="translate(190, 50)" stroke="#38bdf8" strokeWidth="1.8" fill="none">
                <path d="M 0 4 Q 4 0 8 4 Q 12 0 16 4 Q 20 8 16 12 Q 20 16 16 20 Q 12 16 8 20 Q 4 16 0 20 Q -4 16 0 12 Z" opacity="0.85" />
              </g>
            )}

            {/* Sleepy: Zzz */}
            {effectiveMood === "sleepy" && (
              <g transform="translate(194, 68)" fill="#38bdf8" fontWeight="bold">
                <text x="0" y="0" fontSize="13">z</text>
                <text x="7" y="-8" fontSize="16">Z</text>
                <text x="16" y="-18" fontSize="20">Z</text>
              </g>
            )}

            {/* Proud / Celebrating: Golden Sparkle Stars ✦ ✦ */}
            {(effectiveMood === "proud" || effectiveMood === "celebrating") && (
              <g transform="translate(196, 52)">
                <path
                  d="M 0 -13 Q 1.5 -2 11 0 Q 1.5 2 0 13 Q -1.5 2 -11 0 Q -1.5 -2 0 -13 Z"
                  fill="url(#notifGoldStar)"
                  filter="url(#notifGlow)"
                />
                <path
                  d="M 0 -8 Q 1 -1.5 7 0 Q 1 1.5 0 8 Q -1 1.5 -7 0 Q -1 -1.5 0 -8 Z"
                  fill="url(#notifGoldStar)"
                  filter="url(#notifGlow)"
                  transform="translate(-6, 20)"
                />
              </g>
            )}

            {/* Playful: Energy dashes */}
            {effectiveMood === "playful" && (
              <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" filter="url(#notifGlow)">
                <line x1="68" y1="62" x2="56" y2="52" />
                <line x1="62" y1="84" x2="48" y2="82" />
                <line x1="212" y1="62" x2="224" y2="52" />
                <line x1="218" y1="84" x2="232" y2="82" />
              </g>
            )}

            {/* Thinking: Arm with paw resting on chin */}
            {effectiveMood === "thinking" && (
              <g>
                <path
                  d="M 194 162 C 206 148, 198 132, 172 134"
                  fill="none"
                  stroke="url(#notifHandGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  filter="url(#notifGlow)"
                />
                <g transform="translate(162, 136)">
                  <circle cx="0" cy="0" r="11" fill="url(#notifHandGrad)" stroke="#38bdf8" strokeWidth="1.5" />
                  <path d="M -5 -4 Q 0 -7 5 -4" fill="none" stroke="#60a5fa" strokeWidth="1.4" strokeLinecap="round" />
                </g>
              </g>
            )}

            {/* Cheering: Hands in air */}
            {effectiveMood === "celebrating" && (
              <g stroke="#38bdf8" strokeWidth="10" strokeLinecap="round">
                <line x1="68" y1="140" x2="54" y2="108" />
                <circle cx="52" cy="104" r="8" fill="url(#notifHandGrad)" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="212" y1="140" x2="226" y2="108" />
                <circle cx="228" cy="104" r="8" fill="url(#notifHandGrad)" stroke="#38bdf8" strokeWidth="1.5" />
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default NotificationOrbAvatar;
