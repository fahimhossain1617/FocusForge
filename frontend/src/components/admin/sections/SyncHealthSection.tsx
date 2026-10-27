"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Database, CheckCircle, AlertTriangle, Layers } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { SyncHealthData, TimeRangeFilter } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function SyncHealthSection() {
  const [range, setRange] = useState<TimeRangeFilter>("24h");
  const [data, setData] = useState<SyncHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const fetchSyncHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getSyncHealth(range);
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load sync health data");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to sync health API");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchSyncHealth();
  }, [fetchSyncHealth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Data & Sync Health
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            IndexedDB local storage stability, Supabase relay sync success rates, and conflict frequency.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.06] rounded-xl self-start sm:self-auto">
          {(["24h", "7d", "30d"] as TimeRangeFilter[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                range === r
                  ? "bg-white dark:bg-[#1E2638] text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-[#52627A] dark:text-muted-foreground hover:text-[#111827] dark:hover:text-foreground"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && <AdminLoadingView message="Inspecting sync queues & storage metrics..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/sync-health" onRetry={fetchSyncHealth} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchSyncHealth} />
      )}

      {data && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Supabase Sync Success</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {data.supabaseSyncSuccessRate}%
              </p>
              <span className="text-[11px] text-slate-400">Target: ≥ 99.0%</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">IndexedDB Errors</span>
              <p className="text-2xl font-bold text-[#111827] dark:text-foreground mt-0.5">
                {data.indexedDbErrorCount}
              </p>
              <span className="text-[11px] text-slate-400">Local client quota/transaction exceptions</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Sync Conflicts</span>
              <p className="text-2xl font-bold text-[#111827] dark:text-foreground mt-0.5">
                {data.syncConflictsCount}
              </p>
              <span className="text-[11px] text-slate-400">Resolved via timestamp ordering</span>
            </div>
          </div>

          {/* Common Errors List */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
            <h3 className="text-xs font-bold text-[#111827] dark:text-foreground uppercase tracking-wider mb-3">
              Common Sync Diagnostics
            </h3>
            {data.commonSyncErrors.length === 0 ? (
              <p className="text-xs text-slate-400">No recurring sync errors logged.</p>
            ) : (
              <div className="space-y-2">
                {data.commonSyncErrors.map((err, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-md">
                      {err.errorSnippet}
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {err.count} times
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
