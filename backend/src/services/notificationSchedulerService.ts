/**
 * FocusForge / Focentia Notification Scheduler Service
 *
 * Runs background checks for all registered users with active Web Push subscriptions.
 * Dispatches OS-level Web Push notifications directly to users' devices when the app is closed:
 * 1. Task Reminders:
 *    - 5 minutes before scheduled start time
 *    - At scheduled task start time
 *    - 30 minutes before scheduled task end time if incomplete
 * 2. Focus Session Nudges:
 *    - Midday & evening reminders if no focus session completed today
 * 3. Skill Practice Reminders:
 *    - Afternoon/evening nudges if learning topics exist but not practiced today
 * 4. Diary / Mind Space Reminders:
 *    - Evening reminder (20:30-22:00) if no diary entry written in the last 1-2 days
 * 5. Glory AI & Daily Inactivity Re-engagement:
 *    - Re-engagement companion alert if inactive for 24h+
 */

import { pool } from './db';
import { sendWebPushToUser, WebPushPayload } from './webPushService';

// In-memory deduplication set for the running instance
const sentSchedulerDedupe = new Set<string>();

// Predefined template pool (English and Bengali)
const SCHEDULER_TEMPLATES = {
  task_pre_reminder: [
    { en: "Upcoming in 5 minutes: {taskName}.", bn: "৫ মিনিট পর শুরু হচ্ছে: {taskName}।" },
    { en: "{taskName} starts in 5 minutes. Take a breath and get ready.", bn: "৫ মিনিটের মধ্যেই {taskName} শুরু হবে। একটু প্রস্তুতি নিয়ে নাও।" },
    { en: "Heads up: {taskName} is scheduled in 5 minutes.", bn: "মনে করিয়ে দিচ্ছি: ৫ মিনিট পর {taskName} শুরু হবে।" },
  ],
  task_start: [
    { en: "Your scheduled session starts now. Ready for {taskName}?", bn: "তোমার নির্ধারিত সময় শুরু হয়েছে। {taskName}-এর জন্য প্রস্তুত?" },
    { en: "Time to begin: {taskName}. Let's dive in.", bn: "{taskName} শুরু করার সময় হয়েছে। চল কাজে নামি।" },
    { en: "Starting {taskName} now. Take it one step at a time.", bn: "{taskName} শুরু হচ্ছে। মনোযোগ দিয়ে শুরু করো।" },
  ],
  task_incomplete: [
    { en: "How is {taskName} going? About 30 minutes left to wrap up.", bn: "{taskName} কেমন চলছে? গুছিয়ে নেওয়ার জন্য প্রায় ৩০ মিনিট সময় আছে।" },
    { en: "{taskName} scheduled block is nearing its end. Need a few more minutes?", bn: "{taskName}-এর সময় প্রায় শেষের দিকে। আরো কিছুটা সময় লাগবে?" },
    { en: "Checking in on {taskName}. Take your time and finish smoothly.", bn: "{taskName}-এর খবর কি? শান্তভাবে শেষ করে নাও।" },
  ],
  focus_reminder: [
    { en: "Have you had your Focus session today? You can start now.", bn: "আজকের Focus session হয়েছে? চাইলে এখনই শুরু করতে পারো।" },
    { en: "Your Focus session is still waiting. A short session is enough.", bn: "তোমার Focus session এখনো বাকি। ছোট একটা session দিয়েই শুরু করতে পারো।" },
    { en: "Today could use a little Focus. Start whenever you're ready.", bn: "আজ একটু Focus করলে ভালো হবে। যখন ready, শুরু করো।" },
  ],
  skill_reminder: [
    { en: "No practice logged yet for {skillName}. Even 15 minutes counts.", bn: "{skillName}-এ আজ এখনো কোনো প্র্যাকটিস রেকর্ড করা হয়নি। অল্প কিছু সময়ও অনেক কাজে দেয়।" },
    { en: "Keep your skills sharp. Have you spent time on {skillName} today?", bn: "দক্ষতা ধরে রাখতে আজ {skillName}-কে একটু সময় দিয়েছ কি?" },
    { en: "Time for a little practice with {skillName}?", bn: "{skillName}-এর জন্য একটু সময় বের করবে?" },
  ],
  diary_reminder: [
    { en: "How was your day? Take a minute to write in your Diary.", bn: "আজকের দিনটা কেমন কাটল? ডায়েরিতে লিখে রাখতে পারো।" },
    { en: "Capture today's thoughts and moments in your Mind Space.", bn: "আজকের বিশেষ মুহূর্ত ও ভাবনাগুলো ডায়েরিতে বন্দি করে রাখো।" },
    { en: "A quiet moment for yourself. Write down what you felt today.", bn: "নিজের সাথে কিছুক্ষণ শান্ত সময় কাটাও। আজকের অনুভূতিগুলো লিখে ফেলো।" },
  ],
  ai_companion: [
    { en: "Haven't seen you today! Glory AI is ready if you want to chat or plan ahead.", bn: "আজ তোমার দেখা মেলেনি! নতুন কোনো প্ল্যান বা আলোচনার জন্য গ্লোরি এআই প্রস্তুত।" },
    { en: "Need a hand organizing your tasks or studies? Talk with Glory AI anytime.", bn: "পড়াশোনা বা কাজের প্ল্যান করতে কোনো সাহায্য লাগবে? গ্লোরি এআই-এর সাথে কথা বলো।" },
    { en: "Take a minute to check in. Let Glory AI help you stay on track.", bn: "একটু সময় নিয়ে অ্যাপে ঢোকো। কাজের ধারায় ফিরতে গ্লোরি এআই সাহায্য করবে।" },
  ],
};

