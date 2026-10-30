"use client";

import React from "react";
import { AlertCircle, RefreshCw, Database, ShieldAlert, Inbox, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AdminOrbLoader } from "./AdminOrbLoader";

export function AdminLoadingView({
  fullScreen = false,
}: {
  message?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full p-6 text-center ${
        fullScreen ? "min-h-screen min-h-dvh" : "min-h-[380px] sm:min-h-[440px]"
      }`}
    >
      <AdminOrbLoader size={196} />
    </div>
  );
}

export function AdminUnconnectedView({
  endpoint,
  onRetry,
}: {
  endpoint: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] w-full p-6 text-center bg-white dark:bg-[#0c101d] rounded-2xl border border-dashed border-[#DCE5F0] dark:border-white/10 shadow-none my-4">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3.5">
        <Database size={24} strokeWidth={2} />
      </div>
      <h3 className="text-base font-bold text-[#111827] dark:text-foreground">
        Backend Data Source Not Connected
      </h3>
      <p className="text-xs text-[#52627A] dark:text-muted-foreground max-w-md mt-1.5 leading-relaxed">
        This section is fully wired to <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] font-mono text-[11px] text-blue-600 dark:text-blue-400">{endpoint}</code>.
        The backend API handler and database migrations are scheduled for Part 2 & Part 3.
      </p>
      <div className="flex items-center gap-2 mt-4">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-none"
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminDeniedView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-400 mb-3">
        <ShieldAlert size={24} strokeWidth={1.8} />
      </div>
      <h2 className="text-lg font-bold text-[#111827] dark:text-foreground">
        Page Not Available
      </h2>
      <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-1 max-w-sm">
        The requested URL was not found or is not accessible.
      </p>
      <Link
        href="/"
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-none"
      >
        <ArrowLeft size={14} />
        <span>Return to Focentia</span>
      </Link>
    </div>
  );
}

export function AdminErrorView({
  error,
  onRetry,
}: {
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] w-full p-6 text-center bg-rose-50/50 dark:bg-rose-500/[0.04] rounded-2xl border border-rose-200 dark:border-rose-500/20 my-4">
      <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5">
        <AlertCircle size={20} />
      </div>
      <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">Failed to Load Section Data</h3>
      <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1 max-w-md">
        {error || "An unexpected error occurred while communicating with the admin backend."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}

export function AdminEmptyView({
  title = "No records found",
  description = "No items match your active filters or range.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[220px] w-full p-6 text-center bg-white dark:bg-[#0c101d] rounded-2xl border border-[#DCE5F0] dark:border-white/10 my-3">
      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/[0.06] text-slate-400 flex items-center justify-center mb-2">
        <Inbox size={20} strokeWidth={1.8} />
      </div>
      <h4 className="text-sm font-semibold text-[#111827] dark:text-foreground">{title}</h4>
      <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5 max-w-sm">{description}</p>
    </div>
  );
}
