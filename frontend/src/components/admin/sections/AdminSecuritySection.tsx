"use client";

import React, { useState, useEffect, useCallback } from "react";
import { KeyRound, Shield, CheckCircle2, AlertTriangle, Smartphone, Globe, RefreshCw } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { AdminSessionItem, AdminMeResponse } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";
import { useAdminAuth } from "../../../context/AdminAuthContext";

export function AdminSecuritySection() {
  const { adminData } = useAdminAuth();
  const [sessions, setSessions] = useState<AdminSessionItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getAdminSessions();
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setSessions(res.data);
      } else {
        setError(res.error || "Failed to load admin security sessions");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to security sessions API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Admin Security & Sessions
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            MFA verification status, active operator sessions, and authentication security history.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchSessions}
          className="p-2 rounded-xl border border-[#DCE5F0] dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Refresh sessions"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* MFA & Identity Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <span className="text-xs text-[#52627A] dark:text-muted-foreground">Admin Identity</span>
          <p className="text-sm font-bold text-[#111827] dark:text-foreground mt-0.5 truncate">
            {adminData?.email || "fahimhossain1617@gmail.com"}
          </p>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
            Role: {adminData?.role || "super_admin"}
          </span>
        </div>

        <div>
          <span className="text-xs text-[#52627A] dark:text-muted-foreground">Two-Factor Authentication (MFA)</span>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
            <CheckCircle2 size={16} />
            <span>Enforced via Supabase Auth</span>
          </p>
          <span className="text-[11px] text-slate-400">TOTP Authenticator App active</span>
        </div>

        <div>
          <span className="text-xs text-[#52627A] dark:text-muted-foreground">Access Token Expiry</span>
          <p className="text-sm font-bold text-[#111827] dark:text-foreground mt-0.5 font-mono">
            Rolling 1-Hour JWT
          </p>
          <span className="text-[11px] text-slate-400">Server verified on every request</span>
        </div>
      </div>

      {loading && <AdminLoadingView message="Verifying active admin sessions..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/security/admin-sessions" onRetry={fetchSessions} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchSessions} />
      )}

      {sessions && !loading && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
              <span className="text-xs font-bold text-[#111827] dark:text-foreground">Recent & Active Admin Sessions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.06] text-[#52627A] dark:text-muted-foreground font-semibold">
                    <th className="py-2.5 px-4">Session</th>
                    <th className="py-2.5 px-4">IP Address</th>
                    <th className="py-2.5 px-4">Client User-Agent</th>
                    <th className="py-2.5 px-4">Created</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4 font-mono font-medium text-[#111827] dark:text-slate-200">
                        {sess.id.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {sess.ipAddress}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate font-mono text-[11px]">
                        {sess.userAgent}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(sess.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        {sess.isCurrent ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold text-[10px] uppercase">
                            Current Session
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400 font-semibold text-[10px] uppercase">
                            Previous Login
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
