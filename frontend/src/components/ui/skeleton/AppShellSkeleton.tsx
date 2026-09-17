import React from "react";
import Skeleton from "./Skeleton";
import SkeletonCircle from "./SkeletonCircle";
import PageSkeleton from "./PageSkeleton";

export interface AppShellSkeletonProps {
  page?: string;
}

export default function AppShellSkeleton({ page = "today" }: AppShellSkeletonProps) {
  const isAIAgent = page === "ai-agent";
  const isPlanner = page === "planner";
  const isToday = page === "today";

  return (
    <div
      aria-busy="true"
      aria-label="Loading application structure"
      role="status"
      className={`flex min-h-screen ${isAIAgent ? "h-dvh max-h-dvh overflow-hidden" : ""} overflow-x-hidden`}
      style={{ background: "var(--bg-section-grad)" }}
    >
      {/* ============================================================ */}
      {/* 1. PERSISTENT SIDEBAR SKELETON (Desktop)                    */}
      {/* ============================================================ */}
      <aside
        aria-hidden="true"
        className="w-64 min-h-screen hidden md:flex flex-col py-6 px-3 fixed left-0 top-0 bottom-0 z-40 border-r"
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
        <div className="flex-1 space-y-1">
          {[
            { id: "today", w: "w-24" },
            { id: "ai-agent", w: "w-20" },
            { id: "tasks", w: "w-28" },
            { id: "planner", w: "w-20" },
            { id: "mind", w: "w-20" },
            { id: "learning", w: "w-24" },
            { id: "focus", w: "w-16" },
            { id: "settings", w: "w-20" },
          ].map((item) => {
            const isActive = page === item.id || (item.id === "today" && page === "dashboard");
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  isActive
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    : "border-transparent opacity-75"
                }`}
              >
                <SkeletonCircle size={18} className={isActive ? "bg-blue-500/30" : ""} />
                <Skeleton
                  variant="rounded"
                  className={`h-4 ${item.w} ${isActive ? "bg-blue-500/30" : ""}`}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom Install Card / Profile Skeleton */}
        <div className="mt-auto px-2 space-y-2">
          <div className={`p-3 rounded-2xl border space-y-2 transition-all ${
            page === "profile" 
              ? "bg-blue-500/10 border-blue-500/30" 
              : "border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]"
          }`}>
            <div className="flex items-center gap-2">
              <SkeletonCircle size={20} className={page === "profile" ? "bg-blue-500/30" : ""} />
              <Skeleton variant="rounded" className={`h-3.5 w-24 ${page === "profile" ? "bg-blue-500/30" : ""}`} />
            </div>
            <Skeleton variant="rounded" className="h-2 w-full" />
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN CONTENT AREA + MOBILE HEADER SKELETON               */}
      {/* ============================================================ */}
      <main
        className={`flex-1 md:ml-64 w-full min-w-0 flex flex-col ${
          isAIAgent ? "h-dvh max-h-dvh overflow-hidden" : "min-h-screen overflow-x-hidden"
        }`}
      >
        {/* Universal Mobile Header Skeleton */}
        <div
          aria-hidden="true"
          className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30 border-b shrink-0"
          style={{
            background: "var(--color-bg-card)",
            backdropFilter: "blur(20px)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center gap-3">
            <Skeleton variant="rounded" className="w-9 h-9 rounded-xl" />
            <Skeleton variant="rounded" className="h-4 w-28" />
          </div>

          <Skeleton variant="rounded" className="h-8 w-20 rounded-xl" />
        </div>

        {/* Page Content Container matching exact real page responsive wrapper */}
        <div
          className={`w-full min-w-0 ${
            isAIAgent
              ? "flex-1 flex flex-col p-0 max-w-none h-full"
              : isPlanner
              ? "flex-1 flex flex-col p-0 max-w-none"
              : isToday
              ? "flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 max-w-[1700px] mx-auto"
              : "flex-1 p-3.5 sm:p-5 md:p-8 lg:p-10 max-w-7xl mx-auto"
          }`}
        >
          <PageSkeleton page={page} />
        </div>
      </main>
    </div>
  );
}
