"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { useAnimateExit } from "../../hooks/useAnimateExit";

interface GuestTransitionModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export default function GuestTransitionModal({
  isOpen,
  onContinue,
  onCancel,
}: GuestTransitionModalProps) {
  const modalAnim = useAnimateExit({ isOpen, durationMs: 200 });

  if (!modalAnim.shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${
        modalAnim.isExiting ? "motion-exit-fade" : "motion-overlay"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-transition-title"
    >
      <div
        className={`user-menu-dropdown-box relative w-full max-w-md rounded-3xl border border-[#DCE5F0] dark:border-white/10 bg-white dark:bg-[#111216] p-6 sm:p-7 text-center shadow-2xl ${
          modalAnim.isExiting ? "motion-exit-reveal" : "motion-scale-in"
        }`}
      >
        <div className="w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-500 shadow-sm">
          <ShieldAlert size={26} />
        </div>

        <h3
          id="guest-transition-title"
          className="text-lg sm:text-xl font-bold mb-2 text-[#0F172A] dark:text-foreground"
        >
          Your Guest Mode Will End
        </h3>

        <p className="text-xs sm:text-sm text-[#52627A] dark:text-muted-foreground leading-relaxed mb-6">
          Once you log in or create an account, Guest Mode will be permanently disabled for this browser profile. Your current guest data will be permanently deleted and will not be transferred to your account. This action cannot be undone.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#52627A] dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 transition-all cursor-pointer"
          >
            Stay in Guest Mode
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="btn-accent-solid flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Continue to Login
          </button>
        </div>
      </div>
    </div>
  );
}
