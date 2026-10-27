"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Inbox,
  Search,
  Filter,
  Eye,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { FeedbackTicket, PaginatedResult } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";

export function FeedbackSection() {
  const [data, setData] = useState<PaginatedResult<FeedbackTicket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getFeedback({
        page,
        pageSize: 15,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search.trim() || undefined,
      });

      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load feedback inbox");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to feedback API");
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, statusFilter, search]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
          Feedback & Support Inbox
        </h1>
        <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
          User reports, feature suggestions, support requests, and in-app reviews.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets, subject, message, or user..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground placeholder-slate-400 outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none cursor-pointer"
        >
          <option value="all">All Channels</option>
          <option value="problem">Problem Reports</option>
          <option value="support">Support Requests</option>
          <option value="feedback">Feedback & Suggestions</option>
          <option value="review">In-App Reviews</option>
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
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading && <AdminLoadingView message="Loading feedback tickets..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/feedback" onRetry={fetchFeedback} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchFeedback} />
      )}

      {data && !loading && (
        <div className="space-y-4">
          {data.items.length === 0 ? (
            <AdminEmptyView title="No feedback tickets found" description="No tickets match the selected filters." />
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[#52627A] dark:text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Channel / Type</th>
                      <th className="py-3 px-4">Subject & Message</th>
                      <th className="py-3 px-4">Submitter</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {data.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                            item.category === "problem"
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                              : item.category === "support"
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                              : item.category === "review"
                              ? "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          }`}>
                            {item.category}
                          </span>
                          {item.rating && (
                            <span className="flex items-center text-amber-500 font-bold text-[11px] mt-1">
                              <Star size={11} className="fill-amber-500 mr-0.5" />
                              {item.rating} / 5
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {item.subject && (
                            <span className="font-bold text-[#111827] dark:text-slate-200 block truncate">
                              {item.subject}
                            </span>
                          )}
                          <p className="text-slate-600 dark:text-slate-400 truncate">
                            {item.message}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#111827] dark:text-slate-200 block truncate">
                            {item.userName}
                          </span>
                          <span className="text-[11px] text-[#52627A] dark:text-muted-foreground block truncate">
                            {item.userType === "guest" ? "Guest User" : item.userEmail || item.userId?.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(item.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            item.status === "new"
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"
                              : item.status === "in_progress"
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                              : item.status === "resolved"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400"
                          }`}>
                            {item.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/feedback/${item.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] inline-flex items-center"
                            title="View record"
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
