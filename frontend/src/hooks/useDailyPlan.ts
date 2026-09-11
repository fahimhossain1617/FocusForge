"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import {
  getLocalDateString,
  getTodayTasks,
  generateDailyPlanSummary,
} from "../services/taskService";
import notificationService from "../services/notificationService";

export function useDailyPlan() {
  const { state, showToast } = useAppContext();
  const checkingRef = useRef(false);

  /**
   * Helper to format 24h time to 12h readable time in BN or EN
   */
  const formatTimeDisplay = useCallback((timeStr: string, lang: "en" | "bn") => {
    try {
      const [hStr, mStr] = timeStr.split(":");
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr || "0", 10);
      const ampm = h >= 12 ? (lang === "bn" ? "দুপুর/সন্ধ্যা" : "PM") : (lang === "bn" ? "সকাল" : "AM");
      const h12 = h % 12 || 12;
      const formattedMinutes = String(m).padStart(2, "0");
      return `${h12}:${formattedMinutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  }, []);

  /**
   * 1. Evaluates and delivers the Daily Morning Plan notification.
   */
  const checkDailyMorningPlan = useCallback(async () => {
    const prefs = state.notifPreferences;
    if (!prefs?.enabled || !prefs?.dailyMorningPlan) return;
    if (notificationService.getPermission() !== "granted") return;

    const todayStr = getLocalDateString();
    const notifId = `daily_plan_${todayStr}`;

    // Already sent for today
    if (notificationService.hasBeenSent(notifId)) return;

    // Check scheduled morning time
    const scheduledTime = prefs.dailyMorningPlanTime || "07:00";
    const [schedH, schedM] = scheduledTime.split(":").map(Number);

    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // Trigger if current time is at or past the scheduled morning time
    const isTimeOrPast =
      currentH > schedH || (currentH === schedH && currentM >= schedM);

    if (isTimeOrPast) {
      const summary = generateDailyPlanSummary(state.tasks, state.lang);

      // If no tasks planned and user disabled motivational messages, skip
      if (summary.count === 0 && !prefs.motivationalNotifications) {
        notificationService.markAsSent(notifId);
        return;
      }

      await notificationService.send({
        id: notifId,
        title: summary.title,
        body: summary.body,
        tag: "daily-morning-plan",
        requireInteraction: true,
      });

      // Also trigger in-app toast for immediate visibility
      showToast(summary.title + ": " + (summary.count > 0 ? (state.lang === 'bn' ? `আজকের ${summary.count}টি টাস্ক নির্ধারিত আছে` : `${summary.count} tasks planned for today`) : summary.body), "info");
    }
  }, [state.notifPreferences, state.tasks, state.lang, showToast]);

  /**
   * 2. Evaluates individual scheduled task & planner time reminders for today.
   */
  const checkTaskReminders = useCallback(async () => {
    const prefs = state.notifPreferences;
    if (!prefs?.enabled || !prefs?.taskReminders) return;
    if (notificationService.getPermission() !== "granted") return;

    const todayStr = getLocalDateString();
    const todayTasks = getTodayTasks(state.tasks);
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // A. Check Task Reminders
    for (const task of todayTasks) {
      // Must not be completed
      if (task.completed || task.status === "completed") {
        continue;
      }

      // Check either explicit reminderTime or scheduled task time
      const targetTime = (task.reminderTime || task.time || "").trim();
      if (!targetTime) continue;

      const notifId = `task_rem_${task.id}_${todayStr}_${targetTime}`;
      if (notificationService.hasBeenSent(notifId)) {
        continue;
      }

      // Parse target time
      const [rH, rM] = targetTime.split(":").map(Number);
      if (isNaN(rH) || isNaN(rM)) continue;

      // Check if task reminder time has arrived
      const isDue = currentH > rH || (currentH === rH && currentM >= rM);

      if (isDue) {
        const isBn = state.lang === "bn";
        const taskName = task.title || task.name || (isBn ? "আপনার টাস্ক" : "Your task");
        const formattedTime = formatTimeDisplay(targetTime, state.lang);

        const title = isBn ? "FocusForge রিমাইন্ডার" : "FocusForge Task Reminder";
        const body = isBn
          ? `"${taskName}"\nআজকে ${formattedTime} এ আপনি এই কাজটি করার পরিকল্পনা করেছিলেন। এখনই শুরু করার সময়!`
          : `"${taskName}"\nYou scheduled this task for ${formattedTime} today. Time to get started!`;

        await notificationService.send({
          id: notifId,
          title,
          body,
          tag: `task-reminder-${task.id}`,
          requireInteraction: true,
          data: { taskId: task.id },
        });

        // In-app audible/visual toast fallback
        showToast(`⏰ ${title}: ${taskName} (${formattedTime})`, "info");
      }
    }

    // B. Check Planner TimeBlocks scheduled for today
    if (state.timeBlocks && Array.isArray(state.timeBlocks)) {
      const todayBlocks = state.timeBlocks.filter((b) => b.date === todayStr);

      for (const block of todayBlocks) {
        if (!block.startTime) continue;
        const blockTime = block.startTime.trim();
        const blockId = block.id || `${block.date}_${blockTime}_${block.label}`;
        const notifId = `block_rem_${blockId}_${todayStr}_${blockTime}`;

        if (notificationService.hasBeenSent(notifId)) {
          continue;
        }

        const [bH, bM] = blockTime.split(":").map(Number);
        if (isNaN(bH) || isNaN(bM)) continue;

        const isDue = currentH > bH || (currentH === bH && currentM >= bM);

        if (isDue) {
          const isBn = state.lang === "bn";
          const blockLabel = block.label || (isBn ? "শিডিউল সেশন" : "Scheduled session");
          const formattedTime = formatTimeDisplay(blockTime, state.lang);

          const title = isBn ? "FocusForge প্ল্যানার রিমাইন্ডার" : "FocusForge Planner Reminder";
          const body = isBn
            ? `"${blockLabel}"\nআজকে ${formattedTime} এ আপনার এই সেশনটি শুরু করার সময় হয়েছে।`
            : `"${blockLabel}"\nYour scheduled ${formattedTime} session is starting now.`;

          await notificationService.send({
            id: notifId,
            title,
            body,
            tag: `block-reminder-${blockId}`,
            requireInteraction: true,
            data: { blockId },
          });

          showToast(`🗓️ ${title}: ${blockLabel} (${formattedTime})`, "info");
        }
      }
    }
  }, [state.notifPreferences, state.tasks, state.timeBlocks, state.lang, formatTimeDisplay, showToast]);

  /**
   * 3. Focus Session Nudge / Reminder
   */
  const checkFocusReminder = useCallback(async () => {
    const prefs = state.notifPreferences;
    if (!prefs?.enabled || !prefs?.focusSessionReminder) return;
    if (notificationService.getPermission() !== "granted") return;

    const todayStr = getLocalDateString();
    const notifId = `focus_nudge_${todayStr}`;
    if (notificationService.hasBeenSent(notifId)) return;

    const now = new Date();
    // Midday focus reminder at 14:00 (2:00 PM)
    if (now.getHours() >= 14) {
      const todayTasks = getTodayTasks(state.tasks);
      const pendingTasks = todayTasks.filter((t) => !t.completed && t.status !== "completed");

      if (pendingTasks.length > 0) {
        const isBn = state.lang === "bn";
        const title = isBn ? "ফোকাস সেশনের সময় হয়েছে" : "Time for a Focus Session";
        const body = isBn
          ? `আজ আপনার ${pendingTasks.length}টি টাস্ক বাকি আছে। কাজে গভীরভাবে মনোযোগ দিতে একটি ফোকাস সেশন শুরু করুন!`
          : `You have ${pendingTasks.length} tasks remaining today. Jump into a focus session to stay productive!`;

        await notificationService.send({
          id: notifId,
          title,
          body,
          tag: "focus-session-nudge",
          requireInteraction: false,
        });

        showToast(`🎯 ${title}`, "info");
      }
    }
  }, [state.notifPreferences, state.tasks, state.lang, showToast]);

  /**
   * Master polling scheduler: checks every 10 seconds for exact minute precision
   */
  useEffect(() => {
    const runChecks = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        await checkDailyMorningPlan();
        await checkTaskReminders();
        await checkFocusReminder();
      } catch (err) {
        console.warn("[useDailyPlan] check error:", err);
      } finally {
        checkingRef.current = false;
      }
    };

    // Run immediately on mount / state change
    runChecks();

    // Check periodically every 10 seconds
    const interval = setInterval(runChecks, 10000);

    // Also run immediately when user switches tabs back or window gains focus
    const handleActivity = () => {
      if (document.visibilityState === "visible") {
        runChecks();
      }
    };

    document.addEventListener("visibilitychange", handleActivity);
    window.addEventListener("focus", handleActivity);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleActivity);
      window.removeEventListener("focus", handleActivity);
    };
  }, [checkDailyMorningPlan, checkTaskReminders, checkFocusReminder]);
}

export default useDailyPlan;
