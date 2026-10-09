"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { getLocalDateString, getTodayTasks } from "../services/taskService";
import notificationService from "../services/notificationService";
import { notificationRotationManager } from "../services/notificationTemplates";
import reminderSyncService from "../services/reminderSyncService";

export function useDailyPlan() {
  const { state, updateTask } = useAppContext();
  const { user } = useAuth();
  const checkingRef = useRef(false);
  const lastAutomatedNudgeRef = useRef<number>(0);

  const userId = user?.id || null;
  const lang: "en" | "bn" = state.lang === "bn" ? "bn" : "en";
  const prefs = state.notifPreferences;

  // Helper: Check if user is in or approaching an active scheduled task window
  const isUserBusyWithTaskNearby = useCallback(() => {
    const todayTasks = getTodayTasks(state.tasks);
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    return todayTasks.some((task) => {
      const isDone = task.completed || task.status === "completed";
      if (isDone) return false;
      const targetTime = (task.reminderTime || task.time || "").trim();
      if (!targetTime) return false;
      const [rH, rM] = targetTime.split(":").map(Number);
      if (isNaN(rH) || isNaN(rM)) return false;
      const startMinutes = rH * 60 + rM;
      const estMinutes = task.estMinutes || 45;
      const endMinutes = startMinutes + estMinutes;
      // Protected window: 45 minutes before task start until 15 minutes after task end
      return currentTotalMinutes >= startMinutes - 45 && currentTotalMinutes <= endMinutes + 15;
    });
  }, [state.tasks]);

  // Helper: Check minimum 75-minute cooldown between automated engagement nudges
  const canSendAutomatedNudge = useCallback(() => {
    if (isUserBusyWithTaskNearby()) return false;
    const elapsed = Date.now() - lastAutomatedNudgeRef.current;
    return elapsed >= 75 * 60 * 1000; // 75 minutes minimum cooldown
  }, [isUserBusyWithTaskNearby]);

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

      // If task is completed, cancel remaining reminders locally and on backend server
      if (isDone) {
        notificationService.cancelTaskReminders(task.id);
        reminderSyncService.cancelTaskRemindersOnServer(task.id, userId);
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

      // C. Incomplete Task Reminder (around 30 minutes before scheduled end time)
      if (estMinutes >= 35) {
        const incompNotifId = `task_incomp_${task.id}_${todayStr}`;
        if (!notificationService.hasBeenSent(incompNotifId)) {
          const incompTriggerMinutes = endMinutes - 30;
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
    if (!canSendAutomatedNudge()) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // Check if user completed a focus session today
    const allSessions = [...(state.focusSessions || []), ...(state.focusLogs || [])];
    const hasFocusToday = allSessions.some((s: any) => {
      const sDate = s.date || (s.startTime ? s.startTime.split("T")[0] : "");
      return sDate === todayStr && (s.duration || s.completed);
    });

    if (hasFocusToday) {
      notificationService.markAsSent(`focus_rem_morn_${todayStr}`);
      notificationService.markAsSent(`focus_rem_eve_${todayStr}`);
      return;
    }

    // A. Morning Kickoff slot (08:30 - 09:30)
    if (currentH === 8 ? currentM >= 30 : currentH === 9 ? currentM <= 30 : false) {
      const notifId = `focus_rem_morn_${todayStr}`;
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
        lastAutomatedNudgeRef.current = Date.now();
      }
    }

    // B. Evening Focus slot (18:00 - 20:00)
    if (currentH >= 18 && currentH < 20) {
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
        lastAutomatedNudgeRef.current = Date.now();
      }
    }
  }, [prefs, state.focusSessions, state.focusLogs, lang, userId, canSendAutomatedNudge]);

  /**
   * 4. Time Log / Skill Practice Reminders
   * Rotated across natural slots: Morning (~10:15), Sunset (~17:15), Night (~20:15)
   * Only fires if learning topics exist, no practice today, and no task conflicts
   */
  const checkSkillReminders = useCallback(async () => {
    if (!prefs.enabled || prefs.skillReminders === false) return;
    if (!canSendAutomatedNudge()) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();

    // Check if learning logged today
    const hasLearningToday = (state.learningLogs || []).some(
      (log) => log.date === todayStr || ((log as any).createdAt && String((log as any).createdAt).startsWith(todayStr))
    );

    if (hasLearningToday) {
      notificationService.markAsSent(`skill_rem_${todayStr}`);
      return;
    }

    const folders = state.learningFolders || [];
    if (folders.length === 0) return;

    const activeTopic = folders[0]?.name || (lang === "bn" ? "টপিক" : "your skill");

    // Dynamic slot matching (Morning 10-11, Sunset 17-18, Night 20-21)
    const isSlotActive = (currentH === 10) || (currentH === 17) || (currentH === 20);

    if (isSlotActive) {
      const notifId = `skill_rem_${todayStr}`;
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
        lastAutomatedNudgeRef.current = Date.now();
      }
    }
  }, [prefs, state.learningFolders, state.learningLogs, lang, userId, canSendAutomatedNudge]);

  /**
   * 5. My Diary / Mind Space Reflection Reminder
   * Wind-down slot: Night (20:45 - 21:50)
   */
  const checkDiaryReminders = useCallback(async () => {
    if (!prefs.enabled || prefs.diaryReminder === false) return;
    if (!canSendAutomatedNudge()) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    if (currentH < 20 || (currentH === 20 && currentM < 45) || currentH >= 22) return;

    const notifId = `diary_rem_${todayStr}`;
    if (notificationService.hasBeenSent(notifId)) return;

    // Check if user has written diary today
    const diaryTopics = state.diaryTopics || [];
    const hasDiaryToday = diaryTopics.some((topic) =>
      topic.entries?.some((e) => (e.createdAt && e.createdAt.startsWith(todayStr)) || (e.updatedAt && e.updatedAt.startsWith(todayStr)))
    );

    if (hasDiaryToday) {
      notificationService.markAsSent(notifId);
      return;
    }

    const template = notificationRotationManager.getNext("diary_reminder", lang, {}, userId);
    await notificationService.send({
      id: notifId,
      category: "diary_reminder",
      templateId: template.templateId,
      appTag: template.appTag,
      title: template.title,
      body: template.message,
      orbMood: template.orbMood,
      type: "diary",
      actionRoute: "diary",
      requireInteraction: false,
    });
    lastAutomatedNudgeRef.current = Date.now();
  }, [prefs, state.diaryTopics, lang, userId, canSendAutomatedNudge]);

  /**
   * 6. Glory AI & Daily Inactivity Companion
   * Staggered slot: Early Evening (19:00 - 20:30)
   * Only fires if completely inactive today
   */
  const checkInactivityAndAICompanion = useCallback(async () => {
    if (!prefs.enabled) return;
    if (!canSendAutomatedNudge()) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();

    // Only between 19:00 and 20:30
    if (currentH < 19 || currentH >= 21) return;

    const todayTasks = getTodayTasks(state.tasks);
    const hasCompletedTask = todayTasks.some((t) => t.completed || t.status === "completed");
    const allSessions = [...(state.focusSessions || []), ...(state.focusLogs || [])];
    const hasFocus = allSessions.some((s: any) => {
      const sDate = s.date || (s.startTime ? s.startTime.split("T")[0] : "");
      return sDate === todayStr;
    });

    if (hasCompletedTask || hasFocus) {
      notificationService.markAsSent(`inact_rem_${todayStr}`);
      notificationService.markAsSent(`ai_comp_${todayStr}`);
      return;
    }

    // Glory AI Check-in
    if (prefs.aiCompanionReminder !== false) {
      const aiNotifId = `ai_comp_${todayStr}`;
      if (!notificationService.hasBeenSent(aiNotifId)) {
        const template = notificationRotationManager.getNext("ai_companion", lang, {}, userId);
        await notificationService.send({
          id: aiNotifId,
          category: "ai_companion",
          templateId: template.templateId,
          appTag: template.appTag,
          title: template.title,
          body: template.message,
          orbMood: template.orbMood,
          type: "ai",
          actionRoute: "ai-agent",
          requireInteraction: false,
        });
        lastAutomatedNudgeRef.current = Date.now();
        return;
      }
    }

    // Inactivity Nudge Fallback
    if (prefs.inactivityReminders !== false) {
      const notifId = `inact_rem_${todayStr}`;
      if (!notificationService.hasBeenSent(notifId)) {
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
        lastAutomatedNudgeRef.current = Date.now();
      }
    }
  }, [prefs, state.tasks, state.focusSessions, state.focusLogs, lang, userId, canSendAutomatedNudge]);

  /**
   * Sync all pending schedule reminders to the Service Worker for background dispatch
   */
  const syncScheduleToServiceWorker = useCallback(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!navigator.serviceWorker.controller) return;
    if (!prefs.enabled) return;

    try {
      const scheduled = reminderSyncService.buildScheduledReminders({
        tasks: state.tasks,
        focusSessions: state.focusSessions,
        learningFolders: state.learningFolders,
        learningLogs: state.learningLogs,
        notifPreferences: prefs,
        lang,
        userId,
      });

      const reminders = scheduled.map((r) => ({
        id: r.id,
        targetTimestamp: new Date(r.targetTime).getTime(),
        title: r.title,
        body: r.body,
        category: r.category,
        actionRoute: r.actionRoute,
        taskId: r.taskId,
        skillId: r.skillId,
        requireInteraction: Boolean(r.isUrgent),
        isUrgent: Boolean(r.isUrgent),
      }));

      navigator.serviceWorker.controller.postMessage({
        type: "SCHEDULE_REMINDERS",
        reminders,
      });
    } catch (err) {
      console.warn("[useDailyPlan] ServiceWorker sync warning:", err);
    }
  }, [prefs, state.tasks, state.focusSessions, state.learningFolders, state.learningLogs, lang, userId]);

  // Sync to Service Worker and Backend Server on state updates
  useEffect(() => {
    syncScheduleToServiceWorker();
    reminderSyncService.debounceSyncReminders({
      tasks: state.tasks,
      focusSessions: state.focusSessions,
      learningFolders: state.learningFolders,
      learningLogs: state.learningLogs,
      notifPreferences: prefs,
      lang,
      userId,
    });
  }, [syncScheduleToServiceWorker, state.tasks, state.focusSessions, state.learningFolders, state.learningLogs, prefs, lang, userId]);

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
        await checkDiaryReminders();
        await checkInactivityAndAICompanion();
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
    checkDiaryReminders,
    checkInactivityAndAICompanion,
    syncScheduleToServiceWorker,
  ]);
}

export default useDailyPlan;
