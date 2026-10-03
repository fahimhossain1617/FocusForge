import React from "react";

interface GloryOrbIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
}

/**
 * Glory AI Luxury Sparkle Emblem Icon
 * Designed as a refined, cute, and luxury dual AI sparkle star emblem.
 */
export const GloryOrbIcon: React.FC<GloryOrbIconProps> = ({
  size = 22,
  className = "",
  strokeWidth = 2,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Glory Orb Spherical Face Head */}
      <circle cx="12" cy="12" r="9" />

      {/* Expressive Anime Eyes */}
      <ellipse cx="8.5" cy="11.5" rx="1.5" ry="2.2" fill="currentColor" stroke="none" />
      <ellipse cx="15.5" cy="11.5" rx="1.5" ry="2.2" fill="currentColor" stroke="none" />

      {/* Gentle Cute Eyebrows */}
      <path d="M7 8 Q8.5 7 10 7.8" strokeWidth={1.5} />
      <path d="M14 7.8 Q15.5 7 17 8" strokeWidth={1.5} />

      {/* Sweet Smiling Lips */}
      <path d="M10.2 14.8 Q12 16.8 13.8 14.8" strokeWidth={1.6} />
    </svg>
  );
};

export default GloryOrbIcon;
