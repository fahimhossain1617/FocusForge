"use client";

import { useAppContext } from "../../context/AppContext";
import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react";

export default function Toast() {
  const { toasts } = useAppContext();

  return (
    <div 
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,16px))] md:bottom-6 right-4 sm:right-6 z-[100] flex flex-col gap-2.5 pointer-events-none max-w-[calc(100vw-2rem)]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} message={toast.message} type={toast.type} />
      ))}
    </div>
  );
}

function ToastItem({ message, type }: { message: string; type: string }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // PDF Spec: stays for 2.4 seconds (2400ms)
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{ animationDuration: "250ms" }}
      className={`${isExiting ? "motion-exit-toast" : "motion-toast"} app-toast app-toast--${type} flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#111827] border ${
        type === "error"
          ? "border-[#D95C68] text-[#111827] dark:text-foreground"
          : "border-[#DCE5F0] dark:border-white/10 text-[#111827] dark:text-foreground"
      } shadow-[0_8px_28px_rgba(0,0,0,0.06)] dark:shadow-xl pointer-events-auto max-w-sm`}
    >
      {/* Icon */}
      <div className="shrink-0">
        {type === "error" ? (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[#D95C68]">
            <AlertCircle size={20} strokeWidth={2.5} />
          </div>
        ) : type === "info" ? (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[#5B8DEF]">
            <Info size={20} strokeWidth={2.5} />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#2E9B73]/10 dark:bg-[#2E9B73]/20 flex items-center justify-center text-[#2E9B73]">
            <CheckCircle2 size={20} strokeWidth={2.5} className="text-[#2E9B73]" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex flex-col min-w-0">
        <span className="text-xs sm:text-sm font-semibold text-[#111827] dark:text-foreground leading-snug">
          {message}
        </span>
      </div>
    </div>
  );
}
