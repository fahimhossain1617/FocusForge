"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shield, ShieldAlert, AlertTriangle, Eye, CheckCircle2 } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { SecurityEvent } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";

export function SecuritySection() {
  const [events, setEvents] = useState<SecurityEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const fetchSecurity = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getSecurity();
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setEvents(res.data);
      } else {
        setError(res.error || "Failed to load security audit log");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to security API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
          Security & Abuse Monitoring
        </h1>
        <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
          Rate limit spikes, origin anomalies, and brute-force mitigation events.
        </p>
      </div>

      {loading && <AdminLoadingView message="Loading security events..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/security" onRetry={fetchSecurity} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchSecurity} />
      )}

      {events && !loading && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <AdminEmptyView title="No security incidents detected" description="No abuse patterns or unauthorized attempts recorded." />
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[#52627A] dark:text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">Detection Reason</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                            ev.severity === "critical"
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                              : ev.severity === "high"
                              ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          }`}>
                            {ev.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#111827] dark:text-slate-200">
                          {ev.category.replace("_", " ")}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {ev.resource}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {ev.detectionReason}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(ev.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-semibold text-[10px] uppercase">
                            {ev.status}
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
