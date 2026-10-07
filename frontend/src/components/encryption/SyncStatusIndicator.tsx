"use client";

import React from "react";
import { Cloud, CloudCheck, CloudOff, RefreshCw, Lock, AlertCircle, HardDrive } from "lucide-react";
import { type SyncStatus } from "../../lib/sync";

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  isSyncing?: boolean;
  onTriggerSync?: () => void;
  lang?: string;
  className?: string;
}

export default function SyncStatusIndicator({
  status,
  isSyncing = false,
  onTriggerSync,
  lang = "en",
  className = "",
}: SyncStatusIndicatorProps) {
  const isBn = lang === "bn";

  const getStatusConfig = () => {
    switch (status) {
      case "syncing":
        return {
          icon: <RefreshCw size={12} className="animate-spin text-blue-500" />,
          label: isBn ? "সিঙ্ক হচ্ছে..." : "Syncing...",
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        };
      case "synced":
        return {
          icon: <CloudCheck size={12} className="text-emerald-500" />,
          label: isBn ? "সিঙ্ক হয়েছে" : "Synced",
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        };
      case "offline":
        return {
          icon: <CloudOff size={12} className="text-amber-500" />,
          label: isBn ? "অফলাইন" : "Offline",
          color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        };
      case "locked":
        return {
          icon: <Lock size={12} className="text-purple-500" />,
          label: isBn ? "লক করা" : "Locked",
          color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        };
      case "sync_failed":
        return {
          icon: <AlertCircle size={12} className="text-red-500" />,
          label: isBn ? "সিঙ্ক ব্যর্থ" : "Sync Failed",
          color: "text-red-500 bg-red-500/10 border-red-500/20",
        };
      case "saved_locally":
      default:
        return {
          icon: <HardDrive size={12} className="text-[var(--color-text-muted)]" />,
          label: isBn ? "ডিভাইসে সংরক্ষিত" : "Saved Locally",
          color: "text-[var(--color-text-secondary)] bg-[var(--color-surface)] border-[var(--color-border-subtle)]",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <button
      type="button"
      onClick={onTriggerSync}
      disabled={isSyncing || status === "offline"}
      title={isBn ? "সিঙ্ক স্ট্যাটাস (ক্লিক করে সিঙ্ক করুন)" : "Sync Status (Click to sync)"}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer select-none disabled:cursor-default ${config.color} ${className}`}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </button>
  );
}
