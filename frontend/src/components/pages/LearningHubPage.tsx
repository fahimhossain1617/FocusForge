"use client";

import { useState, useRef } from "react";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import EmptyState from "../ui/EmptyState";
import { Folder, Plus, Trash2, CheckCircle, Clock, CalendarDays, AlertTriangle, Trophy, Sparkles, Star, ArrowLeft, Check } from "lucide-react";

function formatHoursMins(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getStreak(logs: { date: string }[]): number {
  if (logs.length === 0) return 0;

  // Sort descending by date
  const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Check if there's a log today or yesterday to start the streak
  const lastLogDate = new Date(sorted[0].date);
  lastLogDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((currentDate.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 1) {
    return 0; // Streak broken
  }

  // Count backwards
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
  const { state, addLearningFolder, addLearningLog, deleteLearningFolder, deleteLearningLog, toggleLearningFolderCompletion, showToast } = useAppContext();
  const { requireAuth } = useAuth();
  const { t } = useTranslation();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [watchHours, setWatchHours] = useState<number | "">("");
  const [watchMins, setWatchMins] = useState<number | "">("");
  const [practiceHours, setPracticeHours] = useState<number | "">("");
  const [practiceMins, setPracticeMins] = useState<number | "">("");
  const [practiceDetails, setPracticeDetails] = useState("");
  const [topics, setTopics] = useState("");
  const [blockers, setBlockers] = useState("");
  const [completedModalData, setCompletedModalData] = useState<{ id: string, name: string, totalMins: number, streak: number } | null>(null);

  const handleCreateFolder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) {
      folderInputRef.current?.focus();
      return;
    }

    requireAuth(() => {
      addLearningFolder(newFolderName.trim());
      setNewFolderName("");
      showToast(t.learningHub.toastFolderCreated);
    }, 'learning');
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderId) return;

    const watchTotal = ((Number(watchHours) || 0) * 60) + (Number(watchMins) || 0);
    const practiceTotal = ((Number(practiceHours) || 0) * 60) + (Number(practiceMins) || 0);

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
        practiceDetails,
        topics,
        blockers
      });

      setWatchHours("");
      setWatchMins("");
      setPracticeHours("");
      setPracticeMins("");
      setPracticeDetails("");
      setTopics("");
      setBlockers("");
      showToast(t.learningHub.toastLogAdded);
    }, 'learning');
  };

  const activeFolder = state.learningFolders.find(f => f.id === selectedFolderId);
  const activeFolderLogs = state.learningLogs.filter(l => l.folderId === selectedFolderId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Analytics
  const totalWatchMins = activeFolderLogs.reduce((acc, log) => acc + log.watchMinutes, 0);
  const totalPracticeMins = activeFolderLogs.reduce((acc, log) => acc + log.practiceMinutes, 0);
  const totalMins = totalWatchMins + totalPracticeMins;

  const streak = getStreak(activeFolderLogs);
  const gapDays = getGapDays(activeFolderLogs);

  return (
    <div className="fade-in max-w-6xl flex flex-col md:flex-row gap-6">

      {/* LEFT PANE: Folders List */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div className="mb-2">
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{t.learningHub.title}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.subtitle}</p>
        </div>

        <form onSubmit={handleCreateFolder} className="flex gap-2">
          <input
            ref={folderInputRef}
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t.learningHub.newFolderPlaceholder}
            className="input-field flex-1 text-sm py-2 px-3 transition-colors focus:border-purple-500"
          />
          <button
            type={newFolderName.trim() ? "submit" : "button"}
            onClick={() => {
              if (!newFolderName.trim()) {
                folderInputRef.current?.focus();
              }
            }}
            title={newFolderName.trim() ? t.learningHub.saveFolder : t.learningHub.createFolder}
            className={`p-2 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              newFolderName.trim()
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105"
                : "btn-primary"
            }`}
          >
            {newFolderName.trim() ? (
              <Check className="w-5 h-5 animate-in zoom-in-50 duration-200 text-white" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </form>

        <div className="flex flex-col gap-2 mt-4">
          {state.learningFolders.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.noFolders}</p>
          ) : (
            state.learningFolders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left w-full border ${selectedFolderId === folder.id
                    ? "bg-[rgba(124,58,237,0.1)] border-[var(--color-purple-primary)]"
                    : "bg-[var(--color-bg-secondary)] border-transparent hover:border-[var(--color-border-subtle)]"
                  }`}
              >
                <Folder className={`w-5 h-5 ${folder.completed ? "text-green-500" : "text-[var(--color-purple-primary)]"}`} />
                <span className={`flex-1 text-sm font-medium ${folder.completed ? "line-through opacity-60" : ""}`} style={{ color: "var(--color-text-primary)" }}>
                  {folder.name}
                </span>
                {folder.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE: Workspace */}
      <div className="w-full md:w-2/3">
        {!activeFolder ? (
          <div className="card h-full min-h-[400px] flex items-center justify-center">
            <EmptyState
              icon={<Folder className="w-8 h-8 text-indigo-400" />}
              title={t.learningHub.selectFolder}
              description={t.learningHub.selectFolderDesc}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Back to all folders button (mobile & small screens) */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-xs"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  color: "var(--color-text-primary)",
                }}
              >
                <ArrowLeft size={16} />
                <span>{state.lang === 'bn' ? "সব ফোল্ডারে ফিরে যান" : "Back to all folders"}</span>
              </button>
            </div>

            {/* Workspace Header */}
            <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                  {activeFolder.name}
                  {activeFolder.completed && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 ml-2">{t.learningHub.completed}</span>}
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {t.learningHub.created} {new Date(activeFolder.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    toggleLearningFolderCompletion(activeFolder.id);
                    if (!activeFolder.completed) {
                      setCompletedModalData({
                        id: activeFolder.id,
                        name: activeFolder.name,
                        totalMins: totalMins,
                        streak: streak
                      });
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                  style={{
                    borderColor: activeFolder.completed ? "var(--color-border-subtle)" : "var(--color-success)",
                    color: activeFolder.completed ? "var(--color-text-muted)" : "var(--color-success)"
                  }}
                >
                  {activeFolder.completed ? t.learningHub.markIncomplete : t.learningHub.markComplete}
                </button>
                <button
                  onClick={() => {
                    deleteLearningFolder(activeFolder.id);
                    setSelectedFolderId(null);
                    showToast(t.learningHub.toastFolderDeleted);
                  }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Time Split */}
              <div className="card p-4 flex flex-col justify-center">
                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.timeSpent}</p>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{formatHoursMins(totalMins)}</span>
                </div>
                {totalMins > 0 && (
                  <div className="flex h-2 rounded-full overflow-hidden mt-1">
                    <div style={{ width: `${(totalPracticeMins / totalMins) * 100}%`, background: "var(--color-purple-primary)" }} title="Practice" />
                    <div style={{ width: `${(totalWatchMins / totalMins) * 100}%`, background: "var(--color-bg-secondary)" }} title="Watch" />
                  </div>
                )}
                <div className="flex gap-4 mt-2 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "var(--color-purple-primary)" }}></div> {t.learningHub.selfLearning} ({formatHoursMins(totalPracticeMins)})</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "var(--color-bg-secondary)" }}></div> {t.learningHub.tuition} ({formatHoursMins(totalWatchMins)})</div>
                </div>
              </div>

              {/* Streak */}
              <div className="card p-4 flex flex-col items-center justify-center text-center">
                <CalendarDays className="w-6 h-6 mb-2" style={{ color: "var(--color-purple-soft)" }} />
                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.currentStreak}</p>
                <span className="text-2xl font-bold" style={{ color: "var(--color-purple-bright)" }}>{streak} <span className="text-sm font-medium text-zinc-500">{t.learningHub.days}</span></span>
              </div>

              {/* Gap Indicator */}
              <div className={`card p-4 flex flex-col items-center justify-center text-center border ${gapDays >= 2 ? "border-red-500/50 bg-red-500/5" : ""}`}>
                {gapDays >= 2 ? (
                  <>
                    <AlertTriangle className="w-6 h-6 mb-2 text-red-500" />
                    <p className="text-xs font-medium uppercase tracking-wider mb-1 text-red-400">{t.learningHub.inactivityGap}</p>
                    <span className="text-lg font-bold text-red-500">{gapDays} {t.learningHub.days}</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-6 h-6 mb-2" style={{ color: "var(--color-success)" }} />
                    <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.status}</p>
                    <span className="text-sm font-medium" style={{ color: "var(--color-success)" }}>{t.learningHub.active}</span>
                  </>
                )}
              </div>
            </div>

            {/* Daily Log Form */}
            <div className="card p-5 border border-[var(--color-purple-primary)]/20">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--color-purple-bright)" }}>
                <Plus className="w-4 h-4" /> {t.learningHub.addDailyLog}
              </h3>
              <form onSubmit={handleAddLog} className="flex flex-col gap-4">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>{t.learningHub.tuitionTime}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="number" min="0" value={watchHours} onChange={e => setWatchHours(e.target.value === "" ? "" : Number(e.target.value))} className="input-field w-full text-sm py-2 pl-3 pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.hrs}</span>
                      </div>
                      <div className="relative flex-1">
                        <input type="number" min="0" max="59" value={watchMins} onChange={e => setWatchMins(e.target.value === "" ? "" : Number(e.target.value))} className="input-field w-full text-sm py-2 pl-3 pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.mins}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>{t.learningHub.selfPractice}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="number" min="0" value={practiceHours} onChange={e => setPracticeHours(e.target.value === "" ? "" : Number(e.target.value))} className="input-field w-full text-sm py-2 pl-3 pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.hrs}</span>
                      </div>
                      <div className="relative flex-1">
                        <input type="number" min="0" max="59" value={practiceMins} onChange={e => setPracticeMins(e.target.value === "" ? "" : Number(e.target.value))} className="input-field w-full text-sm py-2 pl-3 pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.mins}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>{t.learningHub.practiceDetails}</label>
                  <input type="text" value={practiceDetails} onChange={e => setPracticeDetails(e.target.value)} placeholder={t.learningHub.practiceDetailsPlaceholder} className="input-field w-full text-sm py-2 px-3" />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>{t.learningHub.topicsCovered}</label>
                  <input type="text" value={topics} onChange={e => setTopics(e.target.value)} placeholder={t.learningHub.topicsPlaceholder} className="input-field w-full text-sm py-2 px-3" required />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>{t.learningHub.weakTopics}</label>
                  <input type="text" value={blockers} onChange={e => setBlockers(e.target.value)} placeholder={t.learningHub.weakTopicsPlaceholder} className="input-field w-full text-sm py-2 px-3" />
                </div>

                <button type="submit" className="btn-primary py-2 mt-2">{t.learningHub.saveLog}</button>
              </form>
            </div>

            {/* Log History */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>{t.learningHub.logHistory}</h3>
              {activeFolderLogs.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--color-text-muted)" }}>{t.learningHub.noLogs}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeFolderLogs.map(log => (
                    <div key={log.id} className="card p-4 flex flex-col gap-3">

                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold px-2 py-1 rounded bg-[rgba(255,255,255,0.05)]" style={{ color: "var(--color-text-primary)" }}>
                          {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>

                        <div className="flex gap-3 text-xs font-medium">
                          {log.practiceMinutes > 0 && <span style={{ color: "var(--color-purple-soft)" }}>{t.learningHub.selfLearning}: {formatHoursMins(log.practiceMinutes)}</span>}
                          {log.watchMinutes > 0 && <span style={{ color: "var(--color-text-muted)" }}>{t.learningHub.tuition}: {formatHoursMins(log.watchMinutes)}</span>}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{log.topics}</p>
                        {log.practiceDetails && (
                          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>{log.practiceDetails}</p>
                        )}
                      </div>

                      {log.blockers && (
                        <div className="mt-1 border-l-2 pl-3" style={{ borderColor: "var(--color-purple-primary)" }}>
                          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>{t.learningHub.weakTopicsLabel}</p>
                          <ul className="list-disc list-inside text-sm space-y-1" style={{ color: "var(--color-text-muted)" }}>
                            {log.blockers.split(',').map((b, i) => (
                              <li key={i}>{b.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => deleteLearningLog(log.id)}
                          className="text-xs font-medium text-red-400 hover:text-red-500 transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {t.learningHub.deleteLog}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Completion Modal */}
      {completedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setCompletedModalData(null)}></div>

          <div className="completion-modal relative w-full max-w-md rounded-2xl border p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center"
            style={{ background: "rgba(20, 20, 30, 0.75)", backdropFilter: "blur(20px)" }}>

            {/* Glowing orb background effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-purple-500/30 rounded-full blur-[50px] pointer-events-none"></div>

            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                <Trophy className="w-8 h-8 text-purple-400 drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
              </div>
              <Sparkles className="w-5 h-5 text-yellow-400 absolute top-0 -right-2 animate-pulse" />
              <Star className="w-4 h-4 text-purple-300 absolute bottom-2 -left-3 animate-pulse delay-150" />
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{t.learningHub.destinationReached}</h2>
            <h3 className="text-lg font-semibold text-purple-300 mb-3">{t.learningHub.milestoneUnlocked}</h3>

            <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
              {t.learningHub.congratsOnCompleting} <strong className="text-white">{completedModalData.name}</strong>{t.learningHub.consistencyPayingOff}<br /><br />
              <span className="text-xs opacity-80 text-zinc-400 font-medium font-bengali">{t.learningHub.bengaliCongrats}</span>
            </p>

            <div className="w-full bg-black/40 border border-white/5 rounded-xl p-4 flex justify-around mb-8 shadow-inner">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">{t.learningHub.timeInvested}</span>
                <span className="text-lg font-bold text-white">{formatHoursMins(completedModalData.totalMins)}</span>
              </div>
              <div className="w-px bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">{t.learningHub.activeStreak}</span>
                <span className="text-lg font-bold text-purple-400">{completedModalData.streak} {t.learningHub.days}</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  setCompletedModalData(null);
                  setSelectedFolderId(null);
                  folderInputRef.current?.focus();
                }}
                className="w-full py-3 rounded-xl font-bold text-white transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 relative overflow-hidden group"
                style={{ background: "linear-gradient(135deg, var(--color-purple-primary) 0%, #9333ea 100%)" }}
              >
                <span className="relative z-10">{t.learningHub.startNewSkill}</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              </button>

              <button
                onClick={() => setCompletedModalData(null)}
                className="w-full py-3 rounded-xl font-medium text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm"
              >
                {t.learningHub.keepInArchive}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
