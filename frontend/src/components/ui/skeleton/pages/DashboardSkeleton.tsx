import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function DashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading Dashboard"
      role="status"
      className="w-full max-w-[1680px] mx-auto pb-16 space-y-6 select-none fade-in"
    >
      {/* 1. Header: Greeting & Subtitle */}
      <div className="pt-2 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton variant="rounded" className="h-8 sm:h-10 w-72 sm:w-96 max-w-full" />
          <Skeleton variant="rounded" className="h-4 w-60 sm:w-80 max-w-full" />
        </div>
      </div>

      {/* 2. Top 3 Balanced Cards Grid (Today's Tasks, Today's Focus, Current Skills) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Card 1: Today's Tasks */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between border"
          style={{
            background: "linear-gradient(145deg, rgba(16, 22, 36, 0.95), rgba(11, 15, 26, 0.98))",
            borderColor: "rgba(59, 130, 246, 0.12)",
          }}
        >
          <div>
            {/* Header: Title + Subtitle + Plus button */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
              <div className="space-y-1">
                <Skeleton variant="rounded" className="h-5 w-32" />
                <Skeleton variant="rounded" className="h-3 w-44" />
              </div>
              <Skeleton variant="rounded" className="w-8 h-8 rounded-xl" />
            </div>

            {/* 5 Task Items */}
            <div className="mt-3 space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-2.5 py-1.5 px-2">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <SkeletonCircle size={20} />
                    <Skeleton variant="rounded" className="h-3.5 flex-1 max-w-[190px]" />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Skeleton variant="rounded" className="h-3 w-16 hidden sm:block" />
                    <SkeletonCircle size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Today's Focus (Radial Donut Gauge + Breakdown + Distractions) */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between border"
          style={{
            background: "linear-gradient(145deg, rgba(16, 22, 36, 0.95), rgba(11, 15, 26, 0.98))",
            borderColor: "rgba(59, 130, 246, 0.12)",
          }}
        >
          <div>
            {/* Header */}
            <div className="pb-3 border-b border-black/5 dark:border-white/5 space-y-1">
              <Skeleton variant="rounded" className="h-5 w-32" />
              <Skeleton variant="rounded" className="h-3 w-40" />
            </div>

            {/* Center Donut Ring and Breakdown */}
            <div className="mt-4 flex items-center justify-between gap-5">
              {/* Radial Donut Ring Placeholder */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-8 border-blue-500/10 dark:border-white/5 flex items-center justify-center">
                  <Skeleton variant="rounded" className="h-5 w-14" />
                </div>
              </div>

              {/* Focus & Break Breakdown */}
              <div className="flex-1 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circle" className="w-2.5 h-2.5 bg-blue-500/40" />
                    <Skeleton variant="rounded" className="h-3.5 w-18" />
                  </div>
                  <Skeleton variant="rounded" className="h-3.5 w-12" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circle" className="w-2.5 h-2.5 bg-amber-500/40" />
                    <Skeleton variant="rounded" className="h-3.5 w-18" />
                  </div>
                  <Skeleton variant="rounded" className="h-3.5 w-12" />
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Distractions Footer */}
          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <SkeletonCircle size={14} />
              <Skeleton variant="rounded" className="h-3 w-28" />
            </div>
            <Skeleton variant="rounded" className="h-3 w-20" />
          </div>
        </div>

        {/* Card 3: Current Skills (Inline Progress Bars) */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between border"
          style={{
            background: "linear-gradient(145deg, rgba(16, 22, 36, 0.95), rgba(11, 15, 26, 0.98))",
            borderColor: "rgba(59, 130, 246, 0.12)",
          }}
        >
          <div>
            {/* Header: Title + Subtitle + Plus button */}
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="space-y-1">
                <Skeleton variant="rounded" className="h-5 w-32" />
                <Skeleton variant="rounded" className="h-3 w-36" />
              </div>
              <Skeleton variant="rounded" className="w-8 h-8 rounded-xl" />
            </div>

            {/* Skills List: Same-line layout with inline progress bar */}
            <div className="mt-3 space-y-3">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center gap-3 py-1 px-1">
                  <Skeleton variant="rounded" className="w-6 h-6 rounded-lg shrink-0" />
                  <Skeleton variant="rounded" className="h-3.5 w-20 shrink-0" />
                  <Skeleton variant="rounded" className="h-2 flex-1 rounded-full" />
                  <Skeleton variant="rounded" className="h-3 w-8 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: Focus & Productivity Progress (Weekly Bar Chart) */}
      <div
        className="rounded-2xl p-5 sm:p-7 border space-y-6"
        style={{
          background: "linear-gradient(145deg, rgba(16, 22, 36, 0.95), rgba(11, 15, 26, 0.98))",
          borderColor: "rgba(59, 130, 246, 0.12)",
        }}
      >
        {/* Header Bar: Icon + Title + Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <Skeleton variant="rounded" className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1">
              <Skeleton variant="rounded" className="h-5 w-56" />
              <Skeleton variant="rounded" className="h-3 w-72 max-w-full" />
            </div>
          </div>

          <Skeleton variant="rounded" className="h-8 w-36 rounded-xl shrink-0" />
        </div>

        {/* Legend Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-4 w-32" />
            <Skeleton variant="rounded" className="h-3 w-40 hidden sm:block" />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Skeleton variant="circle" className="w-2.5 h-2.5" />
              <Skeleton variant="rounded" className="h-3 w-16" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton variant="circle" className="w-2.5 h-2.5" />
              <Skeleton variant="rounded" className="h-3 w-16" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton variant="circle" className="w-2.5 h-2.5" />
              <Skeleton variant="rounded" className="h-3 w-16" />
            </div>
          </div>
        </div>

        {/* 7-Day Scaled Bar Chart */}
        <div className="pt-6 pb-2 min-h-[240px] flex items-end justify-between gap-2 sm:gap-6 border-b border-black/5 dark:border-white/5 px-1 sm:px-4">
          {[
            { focus: 85, done: 65, missed: 20 },
            { focus: 60, done: 45, missed: 0 },
            { focus: 95, done: 80, missed: 15 },
            { focus: 50, done: 40, missed: 30 },
            { focus: 75, done: 70, missed: 0 },
            { focus: 90, done: 85, missed: 10 },
            { focus: 40, done: 30, missed: 0 },
          ].map((bar, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton variant="rounded" className="h-3 w-8 sm:w-10" />

              {/* 3 Column Bars */}
              <div className="flex items-end justify-center gap-1 sm:gap-1.5 h-36 w-full max-w-[62px]">
                <Skeleton
                  variant="rounded"
                  className="w-3.5 sm:w-4.5 rounded-sm"
                  style={{ height: `${bar.focus}%` }}
                />
                <Skeleton
                  variant="rounded"
                  className="w-3.5 sm:w-4.5 rounded-sm"
                  style={{ height: `${bar.done}%` }}
                />
                <Skeleton
                  variant="rounded"
                  className="w-3.5 sm:w-4.5 rounded-sm"
                  style={{ height: `${bar.missed > 0 ? bar.missed : 4}%` }}
                />
              </div>

              {/* Day & Date */}
              <div className="space-y-1 text-center pt-2">
                <Skeleton variant="rounded" className="h-3.5 w-7 mx-auto" />
                <Skeleton variant="rounded" className="h-2.5 w-9 mx-auto" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom 3 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="p-4 rounded-xl border space-y-1.5"
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              <Skeleton variant="rounded" className="h-3 w-28" />
              <Skeleton variant="rounded" className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
