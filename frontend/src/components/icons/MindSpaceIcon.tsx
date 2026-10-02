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
      {/* Brain contour - Left hemisphere */}
      <path d="M 11 4.5 C 8.5 2.5 5.5 3.5 4.5 6.5 C 2.8 8.8 2.8 12.2 4.2 14.2 C 3.8 16.5 5.2 19.2 8.5 19.8 C 9.8 20 10.8 19.5 11 19" />

      {/* Brain contour - Right hemisphere */}
      <path d="M 13 4.5 C 15.5 2.5 18.5 3.5 19.5 6.5 C 21.2 8.8 21.2 12.2 19.8 14.2 C 20.2 16.5 18.8 19.2 15.5 19.8 C 14.2 20 13.2 19.5 13 19" />

      {/* Center divider vertical stem */}
      <path d="M 12 3.8 V 20.2" />

      {/* Organic branch - Left (mid-height, curving up-left) */}
      <path d="M 12 13 C 9.2 13 7.5 11.2 7.5 8.5" />

      {/* Organic branch - Right (lower-height, curving up-right) */}
      <path d="M 12 16.5 C 14.8 16.5 16.5 14.8 16.5 12" />
    </svg>
  );
};

