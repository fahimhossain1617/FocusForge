import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function SettingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading settings" className="fade-in max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="rounded" className="h-9 w-36" />
        <Skeleton variant="rounded" className="h-4 w-64" />
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border-subtle)" }}>
        <Skeleton variant="rounded" className="h-8 w-24 rounded-xl" />
        <Skeleton variant="rounded" className="h-8 w-28 rounded-xl" />
        <Skeleton variant="rounded" className="h-8 w-20 rounded-xl" />
        <Skeleton variant="rounded" className="h-8 w-24 rounded-xl" />
        <Skeleton variant="rounded" className="h-8 w-20 rounded-xl" />
      </div>

      {/* Main Settings Card */}
      <SkeletonCard className="p-6 sm:p-8 space-y-6">
        <Skeleton variant="rounded" className="h-6 w-36 mb-4" />

        {/* Setting Option Rows */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="flex items-center justify-between py-4 border-b border-black/5 dark:border-white/5 last:border-0"
          >
            <div className="space-y-1.5 flex-1 pr-6">
              <Skeleton variant="rounded" className="h-4 w-44 sm:w-60" />
              <Skeleton variant="rounded" className="h-3 w-56 sm:w-80" />
            </div>

            {/* Toggle switch placeholder */}
            <div className="w-12 h-6 rounded-full border shrink-0" style={{ background: "var(--skeleton-base)", borderColor: "var(--skeleton-border)" }}>
              <div className="w-4 h-4 m-1 rounded-full bg-blue-500/20" />
            </div>
          </div>
        ))}
      </SkeletonCard>
    </div>
  );
}
