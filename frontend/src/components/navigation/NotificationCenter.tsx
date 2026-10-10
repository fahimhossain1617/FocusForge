"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import { NotificationOrbAvatar } from "./NotificationOrbAvatar";
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Settings,
  Info,
  ExternalLink,
  Clock,
  Check,
} from "lucide-react";
import { AppNotification } from "../../types";
import { localNotificationScheduler } from "../../services/localNotificationScheduler";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

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
      return isBn ? "ফোসেন্টিয়া - আজকের প্ল্যান" : "FOCENTIA - DAILY PLAN";
    case "focus_reminder":
    case "focus":
      return isBn ? "ফোসেন্টিয়া - ফোকাস" : "FOCENTIA - FOCUS";
    case "task_start":
      return isBn ? "ফোসেন্টিয়া - টাস্ক শুরু" : "FOCENTIA - TASK START";
    case "task_pre_reminder":
      return isBn ? "ফোসেন্টিয়া - আসন্ন টাস্ক" : "FOCENTIA - TASK DUE SOON";
    case "task_incomplete":
      return isBn ? "ফোসেন্টিয়া - কাজের খবর" : "FOCENTIA - TASK CHECK-IN";
    case "skill_reminder":
    case "learning":
      return isBn ? "ফোসেন্টিয়া - চর্চা" : "FOCENTIA - PRACTICE";
    case "task_completed":
      return isBn ? "ফোসেন্টিয়া - সম্পন্ন" : "FOCENTIA - COMPLETED";
    case "focus_completed":
      return isBn ? "ফোসেন্টিয়া - ফোকাস সম্পন্ন" : "FOCENTIA - FOCUS DONE";
    case "break_time":
      return isBn ? "ফোসেন্টিয়া - বিরতি" : "FOCENTIA - BREAK";
    case "streak_milestone":
      return isBn ? "ফোসেন্টিয়া - স্ট্রিক" : "FOCENTIA - STREAK";
    default:
      return isBn ? "ফোসেন্টিয়া" : "FOCENTIA";
  }
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { state, navigateTo } = useAppContext();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    browserPermission,
    requestBrowserPermission,
  } = useNotificationCenter();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isLight = state.theme?.mode === "light";
  const isBn = state.lang === "bn";
  const isNative = localNotificationScheduler.isNativeAndroid();
  const panelRef = useRef<HTMLDivElement>(null);

  // Clean up selectedIds that are no longer in notifications
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

  // Split notifications into TODAY and EARLIER
  const { todayList, earlierList } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const today: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    notifications.forEach((n) => {
      const nDate = n.timestamp ? n.timestamp.split("T")[0] : "";
      if (nDate === todayStr) {
        today.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { todayList: today, earlierList: earlier };
  }, [notifications]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.actionRoute) {
      navigateTo(notif.actionRoute);
      onClose();
    }
  };

  const handleOpenSettings = () => {
    onClose();
    navigateTo("settings");
    if (typeof window !== "undefined") {
      window.location.hash = "#settings/account/notifications";
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === notifications.length && notifications.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const handleToggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => {
      dismissNotification(id);
    });
    setSelectedIds(new Set());
  };

  const isAllSelected = notifications.length > 0 && selectedIds.size === notifications.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for outside clicks */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40"
            aria-hidden="true"
          />

          {/* Responsive Notification Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className={`fixed top-4 right-3 left-3 sm:left-auto sm:right-6 sm:w-[540px] md:w-[600px] max-h-[88vh] z-50 flex flex-col rounded-[20px] border shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden ${
              isLight
                ? "bg-white border-[#DCE5F0] text-slate-900"
                : "bg-[#0c1120] border-white/[0.12] text-slate-100"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Notification Center"
          >
            {/* 1. Header Bar */}
            <div
              className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
                isLight ? "border-[#DCE5F0] bg-slate-50/80" : "border-white/[0.08] bg-[#141B2D]/90"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-bold tracking-tight">
                  {isBn ? "নোটিফিকেশন" : "Notifications"}
                </h2>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    {unreadCount} {isBn ? "নতুন" : "new"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Mark All as Read Button */}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      isLight
                        ? "text-blue-600 hover:bg-blue-50"
                        : "text-blue-400 hover:bg-white/[0.08]"
                    }`}
                    title={isBn ? "সব পড়া হয়েছে মার্ক করুন" : "Mark all as read"}
                  >
                    <CheckCheck size={14} />
                    <span className="hidden xs:inline">{isBn ? "পড়া হয়েছে" : "Read all"}</span>
                  </button>
                )}

                {/* Direct Link to Main Settings Page */}
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                  title={isBn ? "নোটিফিকেশন সেটিংস" : "Notification Settings"}
                  aria-label="Notification Settings"
                >
                  <Settings size={16} />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer ml-1"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* 2. Bulk Selection / Action Toolbar (when items exist) */}
            {notifications.length > 0 && (
              <div
                className={`px-5 py-2 border-b flex items-center justify-between text-xs shrink-0 select-none ${
                  isLight
                    ? "border-[#DCE5F0]/70 bg-slate-50/50 text-slate-600"
                    : "border-white/[0.06] bg-white/[0.02] text-slate-400"
                }`}
              >
                {/* Select All Checkbox */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-2 text-xs font-medium hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  <div
                    className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${
                      isAllSelected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : selectedIds.size > 0
                        ? "bg-blue-600/20 border-blue-500 text-blue-500"
                        : isLight
                        ? "border-slate-300 bg-white"
                        : "border-slate-600 bg-slate-800"
                    }`}
                  >
                    {isAllSelected && <Check size={11} strokeWidth={3} />}
                    {!isAllSelected && selectedIds.size > 0 && (
                      <span className="w-1.5 h-1.5 rounded-sm bg-blue-500" />
                    )}
                  </div>
                  <span>
                    {isBn ? "সব নির্বাচন করুন" : "Select all"}
                    {selectedIds.size > 0 && ` (${selectedIds.size})`}
                  </span>
                </button>

                {/* Bulk Actions: Delete Selected vs Clear All */}
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 ? (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <Trash2 size={13} />
                      <span>{isBn ? `মুছুন (${selectedIds.size})` : `Delete (${selectedIds.size})`}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <Trash2 size={13} />
                      <span>{isBn ? "সব মুছুন" : "Clear all"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3. Browser Permission Banner */}
            {browserPermission === "default" && (
              <div
                className={`px-5 py-2.5 border-b flex items-center justify-between gap-3 shrink-0 ${
                  isLight
                    ? "border-[#DCE5F0]/60 text-slate-700 bg-blue-50/40"
                    : "border-white/[0.06] text-slate-200 bg-blue-950/20"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Info size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <p className="text-xs">
                    {isNative
                      ? isBn
                        ? "সময়মতো রিমাইন্ডার পেতে নোটিফিকেশন অনুমতি দিন"
                        : "Allow notifications for timely reminders"
                      : isBn
                      ? "সময়মতো রিমাইন্ডার পেতে ব্রাউজার অনুমতি দিন"
                      : "Allow browser notifications for timely reminders"}
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
                  className="px-3 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shrink-0 cursor-pointer active:scale-95 shadow-none"
                >
                  {isBn ? "অনুমতি দিন" : "Enable"}
                </button>
              </div>
            )}

            {/* 4. Panel Notifications Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 focusforge-scrollbar min-h-0">
              {notifications.length === 0 ? (
                /* Empty state */
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                      isLight ? "bg-[#EEF3FB] text-blue-600" : "bg-[#0A0E1A] text-blue-400"
                    }`}
                  >
                    <Bell size={22} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-sm font-bold mb-1">
                    {isBn ? "কোনো নোটিফিকেশন নেই" : "No notifications"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
                    {isBn
                      ? "আপনার আজকের প্ল্যান, টাস্ক ও ফোকাস সেশনের সকল রিমাইন্ডার এখানে সংরক্ষিত থাকবে।"
                      : "Your daily plan, task reminders, and focus updates will safely live here."}
                  </p>
                </div>
              ) : (
                <>
                  {/* TODAY Section */}
                  {todayList.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-2">
                        {isBn ? "আজ" : "TODAY"}
                      </div>
                      <div className="space-y-2">
                        {todayList.map((notif) => (
                          <NotificationItem
                            key={notif.id}
                            notif={notif}
                            isLight={isLight}
                            isBn={isBn}
                            isSelected={selectedIds.has(notif.id)}
                            onToggleSelect={(e) => handleToggleSelectItem(notif.id, e)}
                            onItemClick={handleNotificationClick}
                            onDismiss={(e) => {
                              e.stopPropagation();
                              dismissNotification(notif.id);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* EARLIER Section */}
                  {earlierList.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-2">
                        {isBn ? "পূর্বে" : "EARLIER"}
                      </div>
                      <div className="space-y-2">
                        {earlierList.map((notif) => (
                          <NotificationItem
                            key={notif.id}
                            notif={notif}
                            isLight={isLight}
                            isBn={isBn}
                            isSelected={selectedIds.has(notif.id)}
                            onToggleSelect={(e) => handleToggleSelectItem(notif.id, e)}
                            onItemClick={handleNotificationClick}
                            onDismiss={(e) => {
                              e.stopPropagation();
                              dismissNotification(notif.id);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Notification Item Matching Design System
function NotificationItem({
  notif,
  isLight,
  isBn,
  isSelected,
  onToggleSelect,
  onItemClick,
  onDismiss,
}: {
  notif: AppNotification;
  isLight: boolean;
  isBn: boolean;
  isSelected: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onItemClick: (n: AppNotification) => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const isUnread = !notif.read;
  const timeAgo = formatTimeAgo(notif.timestamp, isBn);
  const appTag = getAppTag(notif, isBn);

  return (
    <div
      onClick={() => onItemClick(notif)}
      className={`relative flex items-center gap-3 p-3 rounded-[16px] border transition-all cursor-pointer select-none active:scale-[0.99] ${
        isSelected
          ? isLight
            ? "bg-blue-50/70 border-blue-500/60 ring-1 ring-blue-500/40"
            : "bg-blue-950/30 border-blue-400/60 ring-1 ring-blue-400/40"
          : isUnread
          ? isLight
            ? "bg-white border-blue-500/30 shadow-sm hover:border-blue-500/50"
            : "bg-[#141B2D] border-blue-400/30 shadow-sm hover:border-blue-400/50"
          : isLight
          ? "bg-slate-50/70 border-[#DCE5F0] opacity-85 hover:opacity-100"
          : "bg-[#0c1120]/70 border-white/[0.06] opacity-85 hover:opacity-100"
      }`}
    >
      {/* 1. Item Selection Checkbox */}
      <button
        type="button"
        onClick={onToggleSelect}
        className="shrink-0 p-1 -m-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer bg-transparent border-none"
        aria-label="Select notification"
      >
        <div
          className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${
            isSelected
              ? "bg-blue-600 border-blue-600 text-white"
              : isLight
              ? "border-slate-300 bg-white hover:border-blue-500"
              : "border-slate-600 bg-[#0A0E1A] hover:border-blue-400"
          }`}
        >
          {isSelected && <Check size={11} strokeWidth={3} />}
        </div>
      </button>

      {/* 2. App Logo tile */}
      <div
        className={`w-[40px] h-[40px] rounded-[11px] shrink-0 flex items-center justify-center border overflow-hidden transition-colors ${
          isLight
            ? "bg-[#EEF3FB] border-[#DCE5F0]"
            : "bg-[#0A0E1A] border-white/[0.08]"
        }`}
      >
        <img
          src="/icons/icon-192x192.png"
          alt="FocusForge"
          className="w-full h-full object-cover scale-110"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/logo.png";
          }}
        />
      </div>

      {/* 3. Text Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div
          className={`text-[9.5px] font-bold uppercase tracking-wider mb-0.5 truncate ${
            isLight ? "text-blue-600" : "text-blue-400"
          }`}
        >
          {appTag}
        </div>
        <h4
          className={`text-[13px] leading-tight truncate ${
            isUnread ? "font-bold text-slate-900 dark:text-slate-100" : "font-medium text-slate-700 dark:text-slate-300"
          }`}
        >
          {notif.title}
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-1 mt-0.5">
          {notif.message}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {timeAgo}
          </span>
          {notif.actionRoute && (
            <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold">
              <ExternalLink size={9} />
              {isBn ? "দেখুন" : "Open"}
            </span>
          )}
        </div>
      </div>

      {/* 4. Orb Reaction Avatar */}
      <NotificationOrbAvatar mood={notif.orbMood || "attentive"} size={52} className="mr-2 shrink-0" />

      {/* 5. Dismiss / Delete Button */}
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-md text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss notification"
        title={isBn ? "মুছুন" : "Dismiss"}
      >
        <X size={13} />
      </button>
    </div>
  );
}
