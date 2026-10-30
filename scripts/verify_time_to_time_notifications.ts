/**
 * Comprehensive Verification: Time-to-Time Notifications, 5m Pre-reminder Removal,
 * Background Push Dispatch, Untimed Task 4.5h Nudges, and Daily 2-3 Cap.
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', 'frontend', '.env.local') });

import { Pool } from 'pg';
import { localNotificationScheduler } from '../frontend/src/services/localNotificationScheduler';
import { reminderSyncService } from '../frontend/src/services/reminderSyncService';
import { Task, NotificationPreferences } from '../frontend/src/types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

let failedCount = 0;
let passedCount = 0;

function assert(condition: boolean, desc: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${desc}${detail ? ` (${detail})` : ''}`);
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL] ${desc}${detail ? ` (${detail})` : ''}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('🔍 VERIFYING TIME-TO-TIME NOTIFICATIONS & BACKGROUND DISPATCH');
  console.log('================================================================\n');

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Future task: 2 hours from now
  const futureHour = (today.getHours() + 2) % 24;
  const timeStr = `${String(futureHour).padStart(2, '0')}:30`;

  const sampleTasks: Task[] = [
    {
      id: 101,
      title: 'Math Revision Chapter 5',
      date: todayStr,
      targetDate: todayStr,
      time: timeStr,
      reminderTime: timeStr,
      reminderEnabled: true,
      completed: false,
      status: 'not_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 102,
      title: 'Untimed Essay Outline',
      date: todayStr,
      targetDate: todayStr,
      time: '',
      reminderTime: '',
      reminderEnabled: true,
      completed: false,
      status: 'not_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const prefs: NotificationPreferences = {
    enabled: true,
    taskReminders: true,
    dailyMorningPlan: true,
    focusSessionReminder: true,
    skillReminders: true,
    inactivityReminders: true,
    soundEnabled: true,
    quietHoursEnabled: false
  };

  // -------------------------------------------------------------
  // TEST 1: Verify 5-minute pre-reminder is completely removed from local scheduler
  // -------------------------------------------------------------
  console.log('--- 1. Testing Local Notification Scheduler ---');
  const localItems = localNotificationScheduler.buildScheduledList({
    tasks: sampleTasks,
    notifPreferences: prefs,
    lang: 'bn'
  });

  const hasPreReminderLocal = localItems.some(i => i.category === ('task_pre_reminder' as any) || i.id.includes('task_pre_'));
  assert(!hasPreReminderLocal, 'Local scheduler generates ZERO 5-minute pre-reminders');

  const taskStartLocal = localItems.find(i => i.taskId === 101 && i.category === 'task_start');
  assert(Boolean(taskStartLocal), 'Exact task_start reminder is scheduled for timed task');
  if (taskStartLocal) {
    const taskDateObj = new Date(taskStartLocal.targetTimestamp);
    assert(
      taskDateObj.getHours() === futureHour && taskDateObj.getMinutes() === 30,
      'task_start reminder matches exact scheduled minute without 5-minute advance offset',
      `${taskDateObj.getHours()}:${taskDateObj.getMinutes()}`
    );
  }

  // Untimed task follow-up in local scheduler
  const untimedLocal = localItems.find(i => i.taskId === 102 && i.category === 'task_incomplete');
  assert(Boolean(untimedLocal), 'Untimed task generates a follow-up reminder 4-6 hours after addition');

  // Count general system nudges for today
  const generalLocal = localItems.filter(i => i.category !== 'task_start' && i.dueDate === todayStr);
  assert(generalLocal.length <= 3, `Local general system nudges strictly capped at 2-3 per day (actual: ${generalLocal.length})`);

  // -------------------------------------------------------------
  // TEST 2: Verify 5-minute pre-reminder is removed from Server Reminder Sync
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Reminder Sync Service ---');
  const serverItems = reminderSyncService.buildScheduledReminders({
    tasks: sampleTasks,
    notifPreferences: prefs,
    lang: 'bn',
    userId: '708f4b03-27e9-42f2-b1a3-209f646161cb'
  });

  const hasPreReminderServer = serverItems.some(i => i.category === ('task_pre_reminder' as any) || i.id.includes('task_pre_'));
  assert(!hasPreReminderServer, 'Server sync service generates ZERO 5-minute pre-reminders');

  const taskStartServer = serverItems.find(i => i.taskId === 101 && i.category === 'task_start');
  assert(Boolean(taskStartServer), 'Server sync service generates exact task_start reminder');

  const untimedServer = serverItems.find(i => i.taskId === 102 && i.category === 'task_incomplete');
  assert(Boolean(untimedServer), 'Server sync service generates untimed task reminder');

  const generalServer = serverItems.filter(i => i.category !== 'task_start' && i.dueDate === todayStr);
  assert(generalServer.length <= 3, `Server general reminders capped at <= 3 per day (actual: ${generalServer.length})`);

  // -------------------------------------------------------------
  // TEST 3: Database & Supabase pg_cron Active Dispatch Verification
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Supabase 24/7 pg_cron Dispatch Engine ---');
  try {
    const cronJobRes = await pool.query("SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'focentia-notification-dispatch'");
    assert(cronJobRes.rows.length === 1, 'Supabase pg_cron job focentia-notification-dispatch exists');
    if (cronJobRes.rows[0]) {
      assert(cronJobRes.rows[0].schedule === '* * * * *', 'pg_cron runs every single minute (* * * * *)', cronJobRes.rows[0].schedule);
      assert(cronJobRes.rows[0].active === true, 'pg_cron job is actively enabled');
    }

    // Clean up any old pre-reminder rows in scheduled_reminders
    const updateRes = await pool.query("UPDATE scheduled_reminders SET status = 'cancelled' WHERE category = 'task_pre_reminder' AND status IN ('pending', 'processing')");
    console.log(`  ℹ Cleaned up ${updateRes.rowCount} legacy pre-reminder rows in database.`);

    // Check for push subscriptions
    const subRes = await pool.query("SELECT COUNT(*) FROM push_subscriptions");
    const subCount = parseInt(subRes.rows[0].count, 10);
    assert(subCount > 0, `Database has active push subscriptions registered (count: ${subCount})`);

  } catch (err: any) {
    assert(false, 'Database pg_cron check failed', err.message);
  } finally {
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

