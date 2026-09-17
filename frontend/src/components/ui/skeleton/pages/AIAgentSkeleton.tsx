import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function AIAgentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading AI Agent" role="status" className="fade-in w-full h-full flex flex-col justify-between p-4 sm:p-6 max-w-5xl mx-auto overflow-hidden">
      {/* 1. Header with Model Selector */}
      <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" className="h-6 w-48" />
          <Skeleton variant="rounded" className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rounded" className="h-8 w-28 rounded-xl hidden sm:block" />
          <SkeletonCircle size={32} />
        </div>
      </div>

      {/* 2. Hero Greeting & Quick Suggestions */}
      <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-6 max-w-2xl mx-auto w-full text-center">
        {/* Agent Avatar Icon */}
        <div className="relative">
          <SkeletonCircle size={64} />
        </div>

        <div className="space-y-2 w-full flex flex-col items-center">
          <Skeleton variant="rounded" className="h-7 w-64" />
          <Skeleton variant="rounded" className="h-4 w-80 max-w-full" />
        </div>

        {/* Quick Action Chips Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-4">
          {[1, 2, 3, 4].map((chip) => (
            <SkeletonCard key={chip} className="p-3.5 flex items-center gap-3">
              <SkeletonCircle size={18} />
              <Skeleton variant="rounded" className="h-3.5 flex-1" />
            </SkeletonCard>
          ))}
        </div>
      </div>

      {/* 3. Bottom Prompt Input Bar */}
      <div className="w-full max-w-3xl mx-auto pt-2">
        <div
          className="p-3 sm:p-4 rounded-2xl border space-y-3"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          {/* Textarea Input area */}
          <div className="space-y-2 py-1">
            <Skeleton variant="rounded" className="h-4 w-3/4" />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Skeleton variant="rounded" className="h-7 w-28 rounded-lg" />
              <Skeleton variant="rounded" className="h-7 w-20 rounded-lg hidden sm:block" />
            </div>

            <div className="flex items-center gap-2">
              <SkeletonCircle size={32} />
              <Skeleton variant="rounded" className="h-8 w-8 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
