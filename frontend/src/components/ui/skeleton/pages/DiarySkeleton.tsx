import React from "react";
import Skeleton from "../Skeleton";
import SkeletonText from "../SkeletonText";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function DiarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading Diary" className="fade-in max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header / Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" className="h-8 w-28 rounded-xl" />
          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          <Skeleton variant="rounded" className="h-6 w-36" />
        </div>

        <div className="flex items-center gap-2">
          <SkeletonCircle size={36} />
          <Skeleton variant="rounded" className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Index Book / Topic View Skeleton Surface */}
      <div className="rounded-2xl border p-5 sm:p-8" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border-subtle)" }}>
        {/* Diary Topic Banner */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-6 w-10 text-blue-500" />
            <Skeleton variant="rounded" className="h-8 w-60 sm:w-80" />
          </div>
          <Skeleton variant="rounded" className="h-4 w-40" />
        </div>

        {/* Realistic Ruled Notebook Writing Surface Simulation */}
        <div className="relative rounded-2xl border p-6 sm:p-10 space-y-7 overflow-hidden" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
          {/* Lined notebook rows simulation */}
          {[1, 2, 3, 4, 5, 6, 7].map((line) => (
            <div key={line} className="w-full pb-2 border-b border-blue-500/10 dark:border-white/5">
              <Skeleton
                variant="rounded"
                className="h-4"
                style={{
                  width: line === 1 ? "40%" : line === 7 ? "55%" : `${80 + (line % 3) * 8}%`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
