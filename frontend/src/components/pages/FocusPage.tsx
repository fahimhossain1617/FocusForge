"use client";

import { useState, useCallback, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { useFocusTimer } from "../../hooks/useFocusTimer";
import { useTranslation } from "../../hooks/useTranslation";
import confetti from "canvas-confetti";
import { Smartphone, Globe, PartyPopper, MessageCircle, Video, MessageSquare, History, Trash2, X, ArrowLeft, Flame, Sparkles, ShieldAlert, Target, Lock } from "lucide-react";

export default function FocusPage() {
  const { state, startFocusSession, endFocusSession, addDistraction, showToast, navigateTo, registerFocusLock, unregisterFocusLock } = useAppContext();
  const { t } = useTranslation();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ id?: number; name: string; category: string }>({
    name: "",
    category: "",
  });
  const [showDistraction, setShowDistraction] = useState(false);
  const [distractionText, setDistractionText] = useState("");
  const [isDeepFocus, setIsDeepFocus] = useState(false);
  const [showTaskError, setShowTaskError] = useState(false);
  const [showDurationError, setShowDurationError] = useState(false);
  
  // Custom Task History
  type HistoryItem = { name: string; totalMinutes: number };
  const [taskHistory, setTaskHistory] = useState<HistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("focus_task_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0 && typeof parsed[0] === "string") {
          setTaskHistory(parsed.map((name: string) => ({ name, totalMinutes: 0 })));
        } else {
          setTaskHistory(parsed);
        }
      } catch (e) {}
    }
  }, []);

  const saveToHistory = (taskName: string) => {
    if (!taskName.trim()) return;
    setTaskHistory((prev) => {
      const existing = prev.find(t => t.name === taskName);
      const updated = [
        { name: taskName, totalMinutes: existing ? existing.totalMinutes : 0 },
        ...prev.filter(t => t.name !== taskName)
      ].slice(0, 50);
      localStorage.setItem("focus_task_history", JSON.stringify(updated));
      return updated;
    });
  };

  const updateHistoryMinutes = (taskName: string, minutes: number) => {
    setTaskHistory((prev) => {
      const updated = prev.map(t => t.name === taskName ? { ...t, totalMinutes: t.totalMinutes + minutes } : t);
      localStorage.setItem("focus_task_history", JSON.stringify(updated));
      return updated;
    });
  };

  const deleteHistoryItem = (taskName: string) => {
    setTaskHistory((prev) => {
      const updated = prev.filter(t => t.name !== taskName);
      localStorage.setItem("focus_task_history", JSON.stringify(updated));
      return updated;
    });
  };
  
  // Modals & Friction State
  const [pauseAttemptCount, setPauseAttemptCount] = useState(0);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showEarlyExitModal, setShowEarlyExitModal] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<"finish" | "back" | "sidebar" | "switch">("finish");
  const [exitAttempts, setExitAttempts] = useState(0);
  const [targetExitPage, setTargetExitPage] = useState<string>("dashboard");

  const handleWorkComplete = useCallback(() => {
    if (activeSessionId) {
      showToast("Work session complete! Great job.");
    }
  }, [activeSessionId, showToast]);

  const timer = useFocusTimer({ onWorkComplete: handleWorkComplete });

  // Register focus lock with AppContext to intercept sidebar/global navigation while focus is active
  useEffect(() => {
    if (activeSessionId && timer.remaining > 0) {
      registerFocusLock((targetPage: string) => {
        timer.pause();
        setTargetExitPage(targetPage);
        setPendingExitAction("sidebar");
        setShowEarlyExitModal(true);
        setExitAttempts((prev) => Math.min(prev + 1, 3));
        return false; // blocks immediate navigation
      });
    } else {
      unregisterFocusLock();
    }

    return () => {
      unregisterFocusLock();
    };
  }, [activeSessionId, timer.remaining, registerFocusLock, unregisterFocusLock]);

  // App Switch / Tab Switch Detection: If user leaves app and comes back, trigger motivation modal
  useEffect(() => {
    if (!activeSessionId) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && timer.remaining > 0) {
        // User returned to the app from another tab/window
        timer.pause();
        setPendingExitAction("switch");
        setShowEarlyExitModal(true);
        setExitAttempts((prev) => Math.min(prev + 1, 3));
        showToast(t.focus.appSwitchNotice, "info");
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeSessionId && timer.remaining > 0) {
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
  }, [activeSessionId, timer.remaining, t.focus.appSwitchNotice, showToast]);

  const handleSelectTask = (task: { id: number; name: string; category: string }) => {
    setSelectedTask(task);
    setShowTaskError(false);
  };

  const handleStartFocus = () => {
    const hasNoTask = !selectedTask.name;
    const hasNoDuration = !timer.workMinutes || timer.workMinutes <= 0;

    if (hasNoTask || hasNoDuration) {
      setShowTaskError(hasNoTask);
      setShowDurationError(hasNoDuration);
      return;
    }

    setShowTaskError(false);
    setShowDurationError(false);
    setExitAttempts(0);
    
    // If it's a custom task (no id), save it to history
    if (!selectedTask.id) {
      saveToHistory(selectedTask.name);
    }
    
    const sessionId = startFocusSession(selectedTask.name, selectedTask.category, selectedTask.id, timer.workMinutes);
    setActiveSessionId(sessionId);
    timer.start();
  };

  const handlePauseAttempt = () => {
    setShowPauseModal(true);
    setPauseAttemptCount(prev => prev + 1);
  };

  const handleConfirmPause = () => {
    timer.pause();
    setShowPauseModal(false);
  };

  // Finish Guard: Only allow natural finish if timer has finished (remaining <= 0)
  const handleFinishAttempt = () => {
    if (timer.remaining > 0) {
      timer.pause();
      setPendingExitAction("finish");
      setShowEarlyExitModal(true);
      setExitAttempts((prev) => Math.min(prev + 1, 3));
      return;
    }

    timer.pause();
    setShowFinishModal(true);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#7C3AED', '#9333ea', '#ffffff', '#FFD700', '#10b981']
    });
  };

  // Back Button Guard: Prompt with 3-attempt friction system
  const handleBackAttempt = () => {
    if (activeSessionId && timer.remaining > 0) {
      timer.pause();
      setTargetExitPage("dashboard");
      setPendingExitAction("back");
      setShowEarlyExitModal(true);
      setExitAttempts((prev) => Math.min(prev + 1, 3));
      return;
    }

    if (activeSessionId) {
      confirmFinishSession();
    }
    navigateTo('dashboard');
  };

  const handleKeepFocusing = () => {
    setShowEarlyExitModal(false);
    timer.start();
  };

  // 3-Attempt Exit Friction Handler:
  // 1st and 2nd attempt: Exit is strictly BLOCKED.
  // 3rd attempt: Exit is unlocked and user is permitted to quit early.
  const handleSecondaryModalAction = () => {
    if (exitAttempts < 3) {
      // Advance attempt count and keep user in the zone
      const nextAttempt = Math.min(exitAttempts + 1, 3);
      setExitAttempts(nextAttempt);
      showToast(
        state.lang === 'bn'
          ? `সতর্কবার্তা: অন্তত ৩ বার চেষ্টার পরই সেশন ছাড়া সম্ভব (${nextAttempt}/৩)!`
          : `Notice: Early exit requires 3 attempts (${nextAttempt}/3)!`,
        'info'
      );
      return;
    }

    // 3rd Attempt reached: Permit Early Exit
    if (activeSessionId) {
      endFocusSession(activeSessionId, timer.elapsedMinutes, false);
      showToast(
        state.lang === 'bn'
          ? `ফোকাস সমাপ্ত হয়েছে (${timer.elapsedMinutes} মিনিট সেভ হয়েছে)`
          : `Focus ended early (${timer.elapsedMinutes}m recorded)`,
        'info'
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
    setSelectedTask({ name: "", category: "" });

    if (pendingExitAction === "back" || pendingExitAction === "sidebar") {
      navigateTo(targetExitPage || 'dashboard');
    }
  };

  const confirmFinishSession = () => {
    if (activeSessionId) {
      endFocusSession(activeSessionId, timer.elapsedMinutes, true);
      showToast(`Session completed: ${timer.elapsedMinutes}m of ${selectedTask.name}`);
      if (!selectedTask.id) {
        updateHistoryMinutes(selectedTask.name, timer.elapsedMinutes);
      }
    }
    unregisterFocusLock();
    setActiveSessionId(null);
    timer.reset();
    setIsDeepFocus(false);
    setShowFinishModal(false);
    setExitAttempts(0);
    setPauseAttemptCount(0);
    setSelectedTask({ name: "", category: "" });
  };

  const handleResetAttempt = () => {
    timer.pause();
    setShowResetModal(true);
  };

  const confirmReset = () => {
    timer.reset();
    setShowResetModal(false);
    setPauseAttemptCount(0);
    setSelectedTask({ name: "", category: "" });
  };

  const handleLogDistraction = () => {
    if (!distractionText.trim() || !activeSessionId) return;
    addDistraction(activeSessionId, distractionText.trim());
    setDistractionText("");
    setShowDistraction(false);
    showToast("Distraction logged. Stay focused.", "info");
  };

  // Get current session distractions
  const currentSession = activeSessionId
    ? state.focusSessions.find((s) => s.id === activeSessionId)
    : null;
  const sessionDistractions = currentSession?.distractions || [];

  const renderDistractionTag = (distraction: { id: string, content: string }) => {
    const text = distraction.content.toLowerCase();
    let Icon = Globe; 
    if (text.includes("facebook") || text.includes("fb")) Icon = MessageCircle;
    else if (text.includes("instagram") || text.includes("ig")) Icon = Smartphone;
    else if (text.includes("youtube") || text.includes("yt")) Icon = Video;
    else if (text.includes("twitter") || text.includes(" x ") || text.match(/^x$/i)) Icon = MessageSquare;
    else if (text.includes("reddit") || text.includes("tiktok") || text.includes("phone")) Icon = Smartphone;

    return (
      <div key={distraction.id} className="text-xs px-3 py-2 rounded-lg flex items-center gap-2 border border-white/5" style={{ color: "var(--color-text-muted)", background: "var(--color-bg-secondary)" }}>
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--color-purple-primary)" }} />
        <span>{distraction.content}</span>
      </div>
    );
  };

  // Timer ring SVG
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - timer.progress);

  // Deep Focus Mode overlay
  const renderDeepFocus = () => {
    if (!isDeepFocus || !activeSessionId) return null;
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center fade-in" style={{ background: "rgba(9, 9, 15, 0.98)" }}>
        {/* Exit button */}
        <button
          onClick={() => setIsDeepFocus(false)}
          className="absolute top-6 right-6 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ color: "var(--color-text-muted)", background: "var(--color-bg-card)" }}
        >
          {t.focus.exitDeepFocus}
        </button>

        {/* Timer */}
        <div className="relative mb-6">
          <svg width="200" height="200" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-bg-card)" strokeWidth="3" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={timer.isWork ? "var(--color-purple-primary)" : "var(--color-success)"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="timer-circle"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
              {timer.display}
            </span>
            <span className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              {timer.isWork ? t.focus.focusText : t.focus.breakText}
            </span>
          </div>
        </div>

        <p className="text-lg font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          {selectedTask.name}
        </p>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-8 relative z-[85]">
          {timer.isRunning ? (
            <button onClick={handlePauseAttempt} className="btn-secondary">{t.focus.pause}</button>
          ) : (
            <button onClick={timer.start} className="btn-primary">
              {timer.remaining < timer.total ? t.focus.resume : t.focus.start}
            </button>
          )}
          <button onClick={handleFinishAttempt} className="btn-ghost">{t.focus.finish}</button>
        </div>

        {/* Distraction capture */}
        <button
          onClick={() => setShowDistraction(true)}
          className="text-sm px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5"
          style={{ color: "var(--color-text-muted)", background: "var(--color-bg-card)" }}
        >
          <MessageSquare className="w-3.5 h-3.5" /> {t.focus.distracted}
        </button>

        {showDistraction && (
          <div className="mt-4 w-full max-w-sm">
            <div className="card p-4">
              <input
                type="text"
                value={distractionText}
                onChange={(e) => setDistractionText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogDistraction()}
                placeholder="What distracted you?"
                className="mb-3 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleLogDistraction} className="btn-primary text-sm flex-1">Save & Return</button>
                <button onClick={() => { setShowDistraction(false); setDistractionText(""); }} className="btn-ghost text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {sessionDistractions.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {sessionDistractions.map(renderDistractionTag)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in max-w-2xl">
      {renderDeepFocus()}
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackAttempt}
            className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 group"
            title={t.focus.backToDashboard}
            aria-label={t.focus.backToDashboard}
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {t.focus.title}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {activeSessionId ? t.focus.subtitleActive : t.focus.subtitleInactive}
            </p>
          </div>
        </div>
      </div>

      {!activeSessionId ? (
        <>
          {/* Task Selection */}
          <div className="card p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {t.focus.whatToFocus}
              </h3>
              <button 
                onClick={() => setShowHistoryModal(true)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                title="View History"
              >
                <History className="w-4 h-4 text-zinc-400 hover:text-white" />
              </button>
            </div>
            
            {taskHistory.length > 0 && (
              <div className="space-y-1.5 mb-4">
                <button
                  onClick={() => handleSelectTask({ id: undefined as any, name: taskHistory[0].name, category: "" })}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                  style={{
                    background: selectedTask.name === taskHistory[0].name ? "var(--color-purple-muted)" : "var(--color-bg-secondary)",
                    color: selectedTask.name === taskHistory[0].name ? "var(--color-purple-bright)" : "var(--color-text-secondary)",
                    borderWidth: 1,
                    borderColor: selectedTask.name === taskHistory[0].name ? "var(--color-border-active)" : "transparent",
                  }}
                >
                  {taskHistory[0].name}
                  <span className="text-xs ml-2 opacity-50">({taskHistory[0].totalMinutes}m focused)</span>
                </button>
              </div>
            )}

            {/* Or custom */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={selectedTask.id ? "" : selectedTask.name}
                onChange={(e) => { setSelectedTask({ name: e.target.value, category: "" }); setShowTaskError(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    document.getElementById("duration-input")?.focus();
                  }
                }}
                placeholder={t.focus.orCustomTask}
                className="text-sm"
              />
            </div>
          </div>

          {/* Timer Presets */}
          <div className="card p-5 mb-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
              {t.focus.sessionDuration}
            </h3>
            <div className="flex items-center gap-2">
              {[25, 50, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => { timer.setPreset(mins); setShowDurationError(false); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: timer.workMinutes === mins ? "var(--color-purple-muted)" : "var(--color-bg-secondary)",
                    color: timer.workMinutes === mins ? "var(--color-purple-bright)" : "var(--color-text-secondary)",
                  }}
                >
                  {mins}m
                </button>
              ))}
              <div className="relative flex items-center">
                <input
                  id="duration-input"
                  type="number"
                  value={timer.workMinutes || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    timer.setPreset(val === "" ? 0 : parseInt(val));
                    if (val !== "" && parseInt(val) > 0) setShowDurationError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleStartFocus();
                    }
                  }}
                  placeholder={t.focus.setDuration}
                  className="input-field !w-36 text-sm text-center py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={1}
                  max={180}
                />
                {!!timer.workMinutes && (
                  <span className="absolute right-3 text-xs pointer-events-none" style={{ color: "var(--color-text-muted)" }}>min</span>
                )}
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartFocus}
            className="btn-primary w-full text-base py-4"
          >
            {t.focus.startFocus}
          </button>
          
          {showTaskError && (
            <p className="text-red-500 text-sm mt-2 text-center fade-in font-medium">
              {t.focus.errSelectTask}
            </p>
          )}
          
          {showDurationError && (
            <p className="text-red-500 text-sm mt-2 text-center fade-in font-medium">
              {t.focus.errSelectDuration}
            </p>
          )}
        </>
      ) : (
        <>
          {/* Active Focus Session */}
          <div className="card p-8 mb-6 text-center">
            {/* Timer Ring */}
            <div className="relative inline-block mb-4">
              <svg width="180" height="180" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-bg-secondary)" strokeWidth="3" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke={timer.isWork ? "var(--color-purple-primary)" : "var(--color-success)"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="timer-circle"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                  {timer.display}
                </span>
                <span className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {timer.isWork ? t.focus.focusText : t.focus.breakText}
                </span>
              </div>
            </div>

            <p className="text-base font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
              {selectedTask.name}
            </p>
            {selectedTask.category && (
              <p className="text-xs mb-6" style={{ color: "var(--color-text-muted)" }}>{selectedTask.category}</p>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mb-6 relative z-10">
              {timer.isRunning ? (
                <button onClick={handlePauseAttempt} className="btn-secondary px-6">{t.focus.pause}</button>
              ) : (
                <button onClick={timer.start} className="btn-primary px-6">
                  {timer.remaining < timer.total ? t.focus.resume : t.focus.start}
                </button>
              )}
              <button onClick={handleResetAttempt} className="btn-ghost">{t.focus.reset}</button>
              <button onClick={handleFinishAttempt} className="btn-ghost" style={{ color: "var(--color-success)" }}>
                {t.focus.finish}
              </button>
            </div>

            {/* Deep Focus Toggle */}
            <button
              onClick={() => setIsDeepFocus(true)}
              className="text-xs font-medium px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
              style={{ color: "var(--color-purple-bright)", background: "var(--color-purple-muted)" }}
            >
              <Lock className="w-3.5 h-3.5" /> {t.focus.enterDeepFocus}
            </button>
          </div>

          {/* Distraction Capture */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                <MessageSquare className="w-4 h-4 text-purple-400" /> {t.focus.distracted}
              </h3>
              <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                {sessionDistractions.length} {t.focus.logged}
              </span>
            </div>

            {showDistraction ? (
              <div>
                <input
                  type="text"
                  value={distractionText}
                  onChange={(e) => setDistractionText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogDistraction()}
                  placeholder={t.focus.whatDistracted}
                  className="mb-3 text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleLogDistraction} className="btn-primary text-sm flex-1">
                    {t.focus.saveReturn}
                  </button>
                  <button onClick={() => { setShowDistraction(false); setDistractionText(""); }} className="btn-ghost text-sm">
                    {t.focus.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDistraction(true)}
                className="w-full text-sm py-3 rounded-xl transition-colors"
                style={{ color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)" }}
              >
                {t.focus.logDistraction}
              </button>
            )}

            {sessionDistractions.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {sessionDistractions.map(renderDistractionTag)}
              </div>
            )}
          </div>
        </>
      )}

      {/* --- MODALS --- */}
      
      {/* Pause Friction Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPauseModal(false)}></div>
          <div className="focus-dialog relative w-full max-w-md border rounded-2xl p-8 shadow-2xl text-center" style={{ backdropFilter: "blur(20px)" }}>
            {pauseAttemptCount === 1 ? (
              <>
                <h2 className="text-xl font-bold text-white mb-3">{t.focus.holdOn}</h2>
                <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
                  {t.focus.distractionEnemy}
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setShowPauseModal(false)} className="w-full py-3 rounded-xl font-bold text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] relative overflow-hidden group" style={{ background: "linear-gradient(135deg, var(--color-purple-primary) 0%, #9333ea 100%)" }}>
                    <span className="relative z-10">{t.focus.resumeFocus}</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  </button>
                  <button onClick={() => setShowPauseModal(false)} className="w-full py-3 rounded-xl font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm">
                    {t.focus.stillPause}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-3">{t.focus.thinkGoals}</h2>
                <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
                  {t.focus.consistencyKey}
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => { setShowPauseModal(false); setPauseAttemptCount(0); }} className="w-full py-3 rounded-xl font-bold text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] relative overflow-hidden group" style={{ background: "linear-gradient(135deg, var(--color-purple-primary) 0%, #9333ea 100%)" }}>
                    <span className="relative z-10">{t.focus.resumeFocus}</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  </button>
                  <button onClick={handleConfirmPause} className="w-full py-3 rounded-xl font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm">
                    {t.focus.pauseTimer}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Early Exit Motivational Guard Modal (3-Attempt Friction System) */}
      {showEarlyExitModal && (() => {
        const currentAttempt = Math.max(1, Math.min(exitAttempts, 3));
        const isExitUnlocked = currentAttempt >= 3;

        const modalTitle = currentAttempt === 1 
          ? t.focus.attempt1Title 
          : currentAttempt === 2 
          ? t.focus.attempt2Title 
          : t.focus.attempt3Title;

        const modalMessage = currentAttempt === 1 
          ? t.focus.attempt1Message 
          : currentAttempt === 2 
          ? t.focus.attempt2Message 
          : t.focus.attempt3Message;

        const modalSecondaryText = currentAttempt === 1 
          ? t.focus.attempt1BtnTry 
          : currentAttempt === 2 
          ? t.focus.attempt2BtnTry 
          : t.focus.attempt3BtnQuit;

        const modalPrimaryText = currentAttempt === 1 
          ? t.focus.attempt1BtnKeep 
          : currentAttempt === 2 
          ? t.focus.attempt2BtnKeep 
          : t.focus.attempt3BtnKeep;

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={handleKeepFocusing}></div>
            <div 
              className="focus-dialog relative w-full max-w-sm border border-amber-500/20 rounded-2xl p-6 shadow-2xl text-center"
              style={{ 
                background: "rgba(18, 17, 28, 0.96)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 25px rgba(245, 158, 11, 0.12)"
              }}
            >
              {/* Attempt Progress Indicator: 3 steps */}
              <div className="flex items-center justify-center gap-2 mb-3.5">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${currentAttempt >= 1 ? 'w-8 bg-amber-400' : 'w-3 bg-white/10'}`} />
                <div className={`h-1.5 rounded-full transition-all duration-300 ${currentAttempt >= 2 ? 'w-8 bg-orange-400' : 'w-3 bg-white/10'}`} />
                <div className={`h-1.5 rounded-full transition-all duration-300 ${currentAttempt >= 3 ? 'w-8 bg-red-400' : 'w-3 bg-white/10'}`} />
              </div>

              {/* Motivational Glowing Icon */}
              <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${
                currentAttempt === 1 
                  ? 'bg-amber-500/10 border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : currentAttempt === 2
                  ? 'bg-orange-500/10 border border-orange-500/25 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                  : 'bg-red-500/10 border border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
              }`}>
                {currentAttempt === 1 && <ShieldAlert className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />}
                {currentAttempt === 2 && <Target className="w-6 h-6 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />}
                {currentAttempt >= 3 && <Flame className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />}
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg font-bold text-white mb-2 leading-tight">
                {modalTitle}
              </h2>

              {/* Message */}
              <p className="text-xs sm:text-sm text-zinc-300 mb-6 leading-relaxed px-1">
                {modalMessage}
              </p>

              {/* Action Buttons: Clean, Balanced Side-by-Side */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSecondaryModalAction}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-center border ${
                    isExitUnlocked 
                      ? 'text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                      : 'text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  {modalSecondaryText}
                </button>

                <button
                  onClick={handleKeepFocusing}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all shadow-[0_0_15px_rgba(124,58,237,0.35)] hover:shadow-[0_0_22px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 text-center flex items-center justify-center gap-1.5"
                  style={{ background: "linear-gradient(135deg, var(--color-purple-primary) 0%, #9333ea 100%)" }}
                >
                  {modalPrimaryText}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Finish Session Celebration Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
          <div className="focus-dialog focus-dialog--success relative w-full max-w-md border rounded-2xl p-8 shadow-2xl text-center" style={{ backdropFilter: "blur(20px)" }}>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <PartyPopper className="w-8 h-8 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t.focus.incredibleWork}</h2>
            <p className="text-sm text-zinc-300 mb-6">{t.focus.maintainedFocus}</p>
            <button onClick={confirmFinishSession} className="w-full py-3 rounded-xl font-bold text-white transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 relative overflow-hidden group" style={{ background: "linear-gradient(135deg, var(--color-purple-primary) 0%, #9333ea 100%)" }}>
              <span className="relative z-10">{t.focus.awesome}</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowResetModal(false)}></div>
          <div className="focus-dialog relative w-full max-w-sm border rounded-2xl p-6 shadow-2xl text-center" style={{ backdropFilter: "blur(20px)" }}>
            <h2 className="text-lg font-bold text-white mb-2">{t.focus.resetSession}</h2>
            <p className="text-sm text-zinc-300 mb-6">{t.focus.resetWarning}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetModal(false)} className="flex-1 py-2.5 rounded-xl font-medium text-white bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm">
                {t.focus.cancel}
              </button>
              <button onClick={confirmReset} className="flex-1 py-2.5 rounded-xl font-medium text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                {t.focus.confirmReset}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card w-full max-w-md p-0 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" /> {t.focus.taskHistory}
              </h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {taskHistory.length === 0 ? (
                <p className="text-center text-zinc-500 text-sm py-8">{t.focus.noHistory}</p>
              ) : (
                <div className="space-y-2">
                  {taskHistory.map((taskItem, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleSelectTask({ id: undefined as any, name: taskItem.name, category: "" });
                          setShowHistoryModal(false);
                        }}
                        className="history-task-item flex-1 text-left px-4 py-3 rounded-xl text-sm transition-all bg-[#101019] hover:bg-[#1a1a24] text-zinc-300 hover:text-white border border-white/5"
                      >
                        {taskItem.name} <span className="text-xs opacity-50 ml-2">({taskItem.totalMinutes}m focused)</span>
                      </button>
                      <button 
                        onClick={() => deleteHistoryItem(taskItem.name)}
                        className="p-3 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors border border-red-500/10"
                        title="Delete"
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
