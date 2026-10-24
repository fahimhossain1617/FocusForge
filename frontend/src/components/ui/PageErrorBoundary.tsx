"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackPage?: string;
  onNavigateHome?: () => void;
  lang?: string;
}

interface DiagnosticInfo {
  timestamp: string;
  page: string;
  name: string;
  message: string;
  component: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  diagnostic: DiagnosticInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export default class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      diagnostic: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("[PageErrorBoundary caught an error]:", error, errorInfo);

    try {
      const topComponent =
        errorInfo?.componentStack
          ?.trim()
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 2)
          .join(" -> ") || "unknown";

      const diag: DiagnosticInfo = {
        timestamp: new Date().toISOString(),
        page: this.props.fallbackPage || "active_view",
        name: error?.name || "Error",
        message: (error?.message || "Unknown runtime exception").slice(0, 300),
        component: topComponent,
      };

      this.setState({ diagnostic: diag });

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("focentia_last_runtime_diagnostic", JSON.stringify(diag));
        } catch {}

        try {
          const rawHistory = localStorage.getItem("focentia_diagnostic_history");
          const history = rawHistory ? JSON.parse(rawHistory) : [];
          const updated = [diag, ...history.filter(Boolean)].slice(0, 5);
          localStorage.setItem("focentia_diagnostic_history", JSON.stringify(updated));
        } catch {}
      }
    } catch {
      // Safe fallback: never throw inside error handler
    }
  }

  handleReset = () => {
    const error = this.state.error;
    const isChunkLoadError = Boolean(
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Failed to fetch") ||
      error?.message?.includes("dynamically imported module") ||
      error?.message?.includes("Unexpected token '<'")
    );

    if (isChunkLoadError && typeof window !== "undefined") {
      try {
        if (typeof caches !== "undefined") {
          caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
        }
      } catch {}
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null, diagnostic: null, showDetails: false });
  };

  handleCopyDiagnostic = () => {
    const { diagnostic } = this.state;
    if (!diagnostic) return;
    const text = `Focentia Error Report\nPage: ${diagnostic.page}\nError: ${diagnostic.name}: ${diagnostic.message}\nComponent: ${diagnostic.component}\nTime: ${diagnostic.timestamp}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.setState({ copied: true });
          setTimeout(() => this.setState({ copied: false }), 2000);
        });
      }
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      const isBn = this.props.lang === "bn";
      const { diagnostic, showDetails, copied } = this.state;

      return (
        <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center my-auto min-h-[360px]">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0d1424]/90 border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20">
              <AlertCircle size={24} />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
              {isBn ? "এই পেজটি লোড হতে সমস্যা হয়েছে" : "This page encountered an issue"}
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {isBn
                ? "আপনার ডেটা সম্পূর্ণ সুরক্ষিত আছে। আপনি পেজটি পুনরায় চেষ্টা করতে পারেন অথবা ড্যাশবোর্ডে ফিরে যেতে পারেন।"
                : "Your data is completely safe. You can try reloading this page or return to your dashboard."}
            </p>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RefreshCw size={15} />
                <span>{isBn ? "পুনরায় চেষ্টা করুন" : "Try again"}</span>
              </button>

              {this.props.onNavigateHome && (
                <button
                  type="button"
                  onClick={() => {
                    this.handleReset();
                    this.props.onNavigateHome?.();
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Home size={15} />
                  <span>{isBn ? "হোম" : "Home"}</span>
                </button>
              )}
            </div>

            {/* Diagnostic Details Accordion */}
            {diagnostic && (
              <div className="w-full mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.08] flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !showDetails })}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{isBn ? (showDetails ? "বিবরণ লুকান" : "ত্রুটির বিবরণ দেখুন") : (showDetails ? "Hide details" : "Show error details")}</span>
                  {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showDetails && (
                  <div className="w-full mt-2.5 p-3 rounded-xl bg-slate-100/80 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 text-left text-[11px] font-mono text-slate-600 dark:text-slate-300 overflow-x-auto space-y-1">
                    <div><span className="text-slate-400">Page:</span> {diagnostic.page}</div>
                    <div><span className="text-slate-400">Error:</span> {diagnostic.name}: {diagnostic.message}</div>
                    {diagnostic.component && <div><span className="text-slate-400">Stack:</span> {diagnostic.component}</div>}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={this.handleCopyDiagnostic}
                        className="py-1 px-2.5 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        <span>{isBn ? (copied ? "কপি হয়েছে!" : "রিপোর্ট কপি করুন") : (copied ? "Copied!" : "Copy Report")}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
