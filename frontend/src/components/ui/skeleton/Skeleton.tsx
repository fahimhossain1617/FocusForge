import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "rounded" | "circle";
  width?: string | number;
  height?: string | number;
  shimmer?: boolean;
}

export default function Skeleton({
  variant = "rounded",
  width,
  height,
  shimmer = true,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const variantClass =
    variant === "circle"
      ? "rounded-full"
      : variant === "rectangular"
      ? "rounded-none"
      : "rounded-xl";

  const shimmerClass = shimmer ? "skeleton-shimmer" : "";

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden shrink-0 border transition-colors ${variantClass} ${shimmerClass} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        backgroundColor: "var(--skeleton-base)",
        borderColor: "var(--skeleton-border)",
        ...style,
      }}
      {...props}
    />
  );
}
