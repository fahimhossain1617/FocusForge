"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import { NotificationOrbAvatar } from "../navigation/NotificationOrbAvatar";
import {
  Bell,
  ArrowLeft,
  CheckCheck,
  Trash2,
  Settings,
  Info,
  ExternalLink,
  Clock,
  Check,
  X,
} from "lucide-react";
import { AppNotification } from "../../types";
import { localNotificationScheduler } from "../../services/localNotificationScheduler";

// Relative time formatter helper
function formatTimeAgo(timestampStr: string, isBn: boolean): string {
  try {
    const time = new Date(timestampStr).getTime();
    if (isNaN(time)) return "";

    const now = Date.now();
    const diffSec = Math.floor((now - time) / 1000);

    if (diffSec < 45) {
      return isBn ? "এইমাত্র" : "Just now";
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return isBn ? `${diffMin} মিনিট আগে` : `${diffMin}m ago`;
    }
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) {
      return isBn ? `${diffHour} ঘণ্টা আগে` : `${diffHour}h ago`;
    }
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays === 1) {
      return isBn ? "গতকাল" : "Yesterday";
    }
    if (diffDays < 7) {
      return isBn ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
    }
    const date = new Date(time);
    return date.toLocaleDateString(isBn ? "bn-BD" : "en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// Category app tag formatter
function getAppTag(notif: AppNotification, isBn: boolean): string {
  const cat = notif.category || notif.type;
  switch (cat) {
    case "daily_plan":
      return isBn ? "ফোসেন্টিয়া • আজকের প্ল্যান" : "FOCENTIA • DAILY PLAN";
    case "focus_reminder":
    case "focus":
      return isBn ? "ফোসেন্টিয়া • ফোকাস" : "FOCENTIA • FOCUS";
    case "task_start":
      return isBn ? "ফোসেন্টিয়া • টাস্ক শুরু" : "FOCENTIA • TASK START";
    case "task_pre_reminder":
      return isBn ? "ফোসেন্টিয়া • আসন্ন টাস্ক" : "FOCENTIA • TASK DUE SOON";
    case "task_incomplete":
      return isBn ? "ফোসেন্টিয়া • কাজের খবর" : "FOCENTIA • TASK CHECK-IN";
    case "skill_reminder":
    case "learning":
      return isBn ? "ফোসেন্টিয়া • চর্চা" : "FOCENTIA • PRACTICE";
    case "task_completed":
      return isBn ? "ফোসেন্টিয়া • সম্পন্ন" : "FOCENTIA • COMPLETED";
    case "focus_completed":
      return isBn ? "ফোসেন্টিয়া • ফোকাস সম্পন্ন" : "FOCENTIA • FOCUS DONE";
    case "break_time":
      return isBn ? "ফোসেন্টিয়া • বিরতি" : "FOCENTIA • BREAK";
    case "streak_milestone":
      return isBn ? "ফোসেন্টিয়া • স্ট্রিক" : "FOCENTIA • STREAK";
    default:
      return isBn ? "ফোসেন্টিয়া" : "FOCENTIA";
  }
}

export default function NotificationsPage() {
  const { state, navigateTo, navigateBack, showToast } = useAppContext();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    browserPermission,
    requestBrowserPermission,
  } = useNotificationCenter();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");

  const isLight = state.theme?.mode === "light";
  const isBn = state.lang === "bn";
  const isNative = localNotificationScheduler.isNativeAndroid();

  // Hold / long press refs to handle selection without triggering normal click
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressedRef = useRef<boolean>(false);

  // Clean up selectedIds if items get removed
  useEffect(() => {
    if (selectedIds.size > 0) {
      const currentIds = new Set(notifications.map((n) => n.id));
      setSelectedIds((prev) => {
        const next = new Set<string>();
        prev.forEach((id) => {
          if (currentIds.has(id)) next.add(id);
        });
        return next;
      });
    }
  }, [notifications, selectedIds.size]);

  // Filter list
  const filteredNotifications = useMemo(() => {
    if (filterMode === "unread") {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filterMode]);

  // Split notifications into TODAY and EARLIER
  const { todayList, earlierList } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const today: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    filteredNotifications.forEach((n) => {
      const nDate = n.timestamp ? n.timestamp.split("T")[0] : "";
      if (nDate === todayStr) {
        today.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { todayList: today, earlierList: earlier };
  }, [filteredNotifications]);

  const isAllSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedIds.has(n.id));

  // Toggle selection for a single notification
  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle Select All
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  // Delete all selected notifications
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    selectedIds.forEach((id) => {
      dismissNotification(id);
    });
    setSelectedIds(new Set());
    showToast(
      isBn ? `${count}টি নোটিফিকেশন মুছে ফেলা হয়েছে` : `${count} notification(s) deleted`,
      "info"
    );
  };

  // Handle single notification click
  const handleNotificationClick = (notif: AppNotification) => {
    if (isLongPressedRef.current) {
      isLongPressedRef.current = false;
      return;
    }

    if (selectedIds.size > 0) {
      // If user is in selection mode, tapping toggles selection
      toggleSelectId(notif.id);
      return;
    }

    // Normal click: mark as read and navigate
    markAsRead(notif.id);
    if (notif.actionRoute) {
      navigateTo(notif.actionRoute);
    }
  };

  // Long press handlers
  const handleTouchStart = (id: string) => {
    isLongPressedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      toggleSelectId(id);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {}
      }
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleOpenSettings = () => {
    navigateTo("settings");
    if (typeof window !== "undefined") {
      window.location.hash = "#settings/account/notifications";
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-8 md:pb-12 space-y-4 sm:space-y-5 select-none">
      {/* 1. Main Page Header */}
      <div className="pt-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Back Navigation Button */}
            <button
              type="button"
              onClick={navigateBack}
              className="inline-flex items-center justify-center w-8 h-8 -ml-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              aria-label={isBn ? "ফিরে যান" : "Back"}
              title={isBn ? "ফিরে যান" : "Back"}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
            </button>

            <div className="flex items-baseline gap-2.5">
              <h1 className="text-2xl sm:text-[28px] md:text-3xl font-bold tracking-tight text-foreground leading-[1.2]">
                {isBn ? "নোটিফিকেশন" : "Notifications"}
              </h1>
              {unreadCount > 0 && (
                <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                  {unreadCount} {isBn ? "নতুন" : "new"}
                </span>
              )}
            </div>
          </div>

          {/* Top Right Action: Settings (Clean icon button aligned with title, no box) */}
          <button
            type="button"
            onClick={handleOpenSettings}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            title={isBn ? "নোটিফিকেশন সেটিংস" : "Notification Settings"}
            aria-label={isBn ? "নোটিফিকেশন সেটিংস" : "Notification Settings"}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* 2. Top Interface Controls Toolbar (Open on page, NOT inside any big outer card box) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Filter Tabs (All / Unread) - Simple separate tabs, NO outer switch box, NO animations */}
        <div className="flex items-center gap-2 select-none">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterMode === "all"
                ? isLight
                  ? "bg-slate-200 text-slate-900"
                  : "bg-slate-800 text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span>{isBn ? "সকল" : "All"} ({notifications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("unread")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterMode === "unread"
                ? isLight
                  ? "bg-slate-200 text-slate-900"
                  : "bg-slate-800 text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span>{isBn ? "অপঠিত" : "Unread"} ({unreadCount})</span>
          </button>
        </div>

        {/* Right: Actions strictly on RIGHT (Mark All Read, Select All, Delete) */}
        {filteredNotifications.length > 0 && (
          <div className="flex items-center gap-3 ml-auto">
            {/* 1. Mark All as Read Button */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title={isBn ? "সব পড়া হয়েছে মার্ক করুন" : "Mark all as read"}
                aria-label={isBn ? "সব পড়া হয়েছে মার্ক করুন" : "Mark all as read"}
              >
                <CheckCheck size={16} />
                <span className="hidden sm:inline">
                  {isBn ? "পড়া হয়েছে" : "Mark Read"}
                </span>
              </button>
            )}

            {/* 2. Select All Checkbox Button (Clean text & checkbox, NO outer box) */}
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title={isBn ? "সবগুলো নির্বাচন করুন" : "Select all"}
            >
              <div
                className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                  isAllSelected
                    ? "bg-blue-600 border-blue-600 text-white"
                    : selectedIds.size > 0
                    ? "bg-blue-600/20 border-blue-500 text-blue-500"
                    : "border-slate-400 dark:border-slate-500"
                }`}
              >
                {isAllSelected && <Check size={11} strokeWidth={3} />}
                {!isAllSelected && selectedIds.size > 0 && (
                  <span className="w-1.5 h-1.5 rounded-sm bg-blue-500" />
                )}
              </div>
              <span>
                {isBn ? "সিলেক্ট অল" : "Select All"}
                {selectedIds.size > 0 && ` (${selectedIds.size})`}
              </span>
            </button>

            {/* 3. Delete Button: Clean text button like Mark Read, NO box */}
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className={`px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                selectedIds.size > 0
                  ? "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                  : "opacity-35 cursor-not-allowed text-slate-400 dark:text-slate-600"
              }`}
              title={
                selectedIds.size > 0
                  ? isBn
                    ? `নির্বাচিত ${selectedIds.size}টি ডিলিট করুন`
                    : `Delete selected (${selectedIds.size})`
                  : isBn
                  ? "ডিলিট করতে নোটিফিকেশন সিলেক্ট করুন"
                  : "Select notifications to delete"
              }
              aria-label="Delete selected notifications"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">
                {isBn ? "ডিলিট" : "Delete"}
                {selectedIds.size > 0 && ` (${selectedIds.size})`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Browser / Native Permission Notice */}
      {browserPermission === "default" && (
        <div className="py-2 flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2 min-w-0">
            <Info size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
            <p className="text-xs sm:text-sm">
              {isNative
                ? isBn
                  ? "গুরুত্বপূর্ণ টাস্ক ও সেশনের সময়মতো নোটিফিকেশন পেতে ডিভাইসের নোটিফিকেশন অনুমতি দিন।"
                  : "Enable app notifications to stay on track with scheduled tasks and reminders."
                : isBn
                ? "গুরুত্বপূর্ণ টাস্ক ও সেশনের সময়মতো নোটিফিকেশন পেতে ব্রাউজার পারমিশন দিন।"
                : "Enable browser notifications to stay on track with scheduled tasks and reminders."}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (isNative) {
                await localNotificationScheduler.requestPermissions();
              }
              await requestBrowserPermission();
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer transition-colors"
          >
            {isBn ? "অনুমতি দিন" : "Enable"}
          </button>
        </div>
      )}

      {/* 4. Notification List Content (Clean Standalone Cards) */}
      <div className="space-y-6 min-h-[350px]">
        {filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                isLight ? "bg-slate-100 text-slate-600" : "bg-[#141B2D] text-slate-300"
              }`}
            >
              <Bell size={26} strokeWidth={1.8} />
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-1.5 text-foreground">
              {filterMode === "unread"
                ? isBn
                  ? "কোনো নতুন নোটিফিকেশন নেই"
                  : "No unread notifications"
                : isBn
                ? "কোনো নোটিফিকেশন নেই"
                : "No notifications yet"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-[360px] leading-relaxed">
              {isBn
                ? "আপনার আজকের প্ল্যান, টাস্ক ও ফোকাস সেশনের সকল রিমাইন্ডার এখানে নিয়মিত দেখতে পাবেন।"
                : "Your daily plans, task reminders, and focus updates will safely appear right here."}
            </p>
          </div>
        ) : (
          <>
            {/* TODAY SECTION */}
            {todayList.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {isBn ? "আজকের নোটিফিকেশন" : "TODAY"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    ({todayList.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {todayList.map((notif) => (
                    <NotificationCard
                      key={notif.id}
                      notif={notif}
                      isLight={isLight}
                      isBn={isBn}
                      isSelected={selectedIds.has(notif.id)}
                      onToggleSelect={(e) => {
                        e.stopPropagation();
                        toggleSelectId(notif.id);
                      }}
                      onItemClick={handleNotificationClick}
                      onDismiss={(e) => {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                      }}
                      onTouchStart={() => handleTouchStart(notif.id)}
                      onTouchEnd={handleTouchEnd}
                      onMouseDown={() => handleTouchStart(notif.id)}
                      onMouseUp={handleTouchEnd}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* EARLIER SECTION */}
            {earlierList.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {isBn ? "পূর্ববর্তী" : "Previous"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    ({earlierList.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {earlierList.map((notif) => (
                    <NotificationCard
                      key={notif.id}
                      notif={notif}
                      isLight={isLight}
                      isBn={isBn}
                      isSelected={selectedIds.has(notif.id)}
                      onToggleSelect={(e) => {
                        e.stopPropagation();
                        toggleSelectId(notif.id);
                      }}
                      onItemClick={handleNotificationClick}
                      onDismiss={(e) => {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                      }}
                      onTouchStart={() => handleTouchStart(notif.id)}
                      onTouchEnd={handleTouchEnd}
                      onMouseDown={() => handleTouchStart(notif.id)}
                      onMouseUp={handleTouchEnd}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Notification Card Component
function NotificationCard({
  notif,
  isLight,
  isBn,
  isSelected,
  onToggleSelect,
  onItemClick,
  onDismiss,
  onTouchStart,
  onTouchEnd,
  onMouseDown,
  onMouseUp,
}: {
  notif: AppNotification;
  isLight: boolean;
  isBn: boolean;
  isSelected: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onItemClick: (n: AppNotification) => void;
  onDismiss: (e: React.MouseEvent) => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
}) {
  const isUnread = !notif.read;
  const timeAgo = formatTimeAgo(notif.timestamp, isBn);
  const appTag = getAppTag(notif, isBn);

  return (
    <div
      onClick={() => onItemClick(notif)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      className={`group relative flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-[18px] border cursor-pointer select-none ${
        isSelected
          ? isLight
            ? "bg-slate-100/90 border-slate-400 ring-2 ring-slate-400/30"
            : "bg-white/10 border-white/30 ring-2 ring-white/20"
          : isUnread
          ? isLight
            ? "bg-white border-[#DCE5F0] shadow-sm hover:border-slate-300"
            : "bg-[#141B2D] border-white/[0.08] shadow-sm hover:border-white/[0.14]"
          : isLight
          ? "bg-slate-50/60 border-[#DCE5F0] opacity-80 hover:opacity-100 hover:bg-white hover:border-slate-300"
          : "bg-[#0D1426]/60 border-white/[0.05] opacity-80 hover:opacity-100 hover:bg-[#141B2D]/60 hover:border-white/[0.12]"
      }`}
    >
      {/* 1. Selection Checkbox */}
      <button
        type="button"
        onClick={onToggleSelect}
        className="shrink-0 p-1 -m-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer bg-transparent border-none"
        aria-label="Select notification"
      >
        <div
          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-[6px] border flex items-center justify-center transition-all ${
            isSelected
              ? isLight
                ? "bg-slate-800 border-slate-800 text-white"
                : "bg-slate-200 border-slate-200 text-slate-900"
              : isLight
              ? "border-slate-300 bg-white hover:border-slate-500"
              : "border-slate-600 bg-[#0A0E1A] hover:border-slate-400"
          }`}
        >
          {isSelected && <Check size={12} strokeWidth={3} />}
        </div>
      </button>

      {/* 2. App Logo Tile */}
      <div
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] shrink-0 flex items-center justify-center border overflow-hidden transition-colors ${
          isLight
            ? "bg-[#EEF3FB] border-[#DCE5F0]"
            : "bg-[#0A0E1A] border-white/[0.08]"
        }`}
      >
        <img
          src="/icons/icon-192x192.png"
          alt="Focentia"
          className="w-full h-full object-cover scale-110"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/logo.png";
          }}
        />
      </div>

      {/* 3. Text & Details */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider truncate text-slate-500 dark:text-slate-400">
            {appTag}
          </span>
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-300 shrink-0" />
          )}
        </div>

        <h4
          className={`text-sm sm:text-[15px] leading-snug truncate ${
            isUnread
              ? "font-bold text-slate-900 dark:text-slate-100"
              : "font-medium text-slate-700 dark:text-slate-300"
          }`}
        >
          {notif.title}
        </h4>

        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 sm:line-clamp-1 mt-0.5">
          {notif.message}
        </p>

        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {timeAgo}
          </span>
          {notif.actionRoute && (
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold hover:underline">
              <ExternalLink size={10} />
              {isBn ? "দেখুন" : "Open"}
            </span>
          )}
        </div>
      </div>

      {/* 4. Notification Orb Reaction Avatar */}
      <NotificationOrbAvatar
        mood={notif.orbMood}
        category={notif.category || notif.type}
        size={64}
        className="flex shrink-0 mr-1 sm:mr-2.5"
      />

      {/* 5. Individual Dismiss Button */}
      <button
        type="button"
        onClick={onDismiss}
        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0 opacity-80 group-hover:opacity-100"
        aria-label="Dismiss notification"
        title={isBn ? "মুছুন" : "Dismiss"}
      >
        <X size={15} />
      </button>
    </div>
  );
}
