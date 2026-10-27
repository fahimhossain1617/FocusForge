"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, AlertOctagon, AlertTriangle, Info, CheckCircle2, Search, Filter } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { AlertItem } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";

export function AlertsSection() {
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getAlerts();
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setAlerts(res.data);
      } else {
        setError(res.error || "Failed to load alert center");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to alerts API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleUpdateStatus = async (alertId: string, newStatus: AlertItem["status"]) => {
    try {
      await adminApiClient.updateAlertStatus(alertId, newStatus);
      fetchAlerts();
    } catch {
      alert("Failed to update alert status.");
    }
  };

  const filteredAlerts = (alerts || []).filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
          Alert Center
        </h1>
        <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
          Critical operations alerts, crash surges, and quota threshold warnings.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none cursor-pointer"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading && <AdminLoadingView message="Loading alerts..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/alerts" onRetry={fetchAlerts} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchAlerts} />
      )}

      {alerts && !loading && (
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <AdminEmptyView title="No active alerts" description="All subsystems operating within parameters." />
          ) : (
            filteredAlerts.map((a) => (
              <div
                key={a.id}
                className={`p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  a.severity === "critical"
                    ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/40"
                    : a.severity === "high"
                    ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/40"
                    : "bg-white dark:bg-[#0c101d] border-[#DCE5F0] dark:border-white/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    a.severity === "critical"
                      ? "bg-rose-600 text-white"
                      : a.severity === "high"
                      ? "bg-amber-500 text-white"
                      : "bg-blue-600 text-white"
                  }`}>
                    {a.severity === "critical" ? <AlertOctagon size={18} /> : <AlertTriangle size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#111827] dark:text-foreground">{a.title}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                        {a.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
                      {a.description}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Occurrences: <strong>{a.occurrences}</strong> • First seen {new Date(a.firstSeenAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <select
                    value={a.status}
                    onChange={(e) => handleUpdateStatus(a.id, e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1E2638] border border-[#DCE5F0] dark:border-white/10 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="investigating">Investigating</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
