"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Activity, Gauge, AlertTriangle, Clock } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { PerformanceMetricRecord, TimeRangeFilter } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";

export function PerformanceSection() {
  const [range, setRange] = useState<TimeRangeFilter>("24h");
  const [data, setData] = useState<PerformanceMetricRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getPerformance(range);
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load performance metrics");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to performance API");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Performance Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            Real client Web Vitals (LCP, CLS, INP) and API / IndexedDB latencies vs monitoring thresholds.
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

      {loading && <AdminLoadingView message="Loading performance metrics..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/performance" onRetry={fetchPerformance} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchPerformance} />
      )}

      {data && !loading && (
        <div className="space-y-4">
          {data.length === 0 ? (
            <AdminEmptyView title="No performance anomalies recorded" description="All tracked Web Vitals and API latencies are within optimal thresholds." />
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[#52627A] dark:text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Metric</th>
                      <th className="py-3 px-4">Observed Value</th>
                      <th className="py-3 px-4">Monitoring Threshold</th>
                      <th className="py-3 px-4">Route / Feature</th>
                      <th className="py-3 px-4">Platform</th>
                      <th className="py-3 px-4">Affected Sessions</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {data.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-bold text-[#111827] dark:text-slate-200">
                          {rec.metric}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={rec.severity === "critical" ? "text-rose-600 dark:text-rose-400" : rec.severity === "warning" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                            {rec.observedValue} {rec.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {rec.monitoringThreshold} {rec.unit}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {rec.route}
                        </td>
                        <td className="py-3 px-4 capitalize text-slate-500">
                          {rec.platform}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {rec.affectedSessions}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            rec.status === "active"
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
