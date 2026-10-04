/**
 * Focentia Notification Templates & Randomized Rotation Engine
 *
 * Requirements:
 * - NO AI-generated text. Predefined, developer-controlled templates only.
 * - Both English and Bengali for every template.
 * - Minimum 7 templates per category.
 * - Fisher-Yates randomized shuffle-bag cycle:
 *     1. All template IDs shuffled into random order.
 *     2. Each template used exactly once before the cycle finishes.
 *     3. Reshuffled when cycle ends.
 *     4. Anti-repeat: new cycle never starts with the same template used last.
 *     5. Account-isolated rotation state.
 *     6. No weekday / fixed-day mapping.
 * - Dedicated Orb Face reaction mood mapped to each category.
 */

import { NotificationCategory } from "../types";
import type { OrbMood } from "../components/ai-agent/useOrbMood";

export interface TemplateDefinition {
  id: string;
  en: string;
  bn: string;
}

export interface CategoryConfig {
  orbMood: OrbMood;
  appTagEn: string;
  appTagBn: string;
  defaultTitleEn: string;
  defaultTitleBn: string;
  templates: TemplateDefinition[];
}

export const NOTIFICATION_TEMPLATES: Record<NotificationCategory, CategoryConfig> = {
  daily_plan: {
    orbMood: "curious",
    appTagEn: "FOCENTIA - DAILY PLAN",
    appTagBn: "ফোসেন্টিয়া - আজকের প্ল্যান",
    defaultTitleEn: "Your plan for today",
    defaultTitleBn: "আজকের দিনের প্ল্যান",
    templates: [
      {
        id: "daily_plan_1",
        en: "Your plan for today is ready. Take it one task at a time.",
        bn: "আজকের প্ল্যান তৈরি। একটার পর একটা করে শুরু করো।",
      },
      {
        id: "daily_plan_2",
        en: "You have a few things planned for today. Start with the first one.",
        bn: "আজ তোমার কিছু কাজ রাখা আছে। প্রথমটা দিয়ে শুরু করো।",
      },
      {
        id: "daily_plan_3",
        en: "Today's plan is waiting for you. Let's get the day moving.",
        bn: "আজকের প্ল্যান তোমার জন্য অপেক্ষা করছে। দিনটা শুরু করি।",
      },
      {
        id: "daily_plan_4",
        en: "Your tasks for today are ready. One step at a time.",
        bn: "আজকের কাজগুলো তৈরি আছে। ধীরে ধীরে এগিয়ে যাও।",
      },
      {
        id: "daily_plan_5",
        en: "Today has a plan. All you need to do is start.",
        bn: "আজকের জন্য একটা প্ল্যান আছে। এখন শুধু শুরু করা বাকি।",
      },
      {
        id: "daily_plan_6",
        en: "You've got a few things to get done today. Let's begin.",
        bn: "আজ কয়েকটা কাজ আছে। চল, প্রথমটা দিয়ে শুরু করি।",
      },
      {
        id: "daily_plan_7",
        en: "Your day is planned. Now let's make it happen.",
        bn: "আজকের দিনটা প্ল্যান করা আছে। এবার কাজে নামি।",
      },
    ],
  },

  focus_reminder: {
    orbMood: "concerned",
    appTagEn: "FOCENTIA - FOCUS SESSION",
    appTagBn: "ফোসেন্টিয়া - ফোকাস সেশন",
    defaultTitleEn: "Focus Session Waiting",
    defaultTitleBn: "ফোকাস সেশন বাকি আছে",
    templates: [
      {
        id: "focus_rem_1",
        en: "Have you had your Focus session today? You can start now.",
        bn: "আজকের Focus session হয়েছে? চাইলে এখনই শুরু করতে পারো।",
      },
      {
        id: "focus_rem_2",
        en: "Your Focus session is still waiting. A short session is enough.",
        bn: "তোমার Focus session এখনো বাকি। ছোট একটা session দিয়েই শুরু করতে পারো।",
      },
      {
        id: "focus_rem_3",
        en: "Still no Focus today? Come on, let's do a short session.",
        bn: "আজও Focus করা হয়নি? চল, ছোট একটা session করি।",
      },
      {
        id: "focus_rem_4",
        en: "Today could use a little Focus. Start whenever you're ready.",
        bn: "আজ একটু Focus করলে ভালো হবে। যখন ready, শুরু করো।",
      },
      {
        id: "focus_rem_5",
        en: "Your progress could use a little Focus today.",
        bn: "আজ তোমার progress-এর জন্য একটু Focus দরকার।",
      },
      {
        id: "focus_rem_6",
        en: "Your Focus session hasn't happened yet. Let's get one done.",
        bn: "আজকের Focus session এখনো হয়নি। একটা করে ফেলো।",
      },
      {
        id: "focus_rem_7",
        en: "Still haven't started? Let's fix that with a short Focus session.",
        bn: "এখনো শুরু করোনি? চল, এবার ছোট একটা Focus session করি।",
      },
    ],
  },

  inactivity: {
    orbMood: "thinking",
    appTagEn: "FOCENTIA - GENTLE NUDGE",
    appTagBn: "ফোসেন্টিয়া - আলতো তাগিদ",
    defaultTitleEn: "Ready to pick up?",
    defaultTitleBn: "কাজে ফিরবে কি?",
    templates: [
      {
        id: "inact_1",
        en: "You haven't started anything today. Pick one small task.",
        bn: "আজ এখনো কিছু শুরু করা হয়নি। একটা ছোট কাজ দিয়ে শুরু করো।",
      },
      {
        id: "inact_2",
        en: "No Focus yet today. Want to start a short session?",
        bn: "আজ এখনো Focus করা হয়নি। ছোট একটা session করবে?",
      },
      {
        id: "inact_3",
        en: "You haven't logged any practice today. Give one topic some time.",
        bn: "আজ এখনো কোনো practice log করা হয়নি। একটা topic-কে একটু সময় দাও।",
      },
      {
        id: "inact_4",
        en: "Still waiting for your first task today. Start small.",
        bn: "আজকের প্রথম কাজটা এখনো শুরু হয়নি। ছোট করে শুরু করো।",
      },
      {
        id: "inact_5",
        en: "Your day is still open. Pick something and begin.",
        bn: "আজকের দিনটা এখনো বাকি। একটা কাজ বেছে নিয়ে শুরু করো।",
      },
      {
        id: "inact_6",
        en: "Nothing much has happened today yet. A small session can change that.",
        bn: "আজ এখনো তেমন কিছু করা হয়নি। একটা ছোট session দিয়ে শুরু করা যায়।",
      },
      {
        id: "inact_7",
        en: "Still haven't started? Let's get one thing done today.",
        bn: "এখনো শুরু করোনি? চল, আজ অন্তত একটা কাজ শেষ করি।",
      },
    ],
  },

  task_start: {
    orbMood: "attentive",
    appTagEn: "FOCENTIA - TASK STARTING",
    appTagBn: "ফোসেন্টিয়া - টাস্ক শুরু হচ্ছে",
    defaultTitleEn: "Time to start",
    defaultTitleBn: "শুরু করার সময় হয়েছে",
    templates: [
      {
        id: "task_start_1",
        en: "Your scheduled session starts now. Ready for {taskName}?",
        bn: "তোমার নির্ধারিত সময় শুরু হয়েছে। {taskName}-এর জন্য প্রস্তুত?",
      },
      {
        id: "task_start_2",
        en: "Time to begin: {taskName}. Let's dive in.",
        bn: "{taskName} শুরু করার সময় হয়েছে। চল কাজে নামি।",
      },
      {
        id: "task_start_3",
        en: "Your task {taskName} is starting now.",
        bn: "তোমার {taskName} কাজটি এখন শুরু হচ্ছে।",
      },
      {
        id: "task_start_4",
        en: "Ready for {taskName}? Time to get going.",
        bn: "{taskName}-এর জন্য তৈরি তো? চল শুরু করি।",
      },
      {
        id: "task_start_5",
        en: "It's time for {taskName}. You've got this.",
        bn: "{taskName}-এর সময় হয়ে গেছে। তুমি পারবে!",
      },
      {
        id: "task_start_6",
        en: "{taskName} is scheduled right now. Let's make progress.",
        bn: "এখন {taskName} করার সময়। একটু একটু করে এগোও।",
      },
      {
        id: "task_start_7",
        en: "Starting {taskName} now. Take it one step at a time.",
        bn: "{taskName} শুরু হচ্ছে। মনোযোগ দিয়ে শুরু করো।",
      },
    ],
  },

  task_pre_reminder: {
    orbMood: "curious",
    appTagEn: "FOCENTIA - TASK DUE SOON",
    appTagBn: "ফোসেন্টিয়া - আসন্ন টাস্ক",
    defaultTitleEn: "Coming up soon",
    defaultTitleBn: "শীঘ্রই শুরু হচ্ছে",
    templates: [
      {
        id: "task_pre_1",
        en: "Upcoming in 30 minutes: {taskName}.",
        bn: "৩০ মিনিট পর শুরু হচ্ছে: {taskName}।",
      },
      {
        id: "task_pre_2",
        en: "Getting ready? {taskName} starts in about 30 minutes.",
        bn: "প্রস্তুত হচ্ছ তো? প্রায় ৩০ মিনিটের মধ্যে {taskName} শুরু হবে।",
      },
      {
        id: "task_pre_3",
        en: "{taskName} is coming up soon. Wrap up what you're doing.",
        bn: "শীঘ্রই {taskName} শুরু হতে যাচ্ছে। বর্তমান কাজটা গুছিয়ে নাও।",
      },
      {
        id: "task_pre_4",
        en: "About 30 minutes until {taskName} begins.",
        bn: "{taskName} শুরু হতে আর প্রায় ৩০ মিনিট বাকি।",
      },
      {
        id: "task_pre_5",
        en: "{taskName} starts shortly. Take a breath and get ready.",
        bn: "কিছুক্ষণের মধ্যেই {taskName} শুরু হবে। একটু মানসিক প্রস্তুতি নিয়ে নাও।",
      },
      {
        id: "task_pre_6",
        en: "Heads up: {taskName} is scheduled in 30 minutes.",
        bn: "মনে করিয়ে দিচ্ছি: ৩০ মিনিট পর {taskName} শুরু হবে।",
      },
      {
        id: "task_pre_7",
        en: "Your next scheduled block is {taskName} in 30 minutes.",
        bn: "তোমার পরবর্তী শিডিউল {taskName}, ৩০ মিনিটের মধ্যে।",
      },
    ],
  },

  task_incomplete: {
    orbMood: "concerned",
    appTagEn: "FOCENTIA - TASK CHECK-IN",
    appTagBn: "ফোসেন্টিয়া - কাজের খবর",
    defaultTitleEn: "How is it going?",
    defaultTitleBn: "কাজের খবর কি?",
    templates: [
      {
        id: "task_incomp_1",
        en: "How is {taskName} going? Still some time to wrap up.",
        bn: "{taskName} কেমন চলছে? গুছিয়ে নেওয়ার জন্য এখনো কিছুটা সময় আছে।",
      },
      {
        id: "task_incomp_2",
        en: "Almost time on {taskName}. Need a few more minutes?",
        bn: "{taskName}-এর নির্ধারিত সময় প্রায় শেষ। আরো কিছুটা সময় লাগবে?",
      },
      {
        id: "task_incomp_3",
        en: "Checking in on {taskName}. Take your time and finish smoothly.",
        bn: "{taskName}-এর খবর কি? শান্তভাবে শেষ করে নাও।",
      },
      {
        id: "task_incomp_4",
        en: "{taskName} scheduled block is nearing its end. How are things looking?",
        bn: "{taskName}-এর সময় প্রায় শেষের দিকে। কতটুকু হলো?",
      },
      {
        id: "task_incomp_5",
        en: "Still working on {taskName}? Keep the calm momentum.",
        bn: "এখনো {taskName} করছ? ধৈর্য ধরে এগিয়ে যাও।",
      },
      {
        id: "task_incomp_6",
        en: "A gentle check-in on {taskName}. Every bit of progress counts.",
        bn: "একটি আলতো তাগিদ: {taskName}-এর জন্য। প্রতিটি ছোট অগ্রগতিও মূল্যবান।",
      },
      {
        id: "task_incomp_7",
        en: "Nearing the end of {taskName} block. You're doing great.",
        bn: "{taskName}-এর সময় প্রায় শেষ হতে চলল। দারুণ করছ তুমি।",
      },
    ],
  },

  skill_reminder: {
    orbMood: "attentive",
    appTagEn: "FOCENTIA - PRACTICE REMINDER",
    appTagBn: "ফোসেন্টিয়া - চর্চার রিমাইন্ডার",
    defaultTitleEn: "Time Log / Skill Practice",
    defaultTitleBn: "দক্ষতা চর্চার সময়",
    templates: [
      {
        id: "skill_rem_1",
        en: "No practice logged yet for {skillName}. A few minutes can make a difference.",
        bn: "{skillName}-এ আজ এখনো কোনো প্র্যাকটিস রেকর্ড করা হয়নি। অল্প কিছু সময়ও অনেক কাজে দেয়।",
      },
      {
        id: "skill_rem_2",
        en: "Keep your skills sharp. Have you spent time on {skillName} today?",
        bn: "দক্ষতা ধরে রাখতে আজ {skillName}-কে একটু সময় দিয়েছ কি?",
      },
      {
        id: "skill_rem_3",
        en: "Your {skillName} progress is waiting. Even 15 minutes counts.",
        bn: "{skillName}-এর অগ্রগতি তোমার অপেক্ষায়। এমনকি ১৫ মিনিটও অনেক।",
      },
      {
        id: "skill_rem_4",
        en: "Time for a little practice with {skillName}?",
        bn: "{skillName}-এর জন্য একটু সময় বের করবে?",
      },
      {
        id: "skill_rem_5",
        en: "A short practice session on {skillName} will keep the momentum alive.",
        bn: "{skillName}-এ একটি ছোট সেশন তোমার গতি বজায় রাখবে।",
      },
      {
        id: "skill_rem_6",
        en: "{skillName} could use some attention today. Want to log a session?",
        bn: "আজ {skillName}-কে একটু সময় দিলে ভালো হতো। কিছু প্র্যাকটিস করবে?",
      },
      {
        id: "skill_rem_7",
        en: "Ready to build your skill in {skillName}? Jump in for a bit.",
        bn: "{skillName}-এর চর্চা করার জন্য তৈরি? চল কিছুটা সময় দিই।",
      },
    ],
  },

  task_completed: {
    orbMood: "happy",
    appTagEn: "FOCENTIA - COMPLETED",
    appTagBn: "ফোসেন্টিয়া - সম্পন্ন হয়েছে",
    defaultTitleEn: "Task Done!",
    defaultTitleBn: "কাজ শেষ!",
    templates: [
      {
        id: "task_done_1",
        en: "Great job finishing {taskName}! Keep the rhythm going.",
        bn: "{taskName} শেষ করার জন্য বাহবা! কাজের গতি বজায় রাখো।",
      },
      {
        id: "task_done_2",
        en: "{taskName} is complete! That's one more off your mind.",
        bn: "{taskName} শেষ হয়েছে! মাথা থেকে আরেকটি চিন্তা নামল।",
      },
      {
        id: "task_done_3",
        en: "Nicely done on {taskName}! Progress feels good.",
        bn: "{taskName}-এ দারুণ কাজ হয়েছে! এগিয়ে যাওয়া আসলেই আনন্দের।",
      },
      {
        id: "task_done_4",
        en: "One more step forward! {taskName} completed.",
        bn: "আরেকটি ধাপ সম্পন্ন! {taskName} শেষ হলো।",
      },
      {
        id: "task_done_5",
        en: "Awesome work finishing {taskName}.",
        bn: "চমৎকার কাজ! {taskName} সম্পূর্ণ হয়েছে।",
      },
      {
        id: "task_done_6",
        en: "{taskName} done! Take a quick breath and feel proud.",
        bn: "{taskName} শেষ! একটা দীর্ঘশ্বাস নাও এবং তৃপ্তি অনুভব করো।",
      },
      {
        id: "task_done_7",
        en: "You knocked out {taskName}! Fantastic job.",
        bn: "{taskName} শেষ করে ফেলেছ! অসাধারণ!",
      },
    ],
  },

  focus_completed: {
    orbMood: "proud",
    appTagEn: "FOCENTIA - FOCUS COMPLETED",
    appTagBn: "ফোসেন্টিয়া - ফোকাস সম্পন্ন",
    defaultTitleEn: "Focus Session Done!",
    defaultTitleBn: "ফোকাস সেশন সমাপ্ত!",
    templates: [
      {
        id: "focus_done_1",
        en: "Focus session completed! Great concentration.",
        bn: "ফোকাস সেশন সমাপ্ত! দুর্দান্ত মনোযোগ ছিল।",
      },
      {
        id: "focus_done_2",
        en: "You stayed with it! Focus session wrapped up successfully.",
        bn: "মনোযোগ ধরে রেখেছিলে! ফোকাস সেশন সফলভাবে সম্পন্ন হয়েছে।",
      },
      {
        id: "focus_done_3",
        en: "Well done on completing your Focus session. Take a moment to rest.",
        bn: "ফোকাস সেশন শেষ করার জন্য অভিনন্দন। এবার একটু জিরিয়ে নাও।",
      },
      {
        id: "focus_done_4",
        en: "Fantastic focus block! Your consistency is shining.",
        bn: "অসাধারণ ফোকাস! তোমার ধারাবাহিকতা সত্যিই প্রশংসনীয়।",
      },
      {
        id: "focus_done_5",
        en: "Focus session done! Quality work delivered.",
        bn: "ফোকাস সেশন শেষ! নিখুঁত কাজ হয়েছে।",
      },
      {
        id: "focus_done_6",
        en: "You stayed in the zone! That was a productive focus session.",
        bn: "কাজে পুরোপুরি ডুবে ছিলে! চমৎকার একটি প্রোডাক্টিভ সেশন ছিল।",
      },
      {
        id: "focus_done_7",
        en: "Another solid focus session in the books. Super proud of you.",
        bn: "আরেকটি সফল ফোকাস সেশন সম্পন্ন হলো। সত্যিই গর্ব হচ্ছে।",
      },
    ],
  },

  break_time: {
    orbMood: "sleepy",
    appTagEn: "FOCENTIA - BREAK TIME",
    appTagBn: "ফোসেন্টিয়া - বিরতির সময়",
    defaultTitleEn: "Take a break",
    defaultTitleBn: "বিরতি নাও",
    templates: [
      {
        id: "break_1",
        en: "Take a 5-minute break. Stretch, drink water.",
        bn: "৫ মিনিটের একটি বিরতি নাও। একটু জল খাও, শরীর টানটান করো।",
      },
      {
        id: "break_2",
        en: "Good work. Give your eyes a rest for a few minutes.",
        bn: "ভালো কাজ হয়েছে। চোখ দুটোকে কয়েক মিনিট বিশ্রাম দাও।",
      },
      {
        id: "break_3",
        en: "Break time! Step away from the screen for a bit.",
        bn: "বিরতির সময়! স্ক্রিন থেকে কিছুক্ষণ দূরে থাকো।",
      },
      {
        id: "break_4",
        en: "Time to recharge. A short rest makes the next session better.",
        bn: "রিচার্জের সময়। ছোট একটা বিশ্রাম পরবর্তী কাজ সহজ করবে।",
      },
      {
        id: "break_5",
        en: "Stand up, stretch a little, take a deep breath.",
        bn: "একটু ওঠো, শরীর প্রসারিত করো, দীর্ঘশ্বাস নাও।",
      },
      {
        id: "break_6",
        en: "Rest is part of the work. Take a calm few minutes.",
        bn: "বিশ্রামও কাজের অংশ। শান্ত হয়ে কয়েক মিনিট জিরিয়ে নাও।",
      },
      {
        id: "break_7",
        en: "Take a breather. You've earned this pause.",
        bn: "একটু শ্বাস নাও। এই বিরতিটা তোমার প্রাপ্য।",
      },
    ],
  },

  streak_milestone: {
    orbMood: "proud",
    appTagEn: "FOCENTIA - STREAK",
    appTagBn: "ফোসেন্টিয়া - স্ট্রিক",
    defaultTitleEn: "Streak Milestone",
    defaultTitleBn: "ধারাবাহিকতার মাইলফলক",
    templates: [
      {
        id: "streak_1",
        en: "{count}-day focus streak! Personal best this month.",
        bn: "{count}-দিনের ফোকাস স্ট্রিক! এই মাসের সেরা অর্জন।",
      },
      {
        id: "streak_2",
        en: "Consistency is your superpower: {count} days in a row!",
        bn: "ধারাবাহিকতাই তোমার আসল শক্তি: টানা {count} দিন!",
      },
      {
        id: "streak_3",
        en: "{count} consecutive days of progress. Keep holding the line.",
        bn: "টানা {count} দিন অগ্রগতি। এভাবেই এগিয়ে যাও।",
      },
      {
        id: "streak_4",
        en: "Another day, another win for your streak ({count} days)!",
        bn: "আরেকটি দিন, স্ট্রিকের আরেকটি জয় ({count} দিন)!",
      },
      {
        id: "streak_5",
        en: "Look at that streak: {count} active days. Respect the discipline.",
        bn: "স্ট্রিকটা চেয়ে দেখ: {count} দিন সক্রিয়। নিয়মানুবর্তিতার জয়।",
      },
      {
        id: "streak_6",
        en: "You're building an unstoppable habit: {count} days.",
        bn: "এক অপরাজেয় অভ্যাস গড়ে তুলছ: টানা {count} দিন।",
      },
      {
        id: "streak_7",
        en: "{count} days of dedication. Every single day counts.",
        bn: "{count} দিনের নিষ্ঠা। প্রতিটি দিনই অর্থপূর্ণ।",
      },
    ],
  },

  system: {
    orbMood: "attentive",
    appTagEn: "FOCENTIA - SYSTEM",
    appTagBn: "ফোসেন্টিয়া - সিস্টেম",
    defaultTitleEn: "Focentia Update",
    defaultTitleBn: "ফোসেন্টিয়া আপডেট",
    templates: [
      {
        id: "sys_1",
        en: "{message}",
        bn: "{message}",
      },
      {
        id: "sys_2",
        en: "{message}",
        bn: "{message}",
      },
      {
        id: "sys_3",
        en: "{message}",
        bn: "{message}",
      },
      {
        id: "sys_4",
        en: "{message}",
        bn: "{message}",
      },
      {
        id: "sys_5",
        en: "{message}",
        bn: "{message}",
      },
      {
        id: "sys_6",
        en: "{message}",
        bn: "{message}",
      },
      {
        id: "sys_7",
        en: "{message}",
        bn: "{message}",
      },
    ],
  },
};

