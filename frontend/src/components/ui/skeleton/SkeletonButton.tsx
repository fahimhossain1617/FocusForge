import React from "react";
import Skeleton from "./Skeleton";

export interface SkeletonButtonProps {
  size?: "sm" | "md" | "lg";
  width?: string | number;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: "h-8 px-3 rounded-lg",
  md: "h-10 px-4 rounded-xl",
  lg: "h-12 px-6 rounded-xl",
};

export default function SkeletonButton({
  size = "md",
  width,
  className = "",
}: SkeletonButtonProps) {
  const sizeClass = sizeClasses[size] || "h-10 px-4 rounded-xl";

  return (
    <Skeleton
      variant="rounded"
      className={`${sizeClass} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width || (size === "sm" ? "80px" : size === "lg" ? "140px" : "110px"),
      }}
    />
  );
}
