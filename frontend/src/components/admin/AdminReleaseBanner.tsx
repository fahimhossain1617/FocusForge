"use client";

import React from "react";
import { Sparkles, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAdminAuth } from "../../context/AdminAuthContext";

export function AdminReleaseBanner() {
  const { releaseNotice, dismissReleaseNotice } = useAdminAuth();

  if (!releaseNotice || !releaseNotice.isNew) return null;

  return (
    <div className="w-full bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200/60 dark:border-blue-900/40 px-4 py-2 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="font-semibold px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] uppercase tracking-wider shrink-0">
          v{releaseNotice.version}
        </span>
        <span className="truncate">{releaseNotice.summary}</span>
        <Link
          href="/admin/release"
          className="hidden sm:inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-1"
        >
          View Release
          <ChevronRight size={13} />
        </Link>
      </div>
      <button
        type="button"
        onClick={() => dismissReleaseNotice()}
        className="p-1 rounded-lg text-blue-400 hover:text-blue-700 dark:hover:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors shrink-0 ml-2 cursor-pointer"
        aria-label="Dismiss release notice"
      >
        <X size={14} />
      </button>
    </div>
  );
}
