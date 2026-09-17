"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  MoreVertical,
  Plus,
  Target,
  Layers,
  TrendingUp,
  Code2,
  Terminal,
  BookOpen,
  Palette,
  Globe,
  Calendar,
  Coffee,
  AlertCircle,
} from "lucide-react";

import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { getLocalDateString } from "../../services/taskService";
import { formatTimeRange } from "../../utils/timeUtils";

type ProgressView = "weekly" | "monthly";

interface TaskItem {
  id: string;
  taskId?: number;
  blockId?: string;
  name: string;
  completed: boolean;
  time?: string;
  startTime?: string;
  endTime?: string;
  targetDate?: string;
  sourceType?: 'routine' | 'custom';
}

interface SkillDisplay {
  id: string;
  name: string;
  progress: number;
  icon: typeof Code2;
  iconBg: string;
}

function greetingText(name: string) {
  const hour = new Date().getHours();
  let timeGreeting = "Good Evening";
  if (hour < 12) timeGreeting = "Good Morning";
  else if (hour < 17) timeGreeting = "Good Afternoon";
  else if (hour < 21) timeGreeting = "Good Evening";
  else timeGreeting = "Good Night";

  return `${timeGreeting}, ${name}`;
}

function formatMinutes(totalMins: number): string {
  const hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export default function DashboardPage() {
  const { state, navigateTo, updateTask, addTask, isLoaded } = useAppContext();
  const { user } = useAuth();
  const { t } = useTranslation();
  const today = getLocalDateString();

  const [progressView, setProgressView] = useState<ProgressView>("weekly");
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Dynamic user display name
  const userName = useMemo(() => {
    return (
      user?.displayName ||
      user?.identifier?.split("@")[0] ||
      "Champion"
    );
  }, [user]);

  // Dynamic 7-day Weekly Data (Ending Today)
  const weeklyData = useMemo(() => {
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const fullDate = `${y}-${m}-${dayNum}`;
      const dayName = dayNames[d.getDay()];
      const dateLabel = `${d.getDate()} ${monthNames[d.getMonth()]}`;

      // Calculate real focus minutes from focusSessions + activities for this day
      const daySessions = (state.focusSessions || []).filter((s) => {
        const sDate = s.startedAt ? s.startedAt.split("T")[0] : "";
        return sDate === fullDate;
      });
      const sessionsMins = daySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

      const dayActivities = (state.activities || []).filter((a) => a.date === fullDate);
      const activitiesMins = dayActivities.reduce((acc, a) => acc + (a.totalMinutes || (a.hours * 60 + a.minutes) || 0), 0);

      const totalDayFocusMinutes = sessionsMins + activitiesMins;

      // Calculate real tasks for this day
      const dayTasks = (state.tasks || []).filter((t) => t.targetDate === fullDate || t.date === fullDate);
      const tasksDone = dayTasks.filter((t) => t.completed || t.status === "completed").length;
      const isPast = fullDate < today;
      const tasksMissed = isPast ? dayTasks.filter((t) => !t.completed && t.status !== "completed").length : 0;

      days.push({
        day: dayName,
        date: dateLabel,
        fullDate,
        focusTime: formatMinutes(totalDayFocusMinutes),
        focusMinutes: totalDayFocusMinutes,
        tasksDone,
        tasksMissed,
        totalTasks: dayTasks.length,
      });
    }
    return days;
  }, [state.focusSessions, state.activities, state.tasks, today]);

  // Dynamic 4-Week Monthly Data
  const monthlyWeeks = useMemo(() => {
    const weeks = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let w = 3; w >= 0; w--) {
      const end = new Date();
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);

      const startLabel = `${monthNames[start.getMonth()]} ${start.getDate()}`;
      const endLabel = `${monthNames[end.getMonth()]} ${end.getDate()}`;
      const range = `${startLabel} – ${endLabel}`;

      const startStr = getLocalDateString(start);
      const endStr = getLocalDateString(end);

      const weekSessions = (state.focusSessions || []).filter((s) => {
        const sDate = s.startedAt ? s.startedAt.split("T")[0] : "";
        return sDate >= startStr && sDate <= endStr;
      });
      const sessMins = weekSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

      const weekActivities = (state.activities || []).filter((a) => a.date >= startStr && a.date <= endStr);
      const actMins = weekActivities.reduce((acc, a) => acc + (a.totalMinutes || (a.hours * 60 + a.minutes) || 0), 0);

      const totalWeekFocusMins = sessMins + actMins;

      const weekTasks = (state.tasks || []).filter((t) => {
        const tDate = t.targetDate || t.date || "";
        return tDate >= startStr && tDate <= endStr;
      });
      const doneCount = weekTasks.filter((t) => t.completed || t.status === "completed").length;
      const totalCount = weekTasks.length;

      const taskPercent = totalCount > 0 
        ? Math.round((doneCount / totalCount) * 100) 
        : (totalWeekFocusMins > 0 ? Math.min(100, Math.round((totalWeekFocusMins / 900) * 100)) : 0);

      weeks.push({
        week: `Week ${4 - w}`,
        range,
        startStr,
        endStr,
        percent: taskPercent,
        focusTime: formatMinutes(totalWeekFocusMins),
        focusMinutes: totalWeekFocusMins,
        tasksDone: `${doneCount} / ${totalCount}`,
        doneCount,
        totalCount,
        missedCount: Math.max(0, totalCount - doneCount),
      });
    }
    return weeks;
  }, [state.focusSessions, state.activities, state.tasks]);

  // Helper to format start and end time for task items (always displayed in 12h AM/PM)
  const formatTaskTimeRange = (t: any): string => {
    const correspondingBlock = (state.timeBlocks || []).find(
      (b) =>
        (t.id && String(b.taskId) === String(t.id)) ||
        (b.date === (t.targetDate || t.date) && b.label === (t.name || t.title))
    );

    const start = t.time || correspondingBlock?.startTime || (t.reminderTime ? t.reminderTime : "");
    const end = t.endTime || correspondingBlock?.endTime || "";

    return formatTimeRange(start, end);
  };

  // Derive display tasks for the selected date
  const tasksList: TaskItem[] = useMemo(() => {
    const realDayTasks = (state.tasks || []).filter(
      (task) => task.targetDate === selectedDate || task.date === selectedDate
    );
    if (realDayTasks.length > 0) {
      return realDayTasks.map((t) => ({
        id: `task-${t.id}`,
        taskId: t.id,
        name: t.name || t.title || "Untitled Task",
        completed: Boolean(t.completed || t.status === "completed"),
        time: formatTaskTimeRange(t),
        targetDate: t.targetDate || t.date || selectedDate,
        sourceType: t.sourceType || "custom",
      }));
    }

    const clickedWeek = monthlyWeeks.find((w) => w.week === selectedDate);
    if (clickedWeek) {
      const weekTasks = (state.tasks || []).filter((t) => {
        const tDate = t.targetDate || t.date || "";
        return tDate >= clickedWeek.startStr && tDate <= clickedWeek.endStr;
      });
      if (weekTasks.length > 0) {
        return weekTasks.map((t) => ({
          id: `task-${t.id}`,
          taskId: t.id,
          name: t.name || t.title || "Untitled Task",
          completed: Boolean(t.completed || t.status === "completed"),
          time: formatTaskTimeRange(t),
          targetDate: t.targetDate || t.date || selectedDate,
          sourceType: t.sourceType || "custom",
        }));
      }
    }
    
    return [];
  }, [state.tasks, state.timeBlocks, selectedDate, monthlyWeeks]);

  const completedCount = tasksList.filter((t) => t.completed).length;
  const pendingCount = tasksList.length - completedCount;

  // Toggle task completion
  const handleToggleTask = (item: TaskItem) => {
    if (item.taskId !== undefined) {
      const nextCompleted = !item.completed;
      updateTask(item.taskId, {
        completed: nextCompleted,
        status: nextCompleted ? "completed" : "not_started",
      });
    }
  };

  // 3-dot click -> jump directly to that date in planner and open edit details drawer
  const handleOpenTaskInPlanner = (item: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetDate = item.targetDate || selectedDate;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("focusforge_planner_selected_date", targetDate);
      sessionStorage.setItem("focusforge_planner_open_drawer", "true");
      window.dispatchEvent(
        new CustomEvent("focusforge:open_planner_date", {
          detail: { date: targetDate, openDrawer: true, taskId: item.taskId },
        })
      );
    }
    navigateTo("planner");
  };

  // Skills list with clean inline progress bars (100% dynamic from real user folders)
  const skillsList: SkillDisplay[] = useMemo(() => {
    if (state.learningFolders && state.learningFolders.length > 0) {
      const iconPalette = [
        { icon: Code2, bg: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
        { icon: Terminal, bg: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        { icon: BookOpen, bg: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
        { icon: Palette, bg: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
        { icon: Globe, bg: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
      ];

      return state.learningFolders.slice(0, 5).map((folder, idx) => {
        const pal = iconPalette[idx % iconPalette.length];
        const logs = (state.learningLogs || []).filter((l) => l.folderId === folder.id);
        const totalMinutes = logs.reduce((acc, l) => acc + l.watchMinutes + l.practiceMinutes, 0);
        const progress = folder.completed ? 100 : Math.min(95, Math.round(totalMinutes / 12));

        return {
          id: folder.id,
          name: folder.name,
          progress: folder.completed ? 100 : progress,
          icon: pal.icon,
          iconBg: pal.bg,
        };
      });
    }

    return [];
  }, [state.learningFolders, state.learningLogs]);

  const isToday = selectedDate === today;
  let tasksTitle = "Today's Tasks";
  let focusTitle = "Today's Focus";
  if (!isToday) {
    const matchingDay = weeklyData.find((d) => d.fullDate === selectedDate);
    const matchingWeek = monthlyWeeks.find((w) => w.week === selectedDate);
    if (matchingDay) {
      tasksTitle = `Tasks (${matchingDay.day}, ${matchingDay.date})`;
      focusTitle = `Focus (${matchingDay.day}, ${matchingDay.date})`;
    } else if (matchingWeek) {
      tasksTitle = `Tasks (${matchingWeek.week})`;
      focusTitle = `Focus (${matchingWeek.week})`;
    } else {
      tasksTitle = `Tasks (${selectedDate})`;
      focusTitle = `Focus (${selectedDate})`;
    }
  }

  // Focus stats for selectedDate / selectedWeek (Seamless contiguous proportional calculation)
  const selectedFocusStats = useMemo(() => {
    const clickedWeek = monthlyWeeks.find((w) => w.week === selectedDate);
    if (clickedWeek) {
      const focusMins = clickedWeek.focusMinutes;
      const breakMins = Math.round(focusMins * 0.15);
      const totalActive = focusMins + breakMins;
      const C = 238.761;

      const focusRatio = totalActive > 0 ? focusMins / totalActive : 0;
      const breakRatio = totalActive > 0 ? breakMins / totalActive : 0;

      return {
        focusTime: clickedWeek.focusTime,
        focusMinutes: focusMins,
        breakTime: formatMinutes(breakMins),
        breakMinutes: breakMins,
        distractionCount: 0,
        distractionMinutes: 0,
        distractionSummary: "Calculated across weekly total",
        totalActiveMinutes: totalActive,
        focusLen: focusRatio * C,
        breakLen: breakRatio * C,
        distractionLen: 0,
        focusOffset: 0,
        breakOffset: -(focusRatio * C),
        distractionOffset: -(focusRatio * C + breakRatio * C),
      };
    }

    // Day calculations
    const daySessions = (state.focusSessions || []).filter((s) => {
      const sDate = s.startedAt ? s.startedAt.split("T")[0] : "";
      return sDate === selectedDate;
    });
    const sessFocusMins = daySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const sessBreakMins = daySessions.reduce((acc, s) => acc + (s.breakMinutes || 0), 0);

    const dayActivities = (state.activities || []).filter((a) => a.date === selectedDate);
    const actFocusMins = dayActivities
      .filter((a) => a.category !== 'Break')
      .reduce((acc, a) => acc + (a.totalMinutes || (a.hours * 60 + a.minutes) || 0), 0);
    const actBreakMins = dayActivities
      .filter((a) => a.category === 'Break')
      .reduce((acc, a) => acc + (a.totalMinutes || (a.hours * 60 + a.minutes) || 0), 0);

    const totalFocusMins = sessFocusMins + actFocusMins;
    const totalBreakMins = sessBreakMins + actBreakMins;

    const distractionsList: string[] = [];
    daySessions.forEach((s) => {
      if (Array.isArray(s.distractions)) {
        s.distractions.forEach((d) => {
          if (d.content) distractionsList.push(d.content);
        });
      }
    });
    const dayLegacyDistractions = (state.distractions || []).filter((d) => d.date === selectedDate);
    const distractionCount = distractionsList.length + dayLegacyDistractions.length;
    // Distraction weight for visualization (2 mins per distraction log if no explicit duration)
    const distractionMins = distractionCount > 0 ? distractionCount * 2 : 0;

    const totalActive = totalFocusMins + totalBreakMins + distractionMins;
    const C = 238.761;

    const focusRatio = totalActive > 0 ? totalFocusMins / totalActive : 0;
    const breakRatio = totalActive > 0 ? totalBreakMins / totalActive : 0;
    const distractionRatio = totalActive > 0 ? distractionMins / totalActive : 0;

    const focusLen = focusRatio * C;
    const breakLen = breakRatio * C;
    const distractionLen = distractionRatio * C;

    return {
      focusTime: formatMinutes(totalFocusMins),
      focusMinutes: totalFocusMins,
      breakTime: formatMinutes(totalBreakMins),
      breakMinutes: totalBreakMins,
      distractionCount,
      distractionMinutes: distractionMins,
      distractionSummary: distractionsList.length > 0 ? distractionsList.slice(0, 2).join(" · ") : (distractionCount > 0 ? `${distractionCount} distractions logged` : "None logged"),
      totalActiveMinutes: totalActive,
      focusLen,
      breakLen,
      distractionLen,
      focusOffset: 0,
      breakOffset: -focusLen,
      distractionOffset: -(focusLen + breakLen),
    };
  }, [selectedDate, monthlyWeeks, state.focusSessions, state.activities, state.distractions]);

  // Aggregated Weekly Totals
  const weeklySummary = useMemo(() => {
    const totalFocusMins = weeklyData.reduce((acc, d) => acc + d.focusMinutes, 0);
    const totalDone = weeklyData.reduce((acc, d) => acc + d.tasksDone, 0);
    const totalTasks = weeklyData.reduce((acc, d) => acc + d.totalTasks, 0);
    const totalMissed = weeklyData.reduce((acc, d) => acc + d.tasksMissed, 0);
    const completionPercent = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : (totalDone > 0 ? 100 : 0);

    return {
      focusTime: formatMinutes(totalFocusMins),
      tasksDoneRatio: `${totalDone} / ${totalTasks}`,
      totalMissed,
      completionPercent,
    };
  }, [weeklyData]);

  // Aggregated Monthly Totals
  const monthlySummary = useMemo(() => {
    const totalFocusMins = monthlyWeeks.reduce((acc, w) => acc + w.focusMinutes, 0);
    const totalDone = monthlyWeeks.reduce((acc, w) => acc + w.doneCount, 0);
    const totalTasks = monthlyWeeks.reduce((acc, w) => acc + w.totalCount, 0);
    const totalMissed = monthlyWeeks.reduce((acc, w) => acc + w.missedCount, 0);
    const completionPercent = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : (totalDone > 0 ? 100 : 0);

    return {
      focusTime: formatMinutes(totalFocusMins),
      tasksDoneRatio: `${totalDone} / ${totalTasks}`,
      totalMissed,
      completionPercent,
    };
  }, [monthlyWeeks]);

  if (!isLoaded) {
    return (
      <div className="max-w-[1600px] mx-auto grid gap-6 animate-pulse">
        <div className="h-16 rounded-2xl bg-white/[.04]" />
        <div className="h-96 rounded-3xl bg-white/[.04]" />
        <div className="h-96 rounded-3xl bg-white/[.04]" />
      </div>
    );
  }

  return (
    <main className="w-full max-w-[1680px] mx-auto pb-16 space-y-6 text-foreground select-none">
      {/* Top Header: Clean, dynamic greeting with NO emojis */}
      <header className="pt-2 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight break-words">
            {greetingText(userName)}
          </h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-muted-foreground font-normal leading-relaxed">
            Your focus today builds your future tomorrow.
          </p>
        </div>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(today)}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-sm flex items-center gap-2"
          >
            Back to Today
          </button>
        )}
      </header>

      {/* Top Section: 3 Balanced Cards (Today's Tasks, Today's Focus + Distractions, Current Skills) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        
        {/* Card 1: Today's Tasks */}
        <section
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: "linear-gradient(145deg, rgba(16, 22, 36, 0.95), rgba(11, 15, 26, 0.98))",
            border: "1px solid rgba(59, 130, 246, 0.12)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div>
            {/* Header: Title + Natural Subtitle + Plus (+) button to Planner */}
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-foreground tracking-tight">{tasksTitle}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tasksList.length} tasks · {completedCount} completed · {pendingCount} pending
                </p>
              </div>
              <button
                onClick={() => navigateTo("planner")}
                className="w-8 h-8 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-400 hover:text-blue-300 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                title="Add task in Planner"
                aria-label="Add task in Planner"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Task Items (Natural spacing, no harsh dividing lines) */}
            <div className="mt-2 space-y-2">
              {tasksList.length > 0 ? (
                tasksList.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleTask(item)}
                    className="group flex items-center justify-between gap-2.5 py-2 px-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    {/* Circular Check Button */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          item.completed
                            ? "bg-emerald-500 border border-emerald-400 text-white "
                            : "border-2 border-slate-600/80 hover:border-blue-400 bg-slate-900/40"
                        }`}
                        aria-label={`Mark task ${item.completed ? "pending" : "done"}`}
                      >
                        {item.completed && <Check size={11} strokeWidth={3.2} />}
                      </div>
                      <span
                        className={`text-xs sm:text-[13px] break-words transition-colors ${
                          item.completed ? "text-muted-foreground line-through" : "text-foreground font-medium"
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.sourceType === 'routine' && (
                        <span className="text-[9px] font-bold text-blue-400/90 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded shrink-0">
                          Routine
                        </span>
                      )}
                    </div>

                    {/* Right side: Time & Action */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.time && (
                        <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                          <Clock3 size={11} className="text-muted-foreground" />
                          {item.time}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleOpenTaskInPlanner(item, e)}
                        className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/10"
                        title="Open in Planner"
                        aria-label="Open in Planner"
                      >
                        <MoreVertical size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center">
                  <Check size={24} className="text-slate-600 mb-2" />
                  No tasks recorded for this day
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Card 2: Today's Focus (Includes Focus Time, Break Time & Distractions summary) */}
        <section
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: "linear-gradient(145deg, rgba(16, 22, 36, 0.95), rgba(11, 15, 26, 0.98))",
            border: "1px solid rgba(59, 130, 246, 0.12)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div>
            {/* Header: Clean title without Live badge */}
            <div className="flex items-center justify-between pb-3">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-foreground tracking-tight">{focusTitle}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Focus time &amp; daily breakdown</p>
              </div>
            </div>

            {/* Main Center Gauge and Breakdown */}
            <div className="mt-2 flex items-center justify-between gap-5">
              {/* Radial Donut Ring (Contiguous Proportional Segment Ring) */}
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="9"
                  />

                  {/* 1. Focus Time Segment (Blue) */}
                  {selectedFocusStats.focusLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="url(#focus-clean-blue)"
                      strokeWidth="9"
                      strokeDasharray={`${selectedFocusStats.focusLen} 238.761`}
                      strokeDashoffset={selectedFocusStats.focusOffset}
                      strokeLinecap="round"
                    />
                  )}

                  {/* 2. Break Time Segment (Amber - seamlessly connects right after Focus) */}
                  {selectedFocusStats.breakLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="9"
                      strokeDasharray={`${selectedFocusStats.breakLen} 238.761`}
                      strokeDashoffset={selectedFocusStats.breakOffset}
                      strokeLinecap="round"
                    />
                  )}

                  {/* 3. Distraction Segment (Rose - seamlessly connects right after Break) */}
                  {selectedFocusStats.distractionLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="9"
                      strokeDasharray={`${selectedFocusStats.distractionLen} 238.761`}
                      strokeDashoffset={selectedFocusStats.distractionOffset}
                      strokeLinecap="round"
                    />
                  )}

                  <defs>
                    <linearGradient id="focus-clean-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center text: Pure calculated focus time */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-foreground tracking-tight">{selectedFocusStats.focusTime}</span>
                </div>
              </div>

              {/* Focus Time & Break Time breakdown */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 " />
                    Focus Time
                  </span>
                  <span className="font-bold text-foreground font-mono text-xs">{selectedFocusStats.focusTime}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 " />
                    Break Time
                  </span>
                  <span className="font-bold text-amber-400 font-mono text-xs">{selectedFocusStats.breakTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Compact Distractions Info */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertCircle size={13} className="text-rose-400" />
              <span>Daily Distractions:</span>
              <span className="font-semibold text-rose-300 font-mono">
                {selectedFocusStats.distractionCount > 0 ? `${selectedFocusStats.distractionCount}` : "0"}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
              {selectedFocusStats.distractionSummary}
            </span>
          </div>
        </section>

        {/* Card 3: Current Skills (Skill Builder with clean inline progress lines and (+) button) */}
        <section
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: "linear-gradient(145deg, rgba(16, 22, 36, 0.95), rgba(11, 15, 26, 0.98))",
            border: "1px solid rgba(59, 130, 246, 0.12)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div>
            {/* Header: Title + Plus (+) button to Skill Builder */}
            <div className="flex items-center justify-between pb-3">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-foreground tracking-tight">Current Skills</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Skill Builder progress</p>
              </div>
              <button
                onClick={() => navigateTo("learning")}
                className="w-8 h-8 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-purple-400 hover:text-purple-300 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                title="Manage skills in Skill Builder"
                aria-label="Manage skills in Skill Builder"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Skills List: Same-line layout with inline progress bar */}
            <div className="mt-2 space-y-3">
              {skillsList.length > 0 ? (
                skillsList.map((skill) => {
                  const IconComponent = skill.icon;
                  return (
                    <div
                      key={skill.id}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Professional Standardized Icon */}
                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${skill.iconBg}`}
                      >
                        <IconComponent size={12} />
                      </div>

                      {/* Skill Name */}
                      <span className="text-xs sm:text-[13px] font-medium text-foreground min-w-[70px] max-w-[130px] break-words shrink-0">
                        {skill.name}
                      </span>

                      {/* Inline Progress Bar on same line */}
                      <div className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${skill.progress}%` }}
                        />
                      </div>

                      {/* Percentage on the right */}
                      <span className="text-muted-foreground font-mono text-xs font-semibold w-9 text-right shrink-0">
                        {skill.progress}%
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center">
                  <BookOpen size={24} className="text-slate-600 mb-2" />
                  <p className="font-medium text-foreground">No skills added yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add a skill in Skill Builder to track your progress</p>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* Bottom Section: Focus & Productivity Progress (Full Width, Scaled Professional Bars) */}
      <section
        className="rounded-2xl p-5 sm:p-7"
        style={{
          background: "linear-gradient(145deg, rgba(16, 22, 36, 0.95), rgba(11, 15, 26, 0.98))",
          border: "1px solid rgba(59, 130, 246, 0.12)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0 ">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-semibold text-foreground tracking-tight">Focus &amp; Productivity Progress</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {progressView === "weekly"
                  ? "Weekly Overview · Real-time 7-day focus & task performance"
                  : "Monthly Overview · 4-Week breakdown and cumulative performance"}
              </p>
            </div>
          </div>

          {/* Toggle: [ Weekly ] [ Monthly ] */}
          <div className="inline-flex rounded-xl p-1 bg-slate-900/90 border border-white/[0.08] shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setProgressView("weekly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                progressView === "weekly"
                  ? "bg-accent text-white "
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setProgressView("monthly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                progressView === "monthly"
                  ? "bg-accent text-white "
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* View Switch: Weekly Bar Chart vs Monthly Radial Week Cards */}
        {progressView === "weekly" ? (
          /* WEEKLY VIEW */
          <div className="mt-4 space-y-6">
            {/* Legend & Date Range */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <span className="text-sm font-semibold text-white">Weekly Overview</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400 font-mono text-xs">
                  {weeklyData.length > 0
                    ? `${weeklyData[0].day}, ${weeklyData[0].date} – ${weeklyData[weeklyData.length - 1].day}, ${weeklyData[weeklyData.length - 1].date}`
                    : "Current 7 Days"}
                </span>
              </div>

              {/* 3 Indicators Legend */}
              <div className="flex items-center gap-5 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 " />
                  Focus Time
                </span>
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 " />
                  Tasks Done
                </span>
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 " />
                  Tasks Missed
                </span>
              </div>
            </div>

            {/* Professional Scaled Bar Chart */}
            <div className="pt-6 pb-2 min-h-[250px] flex items-end justify-between gap-2 sm:gap-6 border-b border-white/[0.06] px-1 sm:px-4">
              {weeklyData.map((d) => {
                const isHovered = hoveredDay === d.day;
                const isSelected = selectedDate === d.fullDate;
                const maxMinutes = 240;
                const focusHeightPercent = d.focusMinutes > 0 ? Math.min(100, Math.max(15, (d.focusMinutes / maxMinutes) * 100)) : 4;
                const doneHeightPercent = d.tasksDone > 0 ? Math.min(85, Math.max(12, (d.tasksDone / 6) * 80)) : (d.totalTasks > 0 ? 4 : 0);
                const missedHeightPercent = d.tasksMissed > 0 ? Math.min(50, Math.max(8, (d.tasksMissed / 6) * 60)) : 0;

                return (
                  <div
                    key={d.fullDate}
                    onClick={() => setSelectedDate(d.fullDate)}
                    onMouseEnter={() => setHoveredDay(d.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`group relative flex-1 flex flex-col items-center cursor-pointer transition-all duration-150 pt-3 pb-1 rounded-2xl ${
                      isSelected ? "bg-white/[0.06] shadow-inner ring-1 ring-white/[0.1] scale-[1.02]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-16 z-20 bg-slate-900/95 border border-blue-500/30 rounded-xl p-2.5 shadow-2xl text-xs whitespace-nowrap pointer-events-none">
                        <p className="font-bold text-white">{d.day}, {d.date}</p>
                        <p className="text-blue-400 font-medium">Focus: {d.focusTime}</p>
                        <p className="text-emerald-400 font-medium">Tasks Done: {d.tasksDone}</p>
                        <p className="text-rose-400 font-medium">Tasks Missed: {d.tasksMissed}</p>
                      </div>
                    )}

                    {/* Top Focus Time Tag */}
                    <span className="text-xs font-mono text-slate-300 mb-2.5 font-semibold">
                      {d.focusTime}
                    </span>

                    {/* Clean scale bar columns */}
                    <div className="flex items-end justify-center gap-1.5 h-36 w-full max-w-[62px]">
                      {/* Focus Time Scale Bar */}
                      <div
                        className="w-4 sm:w-4.5 rounded-sm transition-all duration-300"
                        style={{
                          height: `${focusHeightPercent}%`,
                          background: d.focusMinutes > 0 ? "linear-gradient(to top, #1d4ed8, #38bdf8)" : "rgba(255,255,255,0.06)",
                        }}
                      />

                      {/* Tasks Done Scale Bar */}
                      <div
                        className="w-4 sm:w-4.5 rounded-sm transition-all duration-300"
                        style={{
                          height: `${doneHeightPercent}%`,
                          background: d.tasksDone > 0 ? "linear-gradient(to top, #047857, #10b981)" : "rgba(255,255,255,0.04)",
                        }}
                      />

                      {/* Tasks Missed Scale Bar */}
                      {missedHeightPercent > 0 ? (
                        <div
                          className="w-4 sm:w-4.5 rounded-sm transition-all duration-300"
                          style={{
                            height: `${missedHeightPercent}%`,
                            background: "linear-gradient(to top, #be123c, #f43f5e)",
                          }}
                        />
                      ) : (
                        <div className="w-4 sm:w-4.5 h-1 rounded-sm bg-white/[0.04]" />
                      )}
                    </div>

                    {/* Day & Date Labels */}
                    <div className="mt-3 text-center">
                      <span className="block text-xs sm:text-sm font-bold text-foreground">{d.day}</span>
                      <span className="block text-[11px] text-muted-foreground font-mono mt-0.5">{d.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom 3 Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Focus Time</p>
                  <p className="mt-1 text-xl font-bold text-foreground tracking-tight">{weeklySummary.focusTime}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Tasks Completed</p>
                  <p className="mt-1 text-xl font-bold text-foreground tracking-tight">{weeklySummary.tasksDoneRatio}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Missed Tasks</p>
                  <p className="mt-1 text-xl font-bold text-foreground tracking-tight">{weeklySummary.totalMissed}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MONTHLY VIEW */
          <div className="mt-4 space-y-5 animate-in fade-in duration-300">
            {/* Header info */}
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Calendar size={14} className="text-blue-400" />
                Monthly Progress · 4-Week Overview
              </span>
              <span className="text-xs font-mono text-slate-400">Target: 60h focus / month</span>
            </div>

            {/* 4 Weekly Radial Progress Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {monthlyWeeks.map((item) => {
                const isSelected = selectedDate === item.week;
                return (
                  <div
                    key={item.week}
                    onClick={() => setSelectedDate(item.week)}
                    className={`rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "bg-white/[0.06] shadow-inner ring-1 ring-white/[0.1] scale-[1.02]"
                        : "bg-slate-900/70 border border-white/[0.07] hover:border-blue-500/30 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="text-xs font-bold text-white tracking-tight">{item.week}</h3>
                      <p className="text-[10px] text-slate-400 font-mono">{item.range}</p>
                      
                      <div className="pt-2 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-400">Focus Time</span>
                          <span className="font-semibold text-white font-mono">{item.focusTime}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-400">Tasks Done</span>
                          <span className="font-semibold text-emerald-400 font-mono">{item.tasksDone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative w-16 h-16 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="9"
                        />
                        {item.percent > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="none"
                            stroke="url(#month-blue-grad)"
                            strokeWidth="9"
                            strokeDasharray="238.76"
                            strokeDashoffset={238.76 * (1 - item.percent / 100)}
                            strokeLinecap="round"
                          />
                        )}
                        <defs>
                          <linearGradient id="month-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-white font-mono">{item.percent}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monthly Summary Bar */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-400 block text-[10px]">Monthly Total Focus</span>
                  <span className="text-base font-bold text-white font-mono">{monthlySummary.focusTime}</span>
                </div>
                <div className="h-7 w-[1px] bg-white/[0.08]" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Completed Tasks</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {monthlySummary.tasksDoneRatio} ({monthlySummary.completionPercent}%)
                  </span>
                </div>
                <div className="h-7 w-[1px] bg-white/[0.08]" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Missed</span>
                  <span className="text-base font-bold text-rose-400 font-mono">{monthlySummary.totalMissed} tasks</span>
                </div>
              </div>


            </div>
          </div>
        )}

      </section>
    </main>
  );
}
