import React from "react";
import Skeleton from "../Skeleton";
import SkeletonText from "../SkeletonText";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile" className="fade-in max-w-5xl mx-auto space-y-8 pb-16">
      {/* 1. Profile Header Banner */}
      <SkeletonCard className="p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Large Avatar Placeholder */}
          <div className="relative shrink-0">
            <SkeletonCircle size={100} />
            <div className="absolute bottom-0 right-0">
              <SkeletonCircle size={28} />
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <Skeleton variant="rounded" className="h-7 w-48 mx-auto sm:mx-0" />
                <Skeleton variant="rounded" className="h-4 w-36 mx-auto sm:mx-0" />
              </div>
              <Skeleton variant="rounded" className="h-9 w-24 rounded-xl mx-auto sm:mx-0" />
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
              <Skeleton variant="rounded" className="h-6 w-28 rounded-full" />
              <Skeleton variant="rounded" className="h-6 w-32 rounded-full" />
            </div>
          </div>
        </div>
      </SkeletonCard>

      {/* 2. Completion Progress Bar */}
      <SkeletonCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="rounded" className="h-4 w-36" />
          <Skeleton variant="rounded" className="h-4 w-12" />
        </div>
        <Skeleton variant="rounded" className="h-2 w-full rounded-full" />
      </SkeletonCard>

      {/* 3. Form Grid: Personal Info + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Card */}
        <SkeletonCard className="p-6 space-y-5">
          <Skeleton variant="rounded" className="h-5 w-36 mb-2" />

          {[1, 2, 3, 4].map((field) => (
            <div key={field} className="space-y-2">
              <Skeleton variant="rounded" className="h-3.5 w-24" />
              <Skeleton variant="rounded" className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </SkeletonCard>

        {/* Security & Stats Card */}
        <SkeletonCard className="p-6 space-y-5">
          <Skeleton variant="rounded" className="h-5 w-40 mb-2" />

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-2">
              <Skeleton variant="rounded" className="h-3 w-16" />
              <Skeleton variant="rounded" className="h-6 w-12" />
            </div>
            <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-2">
              <Skeleton variant="rounded" className="h-3 w-20" />
              <Skeleton variant="rounded" className="h-6 w-14" />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-black/5 dark:border-white/5">
            <Skeleton variant="rounded" className="h-4 w-28" />
            <SkeletonText lines={2} size="xs" />
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
