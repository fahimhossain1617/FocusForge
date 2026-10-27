"use client";

import React, { useState, useEffect, useCallback } from "react";
import { UserX, Download, CheckCircle2, AlertTriangle, Save, RefreshCw } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { PrivacyRequestItem } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";

export function PrivacyRequestsSection() {
  const [requests, setRequests] = useState<PrivacyRequestItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchPrivacyRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getPrivacyRequests();
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setRequests(res.data);
      } else {
        setError(res.error || "Failed to load privacy requests");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to privacy requests API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrivacyRequests();
  }, [fetchPrivacyRequests]);

  const handleUpdateStatus = async (id: string, newStatus: PrivacyRequestItem["status"]) => {
    setUpdatingId(id);
    try {
      const res = await adminApiClient.updatePrivacyRequestStatus(id, newStatus);
      if (res.success) {
        fetchPrivacyRequests();
      } else {
        alert(res.error || "Failed to update request status");
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Privacy & Compliance Requests
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            User requests for account deletion and personal data exports.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPrivacyRequests}
          className="p-2 rounded-xl border border-[#DCE5F0] dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Refresh requests"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {loading && <AdminLoadingView message="Loading privacy requests..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/privacy-requests" onRetry={fetchPrivacyRequests} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchPrivacyRequests} />
      )}

      {requests && !loading && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <AdminEmptyView title="No pending privacy requests" description="No users have requested account deletion or data exports." />
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[#52627A] dark:text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">User Email</th>
                      <th className="py-3 px-4">User ID</th>
                      <th className="py-3 px-4">Requested Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                            req.type === "account_deletion"
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          }`}>
                            {req.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#111827] dark:text-slate-200">
                          {req.userEmail}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {req.userId.slice(0, 12)}...
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            req.status === "completed"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : req.status === "processing"
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                              : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400"
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            disabled={updatingId === req.id}
                            value={req.status}
                            onChange={(e) => handleUpdateStatus(req.id, e.target.value as any)}
                            className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-xs font-semibold outline-none cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                          </select>
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
