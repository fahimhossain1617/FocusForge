import React from "react";
import Skeleton from "./Skeleton";

export interface SkeletonTextProps {
  lines?: number;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  lastLineWidth?: string;
  className?: string;
  gap?: string;
}

const sizeHeights: Record<string, string> = {
  xs: "h-2.5",
  sm: "h-3.5",
  base: "h-4",
  lg: "h-5",
  xl: "h-6",
  "2xl": "h-8",
  "3xl": "h-10",
};

export default function SkeletonText({
  lines = 2,
  size = "base",
  lastLineWidth = "65%",
  className = "",
  gap = "space-y-2",
}: SkeletonTextProps) {
  const heightClass = sizeHeights[size] || "h-4";

  return (
    <div aria-hidden="true" className={`w-full flex flex-col ${gap} ${className}`}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        return (
          <Skeleton
            key={index}
            variant="rounded"
            className={`w-full ${heightClass}`}
            style={isLast && lines > 1 ? { width: lastLineWidth } : undefined}
          />
        );
      })}
    </div>
  );
}
