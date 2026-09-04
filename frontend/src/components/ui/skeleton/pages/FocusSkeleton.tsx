import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function FocusSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading focus session" className="fade-in max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <Skeleton variant="rounded" className="h-8 w-44 mx-auto" />
        <Skeleton variant="rounded" className="h-4 w-64 mx-auto" />
      </div>

      {/* Main Focus Timer Container Card */}
      <SkeletonCard className="p-8 sm:p-12 flex flex-col items-center justify-center space-y-8">
        {/* Task Selector Placeholder */}
        <div className="w-full max-w-sm">
          <Skeleton variant="rounded" className="h-11 w-full rounded-xl" />
        </div>

        {/* Circular Timer Ring Placeholder */}
        <div className="relative w-56 h-56 flex items-center justify-center">
          {/* Subtle Outer Ring */}
          <div className="w-52 h-52 rounded-full border-4 border-blue-500/10 dark:border-white/5 flex items-center justify-center">
            {/* Center Digits & Mode */}
            <div className="flex flex-col items-center space-y-2">
              <Skeleton variant="rounded" className="h-10 w-28" />
              <Skeleton variant="rounded" className="h-3 w-16" />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" className="h-11 w-28 rounded-xl" />
          <Skeleton variant="rounded" className="h-11 w-24 rounded-xl" />
        </div>

        {/* Preset Durations */}
        <div className="flex items-center gap-2 pt-2">
          <Skeleton variant="rounded" className="h-8 w-16 rounded-lg" />
          <Skeleton variant="rounded" className="h-8 w-16 rounded-lg" />
          <Skeleton variant="rounded" className="h-8 w-16 rounded-lg" />
        </div>
      </SkeletonCard>

      {/* Bottom Distraction Helper */}
      <div className="flex justify-center">
        <Skeleton variant="rounded" className="h-9 w-40 rounded-xl" />
      </div>
    </div>
  );
}
