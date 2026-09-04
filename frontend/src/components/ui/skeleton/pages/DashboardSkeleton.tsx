import React from "react";
import Skeleton from "../Skeleton";
import SkeletonText from "../SkeletonText";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="fade-in max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          {/* Greeting */}
          <Skeleton variant="rounded" className="h-9 w-64 sm:w-80" />
          {/* Subtitle / Date */}
          <Skeleton variant="rounded" className="h-4 w-48 sm:w-60" />
        </div>

        {/* Streak Pill */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-full border shrink-0"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <SkeletonCircle size={24} />
          <div className="space-y-1.5">
            <Skeleton variant="rounded" className="h-2.5 w-16" />
            <Skeleton variant="rounded" className="h-4 w-12" />
          </div>
        </div>
      </div>

      {/* Row 1: 3 Key Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Today's Focus */}
        <SkeletonCard className="h-36 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton variant="rounded" className="h-3.5 w-24" />
            <SkeletonCircle size={18} />
          </div>
          <div className="space-y-2">
            <Skeleton variant="rounded" className="h-7 w-32" />
            <Skeleton variant="rounded" className="h-3 w-40" />
          </div>
          <Skeleton variant="rounded" className="h-1.5 w-full rounded-full" />
        </SkeletonCard>

        {/* Card 2: Daily Big 3 */}
        <SkeletonCard className="h-36 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton variant="rounded" className="h-3.5 w-24" />
            <SkeletonCircle size={18} />
          </div>
          <div className="space-y-2">
            <Skeleton variant="rounded" className="h-7 w-20" />
            <Skeleton variant="rounded" className="h-3 w-36" />
          </div>
          <Skeleton variant="rounded" className="h-1.5 w-full rounded-full" />
        </SkeletonCard>

        {/* Card 3: Productive Time */}
        <SkeletonCard className="h-36 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton variant="rounded" className="h-3.5 w-28" />
            <SkeletonCircle size={18} />
          </div>
          <div className="space-y-2">
            <Skeleton variant="rounded" className="h-7 w-28" />
            <Skeleton variant="rounded" className="h-3 w-44" />
          </div>
          <Skeleton variant="rounded" className="h-1.5 w-full rounded-full" />
        </SkeletonCard>
      </div>

      {/* Row 2: Weekly Activity Chart + Next Focus Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Productivity Chart Skeleton */}
        <SkeletonCard className="lg:col-span-2 min-h-[340px] flex flex-col justify-between">
          {/* Chart Header & Tab Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1.5">
              <Skeleton variant="rounded" className="h-5 w-40" />
              <Skeleton variant="rounded" className="h-3 w-28" />
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-white/5 bg-black/5 dark:bg-white/5">
              <Skeleton variant="rounded" className="h-7 w-16 rounded-lg" />
              <Skeleton variant="rounded" className="h-7 w-16 rounded-lg" />
            </div>
          </div>

          {/* Simulated Chart Bars */}
          <div className="flex items-end justify-between gap-3 h-48 px-4 pb-2 border-b border-black/5 dark:border-white/5">
            {[45, 65, 80, 50, 95, 70, 30].map((heightPct, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <Skeleton
                  variant="rounded"
                  className="w-full max-w-[36px] rounded-t-lg"
                  style={{ height: `${heightPct}%` }}
                />
                <Skeleton variant="rounded" className="h-3 w-6" />
              </div>
            ))}
          </div>

          {/* Chart Summary Footnote */}
          <div className="flex items-center justify-between pt-4 text-xs">
            <Skeleton variant="rounded" className="h-3.5 w-32" />
            <Skeleton variant="rounded" className="h-3.5 w-24" />
          </div>
        </SkeletonCard>

        {/* Next Focus Task Card */}
        <SkeletonCard className="flex flex-col justify-between min-h-[340px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton variant="rounded" className="h-4 w-28" />
              <Skeleton variant="rounded" className="h-6 w-16 rounded-full" />
            </div>

            <SkeletonText lines={3} size="base" lastLineWidth="70%" />

            <div className="pt-2 flex items-center gap-2">
              <Skeleton variant="rounded" className="h-6 w-20 rounded-md" />
              <Skeleton variant="rounded" className="h-6 w-24 rounded-md" />
            </div>
          </div>

          <div className="pt-6 border-t border-black/5 dark:border-white/5">
            <Skeleton variant="rounded" className="h-10 w-full rounded-xl" />
          </div>
        </SkeletonCard>
      </div>

      {/* Row 3: Today's Tasks List + Distractions Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tasks List */}
        <SkeletonCard className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <Skeleton variant="rounded" className="h-5 w-32" />
            <Skeleton variant="rounded" className="h-3.5 w-16" />
          </div>

          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between p-3 rounded-xl border border-black/5 dark:border-white/5"
            >
              <div className="flex items-center gap-3">
                <SkeletonCircle size={18} />
                <div className="space-y-1">
                  <Skeleton variant="rounded" className="h-4 w-36 sm:w-56" />
                  <Skeleton variant="rounded" className="h-3 w-20" />
                </div>
              </div>
              <Skeleton variant="rounded" className="h-6 w-14 rounded-md" />
            </div>
          ))}
        </SkeletonCard>

        {/* Distraction Log Card */}
        <SkeletonCard className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <Skeleton variant="rounded" className="h-5 w-36" />
            <Skeleton variant="rounded" className="h-3.5 w-16" />
          </div>

          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between p-3 rounded-xl border border-black/5 dark:border-white/5"
            >
              <div className="flex items-center gap-2.5">
                <SkeletonCircle size={16} />
                <Skeleton variant="rounded" className="h-4 w-40 sm:w-60" />
              </div>
              <Skeleton variant="rounded" className="h-3 w-12" />
            </div>
          ))}
        </SkeletonCard>
      </div>
    </div>
  );
}
