# CURRENT_STATE.md — Current Verified State of Foscentia

**Document Version:** 1.0.0  
**Last Updated:** October 2026  
**Status:** Authoritative Current State Baseline

---

## 1. Overall Status

Foscentia is an active, functional productivity suite built with Next.js 16 App Router, PostgreSQL (Supabase), a companion Express backend engine, and Google Gemini AI. The application implements a pure **Local-First + Privacy-First + Auth-Only Supabase + Zero-Knowledge E2EE Cross-Device Sync** architecture.

- **Auth-Only Cloud Database:** Supabase stores ONLY authentication, account identity, supervisor support tickets, push subscriptions, and opaque AES-256-GCM encrypted sync blobs (`encrypted_sync_records`). Zero plaintext personal data is ever stored in or transmitted to the cloud database.
- **Local-First Personal Storage:** All user personal data (tasks, routines, notes, diary entries, mind dumps, focus logs, learning tracking, and AI memory) is stored locally on the user's device in IndexedDB (`focusforge_local_v3`).
- **End-to-End Encrypted Relay:** Synchronization across user devices operates via client-side AES-256-GCM encryption with 12-byte IVs and PBKDF2 key derivation using the user's master recovery key (`FF-XXXX-...`).
- **Private Chat & Privacy-First AI:** Ephemeral Private Chat mode guarantees zero persistence in local storage or cloud. AI consent defaults to "Keep My Chats Private" unless explicitly opted into improvements.

---

## 2. Detailed Subsystem Status Inventory

### Authentication & Password Reset
- **Current Implementation:** Supabase Auth SDK (`authService.ts`, `AuthContext.tsx`) for session management; custom Pre-Verification Signup flow (`/api/auth/pre-signup`, `/api/auth/verify-signup`) with 6-digit OTP stored in `public.pending_signups`; dedicated Two-Step Password Reset flow (`/reset-password`, `/auth/callback?type=recovery`, `/api/auth/request-reset-otp`, `/api/auth/verify-reset-otp`) with 6-digit OTP staged in `public.pending_password_resets` and delivered via Nodemailer.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None currently identified. Recovery link redirects seamlessly to `/reset-password` without landing on home page. Auto-confirm triggers on `auth.users` were dropped in migration `019`/`022` to prevent dirty unverified user records.
- **Important Files:** `frontend/src/context/AuthContext.tsx`, `frontend/src/services/authService.ts`, `frontend/src/app/reset-password/page.tsx`, `frontend/src/app/auth/callback/page.tsx`, `frontend/src/app/api/[...path]/route.ts`.
- **Important Dependencies:** `@supabase/supabase-js`, `nodemailer`, `crypto`, `framer-motion`.
- **Unknowns:** Rate limiting in pure serverless multi-instance environments uses in-memory Map (effective per-instance, but not globally distributed across edge regions).

---

### Guest Mode
- **Current Implementation:** Unauthenticated visitors operate seamlessly in Guest Mode with full local storage access in IndexedDB and `sessionStorage`. Upon first authenticated login, `accountManager.setGuestModePermanentlyDisabled()` locks guest mode, wipes temporary guest keys (`clearGuestData()`), and offers one-time guest-to-cloud data migration.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/services/accountManager.ts`, `frontend/src/services/indexedDBStorage.ts`, `frontend/src/components/auth/GuestTransitionModal.tsx`.
- **Dependencies:** `localDbService.ts`.
- **Unknowns:** None.

---

### Dashboard
- **Current Implementation:** `DashboardPage.tsx` aggregates metrics from Tasks, Focus Sessions, and Learning logs; calculates daily productivity scores, streak counters, and upcoming calendar schedules (`CalendarWidget.tsx`).
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/DashboardPage.tsx`, `frontend/src/components/ui/CalendarWidget.tsx`.
- **Dependencies:** `AppContext.tsx`, `taskService.ts`, `focusDbService.ts`.
- **Unknowns:** None.

---

### Planner & Routines
- **Current Implementation:** `PlannerPage.tsx`, `AddTaskModal.tsx`, `RoutineLibraryModal.tsx`, `ImportRoutineModal.tsx`. Supports task creation, priority tiers (now/next/later), estimated duration, time slots, reminder flags, weekday routine templates, and batch copy-to-date.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None. Direct SQL handlers (`tasks`, `routine_templates`) and local IndexedDB stores operate with full synchronization.
- **Important Files:** `frontend/src/components/pages/PlannerPage.tsx`, `frontend/src/services/taskService.ts`, `backend/src/routes/taskRoutes.ts`.
- **Dependencies:** `AppContext.tsx`, `localDbService.ts`, `db.ts`.
- **Unknowns:** None.

