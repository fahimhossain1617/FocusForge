"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Footprints,
  Activity,
  MessageSquare,
  Bug,
  ShieldAlert,
  Gauge,
  RefreshCw,
  GitBranch,
  Bot,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { AdminOverviewData, TimeRangeFilter } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function OverviewSection() {
  const [range, setRange] = useState<TimeRangeFilter>("24h");
  const cachedInitial = adminApiClient.getCached<AdminOverviewData>(`/api/admin/overview?range=24h`);
  const [loading, setLoading] = useState(!cachedInitial);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);
  const [data, setData] = useState<AdminOverviewData | null>(cachedInitial?.data || null);

  const fetchOverview = useCallback(async () => {
    const url = `/api/admin/overview?range=${encodeURIComponent(range)}`;
    const cached = adminApiClient.getCached<AdminOverviewData>(url);
    if (!cached) {
      setLoading(true);
    }
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getOverview(range);
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load overview data");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to admin API");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const rangeLabels: Record<TimeRangeFilter, { short: string; full: string }> = {
    "24h": { short: "24H", full: "Daily (24h)" },
    "7d": { short: "7D", full: "Weekly (7d)" },
    "30d": { short: "30D", full: "Monthly (30d)" },
    custom: { short: "Custom", full: "Custom" },
  };

  return (
    <div className="space-y-6">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Overview Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            System status, telemetry aggregates, and operational metrics for Focentia.
          </p>
        </div>

        {/* Time Range Pills: Daily, Weekly, Monthly */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.06] rounded-xl self-start sm:self-auto border border-slate-200/60 dark:border-white/[0.04]">
          {(["24h", "7d", "30d"] as TimeRangeFilter[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                range === r
                  ? "bg-white dark:bg-[#1E2638] text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-[#52627A] dark:text-muted-foreground hover:text-[#111827] dark:hover:text-foreground"
              }`}
              title={rangeLabels[r].full}
            >
              <span>{rangeLabels[r].full}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && <AdminLoadingView message="Loading overview telemetry..." />}

      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/overview" onRetry={fetchOverview} />
      )}

      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchOverview} />
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* Top Metric Cards Grid - All Fully Interactive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Logged-in Users (Registered Accounts) */}
            <MetricCardLink
              href="/admin/users"
              icon={Users}
              title="Logged-in Users"
              value={data.registeredUsers.value}
              change={data.registeredUsers.changePercent}
              definition="Total authentic user profiles created in database"
              window={data.registeredUsers.windowLabel}
              badge="Live Supabase"
            />

            {/* 2. Guest Mode Users */}
            <MetricCardLink
              href="/admin/guests"
              icon={Footprints}
              title="Guest Mode Users"
              value={data.guestSessions.value}
              change={data.guestSessions.changePercent}
              definition="Visitors using the app without logging in"
              window={rangeLabels[range].short}
              badge="Anonymous"
            />

            {/* 3. Active Regular Users */}
            <MetricCardLink
              href="/admin/analytics"
              icon={Activity}
              title="Active Regular Users"
              value={data.dau.value}
              change={data.dau.changePercent}
              definition="Unique user accounts actively using app features"
              window={rangeLabels[range].short}
              badge="Active"
            />

            {/* 4. AI Usage & Est. Cost */}
            <MetricCardLink
              href="/admin/ai-usage"
              icon={Bot}
              title="AI Est. Cost"
              value={`$${data.aiUsageSummary.estimatedCostUsd.toFixed(2)}`}
              definition="Operational cost calculated from token consumption"
              window="Active window"
              badge="Free Tier"
            />
          </div>

          {/* Health & Operations Summary Bar - All Fully Interactive */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-xs font-semibold text-[#52627A] dark:text-muted-foreground uppercase tracking-wider">
                System Health & Inbox (Click to Inspect)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <HealthItemLink
                href="/admin/feedback"
                icon={MessageSquare}
                label="Open Feedback"
                count={data.openFeedbackCount}
                color="text-blue-500"
                hint="User messages"
              />
              <HealthItemLink
                href="/admin/issues"
                icon={Bug}
                label="Unresolved Bugs"
                count={data.unresolvedBugsCount}
                color="text-rose-500"
                hint="Auto-detected"
              />
              <HealthItemLink
                href="/admin/security"
                icon={ShieldAlert}
                label="Security Events"
                count={data.criticalSecurityEvents}
                color="text-amber-500"
                hint="Security audit"
              />
              <HealthItemLink
                href="/admin/performance"
                icon={Gauge}
                label="Perf Issues"
                count={data.performanceIssuesCount}
                color="text-indigo-500"
                hint="Web Vitals"
              />
              <HealthItemLink
                href="/admin/sync-health"
                icon={RefreshCw}
                label="Sync Errors"
                count={data.syncErrorsCount}
                color="text-purple-500"
                hint="Data sync"
              />
              <HealthItemLink
                href="/admin/release"
                icon={GitBranch}
                label="App Release"
                count={data.currentReleaseVersion}
                color="text-emerald-500"
                hint="Deploy status"
              />
            </div>
          </div>

          {/* Feature Usage Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Most Used Features */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 shadow-none">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-[#111827] dark:text-foreground">
                    Most Used Features
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-[#52627A] dark:text-muted-foreground uppercase">
                  {rangeLabels[range].short}
                </span>
              </div>

              {data.mostUsedFeatures.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  <p>No feature events recorded yet for this period.</p>
                  <p className="text-[11px] mt-1 text-slate-400">
                    As users use Tasks, Focus Timer, Mind Space, and Diary, usage will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.mostUsedFeatures.map((feat, idx) => (
                    <Link
                      key={feat.featureName}
                      href={`/admin/analytics?feature=${encodeURIComponent(feat.featureName)}`}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all text-xs group cursor-pointer"
                      title={`Inspect ${feat.featureName} analytics`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-[#111827] dark:text-slate-200 truncate capitalize">
                          {feat.featureName.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[#52627A] dark:text-muted-foreground font-mono">
                          {feat.usageCount} uses ({feat.percentageOfTotal}%)
                        </span>
                        <ChevronRight size={13} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Least Used Features */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 shadow-none">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#111827] dark:text-foreground">
                  Least Used Features
                </h3>
                <span className="text-[11px] font-semibold text-[#52627A] dark:text-muted-foreground uppercase">
                  {rangeLabels[range].short}
                </span>
              </div>

              {data.leastUsedFeatures.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  <p>No least-used features recorded for this period.</p>
                  <p className="text-[11px] mt-1 text-slate-400">
                    Feature adoption metrics will display automatically as activity grows.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.leastUsedFeatures.map((feat, idx) => (
                    <Link
                      key={feat.featureName}
                      href={`/admin/analytics?feature=${encodeURIComponent(feat.featureName)}`}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all text-xs group cursor-pointer"
                      title={`Inspect ${feat.featureName} analytics`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-[#111827] dark:text-slate-200 truncate capitalize">
                          {feat.featureName.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[#52627A] dark:text-muted-foreground font-mono">
                          {feat.usageCount} uses ({feat.percentageOfTotal}%)
                        </span>
                        <ChevronRight size={13} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCardLink({
  href,
  icon: Icon,
  title,
  value,
  change,
  definition,
  window,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  value: string | number;
  change?: number;
  definition: string;
  window: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer active:scale-[0.99] block"
      title={`Open ${title} section`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#52627A] dark:text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </span>
          {badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
              {badge}
            </span>
          )}
        </div>
        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Icon size={16} />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#111827] dark:text-foreground tracking-tight">
            {value}
          </span>
          {change !== undefined && (
            <span
              className={`text-xs font-semibold flex items-center ${
                change >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {change >= 0 ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px] text-[#52627A] dark:text-muted-foreground">
        <span className="truncate" title={definition}>
          {definition}
        </span>
        <span className="shrink-0 font-medium ml-1">({window})</span>
      </div>
    </Link>
  );
}

function HealthItemLink({
  href,
  icon: Icon,
  label,
  count,
  color,
  hint,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  count: number | string;
  color: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="p-3 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 hover:border-blue-500/50 hover:shadow-sm transition-all flex flex-col items-center text-center group cursor-pointer active:scale-[0.98] block"
      title={`Inspect ${label}`}
    >
      <Icon size={16} className={`${color} mb-1 group-hover:scale-110 transition-transform`} />
      <span className="text-base font-bold text-[#111827] dark:text-foreground leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {count}
      </span>
      <span className="text-[10px] text-[#52627A] dark:text-muted-foreground mt-0.5 truncate w-full font-medium">
        {label}
      </span>
      {hint && (
        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
          {hint}
        </span>
      )}
    </Link>
  );
}
