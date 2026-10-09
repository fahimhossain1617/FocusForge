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

    // Check if user completed a focus session today
    const allSessions = [...(state.focusSessions || []), ...(state.focusLogs || [])];
    const hasFocusToday = allSessions.some((s: any) => {
      const sDate = s.date || (s.startTime ? s.startTime.split("T")[0] : "");
      return sDate === todayStr && (s.duration || s.completed);
    });

    if (hasFocusToday) {
      notificationService.markAsSent(`focus_rem_mid_${todayStr}`);
      return;
    }

    // Midday reminder (13:30 - 15:30)
    if (currentH >= 13 && currentH < 16) {
      const notifId = `focus_rem_mid_${todayStr}`;
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
   * Staggered slot: Late Afternoon (16:30 - 18:00)
   * Only fires if learning topics exist, no practice today, and no task conflicts
   */
  const checkSkillReminders = useCallback(async () => {
    if (!prefs.enabled || prefs.skillReminders === false) return;
    if (!canSendAutomatedNudge()) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // Check if learning logged today
    const hasLearningToday = (state.learningLogs || []).some(
      (log) => log.date === todayStr || ((log as any).createdAt && String((log as any).createdAt).startsWith(todayStr))
    );

    if (hasLearningToday) {
      notificationService.markAsSent(`skill_rem_aft_${todayStr}`);
      return;
    }

    const folders = state.learningFolders || [];
    if (folders.length === 0) return;

    const activeTopic = folders[0]?.name || (lang === "bn" ? "টপিক" : "your skill");

    // Afternoon reminder slot (16:30 - 18:00)
    if (currentH === 16 ? currentM >= 30 : currentH === 17) {
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
        lastAutomatedNudgeRef.current = Date.now();
      }
    }
  }, [prefs, state.learningFolders, state.learningLogs, lang, userId, canSendAutomatedNudge]);

  /**
   * 5. My Diary / Mind Space Reflection Reminder
   * Staggered slot: Night (20:30 - 22:00)
   */
  const checkDiaryReminders = useCallback(async () => {
    if (!prefs.enabled || prefs.diaryReminder === false) return;
    if (!canSendAutomatedNudge()) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    if (currentH < 20 || (currentH === 20 && currentM < 30) || currentH >= 22) return;

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
   * Staggered slot: Early Evening (18:30 - 20:00)
   * Only fires if completely inactive today
   */
  const checkInactivityAndAICompanion = useCallback(async () => {
    if (!prefs.enabled) return;
    if (!canSendAutomatedNudge()) return;

    const todayStr = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // Only between 18:30 and 20:00
    if (currentH < 18 || (currentH === 18 && currentM < 30) || currentH >= 20) return;

    const todayTasks = getTodayTasks(state.tasks);
    const hasCompletedTask = todayTasks.some((t) => t.completed || t.status === "completed");
    const allSessions = [...(state.focusSessions || []), ...(state.focusLogs || [])];
    const hasFocus = allSessions.some((s: any) => {
      const sDate = s.date || (s.startTime ? s.startTime.split("T")[0] : "");
      return sDate === todayStr;
    });

    if (hasCompletedTask || hasFocus) {
      notificationService.markAsSent(`inactivity_${todayStr}`);
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
      const notifId = `inactivity_${todayStr}`;
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

          const estMinutes = task.estMinutes || 45;
          if (estMinutes >= 35) {
            const incompReminderTime = taskStartTime + (estMinutes - 30) * 60 * 1000;
            const incompTemplate = notificationRotationManager.getNext("task_incomplete", lang, { taskName }, userId);
            scheduledList.push({
              id: `task_incomp_${task.id}_${todayStr}`,
              targetTimestamp: incompReminderTime,
              title: incompTemplate.title,
              body: incompTemplate.message,
              category: "task_incomplete",
              actionRoute: "tasks",
              taskId: task.id,
            });
          }
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

      // 5. Diary nudges
      if (prefs.diaryReminder !== false) {
        const diaryTemplate = notificationRotationManager.getNext("diary_reminder", lang, {}, userId);
        const diaryTime = new Date(year, month, date, 21, 0, 0).getTime();
        scheduledList.push({
          id: `diary_rem_${todayStr}`,
          targetTimestamp: diaryTime,
          title: diaryTemplate.title,
          body: diaryTemplate.message,
          category: "diary_reminder",
          actionRoute: "diary",
        });
      }

      navigator.serviceWorker.controller.postMessage({
        type: "SCHEDULE_REMINDERS",
        reminders: scheduledList,
      });
    } catch {}
  }, [prefs, state.tasks, state.focusSessions, state.focusLogs, state.learningFolders, state.learningLogs, state.diaryTopics, lang, userId]);

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
