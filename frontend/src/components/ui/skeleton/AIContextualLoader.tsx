import React from "react";
import SkeletonText from "./SkeletonText";
import Skeleton from "./Skeleton";
import { Sparkles } from "lucide-react";

export interface AIContextualLoaderProps {
  label?: string;
  className?: string;
}

export default function AIContextualLoader({
  label = "Thinking...",
  className = "",
}: AIContextualLoaderProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`rounded-2xl border p-5 sm:p-6 transition-all fade-in ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(15, 23, 42, 0.6))",
        borderColor: "rgba(59, 130, 246, 0.2)",
      }}
    >
      {/* Header with pulsating AI sparkle icon and status label */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 animate-pulse">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-semibold tracking-wide text-blue-400">
            {label}
          </span>
        </div>

        {/* Subtle bouncing indicator dots */}
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
        </div>
      </div>

      {/* Simulated response content placeholder */}
      <div className="space-y-3">
        <SkeletonText lines={3} size="sm" lastLineWidth="75%" />
        <div className="pt-2 flex items-center gap-2">
          <Skeleton variant="rounded" className="h-6 w-20 rounded-md" />
          <Skeleton variant="rounded" className="h-6 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
