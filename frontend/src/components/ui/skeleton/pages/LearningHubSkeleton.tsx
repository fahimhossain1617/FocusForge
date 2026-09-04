import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function LearningHubSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading learning hub" className="fade-in max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton variant="rounded" className="h-9 w-44" />
          <Skeleton variant="rounded" className="h-4 w-72" />
        </div>

        <Skeleton variant="rounded" className="h-10 w-32 rounded-xl shrink-0" />
      </div>

      {/* Stats Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((idx) => (
          <SkeletonCard key={idx} className="p-5 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton variant="rounded" className="h-3 w-20" />
              <Skeleton variant="rounded" className="h-6 w-14" />
            </div>
            <SkeletonCircle size={40} />
          </SkeletonCard>
        ))}
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((idx) => (
          <SkeletonCard key={idx} className="h-48 flex flex-col justify-between p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SkeletonCircle size={32} />
                <Skeleton variant="rounded" className="h-4 w-12 rounded-md" />
              </div>
              <Skeleton variant="rounded" className="h-5 w-32" />
              <Skeleton variant="rounded" className="h-3 w-20" />
            </div>

            <div className="space-y-2 pt-3 border-t border-black/5 dark:border-white/5">
              <div className="flex justify-between text-xs">
                <Skeleton variant="rounded" className="h-3 w-16" />
                <Skeleton variant="rounded" className="h-3 w-8" />
              </div>
              <Skeleton variant="rounded" className="h-1.5 w-full rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
