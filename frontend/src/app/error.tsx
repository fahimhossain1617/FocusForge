"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in a real production environment
    console.error("Unhandled App Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F8FAFC] flex flex-col items-center justify-center p-4 selection:bg-[#2563EB] selection:text-[#FFFFFF]">
      <div 
        className="pointer-events-none fixed top-0 left-0 right-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(220,38,38,0.15)_0%,rgba(8,9,12,0)_75%)] z-0" 
        aria-hidden="true" 
      />
      
      <div className="relative z-10 max-w-md w-full p-8 rounded-3xl border shadow-2xl flex flex-col items-center text-center"
        style={{
          background: "rgba(13, 20, 38, 0.84)",
          borderColor: "rgba(220, 38, 38, 0.22)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(220, 38, 38, 0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)"
        }}
      >
        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20 shadow-inner">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">Something went wrong</h1>
        
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          We encountered an unexpected error. Don't worry, your data is safe. You can try refreshing the page or returning home.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm text-white border transition-all cursor-pointer shadow-sm hover:bg-white/5 active:scale-[0.98]"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              borderColor: "rgba(255, 255, 255, 0.14)",
            }}
          >
            <RefreshCcw size={16} />
            <span>Try again</span>
          </button>
          
          <button
            onClick={() => { window.location.href = '/'; }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white  transition-all hover:opacity-95 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
          >
            <Home size={16} />
            <span>Reload App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
