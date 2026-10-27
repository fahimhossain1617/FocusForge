"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BarChart3, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { ProductAnalyticsData, TimeRangeFilter } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function AnalyticsSection() {
  const [range, setRange] = useState<TimeRangeFilter>("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);
  const [data, setData] = useState<ProductAnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getAnalytics(range);
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load product analytics");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to analytics API");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Product Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            Adoption, repeat usage, and performance across existing Focentia features.
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

      {loading && <AdminLoadingView message="Aggregating feature analytics..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/analytics" onRetry={fetchAnalytics} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchAnalytics} />
      )}

      {data && !loading && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Total Meaningful Actions</span>
              <p className="text-2xl font-bold text-[#111827] dark:text-foreground mt-0.5">{data.totalActions}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Active Window</span>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{range.toUpperCase()}</p>
            </div>
          </div>

          {/* Features Table */}
          <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[#52627A] dark:text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Feature</th>
                    <th className="py-3 px-4">Interactions</th>
                    <th className="py-3 px-4">Active Users</th>
                    <th className="py-3 px-4">Repeat Usage</th>
                    <th className="py-3 px-4">Success / Fail</th>
                    <th className="py-3 px-4">Avg Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {data.features.map((feat) => (
                    <tr key={feat.featureId} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-semibold text-[#111827] dark:text-slate-200">
                        {feat.featureName}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{feat.totalInteractions}</td>
                      <td className="py-3 px-4 font-mono">{feat.activeUsers}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                          {feat.repeatUsagePercent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{feat.successCount}</span>
                        {" / "}
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">{feat.failureCount}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {feat.averageLatencyMs ? `${feat.averageLatencyMs}ms` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
