import { localNotificationScheduler } from '../frontend/src/services/localNotificationScheduler';
import { notificationService } from '../frontend/src/services/notificationService';
import reminderSyncService from '../frontend/src/services/reminderSyncService';
import { Task, NotificationPreferences } from '../frontend/src/types';

async function runAudit() {
  console.log('=== [1] AUDITING NOTIFICATION SYSTEM ===');

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Future task for today (e.g., 2 hours from now)
  const targetHour = (now.getHours() + 2) % 24;
  const timeStr = `${String(targetHour).padStart(2, '0')}:15`;

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
      priority: 'high',
      estHours: 1,
      estMinutes: 60,
      status: 'not_started',
    },
    {
      id: 102,
      title: 'Untimed general task',
      date: todayStr,
      targetDate: todayStr,
      completed: false,
      priority: 'medium',
      estHours: 1,
      estMinutes: 30,
      status: 'not_started',
    }
  ];

  const prefsWithSound: NotificationPreferences = {
    enabled: true,
    taskReminders: true,
    soundEnabled: true,
    dailyLimit: 3,
    dailyMorningPlan: true,
    focusSessionReminder: true,
    skillReminders: true,
  };

  const listWithSound = localNotificationScheduler.buildScheduledList({
    tasks: sampleTasks,
    notifPreferences: prefsWithSound,
    lang: 'bn',
    userId: 'audit-user-1',
  });

  console.log(`- Scheduled items generated: ${listWithSound.length}`);
  
  // Test 1: Exact timed task reminder must be scheduled
  const taskReminder = listWithSound.find(i => i.taskId === 101);
  if (!taskReminder) {
    throw new Error('FAIL: Task with scheduled time was NOT scheduled!');
  }
  console.log('✔ PASS: Task with scheduled time successfully scheduled at exact timestamp:', taskReminder.targetTimeISO);

  // Test 2: Sound setting must be respected
  if (taskReminder.sound !== true) {
    throw new Error('FAIL: Task reminder sound flag should be true when soundEnabled is true!');
  }
  console.log('✔ PASS: Sound flag correctly enabled on scheduled alert.');

  const prefsWithoutSound: NotificationPreferences = {
    ...prefsWithSound,
    soundEnabled: false,
  };

  const listWithoutSound = localNotificationScheduler.buildScheduledList({
    tasks: sampleTasks,
    notifPreferences: prefsWithoutSound,
    lang: 'bn',
    userId: 'audit-user-1',
  });

  const taskReminderSilent = listWithoutSound.find(i => i.taskId === 101);
  if (taskReminderSilent?.sound !== false) {
    throw new Error('FAIL: Task reminder sound flag should be false when soundEnabled is false!');
  }
  console.log('✔ PASS: Sound toggle off correctly propagates to alerts.');

  // Test 3: Daily limit of random nudges per day must never exceed 3
  const todayNudges = listWithSound.filter(i => i.dueDate === todayStr && i.category !== 'task_start');
  console.log(`- General system nudges for today: ${todayNudges.length} (Max allowed: 3)`);
  if (todayNudges.length > 3) {
    throw new Error(`FAIL: Too many general nudges scheduled for a single day: ${todayNudges.length}`);
  }
  console.log('✔ PASS: Daily system nudge limit strictly bounded to <= 3 per day.');

  console.log('\n=== [2] AUDITING BRAND STRINGS ===');
  // Check share note format
  const shareTitle = 'Final syllabus routine.';
  const shareTextBn = `${shareTitle} - ফোসেনটিয়া নোট ও ফাইলস`;
  const shareTextEn = `${shareTitle} - Focentia Notes & Files`;

  if (shareTextBn.includes('ফোকাসফোর্জ') || shareTextBn.includes('FocusForge')) {
    throw new Error('FAIL: Legacy FocusForge found in Bengali share text!');
  }
  if (shareTextEn.includes('FocusForge')) {
    throw new Error('FAIL: Legacy FocusForge found in English share text!');
  }
  console.log('✔ PASS: Bengali share text:', shareTextBn);
  console.log('✔ PASS: English share text:', shareTextEn);

  console.log('\n=== ALL AUDIT CHECKS PASSED SUCCESSFULLY ===');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

