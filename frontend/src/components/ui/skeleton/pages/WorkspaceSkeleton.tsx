import React from "react";
import Skeleton from "../Skeleton";
import SkeletonText from "../SkeletonText";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading notes and files" role="status" className="fade-in max-w-7xl mx-auto flex flex-col pb-16 space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Skeleton variant="rounded" className="h-6 w-36" />
            <Skeleton variant="rounded" className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton variant="rounded" className="h-4 w-72 sm:w-96 max-w-full" />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Skeleton variant="rounded" className="h-10 flex-1 md:w-72 rounded-xl" />
          <Skeleton variant="rounded" className="h-10 w-28 rounded-xl shrink-0" />
        </div>
      </div>

      {/* 2. Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {["All", "Programming", "Study", "Personal", "Project", "Ideas"].map((cat, idx) => (
          <Skeleton key={idx} variant="rounded" className="h-7 w-20 rounded-xl shrink-0" />
        ))}
      </div>

      {/* 3. Note Cards Grid (4-column responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
          <SkeletonCard key={idx} className="h-44 flex flex-col justify-between p-4 relative overflow-hidden">
            {/* Top row: Category badge + action */}
            <div className="flex items-center justify-between">
              <Skeleton variant="rounded" className="h-4 w-20 rounded-md" />
              <SkeletonCircle size={18} />
            </div>

            {/* Note Content */}
            <div className="space-y-2.5 pt-2">
              <Skeleton variant="rounded" className="h-5 w-4/5" />
              <SkeletonText lines={3} size="sm" lastLineWidth="60%" />
            </div>

            {/* Card Footer: Timestamp & actions */}
            <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
              <Skeleton variant="rounded" className="h-3 w-24" />
              <div className="flex items-center gap-2">
                <SkeletonCircle size={16} />
                <SkeletonCircle size={16} />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
