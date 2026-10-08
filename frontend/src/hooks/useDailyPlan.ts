"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { getLocalDateString, getTodayTasks } from "../services/taskService";
import notificationService from "../services/notificationService";
import { notificationRotationManager } from "../services/notificationTemplates";

export function useDailyPlan() {
  const { state, updateTask } = useAppContext();
  const { user } = useAuth();
  const checkingRef = useRef(false);

  const userId = user?.id || null;
  const lang: "en" | "bn" = state.lang === "bn" ? "bn" : "en";
  const prefs = state.notifPreferences;

  // Sync active user identity and config with notification service
  useEffect(() => {
    notificationService.setUserId(userId);
    notificationService.updateConfig({
      dailyLimit: prefs.dailyLimit || 5,
      quietHoursEnabled: prefs.quietHoursEnabled ?? true,
      quietHoursStart: prefs.quietHoursStart || "22:00",
      quietHoursEnd: prefs.quietHoursEnd || "07:00",
      soundEnabled: prefs.soundEnabled ?? true,
    });
  }, [userId, prefs]);

  /**
   * 1. Daily Morning Plan Notification
   */
  const checkDailyMorningPlan = useCallback(async () => {
    if (!prefs.enabled || prefs.dailyMorningPlan === false) return;

    const todayStr = getLocalDateString();
    const notifId = `daily_plan_${todayStr}`;
    if (notificationService.hasBeenSent(notifId)) return;

    const scheduledTime = prefs.dailyMorningPlanTime || "07:00";
    const [schedH, schedM] = scheduledTime.split(":").map(Number);

    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const isDue = currentH > schedH || (currentH === schedH && currentM >= schedM);
    if (!isDue) return;

    const template = notificationRotationManager.getNext("daily_plan", lang, {}, userId);

    await notificationService.send({
      id: notifId,
      category: "daily_plan",
      templateId: template.templateId,
      appTag: template.appTag,
      title: template.title,
      body: template.message,
      orbMood: template.orbMood,
      type: "planner",
      actionRoute: "planner",
      requireInteraction: false,
    });
  }, [prefs, lang, userId]);

  /**
   * 2. Scheduled Task Reminders (Start Reminder, Pre-Reminder, Incomplete Reminder)
   */
  const checkTaskReminders = useCallback(async () => {
    if (!prefs.enabled || prefs.taskReminders === false) return;

    const todayStr = getLocalDateString();
    const todayTasks = getTodayTasks(state.tasks);
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    for (const task of todayTasks) {
      const isDone = task.completed || task.status === "completed";

      // If task is completed, cancel remaining reminders
      if (isDone) {
        notificationService.cancelTaskReminders(task.id);
        continue;
      }

      const taskName = task.title || task.name || (lang === "bn" ? "টাস্ক" : "Task");
      const targetTime = (task.reminderTime || task.time || "").trim();
      if (!targetTime) continue;

      const [rH, rM] = targetTime.split(":").map(Number);
      if (isNaN(rH) || isNaN(rM)) continue;

      const startMinutes = rH * 60 + rM;
      const estMinutes = task.estMinutes || 45;
      const endMinutes = startMinutes + estMinutes;

      // A. Pre-Reminder (5 minutes before scheduled start time)
      const preNotifId = `task_pre_${task.id}_${todayStr}`;
      if (!notificationService.hasBeenSent(preNotifId)) {
        const preTriggerMinutes = startMinutes - 5;
        if (currentTotalMinutes >= preTriggerMinutes && currentTotalMinutes < startMinutes) {
          const template = notificationRotationManager.getNext(
            "task_pre_reminder",
            lang,
            { taskName },
            userId
          );

          await notificationService.send({
            id: preNotifId,
            category: "task_pre_reminder",
            templateId: template.templateId,
            appTag: template.appTag,
            title: template.title,
            body: template.message,
            orbMood: template.orbMood,
            type: "task",
            actionRoute: "tasks",
            taskId: task.id,
            requireInteraction: false,
          });
        }
      }

      // B. Task Start Reminder (around task start time)
      const startNotifId = `task_start_${task.id}_${todayStr}`;
      if (!notificationService.hasBeenSent(startNotifId)) {
        if (currentTotalMinutes >= startMinutes && currentTotalMinutes < startMinutes + 30) {
          const template = notificationRotationManager.getNext(
            "task_start",
            lang,
            { taskName },
            userId
          );

          await notificationService.send({
            id: startNotifId,
            category: "task_start",
            templateId: template.templateId,
            appTag: template.appTag,
            title: template.title,
            body: template.message,
            orbMood: template.orbMood,
            type: "task",
            actionRoute: "tasks",
            taskId: task.id,
            requireInteraction: true,
            isUrgent: true,
          });
        }
      }

      // C. Incomplete Task Reminder (around 20 minutes before scheduled end time)
      if (estMinutes >= 35) {
        const incompNotifId = `task_incomp_${task.id}_${todayStr}`;
        if (!notificationService.hasBeenSent(incompNotifId)) {
          const incompTriggerMinutes = endMinutes - 20;
          if (currentTotalMinutes >= incompTriggerMinutes && currentTotalMinutes < endMinutes + 15) {
            const template = notificationRotationManager.getNext(
              "task_incomplete",
              lang,
              { taskName },
              userId
            );

            await notificationService.send({
              id: incompNotifId,
              category: "task_incomplete",
              templateId: template.templateId,
              appTag: template.appTag,
              title: template.title,
              body: template.message,
              orbMood: template.orbMood,
              type: "task",
              actionRoute: "tasks",
              taskId: task.id,
              requireInteraction: false,
            });
          }
        }
      }
    }
  }, [prefs, state.tasks, lang, userId]);

  /**
   * 3. Focus Session Daily Reminders
   * If user has not completed a focus session today:
   * First daytime nudge (13:00 - 16:30), and evening nudge (18:00 - 21:30)
   */
  const checkFocusReminders = useCallback(async () => {
    if (!prefs.enabled || prefs.focusSessionReminder === false) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();

    // Check if user completed a focus session today
    const allSessions = [...(state.focusSessions || []), ...(state.focusLogs || [])];
    const hasFocusToday = allSessions.some((s: any) => {
      const sDate = s.date || (s.startTime ? s.startTime.split("T")[0] : "");
      return sDate === todayStr && (s.duration || s.completed);
    });

    if (hasFocusToday) {
      // Completed! Mark sent so no more focus reminders fire today
      notificationService.markAsSent(`focus_rem_day_${todayStr}`);
      notificationService.markAsSent(`focus_rem_eve_${todayStr}`);
      return;
    }

    // Midday reminder (13:00 - 16:30)
    if (currentH >= 13 && currentH < 17) {
      const notifId = `focus_rem_day_${todayStr}`;
      if (!notificationService.hasBeenSent(notifId)) {
        const template = notificationRotationManager.getNext("focus_reminder", lang, {}, userId);
        await notificationService.send({
          id: notifId,
          category: "focus_reminder",
          templateId: template.templateId,
          appTag: template.appTag,
          title: template.title,
          body: template.message,
          orbMood: template.orbMood,
          type: "focus",
          actionRoute: "focus",
          requireInteraction: false,
        });
      }
    }

    // Evening reminder (18:00 - 21:30)
    if (currentH >= 18 && currentH < 22) {
      const notifId = `focus_rem_eve_${todayStr}`;
      if (!notificationService.hasBeenSent(notifId)) {
        const template = notificationRotationManager.getNext("focus_reminder", lang, {}, userId);
        await notificationService.send({
          id: notifId,
          category: "focus_reminder",
          templateId: template.templateId,
          appTag: template.appTag,
          title: template.title,
          body: template.message,
          orbMood: template.orbMood,
          type: "focus",
          actionRoute: "focus",
          requireInteraction: false,
        });
      }
    }
  }, [prefs, state.focusSessions, state.focusLogs, lang, userId]);

  /**
   * 4. Time Log / Skill Practice Reminders
   * If user has active skill/learning topics and hasn't logged practice today
   * Mid-afternoon nudge (16:00 - 18:30) and evening nudge (19:30 - 21:30)
   */
  const checkSkillReminders = useCallback(async () => {
    if (!prefs.enabled || prefs.skillReminders === false) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();

    // Check if learning logged today
    const hasLearningToday = (state.learningLogs || []).some(
      (log) => log.date === todayStr || ((log as any).createdAt && String((log as any).createdAt).startsWith(todayStr))
    );

    if (hasLearningToday) {
      notificationService.markAsSent(`skill_rem_aft_${todayStr}`);
      notificationService.markAsSent(`skill_rem_eve_${todayStr}`);
      return;
    }

    const folders = state.learningFolders || [];
    if (folders.length === 0) return;

    const activeTopic = folders[0]?.name || (lang === "bn" ? "টপিক" : "your skill");

    // Afternoon reminder (16:00 - 18:30)
    if (currentH >= 16 && currentH < 19) {
      const notifId = `skill_rem_aft_${todayStr}`;
      if (!notificationService.hasBeenSent(notifId)) {
        const template = notificationRotationManager.getNext(
          "skill_reminder",
          lang,
          { skillName: activeTopic },
          userId
        );

        await notificationService.send({
          id: notifId,
          category: "skill_reminder",
          templateId: template.templateId,
          appTag: template.appTag,
          title: template.title,
          body: template.message,
          orbMood: template.orbMood,
          type: "learning",
          actionRoute: "learning",
          skillId: folders[0]?.id,
          requireInteraction: false,
        });
      }
    }

    // Evening reminder (19:30 - 22:00)
    if (currentH >= 19 && currentH < 22) {
      const notifId = `skill_rem_eve_${todayStr}`;
      if (!notificationService.hasBeenSent(notifId)) {
        const template = notificationRotationManager.getNext(
          "skill_reminder",
          lang,
          { skillName: activeTopic },
          userId
        );

        await notificationService.send({
          id: notifId,
          category: "skill_reminder",
          templateId: template.templateId,
          appTag: template.appTag,
          title: template.title,
          body: template.message,
          orbMood: template.orbMood,
          type: "learning",
          actionRoute: "learning",
          skillId: folders[0]?.id,
          requireInteraction: false,
        });
      }
    }
  }, [prefs, state.learningFolders, state.learningLogs, lang, userId]);

  /**
   * 5. Inactivity Reminder
   * Triggered if no meaningful activity has occurred today by late afternoon
   */
  const checkInactivityReminder = useCallback(async () => {
    if (!prefs.enabled || prefs.inactivityReminders === false) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();

    // Only between 15:00 and 19:00
    if (currentH < 15 || currentH >= 19) return;

    const notifId = `inactivity_${todayStr}`;
    if (notificationService.hasBeenSent(notifId)) return;

    // Check if user has done anything today
    const todayTasks = getTodayTasks(state.tasks);
    const hasCompletedTask = todayTasks.some((t) => t.completed || t.status === "completed");
    const allSessions = [...(state.focusSessions || []), ...(state.focusLogs || [])];
    const hasFocus = allSessions.some((s: any) => {
      const sDate = s.date || (s.startTime ? s.startTime.split("T")[0] : "");
      return sDate === todayStr;
    });

    // If active work happened, skip inactivity reminder
    if (hasCompletedTask || hasFocus) {
      notificationService.markAsSent(notifId);
      return;
    }

    const template = notificationRotationManager.getNext("inactivity", lang, {}, userId);
    await notificationService.send({
      id: notifId,
      category: "inactivity",
      templateId: template.templateId,
      appTag: template.appTag,
      title: template.title,
      body: template.message,
      orbMood: template.orbMood,
      type: "system",
      actionRoute: "today",
      requireInteraction: false,
    });
  }, [prefs, state.tasks, state.focusSessions, state.focusLogs, lang, userId]);

  /**
   * Sync all pending schedule reminders to the Service Worker for background dispatch
   */
  const syncScheduleToServiceWorker = useCallback(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!navigator.serviceWorker.controller) return;
    if (!prefs.enabled) return;

    try {
      const todayStr = getLocalDateString();
      const scheduledList: Array<{
        id: string;
        targetTimestamp: number;
        title: string;
        body: string;
        category: string;
        actionRoute: string;
        taskId?: number | string;
        skillId?: string;
        requireInteraction?: boolean;
        isUrgent?: boolean;
      }> = [];

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const date = today.getDate();

      // 1. Morning Plan
      if (prefs.dailyMorningPlan !== false) {
        const [mH, mM] = (prefs.dailyMorningPlanTime || "07:00").split(":").map(Number);
        const morningTarget = new Date(year, month, date, mH, mM, 0).getTime();
        const planTemplate = notificationRotationManager.getNext("daily_plan", lang, {}, userId);
        scheduledList.push({
          id: `daily_plan_${todayStr}`,
          targetTimestamp: morningTarget,
          title: planTemplate.title,
          body: planTemplate.message,
          category: "daily_plan",
          actionRoute: "planner",
        });
      }

      // 2. Task Reminders
      if (prefs.taskReminders !== false) {
        const todayTasks = getTodayTasks(state.tasks);
        for (const task of todayTasks) {
          if (task.completed || task.status === "completed") continue;
          const targetTime = (task.reminderTime || task.time || "").trim();
          if (!targetTime) continue;

          const [rH, rM] = targetTime.split(":").map(Number);
          if (isNaN(rH) || isNaN(rM)) continue;

          const taskName = task.title || task.name || (lang === "bn" ? "টাস্ক" : "Task");
          const taskStartTime = new Date(year, month, date, rH, rM, 0).getTime();
          const preReminderTime = taskStartTime - 5 * 60 * 1000; // 5 mins before

          const preTemplate = notificationRotationManager.getNext("task_pre_reminder", lang, { taskName }, userId);
          const startTemplate = notificationRotationManager.getNext("task_start", lang, { taskName }, userId);

          scheduledList.push({
            id: `task_pre_${task.id}_${todayStr}`,
            targetTimestamp: preReminderTime,
            title: preTemplate.title,
            body: preTemplate.message,
            category: "task_pre_reminder",
            actionRoute: "tasks",
            taskId: task.id,
          });

          scheduledList.push({
            id: `task_start_${task.id}_${todayStr}`,
            targetTimestamp: taskStartTime,
            title: startTemplate.title,
            body: startTemplate.message,
            category: "task_start",
            actionRoute: "tasks",
            taskId: task.id,
            requireInteraction: true,
            isUrgent: true,
          });
        }
      }

      // 3. Focus nudges
      if (prefs.focusSessionReminder !== false) {
        const allSessions = [...(state.focusSessions || []), ...(state.focusLogs || [])];
        const hasFocusToday = allSessions.some((s: any) => {
          const sDate = s.date || (s.startTime ? s.startTime.split("T")[0] : "");
          return sDate === todayStr && (s.duration || s.completed);
        });

        if (!hasFocusToday) {
          const focusTemplate = notificationRotationManager.getNext("focus_reminder", lang, {}, userId);
          const middayFocusTime = new Date(year, month, date, 13, 30, 0).getTime();
          const eveningFocusTime = new Date(year, month, date, 18, 30, 0).getTime();

          scheduledList.push({
            id: `focus_rem_day_${todayStr}`,
            targetTimestamp: middayFocusTime,
            title: focusTemplate.title,
            body: focusTemplate.message,
            category: "focus_reminder",
            actionRoute: "focus",
          });

          scheduledList.push({
            id: `focus_rem_eve_${todayStr}`,
            targetTimestamp: eveningFocusTime,
            title: focusTemplate.title,
            body: focusTemplate.message,
            category: "focus_reminder",
            actionRoute: "focus",
          });
        }
      }

      // 4. Skill practice nudges
      if (prefs.skillReminders !== false && (state.learningFolders || []).length > 0) {
        const hasLearningToday = (state.learningLogs || []).some(
          (log) => log.date === todayStr || ((log as any).createdAt && String((log as any).createdAt).startsWith(todayStr))
        );

        if (!hasLearningToday) {
          const activeTopic = state.learningFolders[0]?.name || (lang === "bn" ? "টপিক" : "your skill");
          const skillTemplate = notificationRotationManager.getNext("skill_reminder", lang, { skillName: activeTopic }, userId);
          const aftSkillTime = new Date(year, month, date, 16, 30, 0).getTime();
          const eveSkillTime = new Date(year, month, date, 20, 0, 0).getTime();

          scheduledList.push({
            id: `skill_rem_aft_${todayStr}`,
            targetTimestamp: aftSkillTime,
            title: skillTemplate.title,
            body: skillTemplate.message,
            category: "skill_reminder",
            actionRoute: "learning",
            skillId: state.learningFolders[0]?.id,
          });

          scheduledList.push({
            id: `skill_rem_eve_${todayStr}`,
            targetTimestamp: eveSkillTime,
            title: skillTemplate.title,
            body: skillTemplate.message,
            category: "skill_reminder",
            actionRoute: "learning",
            skillId: state.learningFolders[0]?.id,
          });
        }
      }

      navigator.serviceWorker.controller.postMessage({
        type: "SCHEDULE_REMINDERS",
        reminders: scheduledList,
      });
    } catch {}
  }, [prefs, state.tasks, state.focusSessions, state.focusLogs, state.learningFolders, state.learningLogs, lang, userId]);

  // Sync to Service Worker on state updates
  useEffect(() => {
    syncScheduleToServiceWorker();
  }, [syncScheduleToServiceWorker]);

  /**
   * Master Polling Scheduler: Checks every 10 seconds for exact minute timing
   */
  useEffect(() => {
    const runChecks = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        await checkDailyMorningPlan();
        await checkTaskReminders();
        await checkFocusReminders();
        await checkSkillReminders();
        await checkInactivityReminder();
        syncScheduleToServiceWorker();
      } catch (err) {
        console.warn("[useDailyPlan] scheduler check error:", err);
      } finally {
        checkingRef.current = false;
      }
    };

    runChecks();
    const interval = setInterval(runChecks, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runChecks();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [
    checkDailyMorningPlan,
    checkTaskReminders,
    checkFocusReminders,
    checkSkillReminders,
    checkInactivityReminder,
    syncScheduleToServiceWorker,
  ]);
}

export default useDailyPlan;