function pickTemplate(category: keyof typeof SCHEDULER_TEMPLATES, lang: 'en' | 'bn', vars: Record<string, string> = {}) {
  const list = SCHEDULER_TEMPLATES[category] || SCHEDULER_TEMPLATES.focus_reminder;
  const item = list[Math.floor(Math.random() * list.length)];
  let text = lang === 'bn' ? item.bn : item.en;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}

function isQuietHours(startStr: string = '22:00', endStr: string = '07:00', now: Date = new Date()): boolean {
  try {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = startStr.split(':').map(Number);
    const [eH, eM] = endStr.split(':').map(Number);
    const startMinutes = sH * 60 + (sM || 0);
    const endMinutes = eH * 60 + (eM || 0);

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

/**
 * Execute a single cycle of the notification background scheduler
 */
export async function runNotificationSchedulerCycle(): Promise<{ evaluatedUsers: number; dispatchedCount: number }> {
  let evaluatedUsers = 0;
  let dispatchedCount = 0;

  try {
    // 1. Fetch all distinct users who have active push subscriptions
    const { rows: userRows } = await pool.query(`
      SELECT DISTINCT p.user_id,
        COALESCE(s.push_enabled, true) as push_enabled,
        COALESCE(s.task_reminders, true) as task_reminders,
        COALESCE(s.focus_reminders, true) as focus_reminders,
        COALESCE(s.skill_reminders, true) as skill_reminders,
        COALESCE(s.inactivity_reminders, true) as inactivity_reminders,
        COALESCE(s.quiet_hours_enabled, true) as quiet_hours_enabled,
        COALESCE(s.quiet_hours_start, '22:00') as quiet_hours_start,
        COALESCE(s.quiet_hours_end, '07:00') as quiet_hours_end,
        prof.preferred_language
      FROM push_subscriptions p
      LEFT JOIN user_notification_settings s ON s.user_id = p.user_id
      LEFT JOIN profiles prof ON prof.id = p.user_id
    `);

    if (!userRows || userRows.length === 0) {
      return { evaluatedUsers: 0, dispatchedCount: 0 };
    }

    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = now.toISOString().split('T')[0];
    const currentH = now.getHours();

    for (const user of userRows) {
      evaluatedUsers++;
      const userId = user.user_id;
      if (!userId || user.push_enabled === false) continue;

      const lang: 'en' | 'bn' = user.preferred_language === 'en' ? 'en' : 'bn';
      const inQuiet = user.quiet_hours_enabled && isQuietHours(user.quiet_hours_start, user.quiet_hours_end, now);

      // Helper to dispatch Web Push and record into DB + memory dedupe
      const dispatchPush = async (payload: WebPushPayload, dedupeKey: string) => {
        if (sentSchedulerDedupe.has(dedupeKey)) return;
        sentSchedulerDedupe.add(dedupeKey);

        // Record in DB if not existing
        try {
          const { rows: notifRows } = await pool.query(
            `SELECT id FROM user_notifications WHERE id = $1 AND user_id = $2`,
            [dedupeKey, userId]
          );
          if (notifRows && notifRows.length > 0) return;

          await pool.query(
            `INSERT INTO user_notifications (id, user_id, type, category, title, message, action_route, read, task_id, skill_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [
              dedupeKey,
              userId,
              payload.category || 'system',
              payload.category || 'system',
              payload.title,
              payload.body,
              payload.actionRoute || 'today',
              payload.taskId ? Number(payload.taskId) : null,
              payload.skillId || null,
            ]
          );
        } catch (dbErr) {
          console.warn('[Scheduler DB Log Error]:', dbErr);
        }

        const res = await sendWebPushToUser(userId, payload);
        if (res.sentCount > 0) {
          dispatchedCount += res.sentCount;
        }
      };

      // =========================================================================
      // 1. Task Reminders (5m before, task start, 30m before end if incomplete)
      // Top Priority: Explicit user scheduled tasks always trigger on time
      // =========================================================================
      let taskDispatchedThisCycle = false;
      let hasActiveOrUpcomingTaskNearby = false;

      try {
        const { rows: taskRows } = await pool.query(
          `SELECT id, title, name, reminder_time, time, est_minutes, est_hours, status, completed
           FROM tasks
           WHERE user_id = $1 AND (target_date::text LIKE $2 OR target_date IS NULL)`,
          [userId, `${todayStr}%`]
        );

        for (const task of taskRows) {
          const isDone = task.completed || task.status === 'completed';
          if (isDone) continue;

          const taskName = task.title || task.name || (lang === 'bn' ? 'টাস্ক' : 'Task');
          const targetTime = (task.reminder_time || task.time || '').trim();
          if (!targetTime) continue;

          const [rH, rM] = targetTime.split(':').map(Number);
          if (isNaN(rH) || isNaN(rM)) continue;

          const startMinutes = rH * 60 + rM;
          const estMinutes = Number(task.est_minutes) || (Number(task.est_hours) ? Number(task.est_hours) * 60 : 45);
          const endMinutes = startMinutes + estMinutes;

          // Check if user is in an active or upcoming task window (within 45m before start or during task)
          if (currentTotalMinutes >= startMinutes - 45 && currentTotalMinutes <= endMinutes + 15) {
            hasActiveOrUpcomingTaskNearby = true;
          }

          if (user.task_reminders === false || inQuiet) continue;

          // A. 5 Minutes Before Task Start
          const preDedupeKey = `task_pre_${task.id}_${todayStr}`;
          const preTrigger = startMinutes - 5;
          if (currentTotalMinutes >= preTrigger && currentTotalMinutes < startMinutes) {
            const body = pickTemplate('task_pre_reminder', lang, { taskName });
            await dispatchPush({
              id: preDedupeKey,
              title: lang === 'bn' ? 'আসন্ন টাস্ক' : 'Upcoming Task',
              body,
              category: 'task_pre_reminder',
              actionRoute: 'tasks',
              taskId: task.id,
              isUrgent: false,
            }, preDedupeKey);
            taskDispatchedThisCycle = true;
          }

          // B. At Task Start Time
          const startDedupeKey = `task_start_${task.id}_${todayStr}`;
          if (currentTotalMinutes >= startMinutes && currentTotalMinutes < startMinutes + 15) {
            const body = pickTemplate('task_start', lang, { taskName });
            await dispatchPush({
              id: startDedupeKey,
              title: lang === 'bn' ? 'টাস্ক শুরু করার সময় হয়েছে' : 'Time to Start Task',
              body,
              category: 'task_start',
              actionRoute: 'tasks',
              taskId: task.id,
              isUrgent: true,
              requireInteraction: true,
            }, startDedupeKey);
            taskDispatchedThisCycle = true;
          }

          // C. 30 Minutes Before End (if incomplete)
          if (estMinutes >= 35) {
            const incompDedupeKey = `task_incomp_${task.id}_${todayStr}`;
            const incompTrigger = endMinutes - 30;
            if (currentTotalMinutes >= incompTrigger && currentTotalMinutes < endMinutes + 10) {
              const body = pickTemplate('task_incomplete', lang, { taskName });
              await dispatchPush({
                id: incompDedupeKey,
                title: lang === 'bn' ? 'কাজের অগ্রগতি' : 'Task Check-in',
                body,
                category: 'task_incomplete',
                actionRoute: 'tasks',
                taskId: task.id,
                isUrgent: false,
              }, incompDedupeKey);
              taskDispatchedThisCycle = true;
            }
          }
        }
      } catch (taskErr) {
        console.warn('[Scheduler Task Check Error]:', taskErr);
      }

      // If a task notification was already sent in this cycle, DO NOT send general engagement nudges
      if (taskDispatchedThisCycle || inQuiet) continue;

      // =========================================================================
      // Intelligent Anti-Clustering & Cooldown Check for Automated Nudges
      // Ensure at least 75 minutes gap between any automated engagement nudges
      // and do not send nudges if a user task is starting in <= 45 minutes.
      // =========================================================================
      if (hasActiveOrUpcomingTaskNearby) {
        // User has a task coming up or ongoing. Suppress general nudges to protect focus.
        continue;
      }

      let canSendAutomatedNudge = true;
      try {
        const { rows: recentNotifRows } = await pool.query(
          `SELECT created_at FROM user_notifications 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [userId]
        );

        if (recentNotifRows && recentNotifRows.length > 0) {
          const lastCreatedAt = new Date(recentNotifRows[0].created_at).getTime();
          const elapsedMs = now.getTime() - lastCreatedAt;
          const minGapMs = 75 * 60 * 1000; // 75 minutes minimum cooldown between non-task notifications
          if (elapsedMs < minGapMs) {
            canSendAutomatedNudge = false;
          }
        }
      } catch (cooldownErr) {
        console.warn('[Scheduler Cooldown Check Error]:', cooldownErr);
      }

      if (!canSendAutomatedNudge) continue;

      let automatedNudgeSentThisCycle = false;

      // =========================================================================
      // 2. Focus Reminders (Midday Window: 13:30 - 15:30)
      // Dedicated slot: Only fires if no focus session completed today
      // =========================================================================
      if (!automatedNudgeSentThisCycle && user.focus_reminders !== false && currentH >= 13 && currentH < 16) {
        try {
          const { rows: focusRows } = await pool.query(
            `SELECT id FROM focus_sessions 
             WHERE user_id = $1 AND (created_at::text LIKE $2 OR start_time::text LIKE $2)
             LIMIT 1`,
            [userId, `${todayStr}%`]
          );

          const hasFocusToday = focusRows && focusRows.length > 0;
          if (!hasFocusToday) {
            const focusDedupeKey = `focus_rem_mid_${todayStr}`;
            const body = pickTemplate('focus_reminder', lang);
            await dispatchPush({
              id: focusDedupeKey,
              title: lang === 'bn' ? 'ফোকাস সেশন বাকি আছে' : 'Focus Session Waiting',
              body,
              category: 'focus_reminder',
              actionRoute: 'focus',
              isUrgent: false,
            }, focusDedupeKey);
            automatedNudgeSentThisCycle = true;
          }
        } catch (focusErr) {
          console.warn('[Scheduler Focus Check Error]:', focusErr);
        }
      }

      // =========================================================================
      // 3. Skill Practice Reminders (Late Afternoon Window: 16:30 - 18:00)
      // Dedicated slot: Only fires if skill topics exist but no practice today
      // =========================================================================
      if (!automatedNudgeSentThisCycle && user.skill_reminders !== false && currentH >= 16 && currentH < 18 && currentTotalMinutes >= 16 * 60 + 30) {
        try {
          const { rows: folderRows } = await pool.query(
            `SELECT id, name FROM learning_folders WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
            [userId]
          );

          if (folderRows && folderRows.length > 0) {
            const activeTopic = folderRows[0].name || (lang === 'bn' ? 'টপিক' : 'your skill');
            const { rows: logRows } = await pool.query(
              `SELECT id FROM learning_logs 
               WHERE user_id = $1 AND (created_at::text LIKE $2 OR date::text LIKE $2)
               LIMIT 1`,
              [userId, `${todayStr}%`]
            );

            const hasPracticeToday = logRows && logRows.length > 0;
            if (!hasPracticeToday) {
              const skillDedupeKey = `skill_rem_aft_${todayStr}`;
              const body = pickTemplate('skill_reminder', lang, { skillName: activeTopic });
              await dispatchPush({
                id: skillDedupeKey,
                title: lang === 'bn' ? 'দক্ষতা চর্চার সময়' : 'Time Log / Skill Practice',
                body,
                category: 'skill_reminder',
                actionRoute: 'learning',
                skillId: folderRows[0].id,
                isUrgent: false,
              }, skillDedupeKey);
              automatedNudgeSentThisCycle = true;
            }
          }
        } catch (skillErr) {
          console.warn('[Scheduler Skill Check Error]:', skillErr);
        }
      }

      // =========================================================================
      // 4. Glory AI & Inactivity Re-engagement (Early Evening Window: 18:30 - 20:00)
      // Dedicated slot: Only fires if user had 0 activity all day
      // =========================================================================
      if (!automatedNudgeSentThisCycle && user.inactivity_reminders !== false && currentH >= 18 && currentH < 20 && currentTotalMinutes >= 18 * 60 + 30) {
        try {
          const aiDedupeKey = `ai_comp_${todayStr}`;
          const { rows: activityRows } = await pool.query(
            `SELECT 1 FROM tasks WHERE user_id = $1 AND (target_date::text LIKE $2 OR updated_at::text LIKE $2)
             UNION ALL
             SELECT 1 FROM focus_sessions WHERE user_id = $1 AND (start_time::text LIKE $2 OR created_at::text LIKE $2)
             LIMIT 1`,
            [userId, `${todayStr}%`]
          );

          if (!activityRows || activityRows.length === 0) {
            const body = pickTemplate('ai_companion', lang);
            await dispatchPush({
              id: aiDedupeKey,
              title: lang === 'bn' ? 'গ্লোরি এআই আপনার অপেক্ষায়' : 'Glory AI is Here',
              body,
              category: 'ai_companion',
              actionRoute: 'ai-agent',
              isUrgent: false,
            }, aiDedupeKey);
            automatedNudgeSentThisCycle = true;
          }
        } catch (aiErr) {
          console.warn('[Scheduler AI Companion Check Error]:', aiErr);
        }
      }

      // =========================================================================
      // 5. Diary / Mind Space Reflection (Night Window: 20:30 - 22:00)
      // Dedicated slot: Only fires if no diary entry written in last 2 days
      // =========================================================================
      if (!automatedNudgeSentThisCycle && currentH >= 20 && currentH < 22 && currentTotalMinutes >= 20 * 60 + 30) {
        try {
          const diaryDedupeKey = `diary_rem_${todayStr}`;
          const { rows: diaryRows } = await pool.query(
            `SELECT id FROM diary_entries 
             WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '2 days'
             LIMIT 1`,
            [userId]
          );

          const hasRecentDiary = diaryRows && diaryRows.length > 0;
          if (!hasRecentDiary) {
            const body = pickTemplate('diary_reminder', lang);
            await dispatchPush({
              id: diaryDedupeKey,
              title: lang === 'bn' ? 'ভাবনা লেখার সময়' : 'Time for Reflection',
              body,
              category: 'diary_reminder',
              actionRoute: 'diary',
              isUrgent: false,
            }, diaryDedupeKey);
            automatedNudgeSentThisCycle = true;
          }
        } catch (diaryErr) {
          console.warn('[Scheduler Diary Check Error]:', diaryErr);
        }
      }
    }

    return { evaluatedUsers, dispatchedCount };
  } catch (globalErr) {
    console.error('[Notification Scheduler Global Error]:', globalErr);
    return { evaluatedUsers, dispatchedCount };
  }
}

/**
 * Start the recurring background scheduler loop (runs every 60 seconds)
 */
export function startNotificationScheduler(intervalMs: number = 60000): NodeJS.Timeout {
  console.log('[Notification Scheduler] Starting background worker loop (60s interval)...');
  
  // Run first cycle shortly after boot
  setTimeout(() => {
    runNotificationSchedulerCycle().catch((err) => console.warn('[Scheduler Initial Run]:', err));
  }, 5000);

  return setInterval(() => {
    runNotificationSchedulerCycle().catch((err) => console.warn('[Scheduler Cycle Run]:', err));
  }, intervalMs);
}
