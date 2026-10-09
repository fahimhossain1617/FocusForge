"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useAnimateExit } from "../../hooks/useAnimateExit";
import { RollingDigit } from "./RollingDigit";
import confetti from "canvas-confetti";
import {
  Play,
  Pause,
  RotateCcw,
  Tag,
  CheckCircle2,
  X,
  ArrowLeft,
  LayoutDashboard,
  Check,
  Trash2,
  Clock,
  History,
} from "lucide-react";

interface StopwatchTimerProps {
  onSessionSaved?: () => void;
  onActiveChange?: (isActive: boolean) => void;
}

type TimerViewMode = "setup" | "active";

interface TimerHistoryItem {
  name: string;
  totalSeconds: number;
  lastDate?: string;
}

// Clean helper to format duration in seconds/minutes/hours without floating decimals
function formatDurationDisplay(totalSeconds: number, lang?: string): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) {
    return lang === "bn" ? "০মি." : "0m";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export const StopwatchTimer = memo(function StopwatchTimer({
  onSessionSaved,
  onActiveChange,
}: StopwatchTimerProps) {
  const { state, updateState, showToast, navigateTo } = useAppContext();
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState<TimerViewMode>("setup");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [topicName, setTopicName] = useState("");

  // Timer topic history state
  const [timerHistory, setTimerHistory] = useState<TimerHistoryItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("timer_task_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Modals
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lastSavedDurationStr, setLastSavedDurationStr] = useState("00:00:00");
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Modal smooth entrance & exit animations
  const historyModalAnim = useAnimateExit({ isOpen: showHistoryModal, durationMs: 200 });
  const exitConfirmAnim = useAnimateExit({ isOpen: showExitConfirm, durationMs: 200 });
  const completionModalAnim = useAnimateExit({ isOpen: showCompletionModal, durationMs: 200 });

  // High-precision timing refs to prevent browser background tab drift
  const startTimeRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Notify parent of active view state
  useEffect(() => {
    if (onActiveChange) {
      onActiveChange(viewMode === "active");
    }
  }, [viewMode, onActiveChange]);

  // Sync elapsed seconds smoothly
  const tick = useCallback(() => {
    if (!startTimeRef.current) return;
    const now = performance.now();
    const currentElapsedMs = accumulatedMsRef.current + (now - startTimeRef.current);
    const secs = Math.floor(currentElapsedMs / 1000);
    setElapsedSeconds(secs);
  }, []);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = performance.now();
      timerIntervalRef.current = setInterval(tick, 200);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (startTimeRef.current) {
        accumulatedMsRef.current += performance.now() - startTimeRef.current;
        startTimeRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, tick]);

  // Digits calculation
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const hStr = String(hours).padStart(2, "0");
  const mStr = String(minutes).padStart(2, "0");
  const sStr = String(seconds).padStart(2, "0");

  const h1 = hStr[0];
  const h2 = hStr[1];
  const m1 = mStr[0];
  const m2 = mStr[1];
  const s1 = sStr[0];
  const s2 = sStr[1];

  // Save topic to history helper
  const saveTopicToHistory = useCallback((name: string, addedSeconds: number) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    const today = new Date().toLocaleDateString(state.lang === "bn" ? "bn-BD" : "en-US", {
      month: "short",
      day: "numeric",
    });

    setTimerHistory((prev) => {
      const existing = prev.find((item) => item.name === cleanName);
      const updatedTotal = existing ? existing.totalSeconds + addedSeconds : addedSeconds;
      const updated = [
        { name: cleanName, totalSeconds: updatedTotal, lastDate: today },
        ...prev.filter((item) => item.name !== cleanName),
      ].slice(0, 50);

      try {
        localStorage.setItem("timer_task_history", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [state.lang]);

  const deleteHistoryItem = (name: string) => {
    setTimerHistory((prev) => {
      const updated = prev.filter((item) => item.name !== name);
      try {
        localStorage.setItem("timer_task_history", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Start from setup screen -> enters active view directly
  const handleStartFromSetup = () => {
    setViewMode("active");
    setIsRunning(true);
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  // Instant reset without prompt
  const handleReset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    accumulatedMsRef.current = 0;
    startTimeRef.current = null;
  };

  const handleBackAttempt = () => {
    if (elapsedSeconds > 5 || isRunning) {
      setIsRunning(false);
      setShowExitConfirm(true);
    } else {
      setIsRunning(false);
      setElapsedSeconds(0);
      accumulatedMsRef.current = 0;
      startTimeRef.current = null;
      setViewMode("setup");
    }
  };

  const handleDiscardAndExit = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    accumulatedMsRef.current = 0;
    startTimeRef.current = null;
    setShowExitConfirm(false);
    setViewMode("setup");
  };

  const handleSaveAndStop = async () => {
    if (elapsedSeconds < 1) {
      showToast(
        state.lang === "bn"
          ? "টাইমার এখনো শুরু হয়নি!"
          : "Timer has not run yet!",
        "info"
      );
      return;
    }

    setIsRunning(false);

    // Precise minutes calculation for database storage
    const durationMinutes = Math.round((elapsedSeconds / 60) * 100) / 100;

    const formattedDate = new Date().toLocaleDateString(
      state.lang === "bn" ? "bn-BD" : "en-US",
      { month: "short", day: "numeric" }
    );

    const fallbackName =
      state.lang === "bn"
        ? `টাইমার সেশন (${formattedDate})`
        : `Timer Session (${formattedDate})`;

    const finalTaskName = topicName.trim() || fallbackName;
    const durationDisplay = formatDurationDisplay(elapsedSeconds, state.lang);
    setLastSavedDurationStr(durationDisplay);

    // Save to topic history
    saveTopicToHistory(finalTaskName, elapsedSeconds);

    const newSession = {
      id: "timer_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      taskName: finalTaskName,
      category: "Timer",
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationMinutes: durationMinutes,
      breakMinutes: 0,
      distractions: [],
      completed: true,
      sessionType: "timer" as const,
      elapsedSeconds: elapsedSeconds,
    };

    // Save to AppContext state
    const updatedSessions = [newSession, ...(state.focusSessions || [])];
    updateState({
      focusSessions: updatedSessions,
    });

    // Also persist through localDb directly
    try {
      const { localDb } = await import("../../services/localDbService");
      await localDb.put("focus_sessions", {
        ...newSession,
        userId: "guest",
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[StopwatchTimer] Error persisting session:", e);
    }

    confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#3B82F6", "#60A5FA", "#10b981", "#38BDF8", "#F59E0B"],
    });

    setShowExitConfirm(false);
    setShowCompletionModal(true);

    if (onSessionSaved) {
      onSessionSaved();
    }
  };

  const handleStartAgain = () => {
    setShowCompletionModal(false);
    setElapsedSeconds(0);
    accumulatedMsRef.current = 0;
    startTimeRef.current = null;
    setViewMode("active");
    setTimeout(() => {
      setIsRunning(true);
    }, 100);
  };

  const handleReturnToDashboard = () => {
    setShowCompletionModal(false);
    setElapsedSeconds(0);
    accumulatedMsRef.current = 0;
    startTimeRef.current = null;
    setViewMode("setup");
    navigateTo("today");
  };

  const starterTopics = [
    { en: "Deep Study", bn: "গভীর পড়াশোনা" },
    { en: "Coding & Dev", bn: "কোডিং ও ডেভেলপমেন্ট" },
    { en: "Book Reading", bn: "বই পড়া" },
    { en: "Project Work", bn: "প্রজেক্টের কাজ" },
  ];

  // =========================================================================
  // 1. ACTIVE DIRECT VIEW (Clean Back button, perfectly centered, NO page header)
  // =========================================================================
  if (viewMode === "active") {
    return (
      <div className="w-full animate-in fade-in duration-200">
        {/* Top Navigation Bar: Back icon button on Left, Active status on Right */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleBackAttempt}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[#52627A] dark:text-zinc-400 hover:text-[#111827] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
            title={state.lang === "bn" ? "ফিরে যান" : "Back"}
            aria-label={state.lang === "bn" ? "ফিরে যান" : "Back"}
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5B8DEF] dark:text-blue-400">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? "bg-[#5B8DEF] dark:bg-blue-400 animate-pulse" : "bg-zinc-500"
              }`}
            />
            <span>
              {isRunning
                ? state.lang === "bn"
                  ? "চলমান"
                  : "Active"
                : state.lang === "bn"
                ? "পজ করা"
                : "Paused"}
            </span>
          </div>
        </div>

        {/* Center Container: Centered Margins & Balanced Padding */}
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-4 sm:py-8">
          {/* Topic / Task Pill if provided */}
          {topicName && (
            <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F0F5FD] dark:bg-white/5 border border-[#DCE5F0] dark:border-white/10 text-xs sm:text-sm font-semibold text-[#111827] dark:text-zinc-200">
              <Tag className="w-3.5 h-3.5 text-[#5B8DEF] dark:text-blue-400" />
              <span>{topicName}</span>
            </div>
          )}

          {/* MAIN ROLLING DIGIT TICKER */}
          <div className="w-full flex items-center justify-center gap-2 sm:gap-4 md:gap-6 my-4 select-none">
            {/* Hours Pair */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <RollingDigit value={h1} size="lg" />
                <RollingDigit value={h2} size="lg" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#52627A] dark:text-zinc-400">
                {state.lang === "bn" ? "ঘণ্টা" : "Hours"}
              </span>
            </div>

            {/* Steady Colon Separator */}
            <div className="flex flex-col items-center justify-center pb-5">
              <span className="text-2xl sm:text-4xl md:text-5xl font-bold font-mono text-[#8290A5] dark:text-zinc-500 select-none">
                :
              </span>
            </div>

            {/* Minutes Pair */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <RollingDigit value={m1} size="lg" />
                <RollingDigit value={m2} size="lg" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#52627A] dark:text-zinc-400">
                {state.lang === "bn" ? "মিনিট" : "Minutes"}
              </span>
            </div>

            {/* Steady Colon Separator */}
            <div className="flex flex-col items-center justify-center pb-5">
              <span className="text-2xl sm:text-4xl md:text-5xl font-bold font-mono text-[#8290A5] dark:text-zinc-500 select-none">
                :
              </span>
            </div>

            {/* Seconds Pair */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <RollingDigit value={s1} size="lg" />
                <RollingDigit value={s2} size="lg" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#5B8DEF] dark:text-blue-400">
                {state.lang === "bn" ? "সেকেন্ড" : "Seconds"}
              </span>
            </div>
          </div>

          {/* Controls Row: Play/Pause, Save Session (solid blue, NO icon), Instant Reset */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8 w-full">
            {/* Play/Pause/Resume Button */}
            <button
              type="button"
              onClick={isRunning ? handlePause : handleStart}
              style={{
                backgroundColor: isRunning ? "#0F172A" : "#1E3E7B",
                borderColor: isRunning ? "#0F172A" : "#1E3E7B",
                color: "#FFFFFF",
              }}
              className="w-24 h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-none dark:!bg-white/15 dark:!border-white/15 dark:!text-white text-white border"
              title={isRunning ? (state.lang === "bn" ? "থামান" : "Pause") : (state.lang === "bn" ? "চালিয়ে যান" : "Resume")}
            >
              {isRunning ? (
                <Pause className="w-5 h-5 fill-white text-white" />
              ) : (
                <Play className="w-5 h-5 fill-white text-white ml-0.5" />
              )}
            </button>

            {/* Save Session Button - Solid Blue (btn-primary), NO checkmark icon */}
            {elapsedSeconds > 0 && (
              <button
                type="button"
                onClick={handleSaveAndStop}
                className="btn-primary h-12 px-7 rounded-full text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-none"
              >
                <span>{state.lang === "bn" ? "সেশন সেভ করুন" : "Save Session"}</span>
              </button>
            )}

            {/* Reset Button (Instant 00:00:00 without annoying prompt) */}
            {elapsedSeconds > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="w-12 h-12 rounded-full bg-[#F7FAFE] hover:bg-[#EAF1FB] dark:bg-white/5 dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 text-[#52627A] hover:text-[#111827] dark:text-zinc-300 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-none"
                title={state.lang === "bn" ? "রিসেট করুন" : "Reset Timer"}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Exit / Save Prompt Modal */}
        {exitConfirmAnim.shouldRender && typeof document !== "undefined" && createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowExitConfirm(false);
            }}
            className={`fixed inset-0 z-[150] flex items-center justify-center p-4 bg-transparent ${
              exitConfirmAnim.isExiting ? "motion-exit-fade" : "fade-in duration-200"
            }`}
          >
            <div
              className={`relative w-full max-w-sm rounded-2xl border border-[#DCE5F0] dark:border-white/10 bg-white dark:bg-[#0c1222] p-6 text-center shadow-2xl ${
                exitConfirmAnim.isExiting ? "motion-exit-reveal" : "motion-reveal"
              }`}
            >
              <h4 className="text-base font-bold text-[#111827] dark:text-white mb-2">
                {state.lang === "bn" ? "সেশন সেভ করবেন?" : "Save Current Session?"}
              </h4>
              <p className="text-xs text-[#52627A] dark:text-zinc-400 mb-5">
                {state.lang === "bn"
                  ? "বের হওয়ার আগে সেশনের সময়টুকু ড্যাশবোর্ডে সংরক্ষণ করতে চান?"
                  : "Would you like to record this session time to your dashboard before leaving?"}
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveAndStop}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                >
                  {state.lang === "bn" ? "সেভ করে বের হোন" : "Save & Exit"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscardAndExit}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-[#52627A] dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 bg-[#F7FAFE] dark:bg-white/5 border border-[#DCE5F0] dark:border-white/10 transition-colors cursor-pointer"
                  >
                    {state.lang === "bn" ? "মুছে বের হোন" : "Discard & Exit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExitConfirm(false);
                      setIsRunning(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-[#111827] dark:text-white bg-[#F0F5FD] dark:bg-white/10 border border-[#DCE5F0] dark:border-white/10 transition-colors cursor-pointer"
                  >
                    {state.lang === "bn" ? "চালিয়ে যান" : "Keep Timing"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Celebratory Completion Modal */}
        {completionModalAnim.shouldRender && typeof document !== "undefined" && createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCompletionModal(false);
            }}
            className={`fixed inset-0 z-[150] flex items-center justify-center p-4 bg-transparent ${
              completionModalAnim.isExiting ? "motion-exit-fade" : "fade-in duration-200"
            }`}
          >
            <div
              className={`relative w-full max-w-md rounded-2xl border border-[#DCE5F0] dark:border-white/10 bg-white dark:bg-[#0c1222] p-6 sm:p-7 text-center shadow-2xl ${
                completionModalAnim.isExiting ? "motion-exit-reveal" : "motion-reveal"
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-1.5">
                {state.lang === "bn" ? "অভিনন্দন!" : "Congratulations!"}
              </h3>

              <p className="text-sm font-semibold text-[#5B8DEF] dark:text-blue-400 mb-2">
                {state.lang === "bn"
                  ? `আপনি সফলভাবে ${lastSavedDurationStr} সময় সম্পন্ন করেছেন`
                  : `You completed ${lastSavedDurationStr} of focus time`}
              </p>

              <p className="text-xs text-[#52627A] dark:text-zinc-400 mb-6 leading-relaxed">
                {state.lang === "bn"
                  ? "আপনার ধারাবাহিকতাই সফলতার মূল চাবিকাঠি। এই দারুণ গতি ধরে রাখুন!"
                  : "Your consistency is the foundation of progress. Keep this incredible momentum going!"}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleStartAgain}
                  className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{state.lang === "bn" ? "পুনরায় শুরু করুন" : "Start Again"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReturnToDashboard}
                  className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#52627A] hover:text-[#111827] dark:text-zinc-300 dark:hover:text-white bg-[#F7FAFE] dark:bg-white/5 border border-[#DCE5F0] dark:border-white/10 hover:bg-[#F0F5FD] dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{state.lang === "bn" ? "ড্যাশবোর্ডে ফিরে যান" : "Back to Dashboard"}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. SETUP SCREEN (Side-by-Side 2 Cards Grid with History & View All Modal)
  // =========================================================================
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: Topic or Task Name Card */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="card rounded-2xl p-5 sm:p-6 border border-[#DCE5F0] dark:border-white/10 bg-white dark:bg-[#0c1222] dark:bg-[var(--color-bg-card)] shadow-none flex flex-col h-full justify-between gap-5">
            <div>
              {/* Card Title */}
              <div className="mb-4">
                <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                  {state.lang === "bn" ? "টপিক বা কাজের নাম" : "Topic or Task Name"}
                </h3>
              </div>

              {/* Topic Input Box */}
              <div className="relative mb-5">
                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleStartFromSetup();
                    }
                  }}
                  placeholder={
                    state.lang === "bn"
                      ? "টাস্ক বা পড়ার বিষয়ের নাম লিখুন..."
                      : "Enter your task or topic..."
                  }
                  className="w-full py-3 px-4 text-sm rounded-xl transition-all border bg-[#F7FAFE] dark:bg-white/[0.04] border-[#DCE5F0] dark:border-white/10 text-[#111827] dark:text-white placeholder:text-[#52627A] dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1E3E7B] dark:focus:border-blue-400 shadow-none font-medium"
                />
                {topicName && (
                  <button
                    type="button"
                    onClick={() => setTopicName("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer transition-colors"
                    title="Clear input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Select from Recent Timer Tasks History */}
              {timerHistory.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111827] dark:text-slate-200">
                      {state.lang === "bn" ? "সাম্প্রতিক টাস্কসমূহ" : "Recent Tasks"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHistoryModal(true)}
                      className="text-xs text-[#1E3E7B] dark:text-blue-400 hover:underline cursor-pointer font-semibold"
                    >
                      {state.lang === "bn" ? "ভিউ অল" : "View all"}
                    </button>
                  </div>
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/[0.06] pt-0.5">
                    {timerHistory.slice(0, 3).map((item, idx) => {
                      const isSelected = topicName === item.name;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTopicName(item.name)}
                          className={`w-full text-left py-2 px-1 text-xs sm:text-sm transition-colors flex items-center justify-between cursor-pointer rounded-lg ${
                            isSelected
                              ? "text-[#1E3E7B] dark:text-blue-400 font-semibold"
                              : "text-[#111827] dark:text-foreground hover:text-[#1E3E7B] dark:hover:text-blue-400"
                          }`}
                        >
                          <span className="truncate mr-2 font-medium">{item.name}</span>
                          <span
                            className={`text-xs shrink-0 whitespace-nowrap ${
                              isSelected
                                ? "text-[#1E3E7B] dark:text-blue-300 font-semibold"
                                : "text-[#52627A] dark:text-muted-foreground font-mono"
                            }`}
                          >
                            {formatDurationDisplay(item.totalSeconds, state.lang)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Select Popular Topics (if no history) */}
              {timerHistory.length === 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-semibold text-[#111827] dark:text-slate-200">
                    {t.focus.popularTopics ||
                      (state.lang === "bn" ? "জনপ্রিয় টপিকসমূহ" : "Popular Topics")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {starterTopics.map((topic, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setTopicName(state.lang === "bn" ? topic.bn : topic.en)
                        }
                        className="px-3.5 py-2 rounded-xl text-xs bg-[#F7FAFE] dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-[#DCE5F0] dark:border-white/10 text-[#111827] dark:text-white transition-all cursor-pointer active:scale-95 font-medium"
                      >
                        {state.lang === "bn" ? topic.bn : topic.en}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Task feedback pill */}
            <div>
              {topicName && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs text-blue-400">
                  <div className="flex items-center gap-2 truncate">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {state.lang === "bn" ? "বাছাইকৃত বিষয়:" : "Selected:"}{" "}
                      <strong>{topicName}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTopicName("")}
                    className="text-[11px] underline opacity-80 hover:opacity-100 ml-2 shrink-0 cursor-pointer"
                  >
                    {state.lang === "bn" ? "মুছুন" : "Clear"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Stopwatch Timer Card */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="card rounded-2xl p-5 sm:p-6 border border-[#DCE5F0] dark:border-white/10 bg-white dark:bg-[#0c1222] dark:bg-[var(--color-bg-card)] shadow-none flex flex-col h-full justify-between gap-5">
            <div>
              {/* Card Title */}
              <div className="mb-4">
                <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                  {state.lang === "bn" ? "স্টপওয়াচ টাইমার" : "Stopwatch Timer"}
                </h3>
              </div>

              {/* Compact Preview of Rolling Digits */}
              <div className="py-4 my-2 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-2 sm:gap-3 my-2 select-none">
                  {/* Hours Pair */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      <RollingDigit value="0" size="md" />
                      <RollingDigit value="0" size="md" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#52627A] dark:text-zinc-400">
                      {state.lang === "bn" ? "ঘণ্টা" : "Hours"}
                    </span>
                  </div>

                  {/* Steady Colon Separator */}
                  <div className="flex flex-col items-center justify-center pb-4">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-[#8290A5] dark:text-zinc-500 select-none">
                      :
                    </span>
                  </div>

                  {/* Minutes Pair */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      <RollingDigit value="0" size="md" />
                      <RollingDigit value="0" size="md" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#52627A] dark:text-zinc-400">
                      {state.lang === "bn" ? "মিনিট" : "Minutes"}
                    </span>
                  </div>

                  {/* Steady Colon Separator */}
                  <div className="flex flex-col items-center justify-center pb-4">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-[#8290A5] dark:text-zinc-500 select-none">
                      :
                    </span>
                  </div>

                  {/* Seconds Pair */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      <RollingDigit value="0" size="md" />
                      <RollingDigit value="0" size="md" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5B8DEF] dark:text-blue-400">
                      {state.lang === "bn" ? "সেকেন্ড" : "Seconds"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Timer Button (Launches direct into active timer) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartFromSetup}
                className="btn-primary w-full py-3.5 px-6 rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-colors"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>{state.lang === "bn" ? "টাইমার শুরু করুন" : "Start Timer"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Task History Modal ("View all") */}
      {historyModalAnim.shouldRender && typeof document !== "undefined" && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistoryModal(false);
          }}
          className={`fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-transparent ${
            historyModalAnim.isExiting ? "motion-exit-fade" : "fade-in duration-200"
          }`}
          style={{ minHeight: "100dvh" }}
        >
          <div
            className={`w-full max-w-sm sm:max-w-md my-auto p-0 rounded-2xl bg-white dark:bg-[#0D1426] border border-[#DCE5F0] dark:border-white/10 shadow-xl overflow-hidden flex flex-col max-h-[80vh] ${
              historyModalAnim.isExiting ? "motion-exit-reveal" : "motion-reveal"
            }`}
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-[#E2E8F0] dark:border-white/10 flex items-center justify-between bg-[#F8FAFC] dark:bg-white/[0.02]">
              <h2 className="text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
                <span>{state.lang === "bn" ? "সকল টাইমার রেকর্ড" : "Timer Task History"}</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] dark:text-zinc-400 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Content - Clean line separated list without boxed shapes */}
            <div className="p-3.5 sm:p-4 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#0D1426]">
              {timerHistory.length === 0 ? (
                <p className="text-center text-[#64748B] dark:text-muted-foreground text-xs py-8">
                  {state.lang === "bn" ? "কোনো হিস্ট্রি পাওয়া যায়নি" : "No history recorded yet"}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {timerHistory.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setTopicName(item.name);
                        setShowHistoryModal(false);
                      }}
                      className="group w-full py-2.5 px-1 text-xs sm:text-sm transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.03] text-[#0F172A] dark:text-white flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate mr-3">
                        <span className="font-medium text-[#0F172A] dark:text-white truncate group-hover:text-blue-500 transition-colors">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-[#64748B] dark:text-zinc-400 whitespace-nowrap font-mono">
                          ({formatDurationDisplay(item.totalSeconds, state.lang)}{item.lastDate ? ` • ${item.lastDate}` : ""})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.name);
                        }}
                        className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                        title={state.lang === "bn" ? "মুছুন" : "Delete"}
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

export default StopwatchTimer;
