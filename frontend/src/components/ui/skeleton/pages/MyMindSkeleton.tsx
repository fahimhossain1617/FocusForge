import React from "react";
import Skeleton from "../Skeleton";
import SkeletonText from "../SkeletonText";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function MyMindSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading My Mind" className="fade-in max-w-2xl mx-auto space-y-8">
      {/* Header / Intro */}
      <div className="mb-8 text-center mt-4 space-y-2.5">
        <Skeleton variant="rounded" className="h-8 w-44 mx-auto" />
        <Skeleton variant="rounded" className="h-4 w-72 max-w-full mx-auto" />
      </div>

      {/* 4 Mode Option Buttons Row */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <Skeleton variant="rounded" className="h-8 w-28 rounded-xl" />
        <Skeleton variant="rounded" className="h-8 w-32 rounded-xl" />
        <Skeleton variant="rounded" className="h-8 w-32 rounded-xl" />
        <Skeleton variant="rounded" className="h-8 w-24 rounded-xl" />
      </div>

      {/* Main Thought Capture Box */}
      <div className="mb-8">
        <div
          className="rounded-2xl border transition-all relative pb-16 overflow-hidden"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          {/* Text input area */}
          <div className="p-5 space-y-2">
            <Skeleton variant="rounded" className="h-5 w-3/4" />
            <Skeleton variant="rounded" className="h-5 w-1/2" />
          </div>

          {/* Bottom Bar: Mic & Submit button */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between border-t"
            style={{
              background: "rgba(10, 14, 26, 0.4)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div className="flex items-center gap-2">
              <SkeletonCircle size={36} />
              <Skeleton variant="rounded" className="h-3 w-28 hidden sm:inline-block" />
            </div>

            <Skeleton variant="rounded" className="h-9 w-20 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Recent Thoughts Section */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="rounded" className="h-4 w-32" />
          <Skeleton variant="rounded" className="h-4 w-16" />
        </div>

        {[1, 2, 3].map((idx) => (
          <SkeletonCard key={idx} className="p-4 flex items-center justify-between">
            <div className="space-y-1.5 flex-1 pr-4">
              <Skeleton variant="rounded" className="h-4 w-5/6" />
              <Skeleton variant="rounded" className="h-3 w-24" />
            </div>
            <SkeletonCircle size={24} />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
