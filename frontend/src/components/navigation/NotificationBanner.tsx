"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationOrbAvatar } from "./NotificationOrbAvatar";
import { useAppContext } from "../../context/AppContext";
import { NotificationCategory, AppNotification } from "../../types";

export interface BannerAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export interface BannerNotificationData {
  id: string;
  category: NotificationCategory;
  appTag: string;
  title: string;
  message: string;
  orbMood: string;
  actionRoute?: string;
  actions?: BannerAction[];
  taskId?: number | string;
  durationMs?: number; // default 5000ms
}

export function NotificationBanner() {
  const { state, navigateTo, updateTask, cycleTaskStatus } = useAppContext();
  const [currentNotif, setCurrentNotif] = useState<BannerNotificationData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDoneCheering, setIsDoneCheering] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isLight = state.theme?.mode === "light";
  const isBn = state.lang === "bn";
  const reducedMotion = state.notifPreferences?.orbReactionsMode === "reduced_motion";

  // Listen for custom trigger events dispatched by NotificationService
  useEffect(() => {
    const handleTrigger = (event: Event) => {
      const customEvent = event as CustomEvent<BannerNotificationData>;
      if (!customEvent.detail) return;

      const data = customEvent.detail;
      setCurrentNotif(data);
      setIsExpanded(Boolean(data.actions && data.actions.length > 0));
      setIsDoneCheering(false);

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      const duration = data.durationMs || 5000;
      hideTimerRef.current = setTimeout(() => {
        setCurrentNotif(null);
      }, duration);
    };

    window.addEventListener("focusforge:show-banner" as any, handleTrigger);
    return () => {
      window.removeEventListener("focusforge:show-banner" as any, handleTrigger);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleDismiss = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setCurrentNotif(null);
  };

  const handleTapNotification = () => {
    if (!currentNotif) return;
    if (currentNotif.actionRoute) {
      navigateTo(currentNotif.actionRoute);
    }
    handleDismiss();
  };

  const handleTaskDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentNotif?.taskId) return;

    // Mark task completed in state
    const numId = Number(currentNotif.taskId);
    if (!isNaN(numId)) {
      updateTask(numId, { status: "completed", completed: true });
    }

    // Orb swaps to cheering for 2 seconds per design spec
    setIsDoneCheering(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setCurrentNotif(null);
      setIsDoneCheering(false);
    }, 2000);
  };

  const handleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {currentNotif && (
        <motion.div
          key={currentNotif.id}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 80) {
              handleDismiss();
            }
          }}
          onMouseEnter={() => {
            // Pause auto-hide timer on hover
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          }}
          onMouseLeave={() => {
            // Resume timer
            hideTimerRef.current = setTimeout(() => {
              setCurrentNotif(null);
            }, 3500);
          }}
          onClick={handleTapNotification}
          className="fixed top-3 left-0 right-0 z-[9999] flex justify-center px-3 pointer-events-none select-none"
        >
          <div
            className={`pointer-events-auto relative w-full max-w-[720px] rounded-[18px] p-4 flex flex-col gap-3.5 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.25)] cursor-pointer ${
              isLight
                ? "bg-[#FFFFFF] text-[#0B1F54] border border-[#D5DEEE]"
                : "bg-[#101B35] text-[#EAF1FF] border border-[#22346B]"
            }`}
          >
            {/* Top row: Logo tile + Content + Orb reaction */}
            <div className="flex items-center gap-3.5 w-full">
              {/* 1. App Logo Tile (46 x 46, corner radius 13) */}
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

              {/* 2. Text Content (App Tag + Title + Message) */}
              <div className="flex-1 min-w-0 pr-1">
                <div
                  className={`text-[9.5px] font-bold uppercase tracking-wider mb-0.5 truncate ${
                    isLight ? "text-[#1D4ED8]" : "text-[#3B82F6]"
                  }`}
                >
                  {currentNotif.appTag}
                </div>
                <h4
                  className={`text-[14.5px] font-bold leading-tight truncate ${
                    isLight ? "text-[#0B1F54]" : "text-[#EAF1FF]"
                  }`}
                >
                  {currentNotif.title}
                </h4>
                <p
                  className={`text-[11px] leading-snug line-clamp-1 mt-0.5 ${
                    isLight ? "text-[#5B6B8C]" : "text-[#8DA2CC]"
                  }`}
                >
                  {currentNotif.message}
                </p>
              </div>

              {/* 3. Orb Reaction Avatar */}
              <NotificationOrbAvatar
                mood={currentNotif.orbMood}
                size={62}
                isDoneCheering={isDoneCheering}
                reducedMotion={reducedMotion}
                className="mr-1 shrink-0"
              />
            </div>

            {/* 4. Action Buttons (Optional, max 2 buttons per spec) */}
            <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
              {currentNotif.actions && currentNotif.actions.length > 0 ? (
                currentNotif.actions.slice(0, 2).map((action, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                      handleDismiss();
                    }}
                    className={`h-[30px] px-4 rounded-full text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${
                      action.variant === "primary"
                        ? isLight
                          ? "bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
                          : "bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                        : isLight
                        ? "bg-[#EEF3FB] hover:bg-[#E2EAF5] text-[#0B1F54] border border-[#D5DEEE]"
                        : "bg-[#19274E] hover:bg-[#203264] text-[#EAF1FF] border border-[#22346B]"
                    }`}
                  >
                    {action.label}
                  </button>
                ))
              ) : currentNotif.taskId ? (
                <>
                  <button
                    type="button"
                    onClick={handleTapNotification}
                    className={`h-[30px] px-4 rounded-full text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${
                      isLight
                        ? "bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
                        : "bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                    }`}
                  >
                    {isBn ? "টাস্ক খুলুন" : "Open task"}
                  </button>
                  <button
                    type="button"
                    onClick={handleTaskDone}
                    className={`h-[30px] px-4 rounded-full text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${
                      isLight
                        ? "bg-[#EEF3FB] hover:bg-[#E2EAF5] text-[#0B1F54] border border-[#D5DEEE]"
                        : "bg-[#19274E] hover:bg-[#203264] text-[#EAF1FF] border border-[#22346B]"
                    }`}
                  >
                    {isBn ? "সম্পন্ন" : "Done"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleTapNotification}
                  className={`h-[30px] px-4 rounded-full text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${
                    isLight
                      ? "bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
                      : "bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                  }`}
                >
                  {isBn ? "দেখুন" : "View"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NotificationBanner;
