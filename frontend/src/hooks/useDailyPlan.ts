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
  const { state } = useAppContext();
  const checkingRef = useRef(false);

  /**
   * Evaluates and delivers the Daily Morning Plan notification.
   */
  const checkDailyMorningPlan = useCallback(async () => {
    const prefs = state.notifPreferences;
    if (!prefs.enabled || !prefs.dailyMorningPlan) return;
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
        // Mark as sent so we don't keep checking today
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
    }
  }, [state.notifPreferences, state.tasks, state.lang]);

  /**
   * Evaluates individual scheduled task reminders for today.
   */
  const checkTaskReminders = useCallback(async () => {
    const prefs = state.notifPreferences;
    if (!prefs.enabled || !prefs.taskReminders) return;
    if (notificationService.getPermission() !== "granted") return;

    const todayStr = getLocalDateString();
    const todayTasks = getTodayTasks(state.tasks);

    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, "0");
    const currentM = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentH}:${currentM}`;

    for (const task of todayTasks) {
      // Must have reminder enabled, valid reminder time, and not be completed
      if (!task.reminderEnabled || !task.reminderTime || task.completed || task.status === "completed") {
        continue;
      }

      // Exact or within-the-minute match
      const taskTime = task.reminderTime.trim();
      const notifId = `task_rem_${task.id}_${todayStr}_${taskTime}`;

      if (notificationService.hasBeenSent(notifId)) {
        continue;
      }

      // Check if task reminder time has arrived
      const [rH, rM] = taskTime.split(":").map(Number);
      const isDue =
        now.getHours() > rH || (now.getHours() === rH && now.getMinutes() >= rM);

      if (isDue) {
        const title = state.lang === "bn" ? "FocusForge রিমাইন্ডার" : "FocusForge Reminder";
        const taskName = task.title || task.name;
        const body =
          state.lang === "bn"
            ? `${taskName}\nআপনার নির্ধারিত টাস্ক শুরু করার সময় হয়েছে।`
            : `${taskName}\nIt's time to start your scheduled task.`;

        await notificationService.send({
          id: notifId,
          title,
          body,
          tag: `task-reminder-${task.id}`,
          requireInteraction: true,
          data: { taskId: task.id },
        });
      }
    }
  }, [state.notifPreferences, state.tasks, state.lang]);

  /**
   * Master polling scheduler
   */
  useEffect(() => {
    const runChecks = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        await checkDailyMorningPlan();
        await checkTaskReminders();
      } catch (err) {
        console.warn("[useDailyPlan] check error:", err);
      } finally {
        checkingRef.current = false;
      }
    };

    // Run immediately on mount / settings change
    runChecks();

    // Check periodically every 25 seconds
    const interval = setInterval(runChecks, 25000);

    // Also run immediately when user switches tabs back to FocusForge
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runChecks();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkDailyMorningPlan, checkTaskReminders]);
}

export default useDailyPlan;
