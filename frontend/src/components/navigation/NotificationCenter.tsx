"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import {
  Bell,
  X,
  CheckCheck,
  CalendarDays,
  Target,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Bot,
  Sparkles,
  Info,
  Clock,
  ExternalLink,
} from "lucide-react";
import { AppNotification, NotificationType } from "../../types";

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

// Category visual icon & color mapper
function getCategoryVisuals(type: NotificationType, isLight: boolean) {
  switch (type) {
    case "planner":
      return {
        icon: CalendarDays,
        bg: isLight ? "bg-blue-50 border-blue-100 text-[#2563EB]" : "bg-blue-500/15 border-blue-500/25 text-blue-400",
      };
    case "focus":
      return {
        icon: Target,
        bg: isLight ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-amber-500/15 border-amber-500/25 text-amber-400",
      };
    case "task":
      return {
        icon: CheckCircle2,
        bg: isLight ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
      };
    case "learning":
      return {
        icon: GraduationCap,
        bg: isLight ? "bg-purple-50 border-purple-100 text-purple-600" : "bg-purple-500/15 border-purple-500/25 text-purple-400",
      };
    case "diary":
      return {
        icon: BookOpen,
        bg: isLight ? "bg-pink-50 border-pink-100 text-pink-600" : "bg-pink-500/15 border-pink-500/25 text-pink-400",
      };
    case "ai":
      return {
        icon: Bot,
        bg: isLight ? "bg-cyan-50 border-cyan-100 text-cyan-600" : "bg-cyan-500/15 border-cyan-500/25 text-cyan-400",
      };
    case "system":
    default:
      return {
        icon: Sparkles,
        bg: isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/10 border-white/15 text-slate-200",
      };
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
    browserPermission,
    requestBrowserPermission,
  } = useNotificationCenter();

  const isLight = state.theme?.mode === "light";
  const isBn = state.lang === "bn";
  const panelRef = useRef<HTMLDivElement>(null);

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

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dismissNotification(id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (no blur, clean click catcher) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 dark:bg-black/55 md:hidden"
            aria-hidden="true"
          />

          {/* Mobile Notification Panel (Slide down from header / top sheet) */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className={`fixed top-14 right-3 left-3 z-50 max-h-[82vh] flex flex-col rounded-2xl border shadow-2xl md:hidden overflow-hidden ${
              isLight
                ? "bg-white border-[#DCE5F0] shadow-[0_20px_50px_rgba(34,58,94,0.18)]"
                : "bg-[#0c101c] border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Notification Center"
          >
            {/* 1. Header Bar */}
            <div
              className={`flex items-center justify-between px-4 py-3.5 border-b shrink-0 ${
                isLight ? "border-slate-100 bg-slate-50/60" : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isLight ? "bg-blue-50 text-[#2563EB]" : "bg-blue-500/15 text-blue-400"
                  }`}
                >
                  <Bell size={15} strokeWidth={2.2} />
                </div>
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-foreground tracking-tight">
                  {isBn ? "নোটিফিকেশন" : "Notifications"}
                </h2>
                {unreadCount > 0 && (
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      isLight
                        ? "bg-blue-100 text-[#2563EB]"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    }`}
                  >
                    {unreadCount} {isBn ? "নতুন" : "new"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                      isLight
                        ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
                    }`}
                    title={isBn ? "সব পঠিত হিসেবে চিহ্নিত করুন" : "Mark all as read"}
                    aria-label={isBn ? "সব পঠিত হিসেবে চিহ্নিত করুন" : "Mark all as read"}
                  >
                    <CheckCheck size={14} />
                    <span className="text-[11px] hidden xs:inline">{isBn ? "সব পড়া হয়েছে" : "Read all"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isLight
                      ? "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
                  }`}
                  aria-label={isBn ? "নোটিফিকেশন বন্ধ করুন" : "Close notifications"}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* 2. Device Notification Permission Banner (If not yet determined) */}
            {browserPermission === "default" && (
              <div
                className={`px-3.5 py-2.5 mx-3 mt-3 rounded-xl border flex items-center justify-between gap-2 shrink-0 ${
                  isLight
                    ? "bg-blue-50/70 border-blue-100 text-slate-800"
                    : "bg-blue-500/10 border-blue-500/20 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Info size={14} className="text-[#2563EB] dark:text-blue-400 shrink-0" />
                  <p className="text-xs font-normal truncate">
                    {isBn ? "রিমাইন্ডার পেতে ব্রাউজার নোটিফিকেশন চালু করুন" : "Get real-time device reminders"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer active:scale-95"
                >
                  {isBn ? "অনুমতি দিন" : "Enable"}
                </button>
              </div>
            )}

            {/* 3. Notification List Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2 focusforge-scrollbar min-h-0">
              {notifications.length === 0 ? (
                // Clean Empty State
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                      isLight ? "bg-slate-100 text-slate-400" : "bg-white/[0.04] text-slate-500"
                    }`}
                  >
                    <Bell size={22} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {isBn ? "নতুন কোনো নোটিফিকেশন নেই" : "No notifications yet"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
                    {isBn
                      ? "আপনার নির্ধারিত টাস্ক, ফোকাস ও প্ল্যানার রিমাইন্ডার এখানে দেখাবে।"
                      : "Your scheduled tasks, focus sessions, and planner reminders will appear here."}
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const visuals = getCategoryVisuals(notif.type, isLight);
                  const Icon = visuals.icon;
                  const timeAgo = formatTimeAgo(notif.timestamp, isBn);
                  const isUnread = !notif.read;

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                        isUnread
                          ? isLight
                            ? "bg-blue-50/40 hover:bg-blue-50/70 border-blue-200/80 shadow-xs"
                            : "bg-blue-500/[0.08] hover:bg-blue-500/[0.12] border-blue-500/30 shadow-xs"
                          : isLight
                          ? "bg-slate-50/50 hover:bg-slate-100/70 border-slate-100 text-slate-600"
                          : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-slate-300"
                      }`}
                    >
                      {/* Unread Accent Dot */}
                      {isUnread && (
                        <span className="absolute top-3 left-1.5 w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-blue-400" />
                      )}

                      {/* Category Icon */}
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${visuals.bg}`}
                      >
                        <Icon size={16} strokeWidth={2} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-baseline justify-between gap-1 mb-0.5">
                          <h4
                            className={`text-[13px] leading-tight truncate ${
                              isUnread
                                ? "font-semibold text-slate-900 dark:text-foreground"
                                : "font-medium text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {notif.title}
                          </h4>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {timeAgo}
                          </span>
                          {notif.actionRoute && (
                            <span className="flex items-center gap-0.5 text-[#2563EB] dark:text-blue-400 font-medium">
                              <ExternalLink size={10} />
                              {isBn ? "দেখুন" : "Open"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dismiss × Button (Explicit requirement: no big Delete button, small × icon with aria-label) */}
                      <button
                        type="button"
                        onClick={(e) => handleDismiss(e, notif.id)}
                        className={`absolute top-2.5 right-2.5 p-1 rounded-md transition-colors cursor-pointer ${
                          isLight
                            ? "text-slate-400 hover:text-slate-700 hover:bg-slate-200/80"
                            : "text-slate-500 hover:text-slate-200 hover:bg-white/10"
                        }`}
                        aria-label="Dismiss notification"
                        title={isBn ? "নোটিফিকেশন সরান" : "Dismiss notification"}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
