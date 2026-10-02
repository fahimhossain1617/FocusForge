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
  Sliders,
  ChevronLeft,
} from "lucide-react";
import { AppNotification, NotificationType } from "../../types";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

// Relative time formatter helper (no Unicode emoji)
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
      return isBn ? "ফোকাসফোর্স - আজকের প্ল্যান" : "FOCUSFORCE - DAILY PLAN";
    case "focus_reminder":
    case "focus":
      return isBn ? "ফোকাসফোর্স - ফোকাস" : "FOCUSFORCE - FOCUS";
    case "task_start":
      return isBn ? "ফোকাসফোর্স - টাস্ক শুরু" : "FOCUSFORCE - TASK START";
    case "task_pre_reminder":
      return isBn ? "ফোকাসফোর্স - আসন্ন টাস্ক" : "FOCUSFORCE - TASK DUE SOON";
    case "task_incomplete":
      return isBn ? "ফোকাসফোর্স - কাজের খবর" : "FOCUSFORCE - TASK CHECK-IN";
    case "skill_reminder":
    case "learning":
      return isBn ? "ফোকাসফোর্স - চর্চা" : "FOCUSFORCE - PRACTICE";
    case "task_completed":
      return isBn ? "ফোকাসফোর্স - সম্পন্ন" : "FOCUSFORCE - COMPLETED";
    case "focus_completed":
      return isBn ? "ফোকাসফোর্স - ফোকাস সম্পন্ন" : "FOCUSFORCE - FOCUS DONE";
    case "break_time":
      return isBn ? "ফোকাসফোর্স - বিরতি" : "FOCUSFORCE - BREAK";
    case "streak_milestone":
      return isBn ? "ফোকাসফোর্স - স্ট্রিক" : "FOCUSFORCE - STREAK";
    default:
      return isBn ? "ফোকাসফোর্স" : "FOCUSFORCE";
  }
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { state, updateState, navigateTo } = useAppContext();
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

  const [activeTab, setActiveTab] = useState<"history" | "settings">("history");

  const isLight = state.theme?.mode === "light";
  const isBn = state.lang === "bn";
  const panelRef = useRef<HTMLDivElement>(null);
  const prefs = state.notifPreferences;

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

  const handleTogglePref = (key: keyof typeof prefs) => {
    updateState({
      notifPreferences: {
        ...prefs,
        [key]: !prefs[key],
      },
    });
  };

  const handleSetOrbMode = (mode: "on" | "reduced_motion" | "off") => {
    updateState({
      notifPreferences: {
        ...prefs,
        orbReactionsMode: mode,
      },
    });
  };

  const handleSetTheme = (mode: "dark" | "light" | "system") => {
    updateState({
      theme: {
        ...state.theme,
        mode,
      },
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile & desktop outside clicks (Transparent to keep background completely normal) */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-50 bg-transparent"
            aria-hidden="true"
          />

          {/* Responsive Notification Panel (Works across Phone, Laptop, Desktop, Tablet) */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className={`fixed top-4 right-3 left-3 sm:left-auto sm:right-6 sm:w-[540px] md:w-[620px] max-h-[88vh] z-50 flex flex-col rounded-[20px] border shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden ${
              isLight
                ? "bg-[#FFFFFF] border-[#D5DEEE] text-[#0B1F54]"
                : "bg-[#101B35] border-[#22346B] text-[#EAF1FF]"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Notification Center"
          >
            {/* 1. Header Bar matching Page 6 */}
            <div
              className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
                isLight ? "border-[#D5DEEE] bg-[#EEF3FB]/50" : "border-[#22346B] bg-[#0A1224]/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {activeTab === "settings" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label="Back to notifications"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <h2 className="text-base font-bold tracking-tight">
                  {activeTab === "settings"
                    ? isBn
                      ? "নোটিফিকেশন সেটিংস"
                      : "Notification Settings"
                    : isBn
                    ? "নোটিফিকেশন"
                    : "Notifications"}
                </h2>
                {activeTab === "history" && unreadCount > 0 && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isLight
                        ? "bg-[#1D4ED8]/10 text-[#1D4ED8]"
                        : "bg-[#3B82F6]/20 text-[#3B82F6]"
                    }`}
                  >
                    {unreadCount} {isBn ? "নতুন" : "new"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {activeTab === "history" ? (
                  <>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          isLight
                            ? "text-[#1D4ED8] hover:bg-[#EEF3FB]"
                            : "text-[#3B82F6] hover:bg-white/5"
                        }`}
                        title={isBn ? "সব পঠিত করুন" : "Mark all as read"}
                      >
                        <CheckCheck size={14} />
                        <span className="hidden xs:inline">{isBn ? "পড়া হয়েছে" : "Read all"}</span>
                      </button>
                    )}

                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        {isBn ? "সব মুছুন" : "Clear all"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab("settings")}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title={isBn ? "সেটিংস" : "Settings"}
                      aria-label="Settings"
                    >
                      <Settings size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="px-2.5 py-1 text-xs font-semibold text-[#1D4ED8] dark:text-[#3B82F6] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  >
                    {isBn ? "তালিকা" : "History"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ml-1"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* 2. Permission Banner (Seamless unboxed inline row) */}
            {browserPermission === "default" && activeTab === "history" && (
              <div
                className={`px-5 py-2.5 border-b flex items-center justify-between gap-3 shrink-0 ${
                  isLight
                    ? "border-[#D5DEEE]/60 text-slate-700 bg-blue-50/40"
                    : "border-[#22346B]/60 text-slate-200 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Info size={14} className="text-[#1D4ED8] dark:text-[#3B82F6] shrink-0" />
                  <p className="text-xs">
                    {isBn
                      ? "সময়মতো রিমাইন্ডার পেতে ব্রাউজার অনুমতি দিন"
                      : "Allow browser notifications for timely reminders"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  className="px-3 py-1 text-[11px] font-bold bg-[#1D4ED8] dark:bg-[#3B82F6] hover:opacity-90 text-white rounded-lg transition-all shrink-0 cursor-pointer active:scale-95 shadow-none"
                >
                  {isBn ? "অনুমতি দিন" : "Enable"}
                </button>
              </div>
            )}

            {/* 3. Panel Content */}
            {activeTab === "history" ? (
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 focusforge-scrollbar min-h-0">
                {notifications.length === 0 ? (
                  /* Empty state */
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                        isLight ? "bg-[#EEF3FB] text-[#1D4ED8]" : "bg-[#0A1224] text-[#3B82F6]"
                      }`}
                    >
                      <Bell size={22} strokeWidth={1.8} />
                    </div>
                    <h3 className="text-sm font-bold mb-1">
                      {isBn ? "কোনো নোটিফিকেশন নেই" : "No notifications"}
                    </h3>
                    <p className="text-xs text-[#5B6B8C] dark:text-[#8DA2CC] max-w-[280px] leading-relaxed">
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
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6B8C] dark:text-[#8DA2CC] px-1 mb-2">
                          {isBn ? "আজ" : "TODAY"}
                        </div>
                        <div className="space-y-2">
                          {todayList.map((notif) => (
                            <NotificationItem
                              key={notif.id}
                              notif={notif}
                              isLight={isLight}
                              isBn={isBn}
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
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6B8C] dark:text-[#8DA2CC] px-1 mb-2">
                          {isBn ? "পূর্বে" : "EARLIER"}
                        </div>
                        <div className="space-y-2">
                          {earlierList.map((notif) => (
                            <NotificationItem
                              key={notif.id}
                              notif={notif}
                              isLight={isLight}
                              isBn={isBn}
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
            ) : (
              /* SETTINGS View matching Page 6 of PDF */
              <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-6 focusforge-scrollbar min-h-0">
                {/* 1. APPEARANCE (System / Light / Dark) */}
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#5B6B8C] dark:text-[#8DA2CC] mb-2">
                    {isBn ? "অ্যাপেয়ারেন্স" : "APPEARANCE"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["system", "light", "dark"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleSetTheme(mode)}
                        className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          state.theme?.mode === mode
                            ? isLight
                              ? "bg-[#1D4ED8] text-white"
                              : "bg-[#3B82F6] text-white"
                            : isLight
                            ? "bg-[#EEF3FB] text-[#0B1F54] hover:bg-[#E2EAF5]"
                            : "bg-[#0A1224] text-[#EAF1FF] hover:bg-[#152345]"
                        }`}
                      >
                        {mode === "system"
                          ? isBn
                            ? "সিস্টেম"
                            : "System"
                          : mode === "light"
                          ? isBn
                            ? "লাইট"
                            : "Light"
                          : isBn
                          ? "ডার্ক"
                          : "Dark"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. ORB REACTIONS (On / Reduced motion / Off) */}
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#5B6B8C] dark:text-[#8DA2CC] mb-2">
                    {isBn ? "অর্ব রিঅ্যাকশন" : "ORB REACTIONS"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["on", "reduced_motion", "off"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleSetOrbMode(mode)}
                        className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          (prefs.orbReactionsMode || "on") === mode
                            ? isLight
                              ? "bg-[#1D4ED8] text-white"
                              : "bg-[#3B82F6] text-white"
                            : isLight
                            ? "bg-[#EEF3FB] text-[#0B1F54] hover:bg-[#E2EAF5]"
                            : "bg-[#0A1224] text-[#EAF1FF] hover:bg-[#152345]"
                        }`}
                      >
                        {mode === "on"
                          ? isBn
                            ? "চালু"
                            : "On"
                          : mode === "reduced_motion"
                          ? isBn
                            ? "সীমিত গতি"
                            : "Reduced motion"
                          : isBn
                          ? "বন্ধ"
                          : "Off"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. CATEGORIES Toggles */}
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#5B6B8C] dark:text-[#8DA2CC] mb-2">
                    {isBn ? "ক্যাটাগরি" : "CATEGORIES"}
                  </label>
                  <div
                    className={`rounded-2xl border divide-y overflow-hidden ${
                      isLight
                        ? "bg-[#FFFFFF] border-[#D5DEEE] divide-[#D5DEEE]"
                        : "bg-[#0A1224] border-[#22346B] divide-[#22346B]"
                    }`}
                  >
                    <CategoryToggleRow
                      label={isBn ? "টাস্ক রিমাইন্ডার" : "Task reminders"}
                      checked={prefs.taskReminders ?? true}
                      onChange={() => handleTogglePref("taskReminders")}
                    />
                    <CategoryToggleRow
                      label={isBn ? "পোমোডোরো ও ফোকাস" : "Pomodoro + breaks"}
                      checked={prefs.focusSessionReminder ?? true}
                      onChange={() => handleTogglePref("focusSessionReminder")}
                    />
                    <CategoryToggleRow
                      label={isBn ? "আজকের প্ল্যান রিমাইন্ডার" : "Daily Morning Plan"}
                      checked={prefs.dailyMorningPlan ?? true}
                      onChange={() => handleTogglePref("dailyMorningPlan")}
                    />
                    <CategoryToggleRow
                      label={isBn ? "স্কিল চর্চা রিমাইন্ডার" : "Time Log / Skill practice"}
                      checked={prefs.skillReminders ?? true}
                      onChange={() => handleTogglePref("skillReminders")}
                    />
                    <CategoryToggleRow
                      label={isBn ? "নিষ্ক্রিয়তার সঙ্গী তাগিদ" : "Inactivity companion"}
                      checked={prefs.inactivityReminders ?? true}
                      onChange={() => handleTogglePref("inactivityReminders")}
                    />
                    <CategoryToggleRow
                      label={isBn ? "ধারাবাহিকতা ও অর্জন" : "Streaks + achievements"}
                      checked={prefs.motivationalNotifications ?? true}
                      onChange={() => handleTogglePref("motivationalNotifications")}
                    />
                  </div>
                </div>

                {/* 4. Quiet Hours (Orb sleeps) */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    isLight
                      ? "bg-[#EEF3FB] border-[#D5DEEE] text-[#0B1F54]"
                      : "bg-[#0A1224] border-[#22346B] text-[#EAF1FF]"
                  }`}
                >
                  <div>
                    <span className="font-bold">
                      {isBn
                        ? "কোয়াইট আওয়ারস: ১০:০০ PM - ৭:০০ AM"
                        : "Quiet hours: 10:00 PM - 7:00 AM"}
                    </span>
                    <p className="text-[11px] text-[#5B6B8C] dark:text-[#8DA2CC] mt-0.5">
                      {isBn ? "(অর্ব ঘুমাবে, শুধু জরুরি অ্যালার্ট আসবে)" : "(Orb sleeps, only urgent alerts show)"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.quietHoursEnabled ?? true}
                    onChange={() => handleTogglePref("quietHoursEnabled")}
                    className="w-4 h-4 cursor-pointer accent-[#1D4ED8] dark:accent-[#3B82F6]"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Compact Category Toggle Row
function CategoryToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs font-semibold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
          checked ? "bg-[#1D4ED8] dark:bg-[#3B82F6]" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute top-1 ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

// Notification Item Matching Anatomy (Page 2 & Page 6)
function NotificationItem({
  notif,
  isLight,
  isBn,
  onItemClick,
  onDismiss,
}: {
  notif: AppNotification;
  isLight: boolean;
  isBn: boolean;
  onItemClick: (n: AppNotification) => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const isUnread = !notif.read;
  const timeAgo = formatTimeAgo(notif.timestamp, isBn);
  const appTag = getAppTag(notif, isBn);

  return (
    <div
      onClick={() => onItemClick(notif)}
      className={`relative flex items-center gap-3.5 p-3.5 rounded-[18px] border transition-all cursor-pointer select-none active:scale-[0.99] ${
        isUnread
          ? isLight
            ? "bg-[#FFFFFF] border-[#1D4ED8]/30 shadow-sm"
            : "bg-[#101B35] border-[#3B82F6]/35 shadow-sm"
          : isLight
          ? "bg-[#F8FAFD] border-[#D5DEEE] opacity-80 hover:opacity-100"
          : "bg-[#0A1224] border-[#22346B] opacity-80 hover:opacity-100"
      }`}
    >
      {/* Unread Accent Indicator */}
      {isUnread && (
        <span className="absolute top-3 left-1.5 w-1.5 h-1.5 rounded-full bg-[#1D4ED8] dark:bg-[#3B82F6]" />
      )}

      {/* 1. App Logo tile (46 x 46, corner radius 13) */}
      <div
        className={`w-[46px] h-[46px] rounded-[13px] shrink-0 flex items-center justify-center border overflow-hidden transition-colors ${
          isLight
            ? "bg-[#EEF3FB] border-[#D5DEEE]"
            : "bg-[#0A1224] border-[#22346B]"
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

      {/* 2. Text Content (App tag + Title + detail line) */}
      <div className="flex-1 min-w-0 pr-1">
        <div
          className={`text-[9.5px] font-bold uppercase tracking-wider mb-0.5 truncate ${
            isLight ? "text-[#1D4ED8]" : "text-[#3B82F6]"
          }`}
        >
          {appTag}
        </div>
        <h4
          className={`text-[13.5px] leading-tight truncate ${
            isUnread ? "font-bold" : "font-medium"
          }`}
        >
          {notif.title}
        </h4>
        <p className="text-[11px] text-[#5B6B8C] dark:text-[#8DA2CC] leading-snug line-clamp-1 mt-0.5">
          {notif.message}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[10.5px] text-[#5B6B8C] dark:text-[#8DA2CC]">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {timeAgo}
          </span>
          {notif.actionRoute && (
            <span className="flex items-center gap-0.5 text-[#1D4ED8] dark:text-[#3B82F6] font-semibold">
              <ExternalLink size={9} />
              {isBn ? "দেখুন" : "Open"}
            </span>
          )}
        </div>
      </div>

      {/* 3. Orb Reaction Avatar */}
      <NotificationOrbAvatar mood={notif.orbMood || "attentive"} size={60} className="mr-3 shrink-0" />

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-[#5B6B8C] hover:text-black dark:text-[#8DA2CC] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </div>
  );
}
