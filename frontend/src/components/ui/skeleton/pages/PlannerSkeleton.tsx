import React from "react";
import Skeleton from "../Skeleton";
import SkeletonCircle from "../SkeletonCircle";
import SkeletonCard from "../SkeletonCard";

export default function PlannerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading planner" role="status" className="fade-in max-w-6xl mx-auto space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="pb-1 space-y-1">
        <Skeleton variant="rounded" className="h-6 w-36" />
        <Skeleton variant="rounded" className="h-4 w-64 max-w-full" />
      </div>

      {/* 2. Quick Day Nav & Toolbar */}
      <div className="planner-toolbar flex flex-col sm:flex-row items-center justify-between gap-3 p-2 w-full mb-6 sm:mb-8">
        {/* Quick Day Navigation (Carousel) */}
        <div className="planner-day-tabs flex items-center p-1 relative w-full max-w-[320px] h-[36px] justify-between">
          <Skeleton variant="rounded" className="h-7 w-20 rounded-full" />
          <Skeleton variant="rounded" className="h-7 w-24 rounded-full" />
          <Skeleton variant="rounded" className="h-7 w-20 rounded-full" />
        </div>

        {/* Month Nav + Mini Calendar Picker */}
        <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
          <SkeletonCircle size={28} />
          <Skeleton variant="rounded" className="h-5 w-36" />
          <SkeletonCircle size={28} />
          <SkeletonCircle size={28} />
        </div>
      </div>

      {/* 3. Monthly Calendar Grid */}
      <div className="planner-calendar overflow-hidden flex flex-col mb-8 rounded-2xl border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border-subtle)" }}>
        {/* Weekday Headers */}
        <div className="planner-weekdays grid grid-cols-7 p-2 sm:p-4 gap-1 sm:gap-2 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
          {["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"].map((day, idx) => (
            <div key={idx} className="text-center flex justify-center">
              <Skeleton variant="rounded" className="h-6 w-12 sm:w-16 rounded-full" />
            </div>
          ))}
        </div>

        {/* 35 Calendar Cells (7 cols x 5 rows) */}
        <div className="grid grid-cols-7 gap-[1px] bg-black/10 dark:bg-white/5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[56px] sm:min-h-[90px] md:min-h-[115px] p-1.5 sm:p-2.5 flex flex-col justify-between sm:justify-start gap-1"
              style={{ background: "var(--color-bg-card)" }}
            >
              <div className="flex items-center justify-between">
                <Skeleton variant="circle" className="w-5 h-5 sm:w-6 sm:h-6" />
                <Skeleton variant="circle" className="hidden sm:block w-4 h-4 opacity-40" />
              </div>
              {/* Task badges placeholder (for some cells) */}
              {i % 2 === 0 && (
                <div className="hidden sm:flex flex-col gap-1 mt-1">
                  <Skeleton variant="rounded" className="h-3.5 w-full rounded-[4px]" />
                  {i % 4 === 0 && <Skeleton variant="rounded" className="h-3.5 w-3/4 rounded-[4px]" />}
                </div>
              )}
              {/* Mobile dot indicator */}
              {i % 2 === 0 && (
                <div className="sm:hidden flex justify-center gap-1 mt-auto">
                  <Skeleton variant="circle" className="w-1.5 h-1.5" />
                  {i % 4 === 0 && <Skeleton variant="circle" className="w-1.5 h-1.5" />}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Selected Day Highlights Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" className="w-2.5 h-2.5" />
            <Skeleton variant="rounded" className="h-5 w-52" />
          </div>
          <Skeleton variant="rounded" className="h-8 w-28 rounded-xl" />
        </div>

        {/* Highlights Horizontal Scroll Cards */}
        <div className="flex overflow-x-auto gap-4 pb-4">
          {[1, 2, 3].map((card) => (
            <SkeletonCard key={card} className="min-w-[280px] max-w-[320px] p-5 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <Skeleton variant="rounded" className="h-3.5 w-24" />
                <Skeleton variant="rounded" className="h-4 w-14 rounded-md" />
              </div>
              <Skeleton variant="rounded" className="h-6 w-3/4" />
              <div className="pt-2 flex items-center justify-between">
                <Skeleton variant="rounded" className="h-3.5 w-20" />
                <Skeleton variant="circle" className="w-4 h-4" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
