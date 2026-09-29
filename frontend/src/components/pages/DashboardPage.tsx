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
import { DashboardSkeleton } from "../ui/skeleton";

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

function greetingText(name: string, lang?: string) {
  const hour = new Date().getHours();
  if (lang === 'bn') {
    let timeGreeting = "শুভ সন্ধ্যা";
    if (hour < 12) timeGreeting = "শুভ সকাল";
    else if (hour < 17) timeGreeting = "শুভ অপরাহ্ন";
    else if (hour < 21) timeGreeting = "শুভ সন্ধ্যা";
    else timeGreeting = "শুভ রাত্রি";
    return `${timeGreeting}, ${name.split(" ")[0]}`;
  }
  let timeGreeting = "Good Evening";
  if (hour < 12) timeGreeting = "Good Morning";
  else if (hour < 17) timeGreeting = "Good Afternoon";
  else if (hour < 21) timeGreeting = "Good Evening";
  else timeGreeting = "Good Night";

  return `${timeGreeting}, ${name.split(" ")[0]}`;
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

      return state.learningFolders.slice(0, 4).map((folder, idx) => {
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
    return <DashboardSkeleton />;
  }

  return (
    <main className="w-full max-w-[1600px] mx-auto pb-16 space-y-6 text-foreground select-none">
      {/* Top Header: Clean, dynamic greeting with NO emojis */}
      <header className="pt-1 px-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-[26px] sm:text-[28px] md:text-[32px] font-bold tracking-tight text-foreground leading-[1.2] break-words">
            {greetingText(userName, state.lang)}
          </h1>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-[15px] text-muted-foreground font-normal leading-relaxed">
            {state.lang === 'bn' ? "আপনার আজকের মনোযোগ আগামীকালের ভবিষ্যৎ তৈরি করে।" : "Your focus today builds your future tomorrow."}
          </p>
        </div>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(today)}
            className="self-start sm:self-auto px-3 py-1.5 min-h-[36px] rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-none flex items-center gap-2"
          >
            {state.lang === 'bn' ? "আজকের দিনে ফিরে যান" : "Back to Today"}
          </button>
        )}
      </header>

      {/* Top Section: 3 Balanced Cards (Today's Tasks, Today's Focus + Distractions, Current Skills) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-6 items-stretch">
        
        {/* Card 1: Today's Tasks (Main Card: #FFFFFF, #DCE5F0 border, radius 18, shadow 0 8px 28px) */}
        <section
          className="dashboard-card card rounded-[18px] p-4 sm:p-5 md:p-6 bg-white dark:bg-card border border-[#DCE5F0] dark:border-border shadow-none flex flex-col justify-between"
        >
          <div>
            {/* Header: Title + Subtitle + Icon Badge '+' button */}
            <div className="flex items-start justify-between gap-3 pb-3">
              <div>
                <h2 className="text-[17px] md:text-[18px] font-bold text-[#111827] dark:text-foreground tracking-tight">{tasksTitle}</h2>
                <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5 font-normal">
                  {state.lang === 'bn' ? `${tasksList.length} টি কাজ | ${completedCount} টি সম্পন্ন | ${pendingCount} টি বাকি` : `${tasksList.length} tasks | ${completedCount} completed | ${pendingCount} pending`}
                </p>
              </div>
              <button
                onClick={() => navigateTo("planner")}
                className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-[#EBF3FE] hover:bg-[#DBEAFE] dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-[#1D4ED8] dark:text-blue-300 border border-[#D0E1FD] dark:border-blue-500/30 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title={state.lang === 'bn' ? "প্ল্যানারে কাজ যোগ করুন" : "Add task in Planner"}
                aria-label={state.lang === 'bn' ? "প্ল্যানারে কাজ যোগ করুন" : "Add task in Planner"}
              >
                <Plus size={17} strokeWidth={2.5} />
              </button>
            </div>

            {/* Task Items (Inner box: #F7FAFE, #DCE5F0 border, radius 12, no shadow) */}
            <div className="mt-2 space-y-2">
              {tasksList.length > 0 ? (
                tasksList.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleTask(item)}
                    className="group flex items-center justify-between gap-2.5 py-2.5 px-3 rounded-xl bg-[#F7FAFE] dark:bg-white/[0.02] border border-[#DCE5F0] dark:border-white/[0.06] transition-all cursor-pointer hover:border-[#5B8DEF]/40"
                  >
                    {/* Left: Checkbox (Check circle only #2E9B73) + Task Name */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                      <div
                        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                          item.completed
                            ? "bg-[#2E9B73] border-2 border-[#2E9B73] text-white"
                            : "border-2 border-[#DCE5F0] dark:border-slate-600 hover:border-[#5B8DEF] bg-white dark:bg-slate-900/50"
                        }`}
                        aria-label={`Mark task ${item.completed ? "pending" : "done"}`}
                      >
                        {item.completed && <Check size={11} strokeWidth={3.5} />}
                      </div>
                      <span
                        className={`text-xs sm:text-[13px] font-medium leading-snug break-words line-clamp-2 transition-colors ${
                          item.completed ? "text-[#8290A5] line-through opacity-75" : "text-[#111827] dark:text-foreground"
                        }`}
                        title={item.name}
                      >
                        {item.name || (state.lang === 'bn' ? "শিরোনামহীন কাজ" : "Untitled Task")}
                      </span>
                    </div>

                    {/* Right side: Time Chip & Action */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.time && (
                        <span className="text-[11px] text-[#52627A] dark:text-slate-400 font-mono px-2 py-0.5 rounded-lg bg-white dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/[0.06] whitespace-nowrap shadow-none">
                          {item.time}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleOpenTaskInPlanner(item, e)}
                        className="text-[#8290A5] hover:text-[#111827] dark:hover:text-white w-6 h-6 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10 shrink-0"
                        title={state.lang === 'bn' ? "প্ল্যানারে খুলুন" : "Open in Planner"}
                        aria-label={state.lang === 'bn' ? "প্ল্যানারে খুলুন" : "Open in Planner"}
                      >
                        <MoreVertical size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-[#8290A5] text-sm flex flex-col items-center">
                  <Check size={24} className="text-[#8290A5] mb-2" />
                  {state.lang === 'bn' ? "এই দিনের জন্য কোনো কাজ রেকর্ড করা হয়নি" : "No tasks recorded for this day"}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Card 2: Today's Focus (Focus Time #5B8DEF, Break Time #D99A32, Distractions #D95C68) */}
        <section
          className="dashboard-card card rounded-[18px] p-4 sm:p-5 md:p-6 bg-white dark:bg-card border border-[#DCE5F0] dark:border-border shadow-none flex flex-col justify-between"
        >
          <div>
            {/* Header: Title + Subtitle + Icon Badge '+' button */}
            <div className="flex items-start justify-between gap-3 pb-3">
              <div>
                <h2 className="text-[17px] md:text-[18px] font-bold text-[#111827] dark:text-foreground tracking-tight">{focusTitle}</h2>
                <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5 font-normal">
                  {state.lang === 'bn' ? "মনোযোগের সময় এবং দৈনিক বিবরণ" : "Focus time & daily breakdown"}
                </p>
              </div>
              <button
                onClick={() => navigateTo("focus")}
                className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-[#EBF3FE] hover:bg-[#DBEAFE] dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-[#1D4ED8] dark:text-blue-300 border border-[#D0E1FD] dark:border-blue-500/30 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title={state.lang === 'bn' ? "ফোকাস সেশন শুরু করুন" : "Start a Focus session"}
                aria-label={state.lang === 'bn' ? "ফোকাস সেশন শুরু করুন" : "Start a Focus session"}
              >
                <Plus size={17} strokeWidth={2.5} />
              </button>
            </div>

            {/* Main Center Gauge and Breakdown */}
            <div className="mt-2 flex items-center justify-between gap-5">
              {/* Radial Donut Ring */}
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background Track #E5EDF7 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    strokeWidth="9"
                    className="stroke-[#E5EDF7] dark:stroke-white/[0.06]"
                  />

                  {/* 1. Focus Time Segment (#5B8DEF) */}
                  {selectedFocusStats.focusLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#5B8DEF"
                      strokeWidth="9"
                      strokeDasharray={`${selectedFocusStats.focusLen} 238.761`}
                      strokeDashoffset={selectedFocusStats.focusOffset}
                      strokeLinecap="round"
                    />
                  )}

                  {/* 2. Break Time Segment (#D99A32) */}
                  {selectedFocusStats.breakLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="9"
                      strokeDasharray={`${selectedFocusStats.breakLen} 238.761`}
                      strokeDashoffset={selectedFocusStats.breakOffset}
                      strokeLinecap="round"
                    />
                  )}

                  {/* 3. Distraction Segment (#D95C68) */}
                  {selectedFocusStats.distractionLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#D95C68"
                      strokeWidth="9"
                      strokeDasharray={`${selectedFocusStats.distractionLen} 238.761`}
                      strokeDashoffset={selectedFocusStats.distractionOffset}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </div>

              {/* Focus Time & Break Time breakdown with exact legend dots */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-[#52627A] dark:text-foreground font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5B8DEF] shrink-0" />
                    {state.lang === 'bn' ? "মনোযোগের সময়" : "Focus Time"}
                  </span>
                  <span className="font-bold text-[#111827] dark:text-foreground font-mono tabular-nums text-xs">{selectedFocusStats.focusTime}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-[#52627A] dark:text-foreground font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                    {state.lang === 'bn' ? "বিরতির সময়" : "Break Time"}
                  </span>
                  <span className="font-bold text-[#10B981] dark:text-emerald-400 font-mono tabular-nums text-xs">{selectedFocusStats.breakTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Compact Distractions Info (#D95C68) */}
          <div className="mt-4 pt-3 border-t border-[#DCE5F0] dark:border-white/[0.06] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#52627A] dark:text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-[#D95C68] shrink-0" />
              <span>{state.lang === 'bn' ? "দৈনিক বিক্ষেপ:" : "Daily Distractions:"}</span>
              <span className="font-bold text-[#D95C68] font-mono tabular-nums">
                {selectedFocusStats.distractionCount > 0 ? `${selectedFocusStats.distractionCount}` : "0"}
              </span>
            </div>
            <span className="text-[11px] text-[#8290A5] dark:text-muted-foreground truncate max-w-[180px]">
              {selectedFocusStats.distractionSummary}
            </span>
          </div>
        </section>

        {/* Card 3: Current Skills (Skill Builder with clean inline progress lines and (+) button) */}
        <section
          className="dashboard-card card rounded-[18px] p-4 sm:p-5 md:p-6 bg-white dark:bg-card border border-[#DCE5F0] dark:border-border shadow-none flex flex-col justify-between"
        >
          <div>
            {/* Header: Title + Plus (+) button to Skill Builder */}
            <div className="flex items-start justify-between pb-3">
              <div>
                <h2 className="text-[17px] md:text-[18px] font-bold text-[#111827] dark:text-foreground tracking-tight">
                  {state.lang === 'bn' ? "বর্তমান দক্ষতা" : "Current Skills"}
                </h2>
                <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5 font-normal">
                  {state.lang === 'bn' ? "দক্ষতা বৃদ্ধির অগ্রগতি" : "Skill Builder progress"}
                </p>
              </div>
              <button
                onClick={() => navigateTo("learning")}
                className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-[#EBF3FE] hover:bg-[#DBEAFE] dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-[#1D4ED8] dark:text-blue-300 border border-[#D0E1FD] dark:border-blue-500/30 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title={state.lang === 'bn' ? "দক্ষতা বিল্ডারে দক্ষতা পরিচালনা করুন" : "Manage skills in Skill Builder"}
                aria-label={state.lang === 'bn' ? "দক্ষতা বিল্ডারে দক্ষতা পরিচালনা করুন" : "Manage skills in Skill Builder"}
              >
                <Plus size={17} strokeWidth={2.5} />
              </button>
            </div>

            {/* Skills List: Same-line layout with track #E5EDF7 and Navy #223A5E fill */}
            <div className="mt-2 space-y-2.5">
              {skillsList.length > 0 ? (
                skillsList.map((skill) => {
                  const IconComponent = skill.icon;
                  return (
                    <div
                      key={skill.id}
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem("focusforge_learning_open_folder", skill.id);
                          window.dispatchEvent(new CustomEvent("focusforge:open_learning_folder", { detail: { folderId: skill.id } }));
                        }
                        navigateTo("learning");
                      }}
                      className="flex items-center gap-3 py-2 px-2.5 rounded-xl bg-[#F7FAFE] dark:bg-white/[0.02] border border-[#DCE5F0] dark:border-white/[0.06] transition-colors cursor-pointer hover:bg-[#EBF3FE] dark:hover:bg-white/[0.06]"
                    >
                      {/* Icon Badge: Bright #EBF3FE with vivid #1D4ED8 icon */}
                      <div
                        className="w-7 h-7 rounded-xl bg-[#EBF3FE] dark:bg-blue-500/20 text-[#1D4ED8] dark:text-blue-300 border border-[#D0E1FD]/80 dark:border-blue-500/30 flex items-center justify-center shrink-0"
                      >
                        <IconComponent size={13} />
                      </div>

                      {/* Skill Name */}
                      <span 
                        className="text-xs sm:text-[13px] font-semibold text-[#111827] dark:text-foreground min-w-[70px] max-w-[130px] truncate shrink-0"
                        title={skill.name}
                      >
                        {skill.name}
                      </span>

                      <div className="flex-1 flex justify-end">
                        {skill.progress >= 100 ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#2E9B73]/10 text-[#2E9B73] dark:bg-emerald-500/10 dark:text-emerald-400">
                            {state.lang === 'bn' ? "সম্পন্ন" : "Completed"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#5B8DEF]/10 text-[#1D4ED8] dark:bg-blue-500/10 dark:text-blue-400">
                            {state.lang === 'bn' ? "চলমান" : "In progress"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-[#8290A5] text-sm flex flex-col items-center">
                  <BookOpen size={24} className="text-[#8290A5] mb-2" />
                  <p className="font-semibold text-[#111827] dark:text-foreground">
                    {state.lang === 'bn' ? "এখনও কোনো দক্ষতা যোগ করা হয়নি" : "No skills added yet"}
                  </p>
                  <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-1">
                    {state.lang === 'bn' ? "আপনার অগ্রগতি ট্র্যাক করতে দক্ষতা বিল্ডারে একটি দক্ষতা যোগ করুন" : "Add a skill in Skill Builder to track your progress"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* Bottom Section: Focus & Productivity Progress (Main Card: #FFFFFF, #DCE5F0 border, radius 18, shadow 0 8px 28px) */}
      <section
        className="dashboard-card card rounded-[18px] p-4 sm:p-6 md:p-7 bg-white dark:bg-card border border-[#DCE5F0] dark:border-border shadow-none"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-[17px] md:text-[18px] font-bold text-[#111827] dark:text-foreground tracking-tight">
                {state.lang === 'bn' ? "পারফরম্যান্স" : "Performance"}
              </h2>
              <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5 font-normal">
                {progressView === "weekly"
                  ? (state.lang === 'bn' ? "সাপ্তাহিক ওভারভিউ · রিয়েল-টাইম ৭-দিনের ফোকাস এবং কাজ" : "Weekly Overview · Real-time 7-day focus & task performance")
                  : (state.lang === 'bn' ? "মাসিক ওভারভিউ · ৪-সপ্তাহের ব্রেকডাউন এবং সামগ্রিক পারফরম্যান্স" : "Monthly Overview · 4-Week breakdown and cumulative performance")}
              </p>
            </div>
          </div>

          {/* Toggle: [ Weekly ] [ Monthly ] */}
          <div className="dashboard-period-toggle inline-flex rounded-xl p-1 bg-[#F7FAFE] dark:bg-slate-900/90 border border-[#DCE5F0] dark:border-white/[0.08] shrink-0 self-start sm:self-auto shadow-none">
            <button
              onClick={() => setProgressView("weekly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                progressView === "weekly"
                  ? "bg-[#223A5E] text-white shadow-none dark:bg-blue-600 dark:text-white"
                  : "text-[#52627A] dark:text-muted-foreground hover:text-[#111827] dark:hover:text-foreground hover:bg-[#E7F0FF]/60 dark:hover:bg-white/[0.04]"
              }`}
            >
              {state.lang === 'bn' ? "সাপ্তাহিক" : "Weekly"}
            </button>
            <button
              onClick={() => setProgressView("monthly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                progressView === "monthly"
                  ? "bg-[#223A5E] text-white shadow-none dark:bg-blue-600 dark:text-white"
                  : "text-[#52627A] dark:text-muted-foreground hover:text-[#111827] dark:hover:text-foreground hover:bg-[#E7F0FF]/60 dark:hover:bg-white/[0.04]"
              }`}
            >
              {state.lang === 'bn' ? "মাসিক" : "Monthly"}
            </button>
          </div>
        </div>

        {/* View Switch: Weekly Bar Chart vs Monthly Radial Week Cards */}
        {progressView === "weekly" ? (
          /* WEEKLY VIEW */
          <div className="mt-4 space-y-6">
            {/* Legend & Date Range */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5 text-[#52627A] dark:text-slate-300 font-medium">
                <span className="text-sm font-bold text-[#111827] dark:text-white">
                  {state.lang === 'bn' ? "সাপ্তাহিক ওভারভিউ" : "Weekly Overview"}
                </span>
                <span className="text-[#8290A5]">·</span>
                <span className="text-[#52627A] dark:text-slate-400 font-mono text-xs">
                  {weeklyData.length > 0
                    ? `${weeklyData[0].day}, ${weeklyData[0].date} – ${weeklyData[weeklyData.length - 1].day}, ${weeklyData[weeklyData.length - 1].date}`
                    : (state.lang === 'bn' ? "বর্তমান ৭ দিন" : "Current 7 Days")}
                </span>
              </div>

              {/* 3 Indicators Legend: Focus #5B8DEF, Done #2E9B73, Missed #D95C68 */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-5 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-[#52627A] dark:text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#5B8DEF] shrink-0" />
                  {state.lang === 'bn' ? "মনোযোগের সময়" : "Focus Time"}
                </span>
                <span className="flex items-center gap-1.5 text-[#52627A] dark:text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2E9B73] shrink-0" />
                  {state.lang === 'bn' ? "কাজ সম্পন্ন" : "Tasks Done"}
                </span>
                <span className="flex items-center gap-1.5 text-[#52627A] dark:text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#D95C68] shrink-0" />
                  {state.lang === 'bn' ? "কাজ মিস হয়েছে" : "Tasks Missed"}
                </span>
              </div>
            </div>

            {/* Professional Scaled Bar Chart */}
            <div className="pt-6 pb-2 min-h-[250px] flex items-end justify-between gap-1 sm:gap-4 md:gap-6 border-b border-[#DCE5F0] dark:border-white/[0.06] px-0.5 sm:px-4">
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
                      isSelected ? "bg-[#E7F0FF]/80 dark:bg-white/[0.06] ring-1 ring-[#5B8DEF] dark:ring-white/[0.1] scale-[1.02]" : "hover:bg-[#F7FAFE] dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-16 z-20 bg-white dark:bg-slate-900/95 border border-[#DCE5F0] dark:border-blue-500/30 rounded-xl p-2.5 shadow-none text-xs whitespace-nowrap pointer-events-none">
                        <p className="font-bold text-[#111827] dark:text-white">{d.day}, {d.date}</p>
                        <p className="text-[#5B8DEF] font-medium">{state.lang === 'bn' ? "মনোযোগ:" : "Focus:"} {d.focusTime}</p>
                        <p className="text-[#2E9B73] font-medium">{state.lang === 'bn' ? "কাজ সম্পন্ন:" : "Tasks Done:"} {d.tasksDone}</p>
                        <p className="text-[#D95C68] font-medium">{state.lang === 'bn' ? "কাজ মিস হয়েছে:" : "Tasks Missed:"} {d.tasksMissed}</p>
                      </div>
                    )}

                    {/* Top Focus Time Tag */}
                    <span className="text-[11px] sm:text-xs font-mono text-[#52627A] dark:text-slate-300 mb-2.5 font-semibold">
                      {d.focusTime}
                    </span>

                    {/* Clean scale bar columns */}
                    <div className="flex items-end justify-center gap-1 sm:gap-1.5 h-36 w-full max-w-[62px]">
                      {/* Focus Time Scale Bar (#5B8DEF) */}
                      <div
                        className="w-2.5 xs:w-3.5 sm:w-4.5 rounded-sm transition-all duration-300"
                        style={{
                          height: `${focusHeightPercent}%`,
                          background: d.focusMinutes > 0 ? "#5B8DEF" : "#E5EDF7",
                        }}
                      />

                      {/* Tasks Done Scale Bar (#2E9B73) */}
                      <div
                        className="w-2.5 xs:w-3.5 sm:w-4.5 rounded-sm transition-all duration-300"
                        style={{
                          height: `${doneHeightPercent}%`,
                          background: d.tasksDone > 0 ? "#2E9B73" : "#E5EDF7",
                        }}
                      />

                      {/* Tasks Missed Scale Bar (#D95C68) */}
                      {missedHeightPercent > 0 ? (
                        <div
                          className="w-2.5 xs:w-3.5 sm:w-4.5 rounded-sm transition-all duration-300"
                          style={{
                            height: `${missedHeightPercent}%`,
                            background: "#D95C68",
                          }}
                        />
                      ) : (
                        <div className="w-2.5 xs:w-3.5 sm:w-4.5 h-1 rounded-sm bg-[#E5EDF7] dark:bg-white/[0.04]" />
                      )}
                    </div>

                    {/* Day & Date Labels */}
                    <div className="mt-3 text-center">
                      <span className="block text-xs sm:text-sm font-bold text-[#111827] dark:text-foreground">{d.day}</span>
                      <span className="block text-[11px] text-[#8290A5] dark:text-muted-foreground font-mono mt-0.5">{d.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom 3 Summary Metric Cards (Inner Box: #F7FAFE, border #DCE5F0, radius 12) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#F7FAFE] dark:bg-slate-900/60 border border-[#DCE5F0] dark:border-white/[0.06] shadow-none">
                <div>
                  <p className="text-xs text-[#52627A] dark:text-muted-foreground font-medium">
                    {state.lang === 'bn' ? "সাপ্তাহিক মোট ফোকাস টাইম" : "Total Weekly Focus Time"}
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#111827] dark:text-foreground tracking-tight">{weeklySummary.focusTime}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F7FAFE] dark:bg-slate-900/60 border border-[#DCE5F0] dark:border-white/[0.06] shadow-none">
                <div>
                  <p className="text-xs text-[#52627A] dark:text-muted-foreground font-medium">
                    {state.lang === 'bn' ? "সাপ্তাহিক সম্পন্ন টাস্ক" : "Weekly Tasks Completed"}
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#111827] dark:text-foreground tracking-tight">{weeklySummary.tasksDoneRatio}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F7FAFE] dark:bg-slate-900/60 border border-[#DCE5F0] dark:border-white/[0.06] shadow-none">
                <div>
                  <p className="text-xs text-[#52627A] dark:text-muted-foreground font-medium">
                    {state.lang === 'bn' ? "সাপ্তাহিক মিস হওয়া টাস্ক" : "Weekly Missed Tasks"}
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#111827] dark:text-foreground tracking-tight">{weeklySummary.totalMissed}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MONTHLY VIEW */
          <div className="mt-4 space-y-5 animate-in fade-in duration-300">
            {/* Header info */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <Calendar size={14} className="text-blue-500 dark:text-blue-400" />
                {state.lang === 'bn' ? "মাসিক অগ্রগতি · ৪-সপ্তাহের ওভারভিউ" : "Monthly Progress · 4-Week Overview"}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {state.lang === 'bn' ? "লক্ষ্য: মাসে ৬০ ঘণ্টা মনোযোগ" : "Target: 60h focus / month"}
              </span>
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
                        ? "bg-blue-50/80 dark:bg-white/[0.06] shadow-none ring-1 ring-blue-300 dark:ring-white/[0.1] scale-[1.02]"
                        : "bg-white dark:bg-slate-900/70 border border-[#DCE5F0] dark:border-white/[0.07] hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-white/[0.03] shadow-none"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="text-xs font-bold text-[#111827] dark:text-white tracking-tight">{item.week}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.range}</p>
                      
                      <div className="pt-2 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500 dark:text-slate-400">{state.lang === 'bn' ? "মনোযোগের সময়" : "Focus Time"}</span>
                          <span className="font-semibold text-[#111827] dark:text-white font-mono">{item.focusTime}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500 dark:text-slate-400">{state.lang === 'bn' ? "কাজ সম্পন্ন" : "Tasks Done"}</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{item.tasksDone}</span>
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
                          strokeWidth="9"
                          className="stroke-[#E5EDF7] dark:stroke-white/[0.06]"
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
                            <stop offset="0%" stopColor="#5B8DEF" />
                            <stop offset="100%" stopColor="#223A5E" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-[#111827] dark:text-white font-mono">{item.percent}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monthly Bottom 3 Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#DCE5F0] dark:border-white/[0.06] shadow-none">
                <div>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
                    {state.lang === 'bn' ? "মাসিক মোট ফোকাস টাইম" : "Total Monthly Focus Time"}
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#111827] dark:text-foreground tracking-tight">{monthlySummary.focusTime}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#DCE5F0] dark:border-white/[0.06] shadow-none">
                <div>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
                    {state.lang === 'bn' ? "মাসিক সম্পন্ন টাস্ক" : "Monthly Tasks Completed"}
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#111827] dark:text-foreground tracking-tight">
                    {monthlySummary.tasksDoneRatio} <span className="text-sm font-normal text-slate-500 dark:text-muted-foreground">({monthlySummary.completionPercent}%)</span>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#DCE5F0] dark:border-white/[0.06] shadow-none">
                <div>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
                    {state.lang === 'bn' ? "মাসিক মিস হওয়া টাস্ক" : "Monthly Missed Tasks"}
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#111827] dark:text-foreground tracking-tight">
                    {monthlySummary.totalMissed} {state.lang === 'bn' ? "টাস্ক" : "tasks"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
