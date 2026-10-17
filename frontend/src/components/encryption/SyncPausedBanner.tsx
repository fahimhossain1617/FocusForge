"use client";

import React from "react";
import { ShieldAlert, ArrowRight } from "lucide-react";

interface SyncPausedBannerProps {
  onUnlockClick: () => void;
  lang?: string;
}

export default function SyncPausedBanner({ onUnlockClick, lang = "en" }: SyncPausedBannerProps) {
  const isBn = lang === "bn";

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2 flex items-center justify-between gap-3 text-xs text-amber-600 dark:text-amber-400">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span className="truncate font-medium">
          {isBn
            ? "ডিভাইস সিঙ্ক পজ করা আছে — ক্লাউডে ডেটা সুরক্ষিতভাবে সিঙ্ক করতে পিন দিন।"
            : "Device sync is paused — Enter your sync PIN to securely sync across devices."}
        </span>
      </div>
      <button
        type="button"
        onClick={onUnlockClick}
        className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
      >
        <span>{isBn ? "সিঙ্ক করুন" : "Sync Now"}</span>
        <ArrowRight size={12} />
      </button>
    </div>
  );
}
