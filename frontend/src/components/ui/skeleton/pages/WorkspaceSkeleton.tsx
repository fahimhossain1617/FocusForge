import React from "react";
import Skeleton from "../Skeleton";
import SkeletonText from "../SkeletonText";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading workspace notes" className="fade-in max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Skeleton variant="rounded" className="h-9 w-32" />
          <Skeleton variant="rounded" className="h-4 w-72 sm:w-96" />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Skeleton variant="rounded" className="h-10 flex-1 md:w-64 rounded-xl" />
          <Skeleton variant="rounded" className="h-10 w-28 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Note Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
          <SkeletonCard key={idx} className="h-56 flex flex-col justify-between p-5 relative overflow-hidden">
            {/* Ambient orb top-right */}
            <div className="absolute top-2 right-2">
              <SkeletonCircle size={18} />
            </div>

            {/* Note Content Simulation */}
            <div className="space-y-3 pt-2">
              <Skeleton variant="rounded" className="h-5 w-3/4" />
              <SkeletonText lines={3} size="sm" lastLineWidth="50%" />
            </div>

            {/* Note Card Footer */}
            <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
              <Skeleton variant="rounded" className="h-3 w-20" />
              <div className="flex items-center gap-2">
                <SkeletonCircle size={14} />
                <SkeletonCircle size={14} />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
