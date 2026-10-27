"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  AlertCircle,
  Eye,
} from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { AdminUserListItem, PaginatedResult } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";

const ADMIN_EMAIL = "fahimhossain1617@gmail.com";

export function UsersSection() {
  const [usersData, setUsersData] = useState<PaginatedResult<AdminUserListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Single allowed modal: explicit suspension confirm dialog
  const [suspendTarget, setSuspendTarget] = useState<AdminUserListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmittingSuspension, setIsSubmittingSuspension] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getUsers({
        page,
        pageSize: 15,
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setUsersData(res.data);
      } else {
        setError(res.error || "Failed to load users list");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to users API");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleConfirmSuspend = async () => {
    if (!suspendTarget || !suspendReason.trim()) return;
    if (suspendTarget.email === ADMIN_EMAIL) {
      alert("Security Violation: Cannot suspend the primary admin account.");
      return;
    }

    setIsSubmittingSuspension(true);
    try {
      const res = await adminApiClient.suspendUser(suspendTarget.id, suspendReason.trim());
      if (res.success) {
        setSuspendTarget(null);
        setSuspendReason("");
        fetchUsers();
      } else {
        alert(res.error || "Failed to suspend user");
      }
    } catch {
      alert("Failed to submit suspension request.");
    } finally {
      setIsSubmittingSuspension(false);
    }
  };

  const handleRestoreUser = async (user: AdminUserListItem) => {
    if (!confirm(`Are you sure you want to restore access for ${user.displayName || user.email || user.id}?`)) {
      return;
    }

    try {
      const res = await adminApiClient.restoreUser(user.id);
      if (res.success) {
        fetchUsers();
      } else {
        alert(res.error || "Failed to restore user");
      }
    } catch {
      alert("Failed to restore user");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
          Users & Login Activity
        </h1>
        <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
          Registered accounts, activity history, suspension controls, and user reports.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or user ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground placeholder-slate-400 outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="suspended">Suspended Only</option>
        </select>
      </div>

      {loading && <AdminLoadingView message="Loading user directory..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/users" onRetry={fetchUsers} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchUsers} />
      )}

      {usersData && !loading && (
        <div className="space-y-4">
          {usersData.items.length === 0 ? (
            <AdminEmptyView title="No users found" description="No accounts match your search or filter." />
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[#52627A] dark:text-muted-foreground font-semibold">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Stable ID</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4">Last Observed Login</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {usersData.items.map((u) => {
                      const isPrimaryAdmin = u.email === ADMIN_EMAIL;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {u.avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={u.avatarUrl}
                                  alt=""
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-[11px] text-slate-700 dark:text-slate-200">
                                  {(u.displayName || u.email || "U")[0].toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-semibold text-[#111827] dark:text-foreground block truncate">
                                  {u.displayName || u.fullName || "User"}
                                </span>
                                <span className="text-[11px] text-[#52627A] dark:text-muted-foreground block truncate">
                                  {u.email || "No email on record"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {u.id.slice(0, 12)}...
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {u.lastObservedLogin ? new Date(u.lastObservedLogin).toLocaleString() : "Never observed"}
                          </td>
                          <td className="py-3 px-4">
                            {u.isSuspended ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                                Suspended
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/admin/users/${u.id}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                                title="View details"
                              >
                                <Eye size={15} />
                              </Link>

                              {!isPrimaryAdmin && (
                                <>
                                  {u.isSuspended ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreUser(u)}
                                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                      title="Restore user"
                                    >
                                      <UserCheck size={15} />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setSuspendTarget(u)}
                                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Suspend user"
                                    >
                                      <UserX size={15} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="p-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-[#52627A] dark:text-muted-foreground">
                <span>
                  Showing page {usersData.page} of {Math.ceil(usersData.total / usersData.pageSize) || 1} ({usersData.total} total)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={usersData.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#DCE5F0] dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={!usersData.hasMore}
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

      {/* Explicit Suspension Confirm Dialog (Only Allowed Modal) */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0c101d] rounded-2xl border border-rose-200 dark:border-rose-500/30 p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827] dark:text-foreground">
                  Confirm Account Suspension
                </h3>
                <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5">
                  Target: <strong className="text-slate-900 dark:text-white">{suspendTarget.displayName || suspendTarget.email || suspendTarget.id}</strong>
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111827] dark:text-foreground block mb-1">
                Reason for suspension (Required for audit log)
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Abuse of API rate limits, malicious behavior..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingSuspension}
                onClick={() => {
                  setSuspendTarget(null);
                  setSuspendReason("");
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!suspendReason.trim() || isSubmittingSuspension}
                onClick={handleConfirmSuspend}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
              >
                {isSubmittingSuspension ? "Suspending..." : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
