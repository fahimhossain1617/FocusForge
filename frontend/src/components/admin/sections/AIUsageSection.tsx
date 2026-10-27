"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bot, DollarSign, AlertCircle, TrendingUp, Cpu, Info } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { AIUsageData, TimeRangeFilter } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function AIUsageSection() {
  const [range, setRange] = useState<TimeRangeFilter>("7d");
  const [data, setData] = useState<AIUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const fetchAIUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getAIUsage(range);
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load AI usage metrics");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to AI usage API");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAIUsage();
  }, [fetchAIUsage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            AI Usage & Quotas (Glory AI)
          </h1>
          <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground mt-0.5">
            Token consumption, estimated Gemini API expenditure, quota limits, and error rates.
          </p>
        </div>

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

      {/* Cost Disclaimer */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
        <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Estimation Disclaimer:</span> Costs displayed are calculated estimates based on input/output token counts and Gemini standard billing rates. Actual Google Cloud invoice charges may differ due to rounding or tier discounts.
        </div>
      </div>

      {loading && <AdminLoadingView message="Loading Glory AI metrics..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint="/api/admin/ai-usage" onRetry={fetchAIUsage} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchAIUsage} />
      )}

      {data && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Estimated Cost</span>
              <p className="text-2xl font-bold text-[#111827] dark:text-foreground mt-0.5">
                ${data.estimatedCostUsd.toFixed(2)}
              </p>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Clearly labeled estimate</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Tokens Consumed</span>
              <p className="text-2xl font-bold text-[#111827] dark:text-foreground mt-0.5 font-mono">
                {data.totalTokensUsed.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400">Total in {range.toUpperCase()} window</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Copilot Requests</span>
              <p className="text-2xl font-bold text-[#111827] dark:text-foreground mt-0.5">
                {data.copilotRequests.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400">{data.voiceMinutes} voice min transcribed</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10">
              <span className="text-xs text-[#52627A] dark:text-muted-foreground">Gemini API Errors</span>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {data.geminiErrorsCount}
              </p>
              <span className="text-[11px] text-slate-400">Rate limit / timeout errors</span>
            </div>
          </div>

          {/* Daily Token Breakdown Table */}
          <div className="rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
              <span className="text-xs font-bold text-[#111827] dark:text-foreground">Daily AI Usage Breakdown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.06] text-[#52627A] dark:text-muted-foreground font-semibold">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Tokens Used</th>
                    <th className="py-2.5 px-4">Est. Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {data.dailyTokenBreakdown.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4 font-mono font-medium text-[#111827] dark:text-slate-200">{row.date}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{row.tokens.toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">${row.costEstimate.toFixed(3)}</td>
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
