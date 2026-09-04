import React from "react";
import Skeleton from "./Skeleton";

export interface SkeletonCircleProps {
  size?: number | string;
  className?: string;
}

export default function SkeletonCircle({
  size = 36,
  className = "",
}: SkeletonCircleProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <Skeleton
      variant="circle"
      className={`shrink-0 ${className}`}
      style={{
        width: dimension,
        height: dimension,
        minWidth: dimension,
        minHeight: dimension,
      }}
    />
  );
}
