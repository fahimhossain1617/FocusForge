"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isBn, setIsBn] = useState(false);

  const isChunkLoadError = Boolean(
    error?.name === "ChunkLoadError" ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("Failed to fetch") ||
    error?.message?.includes("dynamically imported module") ||
    error?.message?.includes("Unexpected token '<'") ||
    error?.message?.includes("is not a valid JavaScript MIME type")
  );

  useEffect(() => {
    console.error("Unhandled App Error:", error);

    // Detect user's preferred language from local storage
    try {
      const savedLang = localStorage.getItem("focusforge_lang");
      if (savedLang === "bn") {
        setIsBn(true);
      }
    } catch {}

    // Auto-recover from one-shot ChunkLoadError caused by fresh deployments
    if (isChunkLoadError && typeof window !== "undefined") {
      let alreadyAttempted: string | null = null;
      try {
        alreadyAttempted = sessionStorage.getItem("ff_chunk_recovery_attempted");
      } catch {}

      if (!alreadyAttempted) {
        try {
          sessionStorage.setItem("ff_chunk_recovery_attempted", "true");
        } catch {}

        if (typeof caches !== "undefined") {
          caches.keys().then((keys) => {
            return Promise.all(keys.map((k) => caches.delete(k)));
          }).catch(() => {}).finally(() => {
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
      }
    }
  }, [error, isChunkLoadError]);

  const handleReloadApp = async () => {
    try {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("ff_chunk_recovery_attempted");
        } catch {}

        if (typeof caches !== "undefined") {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update().catch(() => {});
          }
        }
      }
    } catch {}
    window.location.href = `/?_t=${Date.now()}`;
  };

  const handleTryAgain = () => {
    if (isChunkLoadError) {
      handleReloadApp();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F8FAFC] flex flex-col items-center justify-center p-4 selection:bg-[#2563EB] selection:text-[#FFFFFF]">
      <div 
        className="pointer-events-none fixed top-0 left-0 right-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(220,38,38,0.15)_0%,rgba(8,9,12,0)_75%)] z-0" 
        aria-hidden="true" 
      />
      
      <div className="relative z-10 max-w-md w-full p-8 rounded-3xl border shadow-none flex flex-col items-center text-center"
        style={{
          background: "rgba(13, 20, 38, 0.84)",
          borderColor: "rgba(220, 38, 38, 0.22)",
          boxShadow: "none",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)"
        }}
      >
        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20 shadow-none">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">
          {isBn ? "একটি অপ্রত্যাশিত সমস্যা হয়েছে" : "Something went wrong"}
        </h1>
        
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          {isBn
            ? "আমরা একটি অপ্রত্যাশিত ত্রুটির সম্মুখীন হয়েছি। চিন্তা করবেন না, আপনার ডেটা সুরক্ষিত আছে। পেজটি পুনরায় লোড করতে পারেন।"
            : "We encountered an unexpected error. Don't worry, your data is safe. You can try refreshing the page or returning home."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleTryAgain}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm text-white border transition-all cursor-pointer shadow-none hover:bg-white/5 active:scale-[0.98]"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              borderColor: "rgba(255, 255, 255, 0.14)",
            }}
          >
            <RefreshCcw size={16} />
            <span>{isBn ? "পুনরায় চেষ্টা করুন" : "Try again"}</span>
          </button>
          
          <button
            onClick={handleReloadApp}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-95 active:scale-[0.98] cursor-pointer"
            style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
          >
            <Home size={16} />
            <span>{isBn ? "অ্যাপ রিলোড করুন" : "Reload App"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
