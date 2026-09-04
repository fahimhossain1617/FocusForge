import React from "react";

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export default function SkeletonCard({
  children,
  className = "",
  elevated = false,
  style,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-colors ${
        elevated ? "card-elevated" : "card"
      } ${className}`}
      style={{
        backgroundColor: elevated ? "var(--color-bg-elevated)" : "var(--color-bg-card)",
        borderColor: "var(--color-border-subtle)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
