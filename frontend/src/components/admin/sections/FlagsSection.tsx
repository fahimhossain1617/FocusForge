"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Flag, ToggleLeft, ToggleRight, AlertTriangle, Save, RefreshCw } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { AdminFeatureFlag } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView, AdminEmptyView } from "../AdminStateViews";

export function FlagsSection() {
  const [flags, setFlags] = useState<AdminFeatureFlag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getFlags();
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setFlags(res.data);
      } else {
        setError(res.error || "Failed to load feature flags");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to flags API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (flag: AdminFeatureFlag) => {
    setUpdatingKey(flag.key);
    try {
      const updated = !flag.isEnabled;
      const res = await adminApiClient.updateFlag(flag.key, { isEnabled: updated });
      if (res.success) {
        setFlags((prev) =>
          prev ? prev.map((f) => (f.key === flag.key ? { ...f, isEnabled: updated } : f)) : prev
        );
      } else {
        alert(res.error || "Failed to update feature flag");
      }
    } catch {
      alert("Failed to toggle flag");
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Feature Flags & Kill Switches
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            Dynamic feature gating and instant kill switches for high-risk modules.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchFlags}
          className="p-2 rounded-xl border border-[#DCE5F0] dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Refresh flags"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {loading && <AdminLoadingView message="Loading feature flags..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/flags" onRetry={fetchFlags} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchFlags} />
      )}

      {flags && !loading && (
        <div className="space-y-3">
          {flags.length === 0 ? (
            <AdminEmptyView title="No feature flags defined" description="No dynamic kill switches configured." />
          ) : (
            flags.map((flag) => (
              <div
                key={flag.key}
                className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#111827] dark:text-foreground">{flag.name}</span>
                    <code className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] font-mono text-blue-600 dark:text-blue-400">
                      {flag.key}
                    </code>
                  </div>
                  <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-1 max-w-xl">
                    {flag.description}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Updated {new Date(flag.updatedAt).toLocaleString()} by {flag.updatedBy}
                  </span>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={updatingKey === flag.key}
                    onClick={() => handleToggle(flag)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      flag.isEnabled
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 border border-slate-300 dark:bg-white/[0.06] dark:border-white/10 dark:text-slate-400"
                    }`}
                  >
                    {flag.isEnabled ? <ToggleRight size={18} className="text-emerald-600" /> : <ToggleLeft size={18} />}
                    <span>{flag.isEnabled ? "Enabled" : "Disabled"}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
