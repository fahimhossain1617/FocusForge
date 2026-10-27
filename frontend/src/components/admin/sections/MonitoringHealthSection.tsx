"use client";

import React, { useState, useEffect, useCallback } from "react";
import { HeartPulse, CheckCircle2, AlertTriangle, Database, Activity, RefreshCw } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { MonitoringHealthData } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function MonitoringHealthSection() {
  const [data, setData] = useState<MonitoringHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const fetchMonitoringHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getMonitoringHealth();
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load monitoring health data");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to monitoring health API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitoringHealth();
  }, [fetchMonitoringHealth]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Monitoring Health & Ingestion Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            Client telemetry ingestion pipeline reliability, delivery success rates, and storage consumption.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMonitoringHealth}
          className="p-2 rounded-xl border border-[#DCE5F0] dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Refresh health data"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {loading && <AdminLoadingView message="Verifying telemetry ingestion pipeline..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/monitoring-health" onRetry={fetchMonitoringHealth} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchMonitoringHealth} />
      )}

      {data && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Pipeline Status</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5 capitalize">
                <CheckCircle2 size={20} />
                <span>{data.telemetryIngestStatus}</span>
              </p>
              <span className="text-[11px] text-slate-400">Endpoint /api/telemetry/ingest</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Events (Last 24h)</span>
              <p className="text-2xl font-bold text-[#111827] dark:text-foreground mt-0.5 font-mono">
                {data.ingestedLast24h.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400">{data.droppedLast24h} dropped / throttled</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Ingest Error Rate</span>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                {data.ingestErrorRatePercent}%
              </p>
              <span className="text-[11px] text-slate-400">Target: &lt; 0.5%</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Storage Usage</span>
              <p className="text-2xl font-bold text-[#111827] dark:text-foreground mt-0.5 font-mono">
                {data.storageUsageMb} MB
              </p>
              <span className="text-[11px] text-slate-400">Telemetry logs storage</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
            <h3 className="text-xs font-bold text-[#111827] dark:text-foreground uppercase tracking-wider mb-2">
              Ingestion Timestamp Verification
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Last successful payload ingested at:{" "}
              <strong className="text-slate-900 dark:text-white">
                {data.lastSuccessfulIngestionAt ? new Date(data.lastSuccessfulIngestionAt).toLocaleString() : "Never observed"}
              </strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