/**
 * Account-isolated rotation state structure
 */
interface CategoryRotationState {
  bag: string[]; // remaining template IDs in the current cycle
  lastUsedId: string | null;
}

const ROTATION_STORAGE_PREFIX = "focusforge_notif_bag_";

/**
 * Fisher-Yates shuffle array in place
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Interpolate placeholders like {taskName}, {skillName}, {count}
 */
function interpolate(template: string, variables: Record<string, string | number> = {}): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

/**
 * Rotation Manager
 * Handles shuffle-bag state per user account & per category with anti-repeat protection.
 */
class NotificationRotationManager {
  private getStorageKey(userId: string | null | undefined, category: NotificationCategory): string {
    const safeUser = userId ? userId.trim() : "guest";
    return `${ROTATION_STORAGE_PREFIX}${safeUser}_${category}`;
  }

  private loadState(userId: string | null | undefined, category: NotificationCategory): CategoryRotationState {
    if (typeof window === "undefined") {
      return { bag: [], lastUsedId: null };
    }
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId, category));
      if (!raw) return { bag: [], lastUsedId: null };
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.bag)) {
        return {
          bag: parsed.bag,
          lastUsedId: parsed.lastUsedId || null,
        };
      }
    } catch {}
    return { bag: [], lastUsedId: null };
  }

  private saveState(
    userId: string | null | undefined,
    category: NotificationCategory,
    state: CategoryRotationState
  ): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.getStorageKey(userId, category), JSON.stringify(state));
    } catch {}
  }

  /**
   * Get next randomized template for category using shuffle-bag cycle with anti-repeat protection.
   */
  public getNext(
    category: NotificationCategory,
    lang: "en" | "bn" = "en",
    variables: Record<string, string | number> = {},
    userId?: string | null
  ): {
    templateId: string;
    title: string;
    message: string;
    orbMood: OrbMood;
    appTag: string;
  } {
    const config = NOTIFICATION_TEMPLATES[category] || NOTIFICATION_TEMPLATES.system;
    const allTemplates = config.templates;
    const allIds = allTemplates.map((t) => t.id);

    const state = this.loadState(userId, category);
    let bag = [...state.bag];

    // If current cycle bag is empty, reshuffle all 7
    if (bag.length === 0) {
      bag = shuffleArray(allIds);

      // Anti-repeat protection: If new shuffle starts with the last used template, swap it
      if (bag.length > 1 && state.lastUsedId && bag[0] === state.lastUsedId) {
        // Swap first item with last item
        const lastIdx = bag.length - 1;
        [bag[0], bag[lastIdx]] = [bag[lastIdx], bag[0]];
      }
    }

    // Take next template ID from the bag
    const nextId = bag.shift() || allIds[0];

    // Save updated rotation state
    this.saveState(userId, category, {
      bag,
      lastUsedId: nextId,
    });

    const chosen = allTemplates.find((t) => t.id === nextId) || allTemplates[0];
    const rawTemplateText = lang === "bn" ? chosen.bn : chosen.en;
    const message = interpolate(rawTemplateText, variables);

    const title = lang === "bn" ? config.defaultTitleBn : config.defaultTitleEn;
    const appTag = lang === "bn" ? config.appTagBn : config.appTagEn;

    return {
      templateId: nextId,
      title,
      message,
      orbMood: config.orbMood,
      appTag,
    };
  }

  /**
   * Clear rotation state for a user (or testing)
   */
  public clearRotationState(userId?: string | null): void {
    if (typeof window === "undefined") return;
    try {
      const safeUser = userId ? userId.trim() : "guest";
      const prefix = `${ROTATION_STORAGE_PREFIX}${safeUser}_`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }
}

export const notificationRotationManager = new NotificationRotationManager();
export default notificationRotationManager;
