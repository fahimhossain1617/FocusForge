import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function LearningHubSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading skill builder" role="status" className="fade-in max-w-6xl mx-auto flex flex-col md:flex-row gap-6 pb-12">
      {/* LEFT PANE: Folders List (1/3) */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div className="mb-2 space-y-1">
          <Skeleton variant="rounded" className="h-6 w-36" />
          <Skeleton variant="rounded" className="h-4 w-52 max-w-full" />
        </div>

        {/* Create Folder Form */}
        <div className="flex gap-2">
          <Skeleton variant="rounded" className="h-10 flex-1 rounded-xl" />
          <Skeleton variant="rounded" className="h-10 w-10 rounded-xl shrink-0" />
        </div>

        {/* Folder List Items */}
        <div className="flex flex-col gap-2 mt-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 p-3.5 rounded-xl border"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              <SkeletonCircle size={20} />
              <Skeleton variant="rounded" className="h-4 flex-1" />
              <SkeletonCircle size={16} />
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANE: Workspace / Selected Folder (2/3) */}
      <div className="w-full md:w-2/3 flex flex-col gap-4">
        {/* Workspace Card Header */}
        <SkeletonCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton variant="rounded" className="h-6 w-44" />
            <Skeleton variant="rounded" className="h-3.5 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-8 w-24 rounded-xl" />
            <Skeleton variant="rounded" className="h-8 w-8 rounded-xl" />
          </div>
        </SkeletonCard>

        {/* Stats Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((idx) => (
            <SkeletonCard key={idx} className="p-4 flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton variant="rounded" className="h-3 w-16" />
                <Skeleton variant="rounded" className="h-6 w-20" />
              </div>
              <SkeletonCircle size={32} />
            </SkeletonCard>
          ))}
        </div>

        {/* Log Activity Form Card */}
        <SkeletonCard className="p-5 space-y-4">
          <Skeleton variant="rounded" className="h-5 w-36" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton variant="rounded" className="h-10 w-full rounded-xl" />
            <Skeleton variant="rounded" className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton variant="rounded" className="h-16 w-full rounded-xl" />
          <Skeleton variant="rounded" className="h-10 w-32 rounded-xl ml-auto" />
        </SkeletonCard>
      </div>
    </div>
  );
}
