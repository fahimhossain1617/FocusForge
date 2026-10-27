"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, User, Mail, Calendar, Shield, Clock, CheckCircle, Target, BookOpen, AlertCircle } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { AdminUserDetail } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function UserDetailSection({ userId }: { userId: string }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getUserDetail(userId);
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setDetail(res.data);
      } else {
        setError(res.error || "Failed to load user details");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to user detail API");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="p-1.5 rounded-xl border border-[#DCE5F0] dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Back to Users list"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            User Profile & Records
          </h1>
          <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5">
            User ID: <code className="font-mono text-blue-600 dark:text-blue-400">{userId}</code>
          </p>
        </div>
      </div>

      {loading && <AdminLoadingView message="Loading user account details..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint={`/api/admin/users/${userId}`} onRetry={fetchDetail} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchDetail} />
      )}

      {detail && !loading && (
        <div className="space-y-5">
          {/* Top Info Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {detail.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={detail.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-base text-slate-700 dark:text-slate-200">
                  {(detail.displayName || detail.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-[#111827] dark:text-foreground">
                  {detail.displayName || detail.fullName || "User"}
                </h2>
                <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5">
                  {detail.email || "No email on record"}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    detail.isSuspended ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  }`}>
                    {detail.isSuspended ? "Suspended" : "Active"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Joined {new Date(detail.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {detail.isSuspended && detail.suspensionReason && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 max-w-sm">
                <span className="font-bold block">Suspension Reason:</span>
                {detail.suspensionReason}
              </div>
            )}
          </div>

          {/* Aggregated Usage Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Focus Minutes</span>
              <p className="text-lg font-bold text-[#111827] dark:text-foreground mt-0.5">{detail.totalFocusMinutes}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Tasks Done</span>
              <p className="text-lg font-bold text-[#111827] dark:text-foreground mt-0.5">{detail.totalTasksCompleted}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Notes & Files</span>
              <p className="text-lg font-bold text-[#111827] dark:text-foreground mt-0.5">{detail.notesCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Related Reports</span>
              <p className="text-lg font-bold text-[#111827] dark:text-foreground mt-0.5">{detail.relatedTicketsCount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