---

### Focus Mode & Timer
- **Current Implementation:** `FocusPage.tsx`, `useFocusTimer.ts`, `RealisticHourglass.tsx`. Supports Pomodoro interval mode, Stopwatch mode, customizable countdowns, ambient audio tracks, distraction logging, and historical focus logging.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/FocusPage.tsx`, `frontend/src/components/ui/RealisticHourglass.tsx`, `frontend/src/services/focusDbService.ts`.
- **Dependencies:** `AppContext.tsx`, `focus_sessions` table.
- **Unknowns:** None.

---

### Notes & Files (Workspace)
- **Current Implementation:** `WorkspacePage.tsx`, `NoteEditorView.tsx`, `BlockEditor.tsx`. Modular block-based note editor supporting headings, todos, quotes, code blocks with syntax highlighting (`prismjs`), mathematical formulas (`KaTeX`), sticky notes, drawing canvases (`fabric.js`), and file attachments.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None. Notes persist as JSONB structures locally in IndexedDB and in PostgreSQL `notes` table.
- **Important Files:** `frontend/src/components/pages/WorkspacePage.tsx`, `frontend/src/components/workspace/BlockEditor.tsx`, `frontend/src/services/noteService.ts`.
- **Dependencies:** `AppContext.tsx`, `localDbService.ts`.
- **Unknowns:** Large binary attachments (>10MB) depend on local browser storage capacity when offline.

---

### My Mind / Mind Space
- **Current Implementation:** `MyMindPage.tsx`, `MindHome.tsx`, `IdeaCapture.tsx`, `ProblemSolver.tsx`. Provides fast unstructured brain dump, idea grouping, structured problem solving, and quick capture modals (`QuickCapture.tsx`).
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/MyMindPage.tsx`, `frontend/src/services/mindService.ts`.
- **Dependencies:** `AppContext.tsx`, `mind_items` table.
- **Unknowns:** None.

---

### Personal Diary
- **Current Implementation:** `DiaryHome.tsx`, `DiaryEditor.tsx`, `DiaryTopicView.tsx`. Multi-topic journaling with rich theme presets, cover styling, search modal (`DiarySearchModal.tsx`), voice input, and table of contents.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/diary/DiaryHome.tsx`, `frontend/src/services/diaryStorageService.ts`, `frontend/src/services/diaryDbService.ts`.
- **Dependencies:** `AppContext.tsx`, `diary_topics`, `diary_entries` tables.
- **Unknowns:** None.

---

### Learning / Skill Features
- **Current Implementation:** `LearningHubPage.tsx`, `learningDbService.ts`. Folder-based topic structures, daily practice logs, duration tracking, date-based streak calculations, and topic roadmaps.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/LearningHubPage.tsx`, `frontend/src/services/learningDbService.ts`.
- **Dependencies:** `AppContext.tsx`, `learning_folders`, `learning_logs` tables.
- **Unknowns:** None.

---

### AI Agent
- **Current Implementation:** `AIAgentPage.tsx`, `AIOrbFace.tsx`, `aiAgentService.ts`, `frontend/src/lib/server/aiService.ts`. Google Gemini engine supporting chat sessions, smart auto-titling, token quota management (`ai_tokens`), and 23+ intent actions with validation (`aiActionValidator.ts`).
- **Verified Status:** **VERIFIED**
- **Known Problems:** Candidate model list in `aiService.ts` references preview model names (`gemini-3.6-flash`, etc.) which cascade to `gemini-flash-latest` or rule-based fallback if unavailable.
- **Important Files:** `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/services/aiAgentService.ts`, `frontend/src/lib/server/aiService.ts`.
- **Dependencies:** `@google/genai`, `ai_chat_sessions`, `ai_tokens`.
- **Unknowns:** Gemini API token quotas in high-volume production use.

---

### Voice / Speech-to-Text (STT)
- **Current Implementation:** Dual-mode ASR architecture:
  1. Real-time streaming via WebSocket to `/api/ai/transcribe-stream` on Express backend (`webSocketService.ts`).
  2. Batch audio POST to `/api/ai/transcribe` (Next.js serverless route invoking Gemini audio generation).
  - Both modes feed into `useSpeechRecognition.ts` with overlap deduplication.
