"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bug, Search, Filter, AlertTriangle, Eye, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { BugIssue, PaginatedResult } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";

export function IssuesSection() {
  const [data, setData] = useState<PaginatedResult<BugIssue> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getIssues({
        page,
        pageSize: 15,
        severity: severityFilter !== "all" ? severityFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load issues list");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to issues API");
    } finally {
      setLoading(false);
    }
  }, [page, severityFilter, statusFilter]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
          Bugs & Crash Reports
        </h1>
        <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
          Grouped runtime exceptions, React boundary errors, and chunk load failures.
        </p>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <select
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none cursor-pointer"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="investigating">Investigating</option>
          <option value="fixed">Fixed</option>
          <option value="verified">Verified</option>
          <option value="reopened">Reopened</option>
        </select>
      </div>

      {loading && <AdminLoadingView message="Loading grouped issues..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/issues" onRetry={fetchIssues} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchIssues} />
      )}

      {data && !loading && (
        <div className="space-y-4">
          {data.items.length === 0 ? (
            <AdminEmptyView title="No issues found" description="No crashes or bugs match active filters." />
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[#52627A] dark:text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Issue / Error</th>
                      <th className="py-3 px-4">Route / Feature</th>
                      <th className="py-3 px-4">Occurrences</th>
                      <th className="py-3 px-4">Last Seen</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {data.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                            item.severity === "critical"
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                              : item.severity === "high"
                              ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          }`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <span className="font-bold text-[#111827] dark:text-slate-200 block truncate">
                            {item.title || item.errorName}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate font-mono">
                            {item.message}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {item.route}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.occurrencesCount}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(item.lastSeenAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            item.status === "verified"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : item.status === "fixed"
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                              : item.status === "investigating"
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                              : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/issues/${item.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] inline-flex items-center"
                            title="Inspect issue"
                          >
                            <Eye size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-[#52627A] dark:text-muted-foreground">
                <span>
                  Showing page {data.page} of {Math.ceil(data.total / data.pageSize) || 1} ({data.total} total)
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
