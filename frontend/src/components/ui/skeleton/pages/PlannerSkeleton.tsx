import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function PlannerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading planner" className="fade-in max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" className="h-9 w-40" />
          <div className="flex items-center gap-1">
            <SkeletonCircle size={32} />
            <SkeletonCircle size={32} />
          </div>
          <Skeleton variant="rounded" className="h-8 w-16 rounded-lg" />
        </div>

        <Skeleton variant="rounded" className="h-10 w-32 rounded-xl" />
      </div>

      {/* Weekday Strip */}
      <div className="grid grid-cols-7 gap-2 p-2 rounded-2xl border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border-subtle)" }}>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div key={day} className="flex flex-col items-center py-2 space-y-1">
            <Skeleton variant="rounded" className="h-3 w-8" />
            <Skeleton variant="rounded" className="h-5 w-6" />
          </div>
        ))}
      </div>

      {/* 2-Column Layout: Calendar Grid + Daily Timeblocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid Card */}
        <SkeletonCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton variant="rounded" className="h-5 w-28" />
            <div className="flex items-center gap-1">
              <SkeletonCircle size={24} />
              <SkeletonCircle size={24} />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                className="h-8 w-full rounded-lg"
              />
            ))}
          </div>
        </SkeletonCard>

        {/* Daily Timeblocks Schedule */}
        <SkeletonCard className="lg:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton variant="rounded" className="h-5 w-36" />
            <Skeleton variant="rounded" className="h-4 w-20" />
          </div>

          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((block) => (
              <div
                key={block}
                className="flex items-center justify-between p-3.5 rounded-xl border border-black/5 dark:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <Skeleton variant="rounded" className="h-4 w-16" />
                  <div className="space-y-1">
                    <Skeleton variant="rounded" className="h-4 w-44 sm:w-64" />
                    <Skeleton variant="rounded" className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton variant="rounded" className="h-6 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
