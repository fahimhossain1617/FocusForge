import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function FocusSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading focus session" role="status" className="fade-in max-w-2xl mx-auto space-y-6 pb-12">
      {/* 1. Setup Header */}
      <div className="pb-1 space-y-1">
        <Skeleton variant="rounded" className="h-6 w-36" />
        <Skeleton variant="rounded" className="h-4 w-72 max-w-full" />
      </div>

      {/* 2. Task Selection Card */}
      <SkeletonCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkeletonCircle size={18} />
            <Skeleton variant="rounded" className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-1">
            <SkeletonCircle size={14} />
            <Skeleton variant="rounded" className="h-3 w-16" />
          </div>
        </div>

        {/* Task Selection Button */}
        <Skeleton variant="rounded" className="h-12 w-full rounded-xl" />

        {/* Custom Task Input Field */}
        <Skeleton variant="rounded" className="h-10 w-full rounded-xl" />
      </SkeletonCard>

      {/* 3. Timer Presets Card */}
      <SkeletonCard className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <SkeletonCircle size={18} />
          <Skeleton variant="rounded" className="h-4 w-28" />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton variant="rounded" className="h-10 w-16 rounded-xl" />
          <Skeleton variant="rounded" className="h-10 w-16 rounded-xl" />
          <Skeleton variant="rounded" className="h-10 w-16 rounded-xl" />
          <Skeleton variant="rounded" className="h-10 w-36 rounded-xl" />
        </div>
      </SkeletonCard>

      {/* 4. Start Focus Button */}
      <Skeleton variant="rounded" className="h-14 w-full rounded-2xl shadow-lg" />
    </div>
  );
}
