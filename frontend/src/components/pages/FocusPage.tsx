"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAppContext } from "../../context/AppContext";
import { useFocusTimer } from "../../hooks/useFocusTimer";
import { useTranslation } from "../../hooks/useTranslation";
import { HourglassTimer } from "../ui/HourglassTimer";
import confetti from "canvas-confetti";
import { 
  Smartphone, 
  Globe, 
  MessageCircle, 
  Video, 
  MessageSquare, 
  History, 
  Trash2, 
  X, 
  ArrowLeft, 
  Flame, 
  ShieldAlert, 
  Target, 
  Lock, 
  Coffee, 
  CheckCircle2, 
  Play, 
  Pause, 
  FastForward, 
  ChevronRight, 
  Clock,
  Plus,
  Minus,
  Check,
  Sparkles
} from "lucide-react";
import { useAnimateExit } from "../../hooks/useAnimateExit";


type SessionPhase = "setup" | "focus_active" | "break_selection" | "break_active" | "break_completed";

export default function FocusPage() {
  const { 
    state, 
    updateState,
    startFocusSession, 
    endFocusSession, 
    addBreakTime,
    addDistraction, 
    showToast, 
    navigateTo, 
    registerFocusLock, 
    unregisterFocusLock 
  } = useAppContext();
  const { t } = useTranslation();

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("setup");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ id?: number; name: string; category: string }>({
    name: "",
    category: "",
  });
  const [completedSessionData, setCompletedSessionData] = useState<{
    name: string;
    category?: string;
    minutes: number;
  } | null>(null);
  const [selectedBreakDuration, setSelectedBreakDuration] = useState<number>(5);

  const [showDistraction, setShowDistraction] = useState(false);
  const [distractionText, setDistractionText] = useState("");
  const [isDeepFocus, setIsDeepFocus] = useState(false);
  const [showDurationError, setShowDurationError] = useState(false);

  // Custom Task History (synced with Supabase state & local fallback)
  type HistoryItem = { name: string; totalMinutes: number };
  const [taskHistory, setTaskHistory] = useState<HistoryItem[]>(() => {
    if (state.focusTaskHistory && state.focusTaskHistory.length > 0) {
      return state.focusTaskHistory;
    }
    return [];
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Modals & Friction State
  const [pauseAttemptCount, setPauseAttemptCount] = useState(0);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showEarlyExitModal, setShowEarlyExitModal] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<"back" | "sidebar" | "switch">("back");
  const [exitAttempts, setExitAttempts] = useState(0);
  const [targetExitPage, setTargetExitPage] = useState<string>("dashboard");

  const pauseAnim = useAnimateExit({ isOpen: showPauseModal, durationMs: 200 });
  const earlyExitAnim = useAnimateExit({ isOpen: showEarlyExitModal, durationMs: 200 });
  const historyModalAnim = useAnimateExit({ isOpen: showHistoryModal, durationMs: 200 });

  // Load task history on initial mount or when state loads from Supabase
  useEffect(() => {
    if (state.focusTaskHistory && state.focusTaskHistory.length > 0) {
      setTaskHistory(state.focusTaskHistory);
    } else {
      const saved = localStorage.getItem("focus_task_history");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (typeof parsed[0] === "string") {
              const mapped = (parsed as unknown as string[]).map((name: string) => ({ name, totalMinutes: 0 }));
              setTaskHistory(mapped);
            } else {
              setTaskHistory(parsed);
            }
          }
        } catch {}
      }
    }
  }, [state.focusTaskHistory]);

  const saveToHistory = useCallback((taskName: string) => {
    if (!taskName.trim()) return;
    setTaskHistory((prev) => {
      const existing = prev.find((t) => t.name === taskName);
      const updated = [
        { name: taskName, totalMinutes: existing ? existing.totalMinutes : 0 },
        ...prev.filter((t) => t.name !== taskName),
      ].slice(0, 50);
      try {
        localStorage.setItem("focus_task_history", JSON.stringify(updated));
      } catch {}
      setTimeout(() => {
        updateState({ focusTaskHistory: updated });
      }, 0);
      return updated;
    });
  }, [updateState]);

  const updateHistoryMinutes = useCallback((taskName: string, minutes: number) => {
    if (!taskName.trim() || minutes <= 0) return;
    setTaskHistory((prev) => {
      const updated = prev.map((t) =>
        t.name === taskName ? { ...t, totalMinutes: t.totalMinutes + minutes } : t
      );
      try {
        localStorage.setItem("focus_task_history", JSON.stringify(updated));
      } catch {}
      setTimeout(() => {
        updateState({ focusTaskHistory: updated });
      }, 0);
      return updated;
    });
  }, [updateState]);

  const deleteHistoryItem = (taskName: string) => {
    setTaskHistory((prev) => {
      const updated = prev.filter((t) => t.name !== taskName);
      try {
        localStorage.setItem("focus_task_history", JSON.stringify(updated));
      } catch {}
      setTimeout(() => {
        updateState({ focusTaskHistory: updated });
      }, 0);
      return updated;
    });
  };

  // Callback references for clean timer handling
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSessionId;
  const selectedTaskRef = useRef(selectedTask);
  selectedTaskRef.current = selectedTask;

  // --- AUTOMATIC COMPLETION HANDLER ---
  const handleWorkComplete = useCallback(() => {
    const currentSessionId = activeSessionIdRef.current;
    const task = selectedTaskRef.current;

    unregisterFocusLock();

    const completedMins = timerWorkMinutesRef.current || 25;

    if (currentSessionId) {
      endFocusSession(currentSessionId, completedMins, true);
      if (!task.id) {
        updateHistoryMinutes(task.name, completedMins);
      }
    }

    setCompletedSessionData({
      name: task.name || (state.lang === "bn" ? "ফোকাস সেশন" : "Focus Session"),
      category: task.category,
      minutes: completedMins,
    });

    setActiveSessionId(null);
    setIsDeepFocus(false);
    setSessionPhase("break_selection");

    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 },
      colors: ["#3B82F6", "#60A5FA", "#9333ea", "#ffffff", "#10b981", "#FFD700"],
    });

    showToast(
      t.focus.sessionCompletedToast ||
        (state.lang === "bn"
          ? "ফোকাস সেশন সফলভাবে সম্পন্ন হয়েছে! দারুণ কাজ।"
          : "Focus session completed! Amazing job."),
      "success"
    );
  }, [endFocusSession, unregisterFocusLock, updateHistoryMinutes, showToast, state.lang, t.focus.sessionCompletedToast]);

  const handleBreakComplete = useCallback(() => {
    addBreakTime(selectedBreakDuration);
    setSessionPhase("break_completed");

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#10b981", "#34d399", "#6ee7b7", "#ffffff", "#3B82F6"],
    });

    showToast(
      t.focus.breakCompletedToast ||
        (state.lang === "bn"
          ? "বিরতি শেষ! আবার কাজে মন দেওয়ার সময়।"
          : "Break finished! Time to refocus."),
      "info"
    );
  }, [showToast, state.lang, t.focus.breakCompletedToast]);

  const timer = useFocusTimer({
    onWorkComplete: handleWorkComplete,
    onBreakComplete: handleBreakComplete,
  });

  const timerWorkMinutesRef = useRef(timer.workMinutes);
  timerWorkMinutesRef.current = timer.workMinutes;

  // Custom Duration State (Hours and Minutes)
  const [customHours, setCustomHours] = useState<number>(0);
  const [customMinutes, setCustomMinutes] = useState<number>(25);
  const [isHoursFocused, setIsHoursFocused] = useState(false);
  const [isMinutesFocused, setIsMinutesFocused] = useState(false);

  // Sync custom inputs with timer.workMinutes whenever it changes
  useEffect(() => {
    if (timer.workMinutes > 0) {
      setCustomHours(Math.floor(timer.workMinutes / 60));
      setCustomMinutes(timer.workMinutes % 60);
    }
  }, [timer.workMinutes]);

  // Default to 25m preset on initial mount if not yet initialized
  useEffect(() => {
    if (timer.workMinutes === 0) {
      timer.setPreset(25);
    }
  }, [timer]);

  const handleDurationPreset = (mins: number) => {
    setCustomHours(Math.floor(mins / 60));
    setCustomMinutes(mins % 60);
    timer.setPreset(mins);
    setShowDurationError(false);
  };

  const handleCustomHoursChange = (h: number) => {
    const validH = Math.max(0, Math.min(12, h));
    setCustomHours(validH);
    const total = validH * 60 + customMinutes;
    timer.setPreset(total);
    if (total > 0) setShowDurationError(false);
  };

  const handleCustomMinutesChange = (m: number) => {
    const validM = Math.max(0, Math.min(59, m));
    setCustomMinutes(validM);
    const total = customHours * 60 + validM;
    timer.setPreset(total);
    if (total > 0) setShowDurationError(false);
  };

  // Register focus lock with AppContext to intercept sidebar/global navigation ONLY while focus is active
  useEffect(() => {
    if (sessionPhase === "focus_active" && activeSessionId && timer.remaining > 0) {
      registerFocusLock((targetPage: string) => {
        timer.pause();
        setTargetExitPage(targetPage);
        setPendingExitAction("sidebar");
        setShowEarlyExitModal(true);
        setExitAttempts((prev) => Math.min(prev + 1, 3));
        return false;
      });
    } else {
      unregisterFocusLock();
    }

    return () => {
      unregisterFocusLock();
    };
  }, [sessionPhase, activeSessionId, timer.remaining, registerFocusLock, unregisterFocusLock, timer]);

  // Auto-launch focus session if triggered from AI Agent Explore button
  useEffect(() => {
    try {
      const raw = localStorage.getItem("focusforge_pending_focus_launch");
      if (raw) {
        localStorage.removeItem("focusforge_pending_focus_launch");
        const data = JSON.parse(raw);
        if (data && (data.durationMinutes > 0 || data.workMinutes > 0)) {
          const mins = Number(data.durationMinutes || data.workMinutes || 25);
          const taskName = data.taskName || (state.lang === "bn" ? "ডিপ ওয়ার্ক সেশন" : "Deep Work Session");
          const category = data.category || "Study";

          setSelectedTask({ id: 0, name: taskName, category });
          setShowDurationError(false);
          setExitAttempts(0);
          saveToHistory(taskName);

          timer.setPreset(mins);
          const sessionId = startFocusSession(taskName, category, undefined, mins);
          setActiveSessionId(sessionId);
          setSessionPhase("focus_active");

          setTimeout(() => {
            timer.start();
          }, 150);

          showToast(
            state.lang === "bn"
              ? `${mins} মিনিটের ফোকাস সেশন স্বয়ংক্রিয়ভাবে শুরু হয়েছে!`
              : `${mins}m Focus session started automatically!`,
            "success"
          );
        }
      }
    } catch (err) {
      console.warn("[FocusPage] Error auto-launching focus session:", err);
    }
  }, [saveToHistory, startFocusSession, timer, showToast, state.lang]);

  // App Switch / Tab Switch Detection: Warn user if switching away during active session
  useEffect(() => {
    if (sessionPhase !== "focus_active" || !activeSessionId) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && timer.remaining > 0 && sessionPhase === "focus_active") {
        timer.pause();
        setPendingExitAction("switch");
        setShowEarlyExitModal(true);
        setExitAttempts((prev) => Math.min(prev + 1, 3));
        showToast(t.focus.appSwitchNotice, "info");
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sessionPhase === "focus_active" && activeSessionId && timer.remaining > 0) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionPhase, activeSessionId, timer.remaining, t.focus.appSwitchNotice, showToast, timer]);

  const handleSelectTask = (task: { id?: number; name: string; category: string }) => {
    setSelectedTask(task);
  };

  const handleStartFocus = () => {
    const hasNoDuration = !timer.workMinutes || timer.workMinutes <= 0;

    if (hasNoDuration) {
      setShowDurationError(true);
      return;
    }

    setShowDurationError(false);
    setExitAttempts(0);

    const rawName = selectedTask.name?.trim() || "";
    const defaultName = state.lang === "bn" ? "ফোকাস সেশন" : "Focus Session";
    const finalTaskName = rawName || defaultName;
    const finalCategory = selectedTask.category || "";

    if (rawName && !selectedTask.id) {
      saveToHistory(rawName);
    }

    const sessionId = startFocusSession(
      finalTaskName,
      finalCategory,
      selectedTask.id,
      timer.workMinutes
    );
    setActiveSessionId(sessionId);
    setSelectedTask({ id: selectedTask.id, name: finalTaskName, category: finalCategory });
    setSessionPhase("focus_active");
    timer.start();
  };

  const handlePauseAttempt = () => {
    setShowPauseModal(true);
    setPauseAttemptCount((prev) => prev + 1);
  };

  const handleConfirmPause = () => {
    timer.pause();
    setShowPauseModal(false);
  };

  // Back Button Guard: Prompt with 3-attempt friction system if active
  const handleBackAttempt = () => {
    if (sessionPhase === "focus_active" && activeSessionId && timer.remaining > 0) {
      timer.pause();
      setTargetExitPage("dashboard");
      setPendingExitAction("back");
      setShowEarlyExitModal(true);
      setExitAttempts((prev) => Math.min(prev + 1, 3));
      return;
    }

    if (sessionPhase === "break_active") {
      timer.skipBreak();
      setSessionPhase("setup");
      navigateTo("dashboard");
      return;
    }

    setSessionPhase("setup");
    navigateTo("dashboard");
  };

  const handleKeepFocusing = () => {
    setShowEarlyExitModal(false);
    timer.start();
  };

  // 3-Attempt Exit Friction Handler
  const handleSecondaryModalAction = () => {
    if (exitAttempts < 3) {
      const nextAttempt = Math.min(exitAttempts + 1, 3);
      setExitAttempts(nextAttempt);
      showToast(
        state.lang === "bn"
          ? `সতর্কবার্তা: অন্তত ৩ বার চেষ্টার পরই সেশন ছাড়া সম্ভব (${nextAttempt}/৩)!`
          : `Notice: Early exit requires 3 attempts (${nextAttempt}/3)!`,
        "info"
      );
      return;
    }

    if (activeSessionId) {
      endFocusSession(activeSessionId, timer.elapsedMinutes, false);
      showToast(
        state.lang === "bn"
          ? `ফোকাস সমাপ্ত হয়েছে (${timer.elapsedMinutes} মিনিট সেভ হয়েছে)`
          : `Focus ended early (${timer.elapsedMinutes}m recorded)`,
        "info"
      );
      if (!selectedTask.id && timer.elapsedMinutes > 0) {
        updateHistoryMinutes(selectedTask.name, timer.elapsedMinutes);
      }
    }
    unregisterFocusLock();
    setActiveSessionId(null);
    timer.reset();
    setIsDeepFocus(false);
    setShowEarlyExitModal(false);
    setExitAttempts(0);
    setPauseAttemptCount(0);
    setSessionPhase("setup");
    setSelectedTask({ name: "", category: "" });

    if (pendingExitAction === "back" || pendingExitAction === "sidebar") {
      navigateTo(targetExitPage || "dashboard");
    }
  };

  const handleLogDistraction = () => {
    if (!distractionText.trim() || !activeSessionId) return;
    addDistraction(activeSessionId, distractionText.trim());
    setDistractionText("");
    setShowDistraction(false);
    showToast("Distraction logged. Stay focused.", "info");
  };

  // --- BREAK WORKFLOW CONTROLS ---
  const handleSelectBreak = (durationMins: number) => {
    setSelectedBreakDuration(durationMins);
    timer.startBreak(durationMins);
    setSessionPhase("break_active");
  };

  const handleSkipBreak = () => {
    timer.skipBreak();
    setSessionPhase("setup");
    setSelectedTask({ name: "", category: "" });
    setCompletedSessionData(null);
  };

  const handleStartNewSessionAfterBreak = () => {
    timer.skipBreak();
    setSessionPhase("setup");
    setSelectedTask({ name: "", category: "" });
    setCompletedSessionData(null);
  };

  // Current session distractions
  const currentSession = activeSessionId
    ? state.focusSessions.find((s) => s.id === activeSessionId)
    : null;
  const sessionDistractions = currentSession?.distractions || [];

  const renderDistractionTag = (distraction: { id: string; content: string }) => {
    const text = distraction.content.toLowerCase();
    let Icon = Globe;
    if (text.includes("facebook") || text.includes("fb")) Icon = MessageCircle;
    else if (text.includes("instagram") || text.includes("ig")) Icon = Smartphone;
    else if (text.includes("youtube") || text.includes("yt")) Icon = Video;
    else if (text.includes("twitter") || text.includes(" x ") || text.match(/^x$/i)) Icon = MessageSquare;
    else if (text.includes("reddit") || text.includes("tiktok") || text.includes("phone")) Icon = Smartphone;

    return (
      <div
        key={distraction.id}
        className="text-xs px-3 py-2 rounded-lg flex items-center gap-2 border border-[#DCE5F0] dark:border-white/10 bg-[#F7FAFE] dark:bg-white/5 text-[#111827] dark:text-zinc-300"
      >
        <Icon className="w-3.5 h-3.5 text-[#5B8DEF] dark:text-blue-400" />
        <span>{distraction.content}</span>
      </div>
    );
  };

  // ============================================================
  // DEEP FOCUS FULLSCREEN IMMERSIVE VIEW
  // ============================================================
  if (isDeepFocus && sessionPhase === "focus_active" && activeSessionId) {
    return (
      <div
        className="fixed inset-0 z-[120] w-screen h-screen flex flex-col items-center justify-between p-6 sm:p-10 overflow-y-auto fade-in"
        style={{
          background: "radial-gradient(ellipse at 50% 25%, #101b38 0%, #080d1a 60%, #050811 100%)",
        }}
      >
        {/* Soft Ambient Radial Glow behind timer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Deep Focus Top Navigation Bar */}
        <div className="w-full max-w-2xl flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => setIsDeepFocus(false)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
            aria-label={state.lang === "bn" ? "ফিরে যান" : "Back"}
            title={state.lang === "bn" ? "ফিরে যান" : "Back"}
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-xs font-semibold text-blue-400">
            <Lock className="w-3.5 h-3.5" />
            <span>{state.lang === "bn" ? "ডিপ ফোকাস মোড" : "Deep Focus Mode"}</span>
          </div>
        </div>

        {/* Center Timer & Task */}
        <div className="flex flex-col items-center justify-center my-auto text-center z-10 max-w-md w-full py-6">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-2 leading-snug px-2">
            {selectedTask.name}
          </h2>

          {selectedTask.category && (
            <span className="text-xs px-3 py-1 rounded-full mb-6 border border-white/10 bg-white/5 text-zinc-400">
              {selectedTask.category}
            </span>
          )}

          {/* Redesigned Circular Timer with Animated Hourglass */}
          <HourglassTimer
            progress={timer.progress}
            display={timer.display}
            isRunning={timer.isRunning}
            size={240}
            color="#3B82F6"
            trackColor="rgba(59, 130, 246, 0.18)"
          />

          {/* Controls Row (Play/Pause + Distraction Pill) */}
          <div className="flex flex-col items-center justify-center my-6 relative z-10 w-full max-w-sm">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={timer.isRunning ? handlePauseAttempt : timer.start}
                className="w-20 h-12 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all flex items-center justify-center shadow-none active:scale-95 cursor-pointer"
                title={timer.isRunning ? t.focus.pause : t.focus.resume}
                aria-label={timer.isRunning ? t.focus.pause : t.focus.resume}
              >
                {timer.isRunning ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDistraction((prev) => !prev)}
                className={`h-12 px-4 rounded-full border transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer active:scale-95 shadow-none ${
                  showDistraction
                    ? "bg-[#223A5E] dark:bg-blue-600 text-white border-[#223A5E] dark:border-blue-500 shadow-none"
                    : "bg-[#F7FAFE] dark:bg-white/5 hover:bg-[#F0F5FD] dark:hover:bg-white/10 text-[#52627A] dark:text-zinc-300 hover:text-[#111827] dark:hover:text-white border-[#DCE5F0] dark:border-white/10"
                }`}
                title={t.focus.distracted}
              >
                <MessageSquare className={`w-4 h-4 ${showDistraction ? "text-white" : "text-[#5B8DEF] dark:text-blue-400"}`} />
                <span>{t.focus.distracted}</span>
                {sessionDistractions.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#EAF1FB] dark:bg-blue-500/25 text-[#223A5E] dark:text-blue-300 text-[10px] font-bold">
                    {sessionDistractions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Distraction capture inline popover in Deep Focus */}
            {showDistraction && (
              <div className="mt-4 w-full p-4 rounded-2xl border border-[#DCE5F0] dark:border-blue-500/30 bg-white dark:bg-[#0c1222]/95 shadow-none text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#111827] dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#5B8DEF] dark:text-blue-400" />
                    {t.focus.whatDistracted}
                  </span>
                  {sessionDistractions.length > 0 && (
                    <span className="text-[11px] text-[#52627A] dark:text-zinc-400">
                      {sessionDistractions.length} {t.focus.logged}
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  value={distractionText}
                  onChange={(e) => setDistractionText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogDistraction()}
                  placeholder={t.focus.whatDistracted}
                  className="w-full text-xs py-2.5 px-3 rounded-xl bg-[#F7FAFE] dark:bg-black/40 border border-[#DCE5F0] dark:border-white/10 text-[#111827] dark:text-white placeholder:text-[#8290A5] dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#5B8DEF] dark:focus:border-blue-500 mb-3 transition-colors"
                  autoFocus
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLogDistraction}
                    disabled={!distractionText.trim()}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#223A5E] hover:bg-[#2E4E7B] dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-none active:scale-98 cursor-pointer"
                  >
                    {t.focus.saveReturn}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDistraction(false);
                      setDistractionText("");
                    }}
                    className="py-2 px-3 rounded-xl bg-[#F3F7FC] hover:bg-[#EAF1FB] dark:bg-white/5 dark:hover:bg-white/10 text-[#52627A] hover:text-[#111827] dark:text-zinc-300 dark:hover:text-white text-xs font-medium border border-[#DCE5F0] dark:border-white/10 transition-colors cursor-pointer"
                  >
                    {t.focus.cancel}
                  </button>
                </div>

                {sessionDistractions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#DCE5F0] dark:border-white/10 flex flex-col gap-1.5">
                    {sessionDistractions.map(renderDistractionTag)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="w-full max-w-2xl h-6" />

        {/* Pause Friction Modal inside Deep Focus */}
        {pauseAnim.shouldRender && (
          <div
            className={`fixed inset-0 z-[130] flex items-center justify-center p-4 ${
              pauseAnim.isExiting ? "motion-exit-fade" : "motion-overlay"
            }`}
          >
            <div
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
              onClick={() => setShowPauseModal(false)}
            ></div>
            <div
              className={`focus-dialog relative w-full max-w-md border rounded-2xl p-8 shadow-none text-center ${
                pauseAnim.isExiting ? "motion-exit-reveal" : "motion-reveal"
              }`}
            >
              {pauseAttemptCount === 1 ? (
                <>
                  <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">{t.focus.holdOn}</h2>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{t.focus.distractionEnemy}</p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setShowPauseModal(false)}
                      className="w-full py-3 rounded-xl font-bold text-white btn-primary"
                    >
                      {t.focus.resumeFocus}
                    </button>
                    <button
                      onClick={() => setShowPauseModal(false)}
                      className="w-full py-3 rounded-xl font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {t.focus.stillPause}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">{t.focus.thinkGoals}</h2>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{t.focus.consistencyKey}</p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        setShowPauseModal(false);
                        setPauseAttemptCount(0);
                      }}
                      className="w-full py-3 rounded-xl font-bold text-white btn-primary"
                    >
                      {t.focus.resumeFocus}
                    </button>
                    <button
                      onClick={handleConfirmPause}
                      className="w-full py-3 rounded-xl font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {t.focus.pauseTimer}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="motion-page max-w-6xl mx-auto w-full pb-14">
      {/* ============================================================ */}
      {/* 1. SETUP SCREEN (Inactive State)                             */}
      {/* ============================================================ */}
      {sessionPhase === "setup" && (
        <div className="w-full space-y-6">
          {/* Header Row: Title & Subtitle */}
          <div className="mb-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {t.focus.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t.focus.subtitleInactive}
            </p>
          </div>

          {/* Two-Column Side-by-Side Cards (Responsive: 1 col on mobile, 2 cols on lg) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT COLUMN: What will you focus on? */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="rounded-2xl p-5 sm:p-6 border border-border/70 dark:border-white/10 bg-card/60 shadow-none flex flex-col h-full justify-between gap-5">
                <div>
                  {/* Card Title (Clean, no icon, no subtitle) */}
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-foreground">
                      {t.focus.whatToFocus}
                    </h3>
                  </div>

                  {/* Custom Task Input Box */}
                  <div className="relative mb-5">
                    <input
                      type="text"
                      value={selectedTask.id ? "" : selectedTask.name}
                      onChange={(e) => {
                        setSelectedTask({ name: e.target.value, category: "" });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleStartFocus();
                        }
                      }}
                      placeholder={t.focus.orCustomTask}
                      className="input-field w-full py-3 px-4 text-sm rounded-xl transition-all"
                    />
                    {selectedTask.name && (
                      <button
                        type="button"
                        onClick={() => setSelectedTask({ name: "", category: "" })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer transition-colors"
                        title="Clear input"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Quick Select from Recent Task History */}
                  {taskHistory.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {t.focus.recentTasks ||
                            (state.lang === "bn" ? "সাম্প্রতিক টাস্কসমূহ" : "Recent Tasks")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowHistoryModal(true)}
                          className="text-xs text-blue-400 hover:underline cursor-pointer font-medium"
                        >
                          {state.lang === "bn" ? "ভিউ অল" : "View all"}
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {taskHistory.slice(0, 3).map((item, idx) => {
                          const isSelected = selectedTask.name === item.name;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectTask({ name: item.name, category: "" })}
                              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-between border cursor-pointer active:scale-[0.99] ${
                                isSelected
                                  ? "bg-blue-500/15 border-blue-500 text-blue-400 font-semibold shadow-none"
                                  : "bg-secondary/40 hover:bg-secondary text-foreground/90 border-border/60 hover:border-border"
                              }`}
                            >
                              <span className="truncate mr-2 font-medium">{item.name}</span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                                  isSelected
                                    ? "bg-blue-500/25 text-blue-300 font-semibold"
                                    : "bg-black/20 dark:bg-white/5 text-muted-foreground"
                                }`}
                              >
                                {item.totalMinutes}m {state.lang === "bn" ? "ফোকাস" : "focused"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Starter Suggestions if no history */}
                  {taskHistory.length === 0 && (
                    <div className="space-y-2.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {t.focus.popularTopics ||
                          (state.lang === "bn" ? "জনপ্রিয় টপিকসমূহ" : "Popular Topics")}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { en: "Deep Study", bn: "গভীর পড়াশোনা" },
                          { en: "Coding & Dev", bn: "কোডিং ও ডেভেলপমেন্ট" },
                          { en: "Book Reading", bn: "বই পড়া" },
                          { en: "Project Work", bn: "প্রজেক্টের কাজ" },
                        ].map((topic, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              handleSelectTask({
                                name: state.lang === "bn" ? topic.bn : topic.en,
                                category: "",
                              })
                            }
                            className="px-3 py-1.5 rounded-xl text-xs bg-secondary/40 hover:bg-secondary border border-border/60 hover:border-border text-foreground/80 transition-all cursor-pointer active:scale-95"
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
                  {selectedTask.name && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs text-blue-400">
                      <div className="flex items-center gap-2 truncate">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {state.lang === "bn" ? "বাছাইকৃত টাস্ক:" : "Selected:"}{" "}
                          <strong>{selectedTask.name}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTask({ name: "", category: "" })}
                        className="text-[11px] underline opacity-80 hover:opacity-100 ml-2 shrink-0 cursor-pointer"
                      >
                        {state.lang === "bn" ? "মুছুন" : "Clear"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Session Duration & Start Focus */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="rounded-2xl p-5 sm:p-6 border border-border/70 dark:border-white/10 bg-card/60 shadow-none flex flex-col h-full justify-between gap-5">
                <div>
                  {/* Card Title (Clean, no icon, no subtitle, no badge) */}
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-foreground">
                      {t.focus.sessionDuration}
                    </h3>
                  </div>

                  {/* Preset Pills: 25m, 50m, 90m */}
                  <div className="mb-5">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      {t.focus.quickPresets ||
                        (state.lang === "bn" ? "জনপ্রিয় সময়কাল" : "Quick Presets")}
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { mins: 25, label: "25m", subEn: "Pomodoro", subBn: "পোমোডোরো" },
                        { mins: 50, label: "50m", subEn: "Deep Flow", subBn: "ডিপ ফ্লো" },
                        {
                          mins: 90,
                          label: state.lang === "bn" ? "১ঘ ৩০মি" : "1h 30m",
                          subEn: "Ultradian (90m)",
                          subBn: "দেড় ঘণ্টা (৯০মি)",
                        },
                      ].map((preset) => {
                        const isSelected = timer.workMinutes === preset.mins;
                        return (
                          <button
                            key={preset.mins}
                            type="button"
                            onClick={() => handleDurationPreset(preset.mins)}
                            className={`py-2.5 px-2 sm:px-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center active:scale-95 ${
                              isSelected
                                ? "bg-blue-600/15 border-blue-500 text-blue-400 shadow-none ring-1 ring-blue-500/30 font-semibold"
                                : "bg-secondary/40 hover:bg-secondary border-border/60 hover:border-border text-foreground/80"
                            }`}
                          >
                            <span className="text-sm font-bold">{preset.label}</span>
                            <span
                              className={`text-[10px] mt-0.5 truncate max-w-full ${
                                isSelected ? "text-blue-300 font-medium" : "text-muted-foreground"
                              }`}
                            >
                              {state.lang === "bn" ? preset.subBn : preset.subEn}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Hours & Minutes Controls (Clean, Sleek Steppers) */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {t.focus.customDuration ||
                        (state.lang === "bn"
                          ? "কাস্টম সময় (ঘণ্টা ও মিনিট)"
                          : "Custom Duration (Hours & Minutes)")}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Hours Stepper */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-muted-foreground font-medium">
                          {t.focus.hours || (state.lang === "bn" ? "ঘণ্টা (Hours)" : "Hours")}
                        </label>
                        <div className="flex items-center rounded-xl bg-secondary/40 border border-border/70 p-1 shadow-none focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                          <button
                            type="button"
                            onClick={() => handleCustomHoursChange(customHours - 1)}
                            disabled={customHours <= 0}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-90"
                            aria-label="Decrease hours"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={12}
                            value={customHours === 0 && isHoursFocused ? "" : customHours}
                            onFocus={(e) => {
                              setIsHoursFocused(true);
                              e.target.select();
                            }}
                            onBlur={() => setIsHoursFocused(false)}
                            onChange={(e) => {
                              const str = e.target.value.replace(/^0+(?=\d)/, "");
                              const val = str === "" ? 0 : parseInt(str, 10);
                              handleCustomHoursChange(isNaN(val) ? 0 : val);
                            }}
                            className="w-full text-center text-sm font-bold bg-transparent text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleCustomHoursChange(customHours + 1)}
                            disabled={customHours >= 12}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-90"
                            aria-label="Increase hours"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Minutes Stepper */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-muted-foreground font-medium">
                          {t.focus.minutes || (state.lang === "bn" ? "মিনিট (Minutes)" : "Minutes")}
                        </label>
                        <div className="flex items-center rounded-xl bg-secondary/40 border border-border/70 p-1 shadow-none focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                          <button
                            type="button"
                            onClick={() => handleCustomMinutesChange(Math.max(0, customMinutes - 5))}
                            disabled={customMinutes <= 0}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-90"
                            aria-label="Decrease minutes"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={customMinutes === 0 && isMinutesFocused ? "" : customMinutes}
                            onFocus={(e) => {
                              setIsMinutesFocused(true);
                              e.target.select();
                            }}
                            onBlur={() => setIsMinutesFocused(false)}
                            onChange={(e) => {
                              const str = e.target.value.replace(/^0+(?=\d)/, "");
                              const val = str === "" ? 0 : parseInt(str, 10);
                              handleCustomMinutesChange(isNaN(val) ? 0 : val);
                            }}
                            className="w-full text-center text-sm font-bold bg-transparent text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleCustomMinutesChange(Math.min(59, customMinutes + 5))}
                            disabled={customMinutes >= 59}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-90"
                            aria-label="Increase minutes"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Start Focus Button & Duration Error */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartFocus}
                    className="btn-primary w-full py-3.5 px-6 rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{t.focus.startFocus}</span>
                  </button>

                  {showDurationError && (
                    <p className="text-red-400 text-xs mt-2 text-center flex items-center justify-center gap-1.5 font-medium animate-shake">
                      <span>•</span> {t.focus.errSelectDuration}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. ACTIVE FOCUS SESSION (Automatic Completion at 00:00)      */}
      {/* ============================================================ */}
      {sessionPhase === "focus_active" && (
        <div className="w-full">
          {/* Top Bar for Active Session - Full width with left arrow & right status pill */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleBackAttempt}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
              title={state.lang === "bn" ? "ফিরে যান" : "Back"}
              aria-label={state.lang === "bn" ? "ফিরে যান" : "Back"}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            </button>

            <div className="flex items-center">
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 shadow-none">
                <span className={`w-2 h-2 rounded-full ${timer.isRunning ? "bg-blue-400 animate-pulse" : "bg-zinc-500"}`} />
                <span>
                  {timer.isRunning
                    ? (state.lang === "bn" ? "চলমান" : "Active")
                    : (state.lang === "bn" ? "পজ করা" : "Paused")}
                </span>
              </div>
            </div>
          </div>

          {/* Centered Timer Content */}
          <div className="max-w-2xl mx-auto">
            <div className="pt-1 pb-4 mb-5 text-center relative flex flex-col items-center">
              {/* Soft Ambient Background Glow - subtle and diffuse with no box shape */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/[0.08] rounded-full blur-3xl pointer-events-none" />

              {/* Task Info */}
              <div className="mb-3.5 relative z-10">
                <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground mb-1 px-2">
                  {selectedTask.name}
                </h2>
                {selectedTask.category && (
                  <span className="inline-block text-xs px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                    {selectedTask.category}
                  </span>
                )}
              </div>

              {/* Redesigned Circular Timer with Floating Realistic Hourglass */}
              <div className="relative z-10">
                <HourglassTimer
                  progress={timer.progress}
                  display={timer.display}
                  isRunning={timer.isRunning}
                  size={220}
                  color="#3B82F6"
                  trackColor="rgba(59, 130, 246, 0.18)"
                />
              </div>

              {/* Controls Row (Play/Pause Button + Compact Distraction Button) */}
              <div className="flex flex-col items-center justify-center mt-5 mb-2 relative z-10 w-full max-w-sm">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={timer.isRunning ? handlePauseAttempt : timer.start}
                    className="w-20 h-12 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all flex items-center justify-center shadow-none active:scale-95 cursor-pointer"
                    title={timer.isRunning ? t.focus.pause : t.focus.resume}
                    aria-label={timer.isRunning ? t.focus.pause : t.focus.resume}
                  >
                    {timer.isRunning ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDistraction((prev) => !prev)}
                    className={`h-12 px-4 rounded-full border transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer active:scale-95 shadow-none ${
                      showDistraction
                        ? "bg-[#223A5E] dark:bg-blue-600 text-white border-[#223A5E] dark:border-blue-500 shadow-none"
                        : "bg-[#F7FAFE] dark:bg-white/5 hover:bg-[#F0F5FD] dark:hover:bg-white/10 text-[#52627A] dark:text-zinc-300 hover:text-[#111827] dark:hover:text-white border-[#DCE5F0] dark:border-white/10"
                    }`}
                    title={t.focus.distracted}
                  >
                    <MessageSquare className={`w-4 h-4 ${showDistraction ? "text-white" : "text-[#5B8DEF] dark:text-blue-400"}`} />
                    <span>{t.focus.distracted}</span>
                    {sessionDistractions.length > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#EAF1FB] dark:bg-blue-500/25 text-[#223A5E] dark:text-blue-300 text-[10px] font-bold">
                        {sessionDistractions.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Inline Distraction Input Box (Expands inline below controls) */}
                {showDistraction && (
                  <div className="mt-4 w-full p-4 rounded-2xl border border-[#DCE5F0] dark:border-blue-500/30 bg-white dark:bg-[#0c1222]/95 shadow-none text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#111827] dark:text-white flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#5B8DEF] dark:text-blue-400" />
                        {t.focus.whatDistracted}
                      </span>
                      {sessionDistractions.length > 0 && (
                        <span className="text-[11px] text-[#52627A] dark:text-zinc-400">
                          {sessionDistractions.length} {t.focus.logged}
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      value={distractionText}
                      onChange={(e) => setDistractionText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogDistraction()}
                      placeholder={t.focus.whatDistracted}
                      className="w-full text-xs py-2.5 px-3 rounded-xl bg-[#F7FAFE] dark:bg-black/40 border border-[#DCE5F0] dark:border-white/10 text-[#111827] dark:text-white placeholder:text-[#8290A5] dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#5B8DEF] dark:focus:border-blue-500 mb-3 transition-colors"
                      autoFocus
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleLogDistraction}
                        disabled={!distractionText.trim()}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#223A5E] hover:bg-[#2E4E7B] dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-none active:scale-98 cursor-pointer"
                      >
                        {t.focus.saveReturn}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDistraction(false);
                          setDistractionText("");
                        }}
                        className="py-2 px-3 rounded-xl bg-[#F3F7FC] hover:bg-[#EAF1FB] dark:bg-white/5 dark:hover:bg-white/10 text-[#52627A] hover:text-[#111827] dark:text-zinc-300 dark:hover:text-white text-xs font-medium border border-[#DCE5F0] dark:border-white/10 transition-colors cursor-pointer"
                      >
                        {t.focus.cancel}
                      </button>
                    </div>

                    {sessionDistractions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#DCE5F0] dark:border-white/10 flex flex-col gap-1.5">
                        {sessionDistractions.map(renderDistractionTag)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. BREAK SELECTION INTERFACE (Shown Post-Session)            */}
      {/* ============================================================ */}
      {sessionPhase === "break_selection" && (
        <div className="max-w-2xl mx-auto">
          <div className="card p-8 text-center relative overflow-hidden border border-[#DCE5F0] dark:border-purple-500/30 bg-white dark:bg-[#0c1424] shadow-none motion-reveal">
            <h2 className="text-base md:text-lg font-semibold text-[#111827] dark:text-white mb-2">
              {t.focus.breakSelectionTitle}
            </h2>

            <p className="text-sm text-[#52627A] dark:text-zinc-400 mb-5 max-w-md mx-auto leading-relaxed">
              {t.focus.breakSelectionSubtitle}
            </p>

            {/* Session Summary Tag */}
            {completedSessionData && (
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#F0F5FD] dark:bg-white/5 border border-[#DCE5F0] dark:border-white/10 text-xs shadow-none mb-7">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-[#111827] dark:text-white">{completedSessionData.name}</span>
                <span className="text-[#8290A5] dark:text-zinc-500">•</span>
                <span className="font-medium text-[#223A5E] dark:text-blue-300">
                  {completedSessionData.minutes}m focused
                </span>
              </div>
            )}

            {/* Break Options Card */}
            <div className="p-6 rounded-2xl bg-[#F7FAFE] dark:bg-white/[0.03] border border-[#DCE5F0] dark:border-white/10 mb-6 text-left">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#223A5E] dark:text-purple-400 flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-[#5B8DEF] dark:text-purple-400" />
                  {t.focus.takeShortBreak}
                </span>
                <span className="text-xs text-[#52627A] dark:text-zinc-400">
                  {state.lang === "bn" ? "পরবর্তী কাজের জন্য রিচার্জ করুন" : "Recharge your mind"}
                </span>
              </div>

              {/* Break Duration Grid: 2m, 5m, 10m, 20m, 30m */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 xs:gap-2.5 mb-2">
                {[2, 5, 10, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleSelectBreak(mins)}
                    className="group relative p-3 rounded-xl border border-[#DCE5F0] dark:border-white/10 hover:border-[#5B8DEF] dark:hover:border-purple-500/50 bg-white dark:bg-black/30 hover:bg-[#F0F5FD] dark:hover:bg-purple-950/20 text-center transition-all hover:scale-[1.03] active:scale-[0.98] focus:outline-none cursor-pointer shadow-none"
                  >
                    <div className="text-lg font-bold text-[#111827] dark:text-foreground group-hover:text-[#223A5E] dark:group-hover:text-purple-300 transition-colors">
                      {mins}
                      <span className="text-xs font-normal text-[#52627A] dark:text-muted-foreground ml-0.5">m</span>
                    </div>
                    <div className="text-[10px] text-[#52627A] dark:text-zinc-400 group-hover:text-[#111827] dark:group-hover:text-zinc-300 mt-0.5">
                      {mins <= 5
                        ? state.lang === "bn" ? "দ্রুত" : "Quick"
                        : mins <= 10
                        ? state.lang === "bn" ? "মাঝারি" : "Short"
                        : state.lang === "bn" ? "দীর্ঘ" : "Deep"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Skip Break */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleSkipBreak}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-[#52627A] hover:text-[#111827] dark:text-zinc-300 dark:hover:text-white bg-[#F3F7FC] hover:bg-[#EAF1FB] dark:bg-white/5 dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none"
              >
                <FastForward className="w-4 h-4 text-[#5B8DEF] dark:text-current" />
                {t.focus.skipBreak}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. ACTIVE BREAK TIMER SCREEN                                 */}
      {/* ============================================================ */}
      {sessionPhase === "break_active" && (
        <div className="w-full">
          {/* Top Bar for Break */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleBackAttempt}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
              title={state.lang === "bn" ? "ফিরে যান" : "Back"}
              aria-label={state.lang === "bn" ? "ফিরে যান" : "Back"}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            </button>

            <div className="flex items-center">
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 shadow-none">
                <span className={`w-2 h-2 rounded-full ${timer.isRunning ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                <span>{state.lang === "bn" ? "বিরতি" : "Break"}</span>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="py-6 sm:py-8 mb-6 text-center relative flex flex-col items-center motion-reveal">
              {/* Emerald Ambient Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/[0.08] rounded-full blur-3xl pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold mb-6 relative z-10">
                <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.focus.breakMode} — {t.focus.restingRecharging}</span>
              </div>

              {/* Break Timer with Emerald Hourglass */}
              <div className="relative z-10">
                <HourglassTimer
                  progress={timer.progress}
                  display={timer.display}
                  isRunning={timer.isRunning}
                  size={220}
                  color="#10b981"
                  trackColor="rgba(16, 185, 129, 0.18)"
                />
              </div>

              <p className="text-sm text-zinc-300 max-w-sm mx-auto my-6 leading-relaxed relative z-10">
                {state.lang === "bn"
                  ? "চোখ বন্ধ করুন, একটু পানি পান করুন এবং শরীরকে বিশ্রাম দিন।"
                  : "Step away from the screen, stretch, hydrate, and breathe."}
              </p>

              {/* Controls: Icon-Only Pause / Resume Break & Skip Break */}
              <div className="flex items-center justify-center gap-4 relative z-10">
                <button
                  onClick={timer.isRunning ? timer.pause : timer.start}
                  className="w-16 h-11 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all flex items-center justify-center shadow-none active:scale-95 cursor-pointer"
                  title={timer.isRunning ? t.focus.pause : t.focus.resume}
                  aria-label={timer.isRunning ? t.focus.pause : t.focus.resume}
                >
                  {timer.isRunning ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleSkipBreak}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-zinc-400 hover:text-white bg-transparent hover:bg-white/5 border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FastForward className="w-4 h-4" /> {t.focus.skipBreak}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. BREAK COMPLETED SCREEN                                    */}
      {/* ============================================================ */}
      {sessionPhase === "break_completed" && (
        <div className="min-h-[50vh] sm:min-h-[55vh] flex items-center justify-center p-4 w-full">
          <div
            className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-center relative overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] shadow-none motion-reveal"
          >
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">
              {t.focus.breakComplete}
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
              {t.focus.breakCompleteSubtitle}
            </p>

            <div className="flex flex-col gap-2.5 w-full max-w-xs mx-auto">
              <button
                onClick={handleStartNewSessionAfterBreak}
                className="btn-primary w-full py-3 px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-xl cursor-pointer shadow-none"
              >
                <span>{t.focus.startNewSession}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSessionPhase("setup");
                  navigateTo("dashboard");
                }}
                className="btn-ghost w-full py-2.5 px-5 text-xs sm:text-sm font-medium rounded-xl text-muted-foreground hover:text-foreground cursor-pointer shadow-none"
              >
                {t.focus.backToDashboard}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* --- MODALS --- */}

      {/* Pause Friction Modal */}
      {pauseAnim.shouldRender && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-transparent"
            onClick={() => setShowPauseModal(false)}
          ></div>
          <div
            className={`focus-dialog relative w-full max-w-md border rounded-2xl p-8 shadow-none text-center ${
              pauseAnim.isExiting ? "motion-exit-reveal" : "motion-reveal"
            }`}
          >
            {pauseAttemptCount === 1 ? (
              <>
                <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">{t.focus.holdOn}</h2>
                <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
                  {t.focus.distractionEnemy}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowPauseModal(false)}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.01] relative overflow-hidden group btn-primary"
                  >
                    <span className="relative z-10">{t.focus.resumeFocus}</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  </button>
                  <button
                    onClick={() => setShowPauseModal(false)}
                    className="w-full py-3 rounded-xl font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm"
                  >
                    {t.focus.stillPause}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">{t.focus.thinkGoals}</h2>
                <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
                  {t.focus.consistencyKey}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowPauseModal(false);
                      setPauseAttemptCount(0);
                    }}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.01] relative overflow-hidden group btn-primary"
                  >
                    <span className="relative z-10">{t.focus.resumeFocus}</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  </button>
                  <button
                    onClick={handleConfirmPause}
                    className="w-full py-3 rounded-xl font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm"
                  >
                    {t.focus.pauseTimer}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Early Exit Motivational Guard Modal (3-Attempt Friction System) */}
      {earlyExitAnim.shouldRender && (() => {
        const currentAttempt = Math.max(1, Math.min(exitAttempts, 3));
        const isExitUnlocked = currentAttempt >= 3;

        const modalTitle =
          currentAttempt === 1
            ? t.focus.attempt1Title
            : currentAttempt === 2
            ? t.focus.attempt2Title
            : t.focus.attempt3Title;

        const modalMessage =
          currentAttempt === 1
            ? t.focus.attempt1Message
            : currentAttempt === 2
            ? t.focus.attempt2Message
            : t.focus.attempt3Message;

        const modalSecondaryText =
          currentAttempt === 1
            ? t.focus.attempt1BtnTry
            : currentAttempt === 2
            ? t.focus.attempt2BtnTry
            : t.focus.attempt3BtnQuit;

        const modalPrimaryText =
          currentAttempt === 1
            ? t.focus.attempt1BtnKeep
            : currentAttempt === 2
            ? t.focus.attempt2BtnKeep
            : t.focus.attempt3BtnKeep;

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-transparent" onClick={handleKeepFocusing}></div>
            <div
              className={`focus-dialog relative w-full max-w-sm border border-amber-500/20 rounded-2xl p-6 shadow-none text-center ${
                earlyExitAnim.isExiting ? "motion-exit-reveal" : "motion-reveal"
              }`}
              style={{
                boxShadow: "none",
              }}
            >
              {/* Attempt Progress Indicator: 3 steps */}
              <div className="flex items-center justify-center gap-2 mb-3.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentAttempt >= 1 ? "w-8 bg-amber-400" : "w-3 bg-white/10"
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentAttempt >= 2 ? "w-8 bg-orange-400" : "w-3 bg-white/10"
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentAttempt >= 3 ? "w-8 bg-red-400" : "w-3 bg-white/10"
                  }`}
                />
              </div>

              {/* Motivational Glowing Icon */}
              <div
                className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${
                  currentAttempt === 1
                    ? "bg-amber-500/10 border border-amber-500/25"
                    : currentAttempt === 2
                    ? "bg-orange-500/10 border border-orange-500/25"
                    : "bg-red-500/10 border border-red-500/25"
                }`}
              >
                {currentAttempt === 1 && <ShieldAlert className="w-6 h-6 text-amber-400" />}
                {currentAttempt === 2 && <Target className="w-6 h-6 text-orange-400" />}
                {currentAttempt >= 3 && <Flame className="w-6 h-6 text-red-400 animate-pulse" />}
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2 leading-tight">
                {modalTitle}
              </h2>

              {/* Message */}
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed px-1">
                {modalMessage}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSecondaryModalAction}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${
                    isExitUnlocked
                      ? "btn-danger"
                      : "btn-outline"
                  }`}
                >
                  {modalSecondaryText}
                </button>

                <button
                  onClick={handleKeepFocusing}
                  className="btn-primary flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold text-white transition-all text-center flex items-center justify-center gap-1.5 shadow-none"
                >
                  {modalPrimaryText}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* History Modal */}
      {historyModalAnim.shouldRender && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistoryModal(false);
          }}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${
            historyModalAnim.isExiting ? "motion-exit-fade" : "motion-overlay"
          }`}
        >
          <div
            className={`w-full max-w-md p-0 rounded-2xl bg-[#121624] dark:bg-[#0c101b] border border-border/80 shadow-none overflow-hidden flex flex-col max-h-[80vh] ${
              historyModalAnim.isExiting ? "motion-exit-reveal" : "motion-reveal"
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between bg-[#151a2b]/60 dark:bg-[#101524]/60">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <span>{t.focus.taskHistory}</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 bg-[#121624] dark:bg-[#0c101b]">
              {taskHistory.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">{t.focus.noHistory}</p>
              ) : (
                <div className="space-y-2">
                  {taskHistory.map((taskItem, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        handleSelectTask({ name: taskItem.name, category: "" });
                        setShowHistoryModal(false);
                      }}
                      className="group w-full px-4 py-3 rounded-xl text-sm transition-all bg-[#181e30] hover:bg-[#202840] border border-border/60 hover:border-blue-500/40 text-foreground flex items-center justify-between cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2 truncate mr-3">
                        <span className="font-medium text-foreground truncate">{taskItem.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          ({taskItem.totalMinutes}m {state.lang === "bn" ? "ফোকাস" : "focused"})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(taskItem.name);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                        title={state.lang === "bn" ? "মুছুন" : "Delete"}
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
