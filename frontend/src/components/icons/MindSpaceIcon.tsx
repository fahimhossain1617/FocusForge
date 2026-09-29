import React from 'react';

interface MindSpaceIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
}

export const MindSpaceIcon: React.FC<MindSpaceIconProps> = ({ 
  size = 24, 
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
      {/* 1. Detached Top-Left Puzzle Piece (shifted up-left with clear spacing) */}
      <path d="M 4.10 8.00 A 6.60 6.60 0 0 1 10.70 1.40 L 10.70 3.75 A 1.30 1.30 0 1 0 10.70 5.65 L 10.70 8.00 L 8.35 8.00 A 1.30 1.30 0 1 1 6.45 8.00 L 4.10 8.00 Z" />

      {/* 2. Attached Bulb Body Contour (Top-Right, Bottom-Right, Bottom-Left) */}
      <path d="M 6.60 10.50 C 6.60 12.90, 10.00 13.80, 10.20 15.60 L 16.20 15.60 C 16.40 13.80, 19.80 12.90, 19.80 10.50 A 6.60 6.60 0 0 0 13.20 3.90" />

      {/* 3. Center Vertical Divider (Top socket indenting right, lower tab protruding right) */}
      <path d="M 13.20 3.90 L 13.20 6.25 A 1.30 1.30 0 1 0 13.20 8.15 L 13.20 10.50 L 13.20 12.10 A 1.30 1.30 0 1 0 13.20 14.00 L 13.20 15.60" />

      {/* 4. Horizontal Dividers (Both tabs protruding upwards) */}
      <path d="M 6.60 10.50 L 8.95 10.50 A 1.30 1.30 0 1 0 10.85 10.50 L 13.20 10.50" />
      <path d="M 13.20 10.50 L 15.55 10.50 A 1.30 1.30 0 1 0 17.45 10.50 L 19.80 10.50" />

      {/* 5. Lightbulb Base / Screw Threads & Terminal Contact */}
      <path d="M 10.00 17.40 L 16.40 17.40" />
      <path d="M 10.80 19.00 L 15.60 19.00" />
      <path d="M 11.40 20.50 L 15.00 20.50 A 1.80 1.60 0 0 1 11.40 20.50 Z" />
    </svg>
  );
};

