"use client";

import React from "react";

interface PlannerEmptyIllustrationProps {
  className?: string;
}

export default function PlannerEmptyIllustration({ className = "w-28 h-24 sm:w-32 sm:h-28" }: PlannerEmptyIllustrationProps) {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      
      {/* ═══════════════════════════════════════════════════════════════════
          1. DARK MODE 3D EMPTY FILE (Hidden in Light Mode)
      ═══════════════════════════════════════════════════════════════════ */}
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md overflow-visible hidden dark:block"
      >
        <defs>
          {/* Ambient Glow */}
          <filter id="glow-ambient-empty-dark" x="-30%" y="-30%" width="160%" height="160%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="16" result="blur" />
          </filter>

          {/* Soft Drop Shadows for 3D Layers */}
          <filter id="shadow-back-folder-dark" x="-20%" y="-20%" width="150%" height="150%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.4" />
          </filter>

          <filter id="shadow-empty-sheet-dark" x="-20%" y="-20%" width="150%" height="150%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#020617" floodOpacity="0.45" />
          </filter>

          <filter id="shadow-front-pocket-dark" x="-20%" y="-20%" width="150%" height="150%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.3" />
          </filter>

          <filter id="shadow-orb-empty-dark" x="-30%" y="-30%" width="160%" height="160%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#1D4ED8" floodOpacity="0.45" />
          </filter>

          {/* Background Ambient Radial Gradient */}
          <radialGradient id="grad-glow-empty-dark" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.32" />
            <stop offset="65%" stopColor="#1D4ED8" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#0A0E1A" stopOpacity="0" />
          </radialGradient>

          {/* Ground Platform Shadow */}
          <radialGradient id="grad-ground-empty-dark" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Back Folder Base Gradients */}
          <linearGradient id="grad-back-folder-dark" x1="25" y1="20" x2="135" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#080C14" />
          </linearGradient>

          <linearGradient id="grad-back-folder-border-dark" x1="30" y1="20" x2="130" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0.1" />
          </linearGradient>

          {/* Pristine Empty Sheet Gradients */}
          <linearGradient id="grad-empty-sheet-dark" x1="42" y1="30" x2="118" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E2A44" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#131D33" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#0D1527" />
          </linearGradient>

          <linearGradient id="grad-sheet-stroke-dark" x1="42" y1="30" x2="118" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0.1" />
          </linearGradient>

          {/* Folded Corner Gradients */}
          <linearGradient id="grad-corner-fold-dark" x1="104" y1="30" x2="118" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Front Translucent Glass Pocket */}
          <linearGradient id="grad-front-pocket-dark" x1="30" y1="65" x2="130" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#1E293B" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0B1329" stopOpacity="0.88" />
          </linearGradient>

          <linearGradient id="grad-pocket-rim-dark" x1="30" y1="65" x2="130" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.15" />
          </linearGradient>

          {/* 3D Glossy Sphere */}
          <radialGradient id="grad-sphere-empty-dark" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#BAE6FD" />
            <stop offset="25%" stopColor="#60A5FA" />
            <stop offset="70%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </radialGradient>

          {/* Floating Diamond Accent */}
          <linearGradient id="grad-diamond-empty-dark" x1="120" y1="35" x2="136" y2="51" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>

        {/* Ambient Backlight Glow */}
        <ellipse cx="80" cy="70" rx="55" ry="40" fill="url(#grad-glow-empty-dark)" filter="url(#glow-ambient-empty-dark)" />

        {/* Ground Soft Drop Shadow */}
        <ellipse cx="80" cy="126" rx="52" ry="8" fill="url(#grad-ground-empty-dark)" />

        {/* ── 1. BACK FOLDER BASE (WITH TOP TAB) ── */}
        <g filter="url(#shadow-back-folder-dark)">
          <path
            d="M32 38C32 31.3726 37.3726 26 44 26H68C72 26 75.5 28.5 77.5 32L81 38H116C122.627 38 128 43.3726 128 50V110C128 116.627 122.627 122 116 122H44C37.3726 122 32 116.627 32 110V38Z"
            fill="url(#grad-back-folder-dark)"
            stroke="url(#grad-back-folder-border-dark)"
            strokeWidth="1.2"
          />
        </g>

        {/* ── 2. FLOATING EMPTY BLUE GLASS DOCUMENT ── */}
        <g filter="url(#shadow-empty-sheet-dark)">
          <path
            d="M44 40C44 34.4772 48.4772 30 54 30H104L116 42V104C116 109.523 111.523 114 106 114H54C48.4772 114 44 109.523 44 104V40Z"
            fill="url(#grad-empty-sheet-dark)"
            stroke="url(#grad-sheet-stroke-dark)"
            strokeWidth="1"
          />

          <path
            d="M104 30V40C104 41.1046 104.895 42 106 42H116L104 30Z"
            fill="url(#grad-corner-fold-dark)"
          />

          <rect
            x="56"
            y="52"
            width="48"
            height="36"
            rx="6"
            fill="#1E293B"
            fillOpacity="0.25"
            stroke="#3B82F6"
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeOpacity="0.5"
          />

          <path
            d="M80 65V75M75 70H85"
            stroke="#60A5FA"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </g>

        {/* ── 3. FRONT TRANSLUCENT FOLDER POCKET ── */}
        <g filter="url(#shadow-front-pocket-dark)">
          <path
            d="M32 68C32 63.5817 35.5817 60 40 60H65C68.5 60 71.5 62 73.5 65L77.5 70H120C124.418 70 128 73.5817 128 78V110C128 116.627 122.627 122 116 122H44C37.3726 122 32 116.627 32 110V68Z"
            fill="url(#grad-front-pocket-dark)"
            stroke="url(#grad-pocket-rim-dark)"
            strokeWidth="1"
          />
        </g>

        {/* ── 4. FLOATING 3D ACCENTS & SPECULAR SPHERES ── */}
        <g filter="url(#shadow-orb-empty-dark)">
          <circle cx="32" cy="92" r="10.5" fill="url(#grad-sphere-empty-dark)" />
          <ellipse cx="29.5" cy="87.5" rx="3.5" ry="2.2" fill="#FFFFFF" fillOpacity="0.9" transform="rotate(-20 29.5 87.5)" />
          <circle cx="34" cy="95" r="1" fill="#FFFFFF" fillOpacity="0.4" />
        </g>

        <g filter="url(#shadow-empty-sheet-dark)">
          <path
            d="M130 34L136 42L130 50L124 42Z"
            fill="url(#grad-diamond-empty-dark)"
            stroke="#BAE6FD"
            strokeWidth="0.7"
            strokeOpacity="0.75"
          />
          <circle cx="130" cy="42" r="1.5" fill="#FFFFFF" fillOpacity="0.95" />
        </g>

        <path
          d="M125 90H129M127 88V92"
          stroke="#60A5FA"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.65"
        />

        <circle cx="36" cy="38" r="1.2" fill="#93C5FD" fillOpacity="0.7" />
      </svg>


      {/* ═══════════════════════════════════════════════════════════════════
          2. LIGHT MODE 3D EMPTY FILE (Hidden in Dark Mode)
      ═══════════════════════════════════════════════════════════════════ */}
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm overflow-visible block dark:hidden"
      >
        <defs>
          {/* Ambient Glow */}
          <filter id="glow-ambient-empty-light" x="-30%" y="-30%" width="160%" height="160%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="14" result="blur" />
          </filter>

          {/* Soft Natural Shadows for Light Mode */}
          <filter id="shadow-back-folder-light" x="-20%" y="-20%" width="150%" height="150%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#3B82F6" floodOpacity="0.12" />
          </filter>

          <filter id="shadow-empty-sheet-light" x="-20%" y="-20%" width="150%" height="150%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#1E3A8A" floodOpacity="0.10" />
          </filter>

          <filter id="shadow-front-pocket-light" x="-20%" y="-20%" width="150%" height="150%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#1E3A8A" floodOpacity="0.08" />
          </filter>

          <filter id="shadow-orb-empty-light" x="-30%" y="-30%" width="160%" height="160%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="1" dy="4" stdDeviation="4" floodColor="#2563EB" floodOpacity="0.25" />
          </filter>

          {/* Background Ambient Radial Gradient */}
          <radialGradient id="grad-glow-empty-light" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5B8DEF" stopOpacity="0.18" />
            <stop offset="70%" stopColor="#DBEAFE" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Ground Platform Shadow */}
          <radialGradient id="grad-ground-empty-light" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </radialGradient>

          {/* Back Folder Base Gradients (Crisp Pearl/Ice-Blue) */}
          <linearGradient id="grad-back-folder-light" x1="25" y1="20" x2="135" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#F0F6FE" />
            <stop offset="100%" stopColor="#E2EEFC" />
          </linearGradient>

          <linearGradient id="grad-back-folder-border-light" x1="30" y1="20" x2="130" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="60%" stopColor="#BFDBFE" />
            <stop offset="100%" stopColor="#DBEAFE" />
          </linearGradient>

          {/* Pristine Empty Sheet Gradients (Pure Frosted White) */}
          <linearGradient id="grad-empty-sheet-light" x1="42" y1="30" x2="118" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#EFF6FF" />
          </linearGradient>

          <linearGradient id="grad-sheet-stroke-light" x1="42" y1="30" x2="118" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#BFDBFE" />
            <stop offset="60%" stopColor="#93C5FD" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#DBEAFE" stopOpacity="0.4" />
          </linearGradient>

          {/* Folded Corner Gradients (Vibrant Azure) */}
          <linearGradient id="grad-corner-fold-light" x1="104" y1="30" x2="118" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="60%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Front Translucent Glass Pocket */}
          <linearGradient id="grad-front-pocket-light" x1="30" y1="65" x2="130" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EAF2FD" stopOpacity="0.88" />
            <stop offset="60%" stopColor="#DCEBFC" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#CDE2FB" stopOpacity="0.96" />
          </linearGradient>

          <linearGradient id="grad-pocket-rim-light" x1="30" y1="65" x2="130" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.4" />
          </linearGradient>

          {/* 3D Glossy Sphere (Light Blue) */}
          <radialGradient id="grad-sphere-empty-light" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="30%" stopColor="#3B82F6" />
            <stop offset="75%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </radialGradient>

          {/* Floating Diamond Accent */}
          <linearGradient id="grad-diamond-empty-light" x1="120" y1="35" x2="136" y2="51" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>

        {/* Ambient Backlight Glow */}
        <ellipse cx="80" cy="70" rx="55" ry="40" fill="url(#grad-glow-empty-light)" filter="url(#glow-ambient-empty-light)" />

        {/* Ground Soft Drop Shadow */}
        <ellipse cx="80" cy="126" rx="52" ry="8" fill="url(#grad-ground-empty-light)" />

        {/* ── 1. BACK FOLDER BASE (WITH TOP TAB) ── */}
        <g filter="url(#shadow-back-folder-light)">
          <path
            d="M32 38C32 31.3726 37.3726 26 44 26H68C72 26 75.5 28.5 77.5 32L81 38H116C122.627 38 128 43.3726 128 50V110C128 116.627 122.627 122 116 122H44C37.3726 122 32 116.627 32 110V38Z"
            fill="url(#grad-back-folder-light)"
            stroke="url(#grad-back-folder-border-light)"
            strokeWidth="1.2"
          />
        </g>

        {/* ── 2. FLOATING EMPTY WHITE DOCUMENT ── */}
        <g filter="url(#shadow-empty-sheet-light)">
          <path
            d="M44 40C44 34.4772 48.4772 30 54 30H104L116 42V104C116 109.523 111.523 114 106 114H54C48.4772 114 44 109.523 44 104V40Z"
            fill="url(#grad-empty-sheet-light)"
            stroke="url(#grad-sheet-stroke-light)"
            strokeWidth="1"
          />

          <path
            d="M104 30V40C104 41.1046 104.895 42 106 42H116L104 30Z"
            fill="url(#grad-corner-fold-light)"
          />

          {/* Subtle Empty Dashed Box */}
          <rect
            x="56"
            y="52"
            width="48"
            height="36"
            rx="6"
            fill="#F0F7FF"
            stroke="#5B8DEF"
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeOpacity="0.45"
          />

          {/* Clean Ghost Plus Symbol in Center of Empty File */}
          <path
            d="M80 65V75M75 70H85"
            stroke="#3B82F6"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
        </g>

        {/* ── 3. FRONT TRANSLUCENT FOLDER POCKET ── */}
        <g filter="url(#shadow-front-pocket-light)">
          <path
            d="M32 68C32 63.5817 35.5817 60 40 60H65C68.5 60 71.5 62 73.5 65L77.5 70H120C124.418 70 128 73.5817 128 78V110C128 116.627 122.627 122 116 122H44C37.3726 122 32 116.627 32 110V68Z"
            fill="url(#grad-front-pocket-light)"
            stroke="url(#grad-pocket-rim-light)"
            strokeWidth="1"
          />
        </g>

        {/* ── 4. FLOATING 3D ACCENTS & SPECULAR SPHERES ── */}
        <g filter="url(#shadow-orb-empty-light)">
          <circle cx="32" cy="92" r="10.5" fill="url(#grad-sphere-empty-light)" />
          <ellipse cx="29.5" cy="87.5" rx="3.5" ry="2.2" fill="#FFFFFF" fillOpacity="0.9" transform="rotate(-20 29.5 87.5)" />
          <circle cx="34" cy="95" r="1" fill="#FFFFFF" fillOpacity="0.4" />
        </g>

        <g filter="url(#shadow-empty-sheet-light)">
          <path
            d="M130 34L136 42L130 50L124 42Z"
            fill="url(#grad-diamond-empty-light)"
            stroke="#60A5FA"
            strokeWidth="0.7"
            strokeOpacity="0.8"
          />
          <circle cx="130" cy="42" r="1.5" fill="#FFFFFF" fillOpacity="0.95" />
        </g>

        <path
          d="M125 90H129M127 88V92"
          stroke="#3B82F6"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />

        <circle cx="36" cy="38" r="1.2" fill="#5B8DEF" fillOpacity="0.8" />
      </svg>
    </div>
  );
}
