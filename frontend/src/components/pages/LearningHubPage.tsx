"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Star,
  ArrowLeft,
  X,
  Search,
  BookOpen,
  Flame
} from "lucide-react";
import { useAnimateExit } from "../../hooks/useAnimateExit";
import confetti from "canvas-confetti";

function formatHoursMins(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getStreak(logs: { date: string }[]): number {
  if (logs.length === 0) return 0;

  const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let streak = 0;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const lastLogDate = new Date(sorted[0].date);
  lastLogDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((currentDate.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 1) {
    return 0; // Streak broken
  }

  let checkDate = new Date(lastLogDate);
  for (const log of sorted) {
    const logDate = new Date(log.date);
    logDate.setHours(0, 0, 0, 0);

    if (logDate.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (logDate.getTime() < checkDate.getTime()) {
      break;
    }
  }

  return streak;
}

function getGapDays(logs: { date: string }[]): number {
  if (logs.length === 0) return 0;
  const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastLogDate = new Date(sorted[0].date);
  lastLogDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));
}

export default function LearningHubPage() {
  const {
    state,
    addLearningFolder,
    addLearningLog,
    deleteLearningFolder,
    deleteLearningLog,
    toggleLearningFolderCompletion,
    showToast,
  } = useAppContext();
  const { requireAuth } = useAuth();
  const { t } = useTranslation();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const modalInputRef = useRef<HTMLInputElement>(null);

  // Form state for daily log
  const [watchHours, setWatchHours] = useState<number | "">("");
  const [watchMins, setWatchMins] = useState<number | "">("");
  const [practiceHours, setPracticeHours] = useState<number | "">("");
  const [practiceMins, setPracticeMins] = useState<number | "">("");
  const [topics, setTopics] = useState("");
  const [practiceDetails, setPracticeDetails] = useState("");
  const [blockers, setBlockers] = useState("");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      const storedFolderId = sessionStorage.getItem("focusforge_learning_open_folder");
      if (storedFolderId) {
        setSelectedFolderId(storedFolderId);
        sessionStorage.removeItem("focusforge_learning_open_folder");
      }

      const handleOpenFolder = (e: any) => {
        if (e.detail?.folderId) {
          setSelectedFolderId(e.detail.folderId);
        }
      };

      window.addEventListener("focusforge:open_learning_folder", handleOpenFolder);
      return () => window.removeEventListener("focusforge:open_learning_folder", handleOpenFolder);
    }
  }, []);

  useEffect(() => {
    if (isCreateModalOpen) {
      setTimeout(() => {
        modalInputRef.current?.focus();
      }, 50);
    }
  }, [isCreateModalOpen]);

  const triggerCelebrationConfetti = () => {
    try {
      confetti({
        particleCount: 90,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.65 },
        colors: ["#3B82F6", "#60A5FA", "#38BDF8", "#FFD700", "#10B981", "#EC4899", "#8B5CF6"],
        zIndex: 10001,
      });

      confetti({
        particleCount: 90,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.65 },
        colors: ["#3B82F6", "#60A5FA", "#38BDF8", "#FFD700", "#10B981", "#EC4899", "#8B5CF6"],
        zIndex: 10001,
      });

      setTimeout(() => {
        confetti({
          particleCount: 70,
          spread: 100,
          origin: { x: 0.5, y: 0.5 },
          colors: ["#3B82F6", "#60A5FA", "#FFD700", "#FFFFFF", "#38BDF8"],
          zIndex: 10001,
        });
      }, 180);
    } catch {
      // Ignore if confetti fails
    }
  };

  const [completedModalData, setCompletedModalData] = useState<{
    id: string;
    name: string;
    totalMins: number;
    streak: number;
  } | null>(null);
  const [lastCompletedModalData, setLastCompletedModalData] = useState<typeof completedModalData>(null);

  useEffect(() => {
    if (completedModalData) {
      setLastCompletedModalData(completedModalData);
      triggerCelebrationConfetti();
    }
  }, [completedModalData]);

  const activeCompletedData = completedModalData || lastCompletedModalData;
  const completionModalAnim = useAnimateExit({ isOpen: Boolean(completedModalData), durationMs: 200 });

  const handleCreateFolder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      modalInputRef.current?.focus();
      return;
    }

    requireAuth(() => {
      addLearningFolder(trimmed);
      setNewFolderName("");
      setIsCreateModalOpen(false);
      showToast(t.learningHub.toastFolderCreated);
    }, "learning");
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderId) return;

    const watchTotal = (Number(watchHours) || 0) * 60 + (Number(watchMins) || 0);
    const practiceTotal = (Number(practiceHours) || 0) * 60 + (Number(practiceMins) || 0);

    if (watchTotal === 0 && practiceTotal === 0) {
      showToast(t.learningHub.toastEnterTime, "error");
      return;
    }

    requireAuth(() => {
      addLearningLog({
        folderId: selectedFolderId,
        date: new Date().toISOString().split("T")[0],
        watchMinutes: watchTotal,
        practiceMinutes: practiceTotal,
        practiceDetails: practiceDetails.trim(),
        topics: topics.trim(),
        blockers: blockers.trim(),
      });

      setWatchHours("");
      setWatchMins("");
      setPracticeHours("");
      setPracticeMins("");
      setTopics("");
      setPracticeDetails("");
      setBlockers("");
      showToast(t.learningHub.toastLogAdded);
    }, "learning");
  };

  // Active folder details
  const activeFolder = state.learningFolders.find((f) => f.id === selectedFolderId);
  const activeFolderLogs = useMemo(() => {
    if (!selectedFolderId) return [];
    return state.learningLogs
      .filter((l) => l.folderId === selectedFolderId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.learningLogs, selectedFolderId]);

  // Analytics for active folder
  const activeTotalWatchMins = activeFolderLogs.reduce((acc, log) => acc + log.watchMinutes, 0);
  const activeTotalPracticeMins = activeFolderLogs.reduce((acc, log) => acc + log.practiceMinutes, 0);
  const activeTotalMins = activeTotalWatchMins + activeTotalPracticeMins;
  const activeStreak = getStreak(activeFolderLogs);
  const activeGapDays = getGapDays(activeFolderLogs);

  // Filter folders by search query
  const filteredFolders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return state.learningFolders;

    return state.learningFolders.filter((folder) => {
      if (folder.name.toLowerCase().includes(q)) return true;
      const folderLogs = state.learningLogs.filter((l) => l.folderId === folder.id);
      return folderLogs.some(
        (log) =>
          log.topics.toLowerCase().includes(q) ||
          log.practiceDetails.toLowerCase().includes(q)
      );
    });
  }, [state.learningFolders, state.learningLogs, searchQuery]);

  // Map each folder to its topics & stats for cards
  const folderStatsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        totalMins: number;
        watchMins: number;
        practiceMins: number;
        streak: number;
        topicsList: string[];
      }
    >();

    state.learningFolders.forEach((folder) => {
      const logs = state.learningLogs.filter((l) => l.folderId === folder.id);
      const watch = logs.reduce((sum, l) => sum + l.watchMinutes, 0);
      const practice = logs.reduce((sum, l) => sum + l.practiceMinutes, 0);
      const streak = getStreak(logs);

      // Collect unique topics
      const topicSet = new Set<string>();
      logs.forEach((l) => {
        if (l.topics) {
          l.topics
            .split(/[,;\n]+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .forEach((t) => topicSet.add(t));
        }
      });

      map.set(folder.id, {
        totalMins: watch + practice,
        watchMins: watch,
        practiceMins: practice,
        streak,
        topicsList: Array.from(topicSet),
      });
    });

    return map;
  }, [state.learningFolders, state.learningLogs]);

  return (
    <div className="motion-page max-w-6xl mx-auto w-full pb-14">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 1: MAIN INTERFACE (SIMPLIFIED CLEAN NAVY CARD GRID)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {!selectedFolderId && (
        <div className="flex flex-col gap-5">
          {/* Header Row: Title + Search Bar + New Skill Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span>{t.learningHub.title}</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-normal">
                {t.learningHub.subtitle}
              </p>
            </div>

            {/* Actions: Search bar & New Skill Button */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Standardized Search Bar */}
              <div className="relative flex-1 sm:w-60 md:w-64 flex items-center h-9 sm:h-10">
                <Search className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.learningHub.searchPlaceholder}
                  style={{ paddingLeft: "2.25rem", paddingRight: searchQuery ? "2rem" : "0.85rem" }}
                  className="w-full h-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-black/5 dark:bg-white/5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-blue-500 transition-colors shadow-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center justify-center"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* New Skill Button */}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-4.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-none transition-all active:scale-[0.98] cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2.4} />
                <span>{t.learningHub.newSkillBtn}</span>
              </button>
            </div>
          </div>

          {/* Cards Grid or Empty State */}
          {state.learningFolders.length === 0 ? (
            <div className="card p-10 min-h-[360px] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                {t.learningHub.noFolders}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-5">
                {t.learningHub.noFoldersDesc}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.learningHub.createFolder}</span>
              </button>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="card p-8 text-center flex flex-col items-center justify-center min-h-[260px]">
              <Search className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">
                {t.learningHub.noSearchMatches}
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-blue-500 hover:underline mt-2 cursor-pointer"
              >
                {state.lang === "bn" ? "সার্চ ফিল্টার মুছুন" : "Clear search"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFolders.map((folder) => {
                const stats = folderStatsMap.get(folder.id) || {
                  totalMins: 0,
                  watchMins: 0,
                  practiceMins: 0,
                  streak: 0,
                  topicsList: [],
                };
                // Up to 6 topics (even number as requested)
                const displayTopics = stats.topicsList.slice(0, 6);

                return (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="relative rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-none bg-white dark:bg-[#111827] border-slate-200 dark:border-white/[0.08] hover:border-slate-300/80 dark:hover:border-white/15"
                  >
                    {/* Top Row: Topic Name & Creation Date (Left) | Delete & Streak (Right) */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        {/* Title & Created Date */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3
                              className="text-base font-bold text-foreground truncate"
                              title={folder.name}
                            >
                              {folder.name}
                            </h3>
                            {folder.completed && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{t.learningHub.completed}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(folder.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Right Side: Delete Button & Streak (No Box on Streak) */}
                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {stats.streak > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
                              <Flame className="w-3.5 h-3.5" />
                              <span>
                                {stats.streak} {t.learningHub.days}
                              </span>
                            </span>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(t.learningHub.deleteFolderConfirm)) {
                                deleteLearningFolder(folder.id);
                                showToast(t.learningHub.toastFolderDeleted);
                              }
                            }}
                            title={t.learningHub.deleteFolder}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Direct Time Metrics: Left and Right aligned without inner box */}
                      <div className="my-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-muted-foreground text-[11px] block">
                            {state.lang === "bn"
                              ? "টিউশন / অনলাইন ক্লাস"
                              : "Tuition / Online Classes"}
                          </span>
                          <span className="text-sm font-bold text-foreground mt-0.5 block">
                            {formatHoursMins(stats.watchMins)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-[11px] block">
                            {state.lang === "bn" ? "সেলফ লার্নিং" : "Self Learning"}
                          </span>
                          <span className="text-sm font-bold text-blue-400 mt-0.5 block">
                            {formatHoursMins(stats.practiceMins)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: 6 Topics Grid without dividing line */}
                    <div className="pt-1 mt-0.5">
                      {displayTopics.length > 0 ? (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {displayTopics.map((topic, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground truncate"
                              title={topic}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span className="truncate">{topic}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 italic">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 shrink-0" />
                          <span>
                            {state.lang === "bn"
                              ? "লগ যুক্ত করলে টপিক দেখা যাবে"
                              : "Click to add your first daily log"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 2: SKILL DETAIL INTERFACE (IMAGE 2 REFINED)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedFolderId && activeFolder && (
        <div className="flex flex-col gap-4">
          {/* Top Bar: Back to Skills Button */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className="inline-flex items-center justify-center w-9 h-9 -ml-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-colors cursor-pointer"
              aria-label={t.learningHub.backToSkills}
              title={t.learningHub.backToSkills}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Skill Title & Actions Header */}
          <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {activeFolder.name}
                </h1>
                {activeFolder.completed && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.learningHub.completed}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t.learningHub.created} {new Date(activeFolder.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Actions: Mark Complete & Delete Skill */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  toggleLearningFolderCompletion(activeFolder.id);
                  if (!activeFolder.completed) {
                    setCompletedModalData({
                      id: activeFolder.id,
                      name: activeFolder.name,
                      totalMins: activeTotalMins,
                      streak: activeStreak,
                    });
                  }
                }}
                className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl border font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFolder.completed
                    ? "border-slate-300 dark:border-white/10 text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5"
                    : "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {activeFolder.completed
                    ? t.learningHub.markIncomplete
                    : t.learningHub.markComplete}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t.learningHub.deleteFolderConfirm)) {
                    deleteLearningFolder(activeFolder.id);
                    setSelectedFolderId(null);
                    showToast(t.learningHub.toastFolderDeleted);
                  }
                }}
                title={t.learningHub.deleteFolder}
                className="p-2 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Time & Streak Overview (Status Active removed as instructed, clean hours and split) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Time Spent Card (Clean hours display + Self Learning vs Tuition breakdown) */}
            <div className="card p-5 md:col-span-2 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.learningHub.timeSpent}
                </span>
                {activeGapDays >= 2 && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-md">
                    <AlertTriangle className="w-3 h-3" />
                    <span>
                      {activeGapDays} {t.learningHub.days} {t.learningHub.inactivityGap}
                    </span>
                  </span>
                )}
              </div>

              {/* Total Hours Big Text */}
              <div className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                {formatHoursMins(activeTotalMins)}
              </div>

              {/* Clean Breakdown without progressing bar */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {t.learningHub.selfLearning}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-blue-500 dark:text-blue-400">
                    {formatHoursMins(activeTotalPracticeMins)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {t.learningHub.tuition}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-indigo-400">
                    {formatHoursMins(activeTotalWatchMins)}
                  </span>
                </div>
              </div>
            </div>

            {/* Streak Widget: Compact, cleanly tucked into the right corner as requested */}
            <div className="card p-5 flex flex-col items-center justify-center text-center">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-2 shadow-none">
                <Flame className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                {t.learningHub.currentStreak}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {activeStreak}{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  {t.learningHub.days}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Log Form Card (No '+' in title, Fields ordered per user prompt) */}
          <div className="card p-5 sm:p-6 border border-blue-500/25">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">
              {t.learningHub.addDailyLog}
            </h2>

            <form onSubmit={handleAddLog} className="flex flex-col gap-4">
              {/* Row 1: Time Inputs (Tuition/Lectures and Self Learning) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lectures / Online Classes / Video Time */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                    {t.learningHub.tuitionTime}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        value={watchHours}
                        onChange={(e) =>
                          setWatchHours(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="0"
                        className="input-field w-full text-sm py-2 pl-3 pr-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        {t.learningHub.hrs}
                      </span>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={watchMins}
                        onChange={(e) =>
                          setWatchMins(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="0"
                        className="input-field w-full text-sm py-2 pl-3 pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        {t.learningHub.mins}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Self Learning / Self Practice */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                    {t.learningHub.selfPractice}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        value={practiceHours}
                        onChange={(e) =>
                          setPracticeHours(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="0"
                        className="input-field w-full text-sm py-2 pl-3 pr-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        {t.learningHub.hrs}
                      </span>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={practiceMins}
                        onChange={(e) =>
                          setPracticeMins(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="0"
                        className="input-field w-full text-sm py-2 pl-3 pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        {t.learningHub.mins}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field 1: Topics Covered (User explicitly specified this is first) */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  {t.learningHub.topicsCovered}
                </label>
                <input
                  type="text"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder={t.learningHub.topicsPlaceholder}
                  className="input-field w-full text-sm py-2 px-3"
                  required
                />
              </div>

              {/* Field 2: Practice Details & Solved Tasks (e.g. Solved 5 problems, 10 MCQs) */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  {t.learningHub.practiceDetails}
                </label>
                <input
                  type="text"
                  value={practiceDetails}
                  onChange={(e) => setPracticeDetails(e.target.value)}
                  placeholder={t.learningHub.practiceDetailsPlaceholder}
                  className="input-field w-full text-sm py-2 px-3"
                />
              </div>

              {/* Field 3: Weak Topics (e.g. Where did you struggle?) */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  {t.learningHub.weakTopics}
                </label>
                <input
                  type="text"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder={t.learningHub.weakTopicsPlaceholder}
                  className="input-field w-full text-sm py-2 px-3"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="btn-primary py-2.5 px-6 rounded-xl text-sm font-semibold shadow-none shadow-blue-600/20 cursor-pointer"
                >
                  {t.learningHub.saveLog}
                </button>
              </div>
            </form>
          </div>

          {/* Learning History & Records (Log History) */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {t.learningHub.logHistory}
            </h2>

            {activeFolderLogs.length === 0 ? (
              <div className="card p-8 text-center text-muted-foreground text-xs sm:text-sm">
                {t.learningHub.noLogs}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeFolderLogs.map((log) => (
                  <div
                    key={log.id}
                    className="card p-4 sm:p-5 flex flex-col gap-3 hover:border-slate-300 dark:hover:border-white/15 transition-all"
                  >
                    {/* Top Row: Date & Time Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-foreground">
                          {new Date(log.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold">
                        {log.practiceMinutes > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {t.learningHub.selfLearning}: {formatHoursMins(log.practiceMinutes)}
                          </span>
                        )}
                        {log.watchMinutes > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {t.learningHub.tuition}: {formatHoursMins(log.watchMinutes)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Topics & Practice Details */}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {log.topics}
                      </p>
                      {log.practiceDetails && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {log.practiceDetails}
                        </p>
                      )}
                    </div>

                    {/* Weak Topics */}
                    {log.blockers && (
                      <div className="border-l-2 border-amber-500/60 pl-3 py-0.5 bg-amber-500/5 rounded-r-lg">
                        <p className="text-xs font-semibold text-amber-500 mb-0.5">
                          {t.learningHub.weakTopicsLabel}
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                          {log.blockers.split(/[,;\n]+/).map((b, i) => (
                            <li key={i}>{b.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Delete Log Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => deleteLearningLog(log.id)}
                        className="text-xs font-medium text-red-400 hover:text-red-500 transition-colors flex items-center gap-1.5 p-1 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.learningHub.deleteLog}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: CREATE NEW SKILL MODAL                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {mounted &&
        isCreateModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs motion-overlay"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div
              className="absolute inset-0"
              onClick={() => setIsCreateModalOpen(false)}
            />

            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-none bg-white dark:bg-[#111319] text-foreground motion-reveal">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-500 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {t.learningHub.createFolder}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {state.lang === "bn"
                      ? "একটি নতুন স্কিল ফোল্ডার তৈরি করুন"
                      : "Create a new skill folder to organize your learning"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                    {state.lang === "bn" ? "স্কিলের নাম" : "Skill Name"}
                  </label>
                  <input
                    ref={modalInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder={t.learningHub.newFolderPlaceholder}
                    className="input-field w-full text-sm py-2.5 px-3 rounded-xl"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {state.lang === "bn" ? "বাতিল" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-none cursor-pointer"
                  >
                    {t.learningHub.saveFolder}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: COMPLETION CELEBRATION MODAL                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {mounted &&
        completionModalAnim.shouldRender &&
        activeCompletedData &&
        createPortal(
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs ${
              completionModalAnim.isExiting ? "motion-exit-fade" : "motion-overlay"
            }`}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div
              className="absolute inset-0"
              onClick={() => setCompletedModalData(null)}
            />

            <div
              className={`completion-modal relative w-full max-w-sm rounded-2xl border border-white/10 p-5 shadow-none overflow-hidden flex flex-col items-center text-center bg-[#111319]/95 backdrop-blur-md -translate-y-6 sm:-translate-y-8 ${
                completionModalAnim.isExiting ? "motion-exit-reveal" : "motion-reveal"
              }`}
            >
              <button
                onClick={() => setCompletedModalData(null)}
                className="absolute top-3.5 right-3.5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              <div className="relative mb-2.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-none">
                  <Trophy className="w-6 h-6" />
                </div>
                <Star className="w-4 h-4 text-amber-400 absolute -top-1 -right-1.5 animate-pulse" />
              </div>

              <h2 className="text-lg font-bold text-white mb-0.5">
                {t.learningHub.destinationReached}
              </h2>
              <h3 className="text-xs font-semibold text-blue-400 mb-2">
                {t.learningHub.milestoneUnlocked}
              </h3>

              <p className="text-xs text-zinc-300 mb-3.5 leading-relaxed max-w-xs">
                {t.learningHub.congratsOnCompleting}{" "}
                <strong className="text-white">{activeCompletedData.name}</strong>
                {t.learningHub.consistencyPayingOff}
              </p>

              <div className="w-full bg-black/30 border border-white/5 rounded-xl py-2 px-3 flex justify-around mb-4 shadow-none">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                    {t.learningHub.timeInvested}
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5">
                    {formatHoursMins(activeCompletedData.totalMins)}
                  </span>
                </div>
                <div className="w-px bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                    {t.learningHub.activeStreak}
                  </span>
                  <span className="text-sm font-bold text-blue-400 mt-0.5">
                    {activeCompletedData.streak} {t.learningHub.days}
                  </span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={() => {
                    setCompletedModalData(null);
                    setSelectedFolderId(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-none shadow-blue-600/30 cursor-pointer"
                >
                  {t.learningHub.startNewSkill}
                </button>

                <button
                  onClick={() => setCompletedModalData(null)}
                  className="w-full py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {t.learningHub.keepInArchive}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
