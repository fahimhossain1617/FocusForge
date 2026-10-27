"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Info,
} from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { AdminOverviewData, TimeRangeFilter } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function OverviewSection() {
  const [range, setRange] = useState<TimeRangeFilter>("24h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);
  const [data, setData] = useState<AdminOverviewData | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
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

  return (
    <div className="space-y-6">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Overview Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            System status, telemetry aggregates, and operations health across Focentia.
          </p>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.06] rounded-xl self-start sm:self-auto">
          {(["24h", "7d", "30d"] as TimeRangeFilter[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                range === r
                  ? "bg-white dark:bg-[#1E2638] text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-[#52627A] dark:text-muted-foreground hover:text-[#111827] dark:hover:text-foreground"
              }`}
            >
              {r.toUpperCase()}
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
          {/* Top Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Registered Users */}
            <MetricCard
              icon={Users}
              title="Registered Users"
              value={data.registeredUsers.value}
              change={data.registeredUsers.changePercent}
              definition={data.registeredUsers.definition}
              window={data.registeredUsers.windowLabel}
            />

            {/* Guest Sessions */}
            <MetricCard
              icon={Footprints}
              title="Guest Sessions"
              value={data.guestSessions.value}
              change={data.guestSessions.changePercent}
              definition="Distinct anonymous sessions (not unique people)"
              window={data.guestSessions.windowLabel}
            />

            {/* DAU */}
            <MetricCard
              icon={Activity}
              title="Active Users (DAU)"
              value={data.dau.value}
              change={data.dau.changePercent}
              definition={data.dau.definition}
              window={data.dau.windowLabel}
            />

            {/* AI Usage */}
            <MetricCard
              icon={Bot}
              title="AI Est. Cost"
              value={`$${data.aiUsageSummary.estimatedCostUsd.toFixed(2)}`}
              definition="Clearly labeled estimate based on Gemini token pricing"
              window="Active billing window"
            />
          </div>

          {/* Health & Operations Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <HealthItem
              icon={MessageSquare}
              label="Open Feedback"
              count={data.openFeedbackCount}
              color="text-blue-500"
            />
            <HealthItem
              icon={Bug}
              label="Unresolved Bugs"
              count={data.unresolvedBugsCount}
              color="text-rose-500"
            />
            <HealthItem
              icon={ShieldAlert}
              label="Security Events"
              count={data.criticalSecurityEvents}
              color="text-amber-500"
            />
            <HealthItem
              icon={Gauge}
              label="Perf Issues"
              count={data.performanceIssuesCount}
              color="text-indigo-500"
            />
            <HealthItem
              icon={RefreshCw}
              label="Sync Errors"
              count={data.syncErrorsCount}
              color="text-purple-500"
            />
            <HealthItem
              icon={GitBranch}
              label="App Release"
              count={data.currentReleaseVersion}
              color="text-emerald-500"
            />
          </div>

          {/* Feature Usage Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <h3 className="text-sm font-bold text-[#111827] dark:text-foreground mb-3 flex items-center justify-between">
                <span>Most Used Features</span>
                <span className="text-[11px] font-normal text-[#52627A] dark:text-muted-foreground">{range.toUpperCase()}</span>
              </h3>
              <div className="space-y-2.5">
                {data.mostUsedFeatures.map((feat, idx) => (
                  <div key={feat.featureName} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#111827] dark:text-slate-200">
                      {idx + 1}. {feat.featureName}
                    </span>
                    <span className="text-[#52627A] dark:text-muted-foreground font-mono">
                      {feat.usageCount} uses ({feat.percentageOfTotal}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <h3 className="text-sm font-bold text-[#111827] dark:text-foreground mb-3 flex items-center justify-between">
                <span>Least Used Features</span>
                <span className="text-[11px] font-normal text-[#52627A] dark:text-muted-foreground">{range.toUpperCase()}</span>
              </h3>
              <div className="space-y-2.5">
                {data.leastUsedFeatures.map((feat, idx) => (
                  <div key={feat.featureName} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#111827] dark:text-slate-200">
                      {idx + 1}. {feat.featureName}
                    </span>
                    <span className="text-[#52627A] dark:text-muted-foreground font-mono">
                      {feat.usageCount} uses ({feat.percentageOfTotal}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  change,
  definition,
  window,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  change?: number;
  definition: string;
  window: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#52627A] dark:text-muted-foreground">{title}</span>
        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#111827] dark:text-foreground tracking-tight">{value}</span>
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
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px] text-[#52627A] dark:text-muted-foreground">
        <span className="truncate" title={definition}>{definition}</span>
        <span className="shrink-0 font-medium ml-1">({window})</span>
      </div>
    </div>
  );
}

function HealthItem({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ElementType;
  label: string;
  count: number | string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 flex flex-col items-center text-center">
      <Icon size={16} className={`${color} mb-1`} />
      <span className="text-base font-bold text-[#111827] dark:text-foreground leading-tight">{count}</span>
      <span className="text-[10px] text-[#52627A] dark:text-muted-foreground mt-0.5 truncate w-full">{label}</span>
    </div>
  );
}
