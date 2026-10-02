"use client";

import React, { useMemo } from "react";
import type { OrbMood } from "../ai-agent/useOrbMood";
import { NotificationCategory } from "../../types";

export interface NotificationOrbAvatarProps {
  mood?: OrbMood | string;
  category?: NotificationCategory | string;
  size?: number; // default 64
  isDoneCheering?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

// Fallback category to mood mapping
function getCategoryMood(category?: string): OrbMood {
  switch (category) {
    case "daily_plan":
      return "curious";
    case "focus_reminder":
    case "focus":
      return "attentive";
    case "task_start":
      return "attentive";
    case "task_pre_reminder":
      return "thinking";
    case "task_incomplete":
      return "concerned";
    case "skill_reminder":
    case "learning":
      return "curious";
    case "task_completed":
      return "celebrating";
    case "focus_completed":
      return "happy";
    case "break_time":
      return "sleepy";
    case "streak_milestone":
      return "proud";
    default:
      return "attentive";
  }
}

export function NotificationOrbAvatar({
  mood,
  category,
  size = 64,
  isDoneCheering = false,
  reducedMotion = false,
  className = "",
}: NotificationOrbAvatarProps) {
  // Determine effective mood
  const baseMood = mood || (category ? getCategoryMood(category) : "attentive");
  const effectiveMood: OrbMood = (isDoneCheering ? "celebrating" : baseMood) as OrbMood;

  // Head tilt angle based on emotion
  const headAngle = useMemo(() => {
    if (effectiveMood === "curious") return 7;
    if (effectiveMood === "thinking") return 6;
    if (effectiveMood === "sad" || effectiveMood === "error" || effectiveMood === "concerned") return -4.5;
    if (effectiveMood === "sulky") return -3.5;
    if (effectiveMood === "playful" || effectiveMood === "excited" || effectiveMood === "celebrating") return 5;
    if (effectiveMood === "proud") return -4.5;
    if (effectiveMood === "caring" || effectiveMood === "supportive") return 4;
    return 0;
  }, [effectiveMood]);

  return (
    <div
      className={`shrink-0 flex items-center justify-center select-none relative bg-transparent ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
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
          viewBox="54 40 172 172"
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ambient Shadow Glow */}
            <radialGradient id="notifSphereAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#1e3a8a" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>

            {/* Vibrant Cobalt 3D Sphere Body */}
            <radialGradient id="notifCobalt" cx="34%" cy="24%" r="76%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="36%" stopColor="#1d4ed8" stopOpacity="1" />
              <stop offset="76%" stopColor="#1e3a8a" stopOpacity="1" />
              <stop offset="100%" stopColor="#0a0f1d" stopOpacity="1" />
            </radialGradient>

            {/* Glossy Top-Left Specular Shine */}
            <linearGradient id="notifSpecular" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#93c5fd" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>

            {/* Soft Pastel Pink Cheek Blush */}
            <radialGradient id="notifPinkBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff3366" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#ff4d79" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ff4d79" stopOpacity="0" />
            </radialGradient>

            {/* Glowing Golden Sparkle Star */}
            <linearGradient id="notifGoldStar" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            {/* Deep Glossy Eye Gradient */}
            <radialGradient id="notifEyeGrad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="65%" stopColor="#080d1a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Realistic Hand Gradient */}
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
          <ellipse cx="140" cy="208" rx="58" ry="7.5" fill="rgba(0, 0, 0, 0.45)" />

          {/* 2. Soft Ambient Halo Glow */}
          <circle cx="140" cy="126" r="92" fill="url(#notifSphereAura)" />

          {/* 3. Luxury Cobalt Sphere Body & Head Group */}
          <g transform={`rotate(${headAngle}, 140, 126)`}>
            {/* Main 3D Sphere */}
            <circle
              cx="140"
              cy="126"
              r="76"
              fill="url(#notifCobalt)"
              stroke="rgba(96, 165, 250, 0.45)"
              strokeWidth="1.5"
            />

            {/* Top-Left Glossy Specular Sheen */}
            <path
              d="M 88 76 C 100 52, 140 46, 184 60 C 148 53, 108 60, 88 76 Z"
              fill="url(#notifSpecular)"
            />
            <ellipse
              cx="105"
              cy="76"
              rx="16"
              ry="10"
              fill="url(#notifSpecular)"
              transform="rotate(-28, 105, 76)"
            />
            <circle cx="101" cy="72" r="5" fill="#ffffff" opacity="0.75" filter="url(#notifGlow)" />

            {/* Soft Pink Cheek Blushes */}
            <ellipse cx="93" cy="132" rx="12" ry="7.5" fill="url(#notifPinkBlush)" filter="url(#notifGlow)" />
            <ellipse cx="187" cy="132" rx="12" ry="7.5" fill="url(#notifPinkBlush)" filter="url(#notifGlow)" />

            {/* REALISTIC EYEBROWS */}
            <g stroke="#93c5fd" strokeWidth="2.4" strokeLinecap="round" opacity="0.95">
              {effectiveMood === "sad" || effectiveMood === "error" || effectiveMood === "concerned" ? (
                <>
                  <path d="M 97 93 Q 112 86 125 93" fill="none" />
                  <path d="M 155 93 Q 168 86 183 93" fill="none" />
                </>
              ) : effectiveMood === "curious" ? (
                <>
                  <path d="M 97 82 Q 112 73 125 83" fill="none" />
                  <path d="M 155 92 Q 168 89 181 93" fill="none" />
                </>
              ) : effectiveMood === "sulky" ? (
                <>
                  <line x1="97" y1="92" x2="125" y2="92" />
                  <path d="M 155 87 Q 168 80 181 87" fill="none" />
                </>
              ) : effectiveMood === "playful" || effectiveMood === "excited" || effectiveMood === "celebrating" ? (
                <>
                  <path d="M 97 87 Q 112 81 125 87" fill="none" />
                  <path d="M 155 87 Q 168 81 183 87" fill="none" />
                </>
              ) : effectiveMood === "sleepy" ? (
                <>
                  <path d="M 99 95 Q 112 98 125 96" fill="none" />
                  <path d="M 155 96 Q 168 98 181 95" fill="none" />
                </>
              ) : effectiveMood === "thinking" ? (
                <>
                  <path d="M 97 93 Q 112 89 125 94" fill="none" />
                  <path d="M 155 86 Q 168 79 181 86" fill="none" />
                </>
              ) : effectiveMood === "proud" ? (
                <>
                  <path d="M 98 85 Q 112 78 126 85" fill="none" />
                  <path d="M 154 85 Q 168 78 182 85" fill="none" />
                </>
              ) : (
                <>
                  <path d="M 99 90 Q 112 84 125 90" fill="none" />
                  <path d="M 155 90 Q 168 84 181 90" fill="none" />
                </>
              )}
            </g>

            {/* REALISTIC EYES */}
            {effectiveMood === "playful" ? (
              /* Playful / Wink: Left open, Right wink */
              <g>
                <ellipse cx="112" cy="112" rx="14.5" ry="16.5" fill="url(#notifEyeGrad)" />
                <ellipse cx="112" cy="117" rx="10" ry="5.5" fill="#0284c7" opacity="0.45" />
                <circle cx="116" cy="107" r="4.8" fill="#ffffff" filter="url(#notifGlow)" />
                <circle cx="108" cy="116" r="2.2" fill="#ffffff" opacity="0.9" />

                <path
                  d="M 151 114 Q 166 127 181 114"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line x1="181" y1="114" x2="188" y2="108" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" />
              </g>
            ) : effectiveMood === "sleepy" ? (
              /* Sleepy: Relaxed Curved Eyes */
              <g>
                <path
                  d="M 97 114 Q 112 123 127 114"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M 153 114 Q 168 123 183 114"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>
            ) : effectiveMood === "happy" || effectiveMood === "celebrating" ? (
              /* Joyful Arched Eyes ^ ^ */
              <g>
                <path
                  d="M 97 115 Q 112 97 127 115"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 153 115 Q 168 97 183 115"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
              </g>
            ) : effectiveMood === "sulky" ? (
              /* Sulky: Side-eye glance */
              <g>
                <ellipse cx="112" cy="112" rx="14.5" ry="15" fill="url(#notifEyeGrad)" />
                <line x1="96" y1="106" x2="128" y2="106" stroke="#38bdf8" strokeWidth="2.6" />
                <circle cx="117" cy="113" r="5.5" fill="#0284c7" />
                <circle cx="119" cy="111" r="3" fill="#ffffff" filter="url(#notifGlow)" />

                <ellipse cx="168" cy="112" rx="14.5" ry="15" fill="url(#notifEyeGrad)" />
                <line x1="152" y1="106" x2="184" y2="106" stroke="#38bdf8" strokeWidth="2.6" />
                <circle cx="173" cy="113" r="5.5" fill="#0284c7" />
                <circle cx="175" cy="111" r="3" fill="#ffffff" filter="url(#notifGlow)" />
              </g>
            ) : (
              /* Big Vivid Anime-style Expressive Eyes */
              <g>
                <ellipse cx="112" cy="112" rx="14.5" ry="16.5" fill="url(#notifEyeGrad)" />
                <ellipse cx="112" cy="117" rx="10" ry="5.5" fill="#0284c7" opacity="0.45" />
                <circle cx="112" cy="112" r="8" fill="#0369a1" opacity="0.45" />
                <circle cx="116" cy="107" r="4.8" fill="#ffffff" filter="url(#notifGlow)" />
                <circle cx="108" cy="116" r="2.2" fill="#ffffff" opacity="0.9" />

                <ellipse cx="168" cy="112" rx="14.5" ry="16.5" fill="url(#notifEyeGrad)" />
                <ellipse cx="168" cy="117" rx="10" ry="5.5" fill="#0284c7" opacity="0.45" />
                <circle cx="168" cy="112" r="8" fill="#0369a1" opacity="0.45" />
                <circle cx="172" cy="107" r="4.8" fill="#ffffff" filter="url(#notifGlow)" />
                <circle cx="164" cy="116" r="2.2" fill="#ffffff" opacity="0.9" />
              </g>
            )}

            {/* REALISTIC MOUTHS */}
            {effectiveMood === "curious" ? (
              <ellipse cx="140" cy="129" rx="4" ry="4.8" fill="#090e21" stroke="#60a5fa" strokeWidth="1.4" />
            ) : effectiveMood === "sulky" ? (
              <path d="M 131 134 Q 140 126 149 134" fill="none" stroke="#60a5fa" strokeWidth="2.8" strokeLinecap="round" />
            ) : effectiveMood === "playful" ? (
              <g>
                <path d="M 130 123 Q 140 134 150 123" fill="none" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M 134 126 Q 140 142 146 126 Z" fill="#ff4d79" stroke="#e11d48" strokeWidth="0.9" />
              </g>
            ) : effectiveMood === "sleepy" ? (
              <g>
                <ellipse cx="140" cy="130" rx="7.5" ry="9" fill="#080c1d" stroke="#60a5fa" strokeWidth="1.6" />
                <ellipse cx="140" cy="135" rx="4.8" ry="3.2" fill="#ff4d79" />
              </g>
            ) : effectiveMood === "happy" || effectiveMood === "celebrating" ? (
              <path d="M 131 125 Q 140 140 149 125 Z" fill="#ff4d79" stroke="#38bdf8" strokeWidth="2" />
            ) : effectiveMood === "proud" ? (
              <path d="M 132 125 Q 140 133 150 124" fill="none" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" />
            ) : (
              <path d="M 132 125 Q 140 132 148 125" fill="none" stroke="#93c5fd" strokeWidth="2.6" strokeLinecap="round" />
            )}

            {/* EMOTION ACCESSORIES */}
            {/* Curious: Question mark ? */}
            {effectiveMood === "curious" && (
              <text x="194" y="66" fill="#38bdf8" fontSize="24" fontWeight="bold" fontFamily="sans-serif" filter="url(#notifGlow)">
                ?
              </text>
            )}

            {/* Sulky: Comic Puff */}
            {effectiveMood === "sulky" && (
              <g transform="translate(190, 50)" stroke="#38bdf8" strokeWidth="2" fill="none">
                <path d="M 0 4 Q 4 0 8 4 Q 12 0 16 4 Q 20 8 16 12 Q 20 16 16 20 Q 12 16 8 20 Q 4 16 0 20 Q -4 16 0 12 Z" opacity="0.9" />
              </g>
            )}

            {/* Sleepy: Zzz */}
            {effectiveMood === "sleepy" && (
              <g transform="translate(194, 68)" fill="#38bdf8" fontWeight="bold">
                <text x="0" y="0" fontSize="14">z</text>
                <text x="8" y="-9" fontSize="17">Z</text>
                <text x="18" y="-20" fontSize="22">Z</text>
              </g>
            )}

            {/* Proud / Celebrating: Golden Sparkle Stars ✦ ✦ */}
            {(effectiveMood === "proud" || effectiveMood === "celebrating") && (
              <g transform="translate(196, 52)">
                <path
                  d="M 0 -14 Q 1.8 -2 12 0 Q 1.8 2 0 14 Q -1.8 2 -12 0 Q -1.8 -2 0 -14 Z"
                  fill="url(#notifGoldStar)"
                  filter="url(#notifGlow)"
                />
                <path
                  d="M 0 -9 Q 1.2 -1.5 8 0 Q 1.2 1.5 0 9 Q -1.2 1.5 -8 0 Q -1.2 -1.5 0 -9 Z"
                  fill="url(#notifGoldStar)"
                  filter="url(#notifGlow)"
                  transform="translate(-7, 22)"
                />
              </g>
            )}

            {/* Playful: Energy dashes */}
            {effectiveMood === "playful" && (
              <g stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" filter="url(#notifGlow)">
                <line x1="68" y1="62" x2="56" y2="52" />
                <line x1="62" y1="84" x2="48" y2="82" />
                <line x1="212" y1="62" x2="224" y2="52" />
                <line x1="218" y1="84" x2="232" y2="82" />
              </g>
            )}

            {/* Thinking: Hand on chin */}
            {effectiveMood === "thinking" && (
              <g>
                <path
                  d="M 194 162 C 206 148, 198 132, 172 134"
                  fill="none"
                  stroke="url(#notifHandGrad)"
                  strokeWidth="15"
                  strokeLinecap="round"
                  filter="url(#notifGlow)"
                />
                <g transform="translate(162, 136)">
                  <circle cx="0" cy="0" r="12" fill="url(#notifHandGrad)" stroke="#38bdf8" strokeWidth="1.6" />
                  <path d="M -5 -4 Q 0 -7 5 -4" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              </g>
            )}

            {/* Cheering: Hands in air */}
            {effectiveMood === "celebrating" && (
              <g stroke="#38bdf8" strokeWidth="11" strokeLinecap="round">
                <line x1="68" y1="140" x2="54" y2="108" />
                <circle cx="52" cy="104" r="8.5" fill="url(#notifHandGrad)" stroke="#38bdf8" strokeWidth="1.6" />
                <line x1="212" y1="140" x2="226" y2="108" />
                <circle cx="228" cy="104" r="8.5" fill="url(#notifHandGrad)" stroke="#38bdf8" strokeWidth="1.6" />
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default NotificationOrbAvatar;
