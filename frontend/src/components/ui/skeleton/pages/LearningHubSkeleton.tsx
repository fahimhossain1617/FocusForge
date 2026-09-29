import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function LearningHubSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading skill builder"
      role="status"
      className="fade-in max-w-6xl mx-auto flex flex-col gap-6 pb-12"
    >
      {/* Header Row: Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton variant="rounded" className="h-7 w-40 rounded-lg" />
          <Skeleton variant="rounded" className="h-4 w-60 max-w-full rounded-md" />
        </div>

        {/* Actions: Search bar & New Skill Button */}
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" className="h-10 w-48 sm:w-64 rounded-xl" />
          <Skeleton variant="rounded" className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Grid of Skill Cards (Inspired by Image 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <SkeletonCard
            key={idx}
            className="p-5 flex flex-col justify-between rounded-2xl min-h-[190px]"
          >
            <div>
              {/* Card Header: Squircle Badge + Title + Action */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <Skeleton variant="rounded" className="w-11 h-11 rounded-xl shrink-0" />
                  <div className="space-y-1">
                    <Skeleton variant="rounded" className="h-5 w-28 rounded-md" />
                    <Skeleton variant="rounded" className="h-3 w-16 rounded-md" />
                  </div>
                </div>
                <SkeletonCircle size={28} />
              </div>

              {/* Progress & Time */}
              <div className="my-3 space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton variant="rounded" className="h-3 w-16" />
                  <Skeleton variant="rounded" className="h-3 w-12" />
                </div>
                <Skeleton variant="rounded" className="h-1.5 w-full rounded-full" />
              </div>
            </div>

            {/* Bullets Grid */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-2 gap-2">
              <Skeleton variant="rounded" className="h-3 w-20" />
              <Skeleton variant="rounded" className="h-3 w-18" />
              <Skeleton variant="rounded" className="h-3 w-16" />
              <Skeleton variant="rounded" className="h-3 w-22" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
