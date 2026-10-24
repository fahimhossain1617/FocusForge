"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackPage?: string;
  onNavigateHome?: () => void;
  lang?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("[PageErrorBoundary caught an error]:", error, errorInfo);
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
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isBn = this.props.lang === "bn";
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
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
