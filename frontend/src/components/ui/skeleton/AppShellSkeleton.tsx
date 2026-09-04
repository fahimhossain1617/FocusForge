import React from "react";
import Skeleton from "./Skeleton";
import SkeletonCircle from "./SkeletonCircle";
import PageSkeleton from "./PageSkeleton";

export interface AppShellSkeletonProps {
  page?: string;
}

export default function AppShellSkeleton({ page = "today" }: AppShellSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading application structure"
      className="flex min-h-screen overflow-x-hidden"
      style={{ background: "var(--bg-section-grad)" }}
    >
      {/* ============================================================ */}
      {/* 1. PERSISTENT SIDEBAR SKELETON (Desktop)                    */}
      {/* ============================================================ */}
      <aside
        aria-hidden="true"
        className="w-60 min-h-screen hidden md:flex flex-col py-6 px-3 fixed left-0 top-0 bottom-0 z-40 border-r"
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* User Profile Header Placeholder */}
        <div className="px-3 mb-6 min-h-[40px] flex items-center gap-2.5">
          <SkeletonCircle size={32} />
          <div className="space-y-1 flex-1">
            <Skeleton variant="rounded" className="h-4 w-28" />
            <Skeleton variant="rounded" className="h-2.5 w-16" />
          </div>
        </div>

        {/* Navigation Group Items */}
        <div className="flex-1 space-y-6">
          {/* Group 1: Dashboard & My Mind */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent">
              <SkeletonCircle size={18} />
              <Skeleton variant="rounded" className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent">
              <SkeletonCircle size={18} />
              <Skeleton variant="rounded" className="h-4 w-20" />
            </div>
          </div>

          <div className="h-px bg-black/5 dark:bg-white/5 mx-3" />

          {/* Group 2: Workspace, Planner, Focus */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent">
              <SkeletonCircle size={18} />
              <Skeleton variant="rounded" className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent">
              <SkeletonCircle size={18} />
              <Skeleton variant="rounded" className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent">
              <SkeletonCircle size={18} />
              <Skeleton variant="rounded" className="h-4 w-16" />
            </div>
          </div>

          <div className="h-px bg-black/5 dark:bg-white/5 mx-3" />

          {/* Group 3: Learning Hub */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent">
              <SkeletonCircle size={18} />
              <Skeleton variant="rounded" className="h-4 w-28" />
            </div>
          </div>

          <div className="h-px bg-black/5 dark:bg-white/5 mx-3" />

          {/* Group 4: Theme & Settings */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent">
              <SkeletonCircle size={18} />
              <Skeleton variant="rounded" className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent">
              <SkeletonCircle size={18} />
              <Skeleton variant="rounded" className="h-4 w-20" />
            </div>
          </div>
        </div>

        {/* Bottom Install Card / Profile Skeleton */}
        <div className="mt-auto px-2 space-y-2">
          <div className="p-3 rounded-2xl border border-black/5 dark:border-white/5 space-y-2 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <SkeletonCircle size={20} />
              <Skeleton variant="rounded" className="h-3.5 w-24" />
            </div>
            <Skeleton variant="rounded" className="h-2 w-full" />
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN CONTENT AREA + MOBILE HEADER SKELETON               */}
      {/* ============================================================ */}
      <main className="flex-1 md:ml-60 w-full min-w-0 overflow-x-hidden">
        {/* Mobile Header Skeleton */}
        <div
          aria-hidden="true"
          className="md:hidden flex items-center justify-between px-3.5 py-3 sticky top-0 z-30 border-b"
          style={{
            background: "rgba(7, 10, 18, 0.90)",
            backdropFilter: "blur(20px)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <SkeletonCircle size={28} />
            <Skeleton variant="rounded" className="h-4 w-24" />
          </div>

          <Skeleton variant="rounded" className="h-8 w-20 rounded-xl" />
        </div>

        {/* Page Content Container with Active Page Skeleton */}
        <div className="p-3.5 sm:p-5 md:p-8 lg:p-10 max-w-5xl mx-auto w-full min-w-0">
          <PageSkeleton page={page} />
        </div>
      </main>
    </div>
  );
}
