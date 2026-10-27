"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GitBranch, CheckCircle2, AlertCircle, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { ReleaseStatusData } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function ReleaseSection() {
  const [data, setData] = useState<ReleaseStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const fetchRelease = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getRelease();
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load release status");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to release API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelease();
  }, [fetchRelease]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Release & Deployment Status
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            Verified production build metadata, git commit details, and deployment changelogs.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRelease}
          className="p-2 rounded-xl border border-[#DCE5F0] dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Refresh release metadata"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {loading && <AdminLoadingView message="Verifying production build metadata..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/release" onRetry={fetchRelease} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchRelease} />
      )}

      {data && !loading && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Current Version</span>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                v{data.currentAppVersion}
              </p>
              <span className="text-[11px] text-slate-400">Environment: {data.environment}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Git Commit Hash</span>
              <p className="text-2xl font-bold text-[#111827] dark:text-foreground mt-0.5 font-mono">
                {data.currentCommitHash ? data.currentCommitHash.slice(0, 7) : "unavailable"}
              </p>
              <span className="text-[11px] text-slate-400">Deployed {data.deployedAt ? new Date(data.deployedAt).toLocaleDateString() : "unknown"}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Health Status</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 size={22} />
                <span>{data.isHealthy ? "Healthy" : "Degraded"}</span>
              </p>
              <span className="text-[11px] text-slate-400">Production smoke verified</span>
            </div>
          </div>

          {/* Integration requirements callout */}
          {data.integrationStatus === "unavailable" && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold block mb-1">Deployment Integration Unavailable:</span>
              Detailed live commit logs require Vercel deployment webhooks and GitHub release metadata integration (scheduled in Part 2).
            </div>
          )}

          {/* Changelog items */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-[#111827] dark:text-foreground">
              Release Changelog Highlights
            </h3>
            {data.changelogItems.length === 0 ? (
              <p className="text-xs text-slate-400">No release notes published for current build.</p>
            ) : (
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {data.changelogItems.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
