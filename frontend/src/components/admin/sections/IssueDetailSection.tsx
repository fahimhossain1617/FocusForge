"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Bug, AlertTriangle, ShieldCheck, Clock, CheckCircle2, Save } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { BugIssue } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function IssueDetailSection({ issueId }: { issueId: string }) {
  const [issue, setIssue] = useState<BugIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const [status, setStatus] = useState<BugIssue["status"]>("new");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getIssueDetail(issueId);
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setIssue(res.data);
        setStatus(res.data.status);
      } else {
        setError(res.error || "Failed to load issue detail");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to issues API");
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    try {
      await adminApiClient.updateIssueStatus(issueId, status);
      fetchDetail();
    } catch {
      alert("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/issues"
          className="p-1.5 rounded-xl border border-[#DCE5F0] dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Back to issues"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Issue #{issueId.slice(0, 8)}
          </h1>
          <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5">
            Severity: <strong className="capitalize">{issue?.severity || "High"}</strong>
          </p>
        </div>
      </div>

      {loading && <AdminLoadingView message="Loading issue diagnostics..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint={`/api/admin/issues/${issueId}`} onRetry={fetchDetail} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchDetail} />
      )}

      {issue && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Diagnostics Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 space-y-3">
              <h2 className="text-base font-bold text-[#111827] dark:text-foreground">
                {issue.title || issue.errorName}
              </h2>
              <p className="text-xs font-mono text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-500/[0.04] p-3 rounded-xl border border-rose-200/50 dark:border-rose-500/20">
                {issue.message}
              </p>

              {/* Sanitized Stack */}
              {issue.sanitizedStack && (
                <div>
                  <span className="text-xs font-bold text-[#111827] dark:text-foreground block mb-1">
                    Sanitized Stack Trace
                  </span>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                    {issue.sanitizedStack}
                  </pre>
                </div>
              )}
            </div>

            {/* Facts vs Hypotheses Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-blue-200/60 dark:border-blue-900/40">
                <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">
                  Confirmed Facts
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                  {issue.facts.length > 0 ? (
                    issue.facts.map((f, i) => <li key={i}>{f}</li>)
                  ) : (
                    <li className="text-slate-400">Occurrences: {issue.occurrencesCount} on route {issue.route}</li>
                  )}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-amber-200/60 dark:border-amber-900/40">
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">
                  Investigative Hypotheses
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                  {issue.hypotheses.length > 0 ? (
                    issue.hypotheses.map((h, i) => <li key={i}>{h}</li>)
                  ) : (
                    <li className="text-slate-400">Potential network transition or stale cache artifact</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 space-y-4">
            <div>
              <label className="text-xs font-bold text-[#111827] dark:text-foreground block mb-1">
                Triage Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none cursor-pointer"
              >
                <option value="new">New</option>
                <option value="investigating">Investigating</option>
                <option value="fixed">Fixed</option>
                <option value="verified">Verified (Manual Confirmation)</option>
                <option value="reopened">Reopened</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                * Note: &apos;Fixed&apos; never automatically becomes &apos;Verified&apos;. Verification requires manual confirmation.
              </p>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleUpdateStatus}
                className="w-full mt-2.5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isUpdating ? "Saving..." : "Update Status"}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2 text-xs">
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">Route</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{issue.route}</span>
              </div>
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">Occurrences</span>
                <span className="font-bold text-slate-900 dark:text-white">{issue.occurrencesCount}</span>
              </div>
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">First Seen</span>
                <span>{new Date(issue.firstSeenAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">Last Seen</span>
                <span>{new Date(issue.lastSeenAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">App Version</span>
                <span className="font-mono">{issue.appVersion}</span>
              </div>
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">Platform</span>
                <span className="capitalize">{issue.platform}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
