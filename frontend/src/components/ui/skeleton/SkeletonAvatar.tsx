import React from "react";
import SkeletonCircle from "./SkeletonCircle";
import Skeleton from "./Skeleton";

export interface SkeletonAvatarProps {
  size?: number | string;
  withStatusDot?: boolean;
  className?: string;
}

export default function SkeletonAvatar({
  size = 40,
  withStatusDot = false,
  className = "",
}: SkeletonAvatarProps) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <SkeletonCircle size={size} />
      {withStatusDot && (
        <Skeleton
          variant="circle"
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[var(--color-bg-base)]"
        />
      )}
    </div>
  );
}
