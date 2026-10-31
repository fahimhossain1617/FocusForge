export default function AdminLoading() {
  return (
    <div
      className="space-y-6 animate-pulse select-none py-1"
      role="status"
      aria-live="polite"
      aria-label="Loading admin section..."
    >
      {/* Title & subtitle skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-200 dark:bg-white/[0.08] rounded-xl" />
        <div className="h-4 w-72 max-w-[85%] bg-slate-100 dark:bg-white/[0.04] rounded-lg" />
      </div>

      {/* KPI Stats Grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/[0.06] space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-100 dark:bg-white/[0.04] rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-6 w-24 bg-slate-200 dark:bg-white/[0.08] rounded-lg" />
            <div className="h-2.5 w-16 bg-slate-100 dark:bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>

      {/* Main Panel Content Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/[0.06] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="h-5 w-36 bg-slate-200 dark:bg-white/[0.08] rounded-lg" />
          <div className="h-8 w-24 bg-slate-100 dark:bg-white/[0.04] rounded-xl" />
        </div>
        <div className="space-y-2.5 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-11 w-full bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/[0.03]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