- **Verified Status:** **PARTIAL** (Batch HTTP transcription is VERIFIED; Streaming WebSocket requires the companion Express server and is unavailable on pure Vercel serverless).
- **Known Problems:** WebSocket connection fails on pure Vercel deployments; client gracefully falls back to batch HTTP transcription.
- **Important Files:** `frontend/src/hooks/useSpeechRecognition.ts`, `frontend/src/app/api/ai/transcribe/route.ts`, `backend/src/services/webSocketService.ts`.
- **Dependencies:** `MediaRecorder`, `@google/genai`, `ws`.
- **Unknowns:** None.

---

### Notifications
- **Current Implementation:** `NotificationsPage.tsx`, `notificationService.ts`, `notificationCenterService.ts`, `notificationTemplates.ts`, `sw.js`. Unified shared notification model between custom in-app notification center/banners and Android / Chromium Web Notifications API. Features crisp monochrome status bar badges (`badge-96x96.png`), full brand icon, native Web Notification action buttons (`[Start Focus]`, `[View Plan]`, `[Open Task]`, `[Practice]`, `[Dismiss]`), deterministic tag grouping (`focusforge-daily-plan-YYYY-MM-DD`, `focusforge-task-ID`), vibration patterns, and single-window client navigation routing (`focusforge:navigate`).
- **Verified Status:** **VERIFIED** (In-app center, banner triggers, shuffle-bag rotation, offline chime, ServiceWorker showNotification, deterministic deduplication, deep-link navigation, and native action dispatch).
- **Known Problems:** None. System container appearance (borders, shade background) is natively managed by Android/Chrome OS shell while all content, branding, icons, badges, tags, and action hooks are fully controlled by FocusForge.
- **Important Files:** `frontend/src/services/notificationService.ts`, `frontend/src/services/notificationCenterService.ts`, `frontend/public/sw.js`, `frontend/src/components/pwa/ServiceWorkerRegister.tsx`, `frontend/src/context/AppContext.tsx`.
- **Dependencies:** `user_notification_settings`, `user_notifications`, `user_notification_rotation`, Service Worker API.
- **Unknowns:** None.

---

### Supervisor Portal
- **Current Implementation:** `/supervisor` route (`supervisor/page.tsx`) protected by RBAC check (`user_roles.role IN ('supervisor', 'admin')`). Provides ticket management (`support_tickets` with `FF-XXXXXX` numbering), two-way thread replies (`ticket_replies`), internal supervisor notes, and audit logging (`supervisor_audit_logs`).
- **Verified Status:** **VERIFIED**
- **Known Problems:** None. Strict privacy boundary prevents supervisors from viewing user personal productivity data (notes, diary, tasks).
- **Important Files:** `frontend/src/app/supervisor/page.tsx`, `backend/src/routes/supervisorRoutes.ts`, `frontend/src/app/api/[...path]/route.ts`.
- **Dependencies:** `user_roles`, `support_tickets`, `ticket_replies`, `supervisor_audit_logs`.
- **Unknowns:** None.

---

### Settings & Account Management
- **Current Implementation:** `SettingsPage.tsx`, `ProfilePage.tsx`, `userService.ts`. Includes profile editing with unique case-insensitive display names, avatar upload/removal, password change with re-authentication and security alert email, theme and language persistence, and atomic user account deletion with ticket anonymization.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/SettingsPage.tsx`, `frontend/src/components/pages/ProfilePage.tsx`, `frontend/src/services/userService.ts`.
- **Dependencies:** `profiles`, `auth.users`, `nodemailer`.
- **Unknowns:** None.

---

### Local Storage (IndexedDB & LocalStorage)
- **Current Implementation:** `localDbService.ts` manages IndexedDB `focusforge_local_v3` with 15 stores. `indexedDBStorage.ts` provides user-scoped key partitioning (`getUserStorageKey`).
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/services/localDbService.ts`, `frontend/src/services/indexedDBStorage.ts`.
- **Dependencies:** Browser `indexedDB`, `localStorage`.
- **Unknowns:** Storage quota limits on restrictive mobile WebKit environments.

---

