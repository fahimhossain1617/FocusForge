"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ScrollText, ChevronLeft, ChevronRight, User, ShieldCheck } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { AuditLogEntry, PaginatedResult } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";

export function AuditLogSection() {
  const [data, setData] = useState<PaginatedResult<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);
  const [page, setPage] = useState(1);

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getAuditLog({ page, pageSize: 25 });
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load audit log");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to audit log API");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
          Admin Activity & Audit Log
        </h1>
        <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
          Immutable log of all administrative actions, feature flag alterations, and user suspensions.
        </p>
      </div>

      {loading && <AdminLoadingView message="Loading audit log records..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/audit-log" onRetry={fetchAuditLog} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchAuditLog} />
      )}

      {data && !loading && (
        <div className="space-y-4">
          {data.items.length === 0 ? (
            <AdminEmptyView title="Audit log is empty" description="No administrative changes recorded yet." />
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[#52627A] dark:text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Admin Email</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target Resource</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {data.items.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono">
                          {new Date(entry.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#111827] dark:text-slate-200">
                          {entry.adminEmail}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold text-[10px] uppercase">
                            {entry.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {entry.targetResource} {entry.targetId ? `(#${entry.targetId.slice(0, 8)})` : ""}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate font-mono text-[11px]">
                          {entry.details ? JSON.stringify(entry.details) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-[#52627A] dark:text-muted-foreground">
                <span>
                  Showing page {data.page} of {Math.ceil(data.total / data.pageSize) || 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={data.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#DCE5F0] dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={!data.hasMore}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-[#DCE5F0] dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
