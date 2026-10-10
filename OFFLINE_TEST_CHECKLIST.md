# FocusForge Offline & Sync Testing Checklist

This document details the test scenarios, mechanisms, and verification procedures for FocusForge's offline-first architecture, local scheduling, and synchronization pipelines.

---

## 1. Core Architecture Overview

FocusForge uses a local-first architecture:
- **Local Database:** Dexie IndexedDB (`focentia_e2ee_db_v1`) provides offline persistence for Tasks, Time Logs, Diaries, Notes, Habits, and Focus Sessions.
- **Connectivity Engine:** `connectivityService.ts` combines browser `navigator.onLine` and `window.addEventListener('online'/'offline')` with real reachability probes (HEAD/GET with abort controller timeout) so failed requests immediately update network status.
- **Sync Engine:** `sync.ts` stores local changes in `sync_queue` with client UUIDs. Offline mutations are written locally first and queued. On reconnection, the queue flushes with exponential backoff (1.5s to 24s), followed by remote change pull with last-write-wins by `updatedAt` (never overwriting locally created data without newer remote timestamp, deletes tracked by tombstones).
- **Local Notifications:** `localNotificationScheduler.ts` acts as the source of truth for scheduling alarms locally. It leverages Capacitor LocalNotifications (`allowWhileIdle: true`), native Android AlarmManager bridge, or Service Worker persistent alarms in IndexedDB (`focentia_reminders_db`).

---

## 2. Test Scenarios & Verification Matrix

### Category 1: Fully Offline Features (Network Disabled)

| Feature | Test Procedure | Expected Result | Verified Status |
| :--- | :--- | :--- | :--- |
| **Dashboard** | Disconnect network. Add task, complete focus block, log time. Reload page offline. | Today's Tasks, Today's Focus, Time Log Summary, and Performance charts calculate and render correctly from IndexedDB. | **PASS** |
| **Focus + Timer** | Disconnect network. Start 25m Pomodoro, log distraction, complete session. | Session logs immediately to local IndexedDB and updates Dashboard metrics with zero network calls. | **PASS** |
| **Time Log** | Disconnect network. Create folder, log 45m study session, check streaks. | Folder and logs persist in IndexedDB; streaks and weak topics recalculate accurately. | **PASS** |
| **My Diary** | Disconnect network. Create diary entry, search by keyword, bookmark entry. | Full CRUD, search, and bookmarking execute locally without latency or errors. | **PASS** |
| **Mind Space** | Disconnect network. Add Free Flow thoughts, Idea Vault cards, Problem Solver notes. | Text thoughts persist in IndexedDB immediately; edit and delete function offline. | **PASS** |
| **Planner** | Disconnect network. Add tasks, schedule time blocks, drag-and-drop to reschedule. | All planner blocks, routines, and calendar views work offline with local IDB persistence. | **PASS** |
| **Notes & Files** | Disconnect network. Create note, apply category, search notes. | Note creation, editing, category filtering, and search execute 100% offline. | **PASS** |

---

### Category 2: Online-Only Features (Graceful Offline Handling)

| Feature | Test Procedure | Expected Result | Verified Status |
| :--- | :--- | :--- | :--- |
| **Voice Input (My Diary)** | Disconnect network. Tap microphone button in Diary composer. | Recording does not start. Displays: *"You are currently offline. Voice input needs internet."* | **PASS** |
| **Voice Input (Mind Space)** | Disconnect network. Tap microphone button in Mind Space composer. | Recording does not start. Displays: *"You are currently offline. Voice input needs internet."* | **PASS** |
| **Notes: Share** | Disconnect network. Open note more menu, inspect Share button. | Button disabled (`opacity-50`). Clicking shows message that internet is required. | **PASS** |
| **Notes: Download as PDF** | Disconnect network. Open note more menu, inspect PDF download button. | Button disabled (`opacity-50`). Clicking shows message that internet is required. | **PASS** |
| **Glory AI: Offline Sleeping State** | Disconnect network. Open Glory AI page. | Input is disabled. Glory displays sleeping mood with: *"You are currently offline. I'm sleeping right now, I'll help you again when you're back online."* | **PASS** |
| **Glory AI: No Token Deduction** | Disconnect network. Inspect token balance and network calls. | Zero Gemini API calls made. Zero tokens deducted. | **PASS** |
| **Glory AI: Auto-Wake on Reconnect** | Reconnect network while on Glory AI page. | Glory wakes up automatically (mood returns to idle/ready, input field re-enabled, no page restart needed). | **PASS** |

---

### Category 3: Synchronization & Reachability

| Feature | Test Procedure | Expected Result | Verified Status |
| :--- | :--- | :--- | :--- |
| **Dual Reachability Check** | Simulate dropped packets / unreachable API endpoint while `navigator.onLine` is true. | `connectivityService` detects failed requests and marks state offline; does not falsely claim "online". | **PASS** |
| **Persistent Sync Queue** | Create 5 items offline. Kill/restart the app. Inspect IndexedDB `sync_queue`. | Queue remains fully intact in IndexedDB across restarts. | **PASS** |
| **Auto-Flush on Reconnect** | Create offline items, reconnect network. | Queue flushes automatically with exponential backoff retries without user intervention. | **PASS** |
| **Conflict Resolution** | Modify item offline and online with different timestamps. Pull changes. | Last-write-wins by `updatedAt` applies. Client-created records are never lost. Deleted items persist tombstones. | **PASS** |
| **Sync Status Indicator** | Toggle network between offline, connecting, and synced. | Subtle non-blocking indicator in mobile header reflects *Offline*, *Syncing...*, and *Synced*. | **PASS** |

---

### Category 4: Notifications & Local Scheduling

| Feature | Test Procedure | Expected Result | Verified Status |
| :--- | :--- | :--- | :--- |
| **Exact Alarm Scheduling** | Schedule task reminder for 2 minutes ahead. Turn on Airplane Mode. Close app. | Local alarm fires on exact second via LocalNotifications (`allowWhileIdle: true`) / SW IDB scheduler. | **PASS** |
| **Android 13+ & Exact Alarms** | Launch native Android app. Inspect permission flow. | Shows native device permission prompt (POST_NOTIFICATIONS / SCHEDULE_EXACT_ALARM). Never shows "browser notifications" text. | **PASS** |
| **Quiet Hours (10 PM - 7 AM)** | Schedule non-urgent reminder inside quiet hours window. | Reminder is silenced or postponed past 7:00 AM. Urgent alarms still delivered. | **PASS** |
| **Reboot & Update Rescheduling** | Rehydrate scheduled alarms on SW activate / BOOT_COMPLETED. | Stored alarms in IndexedDB `focentia_reminders_db` are read and re-armed automatically. | **PASS** |
| **Automatic Rescheduling on Edit** | Edit or complete a task with an existing reminder. | Old reminder is cancelled, new alarm is scheduled. No duplicate alarms generated. | **PASS** |
| **In-App Notification Center Offline** | Disconnect network. Open Notifications page, mark read, delete selected. | Full notification center works 100% offline from local database. | **PASS** |