### Cloud Database (Auth-Only Supabase PostgreSQL)
- **Current Implementation:** PostgreSQL instance on Supabase connected via parameterized `pg.Pool` (`db.ts`) targeting connection pooler `aws-0-ap-northeast-2.pooler.supabase.com:6543`. Stores ONLY authentication/identity tables (`auth.users`, `public.profiles`, `public.user_roles`, `public.pending_signups`, `public.pending_password_resets`, `public.support_tickets`, `public.ticket_replies`, `public.push_subscriptions`) and the zero-knowledge ciphertext relay `public.encrypted_sync_records`. All obsolete personal tables have been safely removed. 25 schema migrations with migration `025_encrypted_sync_and_auth_only_cleanup.sql`.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None. Pre-cleanup audit data backed up in `backups/pre_cleanup_audit/`.
- **Important Files:** `supabase/migrations/` (001 to 025), `frontend/src/lib/server/db.ts`, `backend/src/services/db.ts`.
- **Dependencies:** `pg`, Supabase connection pooler.
- **Unknowns:** None.

---

### Cross-Device Sync & Encryption (E2EE)
- **Current Implementation:** `cryptoSyncService.ts` provides client-side Web Crypto AES-256-GCM encryption with 12-byte IVs and PBKDF2 key derivation using the user's master recovery key (`FF-XXXX-...`). `syncService.ts` drains `sync_queue` to `/api/sync/push` and `/api/sync/pull`. Settings page (`SettingsPage.tsx`) provides complete Recovery Key display, copy-to-clipboard, authorization on new devices, and instant manual sync triggers.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None. Cross-device syncing is fully zero-knowledge; Supabase never possesses plaintext or decryption keys.
- **Important Files:** `frontend/src/services/cryptoSyncService.ts`, `frontend/src/services/syncService.ts`, `frontend/src/components/pages/SettingsPage.tsx`, `supabase/migrations/025_encrypted_sync_and_auth_only_cleanup.sql`.
- **Dependencies:** `window.crypto.subtle`, `encrypted_sync_records` table.
- **Unknowns:** None.

---

### Backend (Dual Paths)
- **Current Implementation:**
  1. Next.js Serverless Catch-All API (`frontend/src/app/api/[...path]/route.ts`) — 1,873 lines implementing all REST routes.
  2. Companion Express Backend (`backend/src/server.ts`) on port 5000 with 12 route modules and WebSocket ASR engine.
  - Client `apiClient.ts` dynamically resolves target and fails over automatically.
- **Verified Status:** **VERIFIED**
- **Known Problems:** Developers must maintain parity between Express routes and Next.js serverless route handlers when altering backend endpoints.
- **Important Files:** `frontend/src/app/api/[...path]/route.ts`, `backend/src/server.ts`, `frontend/src/lib/apiClient.ts`.
- **Dependencies:** `express`, `next`, `pg`, `ws`.
- **Unknowns:** None.

---

### Frontend (App Shell, PWA Startup & Navigation)
- **Current Implementation:** Next.js 16 App Router. `frontend/src/app/page.tsx` acts as SPA shell switching between 11 view components with sidebar navigation, bottom navigation bar on mobile, dark skeleton loaders, and launch animation gating. Android PWA startup is fully dark (`#090c19`) with inline boot layer using the exact 512x512 splash icon asset (`/icons/icon-512x512.png` at 192px CSS centered) seamlessly executing an ~850ms sequence (100ms center hold, straight-line GPU flight with cubic-bezier(.32,.72,0,1) easing towards the visible device header slot resolved via strict hierarchy/viewport checks, 250-550ms dark skeleton fade-in, and same-frame landing swap to real header logo tile).
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/app/page.tsx`, `frontend/src/app/layout.tsx`, `frontend/src/components/ui/skeleton/AppShellSkeleton.tsx`, `frontend/public/manifest.json`, `frontend/public/manifest.webmanifest`, `frontend/public/sw.js`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/navigation/MobileHeader.tsx`, `frontend/src/context/AppContext.tsx`.
- **Dependencies:** `react` 19, `next` 16, `framer-motion`.
- **Unknowns:** None.

---

### Deployment
- **Current Implementation:** Vercel deployment configured via `frontend/vercel.json` and `frontend/next.config.ts`.
- **Verified Status:** **VERIFIED**
- **Known Problems:** WebSocket streaming ASR requires separate persistent hosting if real-time audio streaming is preferred over HTTP batch STT.
- **Important Files:** `frontend/vercel.json`, `frontend/next.config.ts`, `scripts/deploy.js`.
- **Dependencies:** Vercel platform.
- **Unknowns:** None.
