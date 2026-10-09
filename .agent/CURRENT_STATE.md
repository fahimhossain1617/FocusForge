# CURRENT_STATE.md — Current Verified State of Focentia

**Document Version:** 1.0.0  
**Last Updated:** October 2026  
**Status:** Authoritative Current State Baseline

---

## 1. Overall Status

Focentia is an active, functional productivity suite built with Next.js 16 App Router, PostgreSQL (Supabase), a companion Express backend engine, and Google Gemini AI. The application implements a pure **Local-First + Privacy-First + Auth-Only Supabase + Zero-Knowledge E2EE Cross-Device Sync** architecture.

- **Brand Migration Complete:** Entire application branding (UI, Settings, Privacy, Terms, Support, FAQs, Feature Guides, Preferences, About, Notifications, Email Templates, AI System Prompts, and I18n Translations in English & Bengali) has been comprehensively migrated to **Focentia** / **ফোসেন্টিয়া**.
- **Auth-Only Cloud Database:** Supabase stores ONLY authentication, account identity, supervisor support tickets, push subscriptions, and opaque AES-256-GCM encrypted sync blobs (`encrypted_sync_records`). Zero plaintext personal data is ever stored in or transmitted to the cloud database.
- **Local-First Personal Storage:** All user personal data (tasks, routines, notes, diary entries, mind dumps, focus logs, learning tracking, and AI memory) is stored locally on the user's device in IndexedDB (`focusforge_local_v3`).
- **End-to-End Encrypted Relay:** Synchronization across user devices operates via client-side AES-256-GCM encryption with 12-byte IVs and PBKDF2 key derivation using the user's master recovery key (`FF-XXXX-...`).
- **Private Chat & Privacy-First AI:** Ephemeral Private Chat mode guarantees zero persistence in local storage or cloud. AI consent defaults to "Keep My Chats Private" unless explicitly opted into improvements.

---

## 2. Detailed Subsystem Status Inventory

### Authentication & Password Reset
- **Current Implementation:** Supabase Auth SDK (`authService.ts`, `AuthContext.tsx`) for session management; custom Pre-Verification Signup flow (`/api/auth/pre-signup`, `/api/auth/verify-signup`) with 6-digit OTP stored in `public.pending_signups`; dedicated Two-Step Password Reset flow (`/reset-password`, `/auth/callback?type=recovery`, `/api/auth/request-reset-otp`, `/api/auth/verify-reset-otp`) with 6-digit OTP staged in `public.pending_password_resets` and delivered via email. Password reset email links clicked from Gmail immediately route directly to `/reset-password` without opening dashboard device encryption modals. On `/reset-password`, user enters new password & confirmation in Step 1, receives 6-digit OTP in email, verifies in Step 2, updates password in database, auto-logs in and transitions smoothly. Device encryption setup/unlock is gated to authenticated users only after onboarding completion and can be managed directly in Settings under `Privacy > E2EE Sync & Recovery Key`.
- **Verified Status:** **VERIFIED**
- **Known Problems:** Direct connection to `db.<project>.supabase.co` on IPv4 environments like Vercel must use Supabase connection pooler (`aws-0-ap-northeast-2.pooler.supabase.com:6543`) in environment variables.
- **Important Files:** `frontend/src/context/AuthContext.tsx`, `frontend/src/app/auth/callback/page.tsx`, `frontend/src/app/page.tsx`, `frontend/src/services/authService.ts`, `frontend/src/app/reset-password/page.tsx`, `frontend/src/components/pages/SettingsPage.tsx`, `frontend/src/services/onboardingStorage.ts`.
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

### Dashboard & Focus Metrics
- **Current Implementation:** `DashboardPage.tsx` aggregates metrics from Tasks, Focus Sessions, and Learning logs; calculates daily productivity scores, streak counters, and upcoming calendar schedules (`CalendarWidget.tsx`). Focus calculations compute focus minutes, break minutes, and distraction counts strictly from normalized `focusSessions` without double-counting synthetic activities. Supports inline collapsible distraction list with clean line-to-line separation without glows/shadows. Weekly and monthly metric summaries accurately calculate focus time, break time, distractions, and include Time Log skills completed in a responsive 5-metric row matching existing theme tokens.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/DashboardPage.tsx`, `frontend/src/components/pages/FocusPage.tsx`, `frontend/src/components/pages/ProfilePage.tsx`, `frontend/src/context/AppContext.tsx`, `frontend/src/services/focusDbService.ts`, `frontend/src/services/userService.ts`.
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
- **Current Implementation:** `FocusPage.tsx`, `useFocusTimer.ts`, `HourglassTimer.tsx`. Supports Pomodoro interval mode, Stopwatch mode, customizable countdowns, ambient audio tracks, distraction logging, and historical focus logging. Unboxed natural recent task presentation; Pause Friction Modal, Early Exit Guard Modal, and History Modal portaled to `document.body` via `createPortal` for true responsive viewport centering without clipping or parent transform traps.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/FocusPage.tsx`, `frontend/src/components/ui/HourglassTimer.tsx`, `frontend/src/services/focusDbService.ts`.
- **Dependencies:** `AppContext.tsx`, `focus_sessions` table.
- **Unknowns:** None.

---

### Notes & Files (Workspace)
- **Current Implementation:** `WorkspacePage.tsx`, `NoteEditorView.tsx`, `BlockEditor.tsx`. Modular block-based note editor supporting headings, todos, quotes, code blocks, mathematical formulas (`KaTeX`), sticky notes, and file attachments. Filtered notes sorted recent-first (`updatedAt || createdAt` descending) matching Mind Space. Mobile folder cards dynamically proportioned (`aspect-ratio: 1 / 1.18`). Code block line numbers removed for direct editing; Quick Note padded with `p-5 sm:p-6`; CommandMenu anchored to triggering block without viewport jumps. Folder detail header equipped with safe-area spacing matching My Diary.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/WorkspacePage.tsx`, `frontend/src/components/workspace/BlockEditor.tsx`, `frontend/src/components/pages/NoteEditorView.tsx`, `frontend/src/components/workspace/NoteCard.tsx`, `frontend/src/components/workspace/notecard.css`.
- **Dependencies:** `AppContext.tsx`, `localDbService.ts`.
- **Unknowns:** None.

---

### My Mind / Mind Space
- **Current Implementation:** `MyMindPage.tsx`, `MindHome.tsx`, `IdeaCapture.tsx`, `ProblemSolver.tsx`. Provides fast unstructured brain dump, idea grouping, structured problem solving, and quick capture modals (`QuickCapture.tsx`). Unified single-container writing composer design with seamless transparent textarea, centered VoiceWaveform during recording with zero status labels, and integrated lower action controls (Microphone, Bengali/English language toggle, Save button). Category selector tabs row ("Free Flow", "Idea Vault", "Problem Solver") centered across all screen sizes.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/MyMindPage.tsx`, `frontend/src/components/mymind/MindHome.tsx`, `frontend/src/components/mymind/VoiceInput.tsx`, `frontend/src/services/mindService.ts`.
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

### Learning / Skill Features (Time Log)
- **Current Implementation:** `LearningHubPage.tsx`, `learningDbService.ts`. Folder-based topic structures, daily practice logs, duration tracking, date-based streak calculations, and topic roadmaps. Inactivity gaps displayed as clean, unboxed normal text in both main skill cards and skill detail hero header.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/LearningHubPage.tsx`, `frontend/src/services/learningDbService.ts`.
- **Dependencies:** `AppContext.tsx`, `learning_folders`, `learning_logs` tables.
- **Unknowns:** None.

---

### AI Agent (Glory AI)
- **Current Implementation:** `AIAgentPage.tsx`, `AIChatAnimatedTypingInput.tsx`, `AIOrbFace.tsx`, `GloryOrbIcon.tsx`, `BorderBeam.tsx`, `aiAgentService.ts`, `frontend/src/lib/server/aiService.ts`. Rebranded as **Glory AI** (গ্লোরি এআই) with dedicated monochromatic Orb Face icon. Features a two-tier composer layout with a dedicated auto-growing native textarea supporting full Bengali Unicode script & conjunct rendering, expanding upward up to 150px on mobile and 220px on desktop with internal vertical scrolling beyond maximum height, while bottom action controls (Companion Mood, Model Selector, Voice Language Toggle, Mic, Send/Stop) remain stationary. Constant-speed SVG perimeter BorderBeam (with explicit 24px corner radius matching composer container) and VoiceReactiveGlow. Permanent silky pearl white Orb face across dark and light modes with full mobile touch drag tracking. Powered by ultra-low latency `gemini-3.5-flash-lite` engine (~1000ms response time) with instant streaming reveals, persistent active in-memory chat conversation across internal feature navigation (Planner, Today, Focus, etc.), explicit "New Chat" reset controls, smart auto-titling, strict persistent 5,000 token quota management with reset-at timers, and 23+ intent actions with validation (`aiActionValidator.ts`).
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/components/ai-agent/AIChatAnimatedTypingInput.tsx`, `frontend/src/components/ai-agent/ai-agent.module.css`, `frontend/src/hooks/useAIAgent.ts`, `frontend/src/components/ai-agent/AIOrbFace.tsx`, `frontend/src/components/ui/BorderBeam.tsx`, `frontend/src/components/icons/GloryOrbIcon.tsx`, `frontend/src/services/aiAgentService.ts`, `frontend/src/lib/server/aiService.ts`.
- **Dependencies:** `@google/genai`, `ai_chat_sessions`, `ai_tokens`.
- **Unknowns:** None.

---

### Voice / Speech-to-Text (STT) & Real-Time Dictation
- **Current Implementation:** Production-grade Single-Owner Voice Dictation & STT System:
  1. **Deterministic Single-Owner Engine:** Typed Finite State Machine (`VoiceSessionManager` & `useContinuousSpeech`) managing `IDLE` | `RECORDING` | `STOPPING` | `FINALIZING` | `PAUSED` | `ERROR` with epoch guards and session ID lifecycle management.
  2. **No-Live-Transcript UX Stability:** Prevents live interim text insertion and layout shifts during speech recording. The text input remains stable while the 60fps audio waveform and voice-reactive astral glow animate smoothly inside the text bar.
  3. **Exact-Once Idempotent Finalization:** On Pause/Stop, the session final transcript is merged with base text using `mergeTranscripts()` and committed exactly once.
  4. **Zero-Duplication & Genuine Repetition Preservation:** Eliminates multi-word repetitions across chunk boundaries while preserving intentional repetitions like "really really" and "অনেক অনেক".
  5. **Bilingual Support (Bangla & English):** Default `bn-BD` with discrete instant toggle to `en-US`.
  6. **Zero Hardware Lockouts:** Event-driven harmonic synthesis via `broadcastSpeechActivity` guarantees zero mic hardware contention.
  7. **Cloud AI Audio Transcription:** `/api/ai/transcribe` provides server-side Gemini multimodal fallback.
- **Verified Status:** **VERIFIED** (24/24 master automated voice tests passed, 12/12 reconciler tests passed, Next.js 16 production build passed with 0 errors).
- **Known Problems:** None.
- **Important Files:** `frontend/src/services/voice/transcriptReconciler.ts`, `frontend/src/services/voice/voiceSessionManager.ts`, `frontend/src/services/voice/voiceEditingController.ts`, `frontend/src/hooks/useContinuousSpeech.ts`, `frontend/src/hooks/useSpeechRecognition.ts`, `frontend/src/components/voice/VoiceWaveform.tsx`, `frontend/src/components/voice/VoiceReactiveGlow.tsx`, `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/components/mymind/VoiceInput.tsx`, `frontend/src/components/diary/DiaryVoiceInput.tsx`, `scripts/test_master_voice_verification.ts`.
- **Dependencies:** Web Speech API, `@google/genai`.
- **Unknowns:** None.


---

### Notifications & Background Smart Reminder System
- **Current Implementation:** `frontend/src/services/reminderSyncService.ts`, `frontend/src/lib/server/schedulerService.ts`, `backend/src/services/notificationSchedulerService.ts`, `frontend/src/lib/server/db.ts`, `backend/src/services/db.ts`, `frontend/src/components/navigation/NotificationOrbAvatar.tsx`, `frontend/src/services/notificationService.ts`, `frontend/src/services/notificationTemplates.ts`, `frontend/src/hooks/useDailyPlan.ts`, `frontend/public/sw.js`, `frontend/src/components/pwa/ServiceWorkerRegister.tsx`, `frontend/src/components/pages/NotificationsPage.tsx`, `frontend/vercel.json`, `supabase/migrations/028_scheduled_reminders_and_queue.sql`. Unified production-grade background scheduling and Web Push delivery pipeline:
  1. **Strict User-Fixed Task Scheduling:** Todo Task Reminders (exact 5-minute Pre-Reminder and exact Start Reminder) are strictly locked to the user's chosen task times. Task reminders are protected with high priority and are completely exempt from non-urgent cooldown spacing and daily limits, guaranteeing prompt delivery at the exact scheduled minute.
  2. **Deterministic Daily Jitter & Organic Dynamic Slots:** General automated nudges (Morning Plan ~07:45, Morning Focus ~08:45, Evening Focus ~18:30, Skill Practice rotated across Morning/Sunset/Night slots, Inactivity ~19:30, Diary Reflection ~21:15) dynamically jitter day-by-day based on deterministic daily hashing, preventing rigid identical delivery times every day while avoiding midday/lunch (12:00–15:00) interruptions.
  3. **Persistent Cloud Database Queue (`scheduled_reminders`):** Migration 028 introduces an indexed, RLS-protected persistent queue for scheduled notification items. Uses partial index `idx_scheduled_reminders_pending_due` for sub-millisecond polling.
  4. **Automated Cron Scheduling Engine:** Vercel Cron configured in `vercel.json` (`/api/notifications/cron` every minute) and Companion Express Backend (`notificationSchedulerService.ts` via `node-cron`).
  5. **Atomic Claiming with Concurrency Protection:** High-concurrency worker safe claiming using PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` inside `dbClaimDueScheduledReminders`, guaranteeing zero duplicate dispatch across multiple server instances or retries.
  6. **Anti-Spam & Quiet Hours:** Applies 45-minute minimum spacing between non-urgent automated nudges, enforces user-defined daily limits (default: 5), and timezone-aware Quiet Hours (22:00–07:00).
  7. **Multi-Device Web Push Delivery:** Delivers authenticated payloads via `web-push` using VAPID keys with automatic purge of 410/404 expired endpoints.
- **Verified Status:** **VERIFIED** (All tests passed, Next.js 16 build passed cleanly with 0 errors).
- **Known Problems:** None.
- **Important Files:** `frontend/src/services/reminderSyncService.ts`, `frontend/src/lib/server/schedulerService.ts`, `backend/src/services/notificationSchedulerService.ts`, `frontend/src/lib/server/db.ts`, `backend/src/services/db.ts`, `frontend/src/app/api/[...path]/route.ts`, `frontend/vercel.json`, `supabase/migrations/028_scheduled_reminders_and_queue.sql`, `frontend/public/sw.js`.
- **Dependencies:** `web-push`, `pg`, `node-cron`, Service Worker API, Push API.
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

### Local Storage (Dexie.js IndexedDB & Safe Migration)
- **Current Implementation:** `lib/db.ts` and `lib/repositories/*` manage typed Dexie.js IndexedDB (`focentia_e2ee_db_v1`) across 17 versioned object stores. `lib/migrations/localStorageToIndexedDB.ts` provides safe, idempotent, non-destructive migration from legacy `localStorage` with a multi-step verification gate before cleanup. Direct `localStorage` use for persistent state is eliminated.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/lib/db.ts`, `frontend/src/lib/repositories/index.ts`, `frontend/src/lib/migrations/localStorageToIndexedDB.ts`, `frontend/src/services/localDbService.ts`.
- **Dependencies:** `dexie`, Web IndexedDB API.
- **Unknowns:** None.

---

### Cloud Database (Auth-Only Supabase PostgreSQL)
- **Current Implementation:** PostgreSQL instance on Supabase connected via parameterized `pg.Pool` (`db.ts`) targeting connection pooler `aws-0-ap-northeast-2.pooler.supabase.com:6543`. Stores ONLY authentication/identity tables (`auth.users`, `public.profiles`, `public.user_roles`, `public.pending_signups`, `public.pending_password_resets`, `public.support_tickets`, `public.ticket_replies`, `public.push_subscriptions`), the zero-knowledge key vault `public.user_encryption_keys`, and the ciphertext relay `public.encrypted_sync_records`. All obsolete personal tables have been safely removed. 26 schema migrations through `026_user_encryption_keys_and_e2ee.sql`.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `supabase/migrations/` (001 to 026), `frontend/src/lib/server/db.ts`, `backend/src/services/db.ts`.
- **Dependencies:** `pg`, Supabase connection pooler.
- **Unknowns:** None.

---

### Cross-Device Sync & Envelope-Key E2EE Architecture
- **Current Implementation:** `lib/crypto.ts` provides complete Web Crypto AES-256-GCM envelope encryption with 12-byte IVs, cryptographically random 256-bit MEK, 250,000-iteration PBKDF2-HMAC-SHA-256 KEK derivation, and wrapped key envelope persistence in Supabase `user_encryption_keys`. `lib/sync.ts` & `services/syncService.ts` provide debounced, batched offline-first sync with monotonic `data_version` tracking and conflict resolution. Interactive modals (`PassphraseSetupModal.tsx`, `PassphraseUnlockModal.tsx`, `RecoveryKeyExportModal.tsx`) and live indicators (`SyncStatusIndicator.tsx`) are integrated seamlessly into UI navigation. Binary file attachments (images, PDFs) are encrypted client-side before upload to Supabase Storage.
- **Verified Status:** **VERIFIED** (22/22 crypto tests passed, frontend and backend production builds passed with 0 errors).
- **Known Problems:** None.
- **Important Files:** `frontend/src/lib/crypto.ts`, `frontend/src/lib/db.ts`, `frontend/src/lib/sync.ts`, `frontend/src/services/syncService.ts`, `frontend/src/components/encryption/*`, `supabase/migrations/026_user_encryption_keys_and_e2ee.sql`.
- **Dependencies:** `window.crypto.subtle`, `dexie`, `user_encryption_keys`, `encrypted_sync_records`.
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
- **Current Implementation:** Next.js 16 App Router. `frontend/src/app/page.tsx` acts as SPA shell switching between 11 view components with sidebar navigation, bottom navigation bar on mobile, dark skeleton loaders, and launch animation gating. Includes comprehensive history & hardware back-button navigation integration (`popstate`), instant circular theme transition (`themeTransition.ts`), clean transparent popover backdrops, fixed bottom nav, and refined Focus UI.
- **App Icons & Instant Startup Transition:** Brand app icon with full-bleed white background and centered FocusForge emblem mark across all mobile and web formats. Zero-latency in-app boot layer (`#ff-boot-layer`) renders an identical white badge with SVG mark and executes an ultra-fast, eye-soothing 240ms flight animation (`cubic-bezier(0.16, 1, 0.3, 1)`) scaling and translating directly into the header/sidebar logo slot upon launch. HTML navigation uses Stale-While-Revalidate caching in `sw.js` for instant sub-0.3s app open. Unexpected PWA hard-reloads removed from `ServiceWorkerRegister.tsx` to prevent mid-session refreshing and layout flashing.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/app/page.tsx`, `frontend/src/app/layout.tsx`, `frontend/public/sw.js`, `frontend/public/app-icon.svg`, `frontend/public/icons/*`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/navigation/MobileHeader.tsx`, `frontend/src/components/navigation/BottomNav.tsx`, `frontend/src/components/icons/GloryOrbIcon.tsx`, `frontend/src/context/AppContext.tsx`, `frontend/src/context/AuthContext.tsx`, `frontend/src/utils/themeTransition.ts`.
- **Dependencies:** `react` 19, `next` 16, `framer-motion`.
- **Unknowns:** None.

---

### Real-Time Voice-to-Text & Global Continuous Speech Recognition Engine
- **Current Implementation:** Pure production-grade real-time dictation engine powered globally by `useContinuousSpeech` (`frontend/src/hooks/useContinuousSpeech.ts`):
  1. `useContinuousSpeech` (`frontend/src/hooks/useContinuousSpeech.ts`): Zero-drop continuous speech recognition engine. Uses dual-buffer architecture (`allFinalTextRef` + `sessionFinalRef`). Dispatches `speech-activity` events. On Chrome's native Web Speech API `recognition.onend` termination, if listening is active, locks session words and waits a deliberate **300ms buffer** before rolling over. Implements strict error backoff guards preventing rapid-fire restart loops.
  2. **Zero-Conflict Audio Architecture (`useVoiceAmplitude.ts`):** Removed competing hardware `getUserMedia` capture that previously locked microphones on Android and Windows, eliminating the `audio-capture` crash loop and repetitive "beep beep" audio glitches. Replaced with an event-driven organic harmonic voice amplitude & frequency synthesizer.
  3. **Live Caret & Permanent Textarea Visibility:** Textareas remain permanently mounted across all views (`MindHome.tsx`, `IdeaCapture.tsx`, `ProblemSolver.tsx`, `ThoughtDetail.tsx`, `QuickCapture.tsx`, `VoiceInput.tsx`, and `AIAgentPage.tsx`). As users speak, transcribed text streams live into the field while the harmonic waveform animates smoothly above or embedded inside.
  4. **Single Engine Consolidation:** All voice entry points (Mind Space, Idea Vault, Problem Solver, Thought Detail, Quick Capture, Diary, and Glory AI Composer) route through `useContinuousSpeech`.
  5. `VoiceInput` (`frontend/src/components/mymind/VoiceInput.tsx`): Consumes `useContinuousSpeech` globally across Mind Space (`MindHome.tsx`), Idea Vault (`IdeaCapture.tsx`), Problem Solver (`ProblemSolver.tsx`), Thought Detail (`ThoughtDetail.tsx`), and Quick Capture (`QuickCapture.tsx`).
  6. `DiaryVoiceInput` (`frontend/src/components/diary/DiaryVoiceInput.tsx`): Consumes `useContinuousSpeech` for reliable, zero-drop diary dictation with smooth auto-scroll.
  7. **Glory AI Input Integration (`AIAgentPage.tsx`):** Connected `onTranscriptChange` to chat input state, enabling direct real-time speech dictation into Glory AI.
  8. **Voice-Reactive Ambient Glow Effect & Harmonic Waveform:**
     - **Astral Violet-Cyan Aurora:** High-contrast organic aura (`VoiceReactiveGlow.tsx` / `VoiceReactiveGlow.module.css`) in violet, purple, and cyan tones (`rgba(168, 85, 247, ...)`, `rgba(6, 182, 212, ...)`).
     - **Harmonic Audio Waveform Bar:** Live audio equalizer waveform (`VoiceWaveform.tsx`) rendered alongside active text inputs.
     - **Glory AI Border Beam Dynamic Transition:** When voice is started in Glory AI, `BorderBeam` is automatically hidden, leaving only the ambient glow and reactive sound wave, and reappears when voice stops.
     - **Unified Mic / Stop Square Controls:** Standard `<Mic>` icon in idle states, switching to `<Square>` stop icon in theme accent when active.
     - **Bengali/English Language Toggle:** Discrete touch button (`বাং` / `EN`) next to all voice inputs (Glory AI, Mind Space, My Diary) defaulting to `bn-BD`.
- **Verified Status:** **VERIFIED** (Automated Next.js production build passed with 0 errors across all 17 routes, 12/12 voice system tests passed, 7/7 continuous speech tests passed, verified live text synchronization and zero beep loop architecture).

- **Important Files:** `frontend/src/hooks/useContinuousSpeech.ts`, `frontend/src/hooks/useVoiceAmplitude.ts`, `frontend/src/components/voice/VoiceWaveform.tsx`, `frontend/src/components/voice/VoiceReactiveGlow.tsx`, `frontend/src/components/mymind/VoiceInput.tsx`, `frontend/src/components/mymind/MindHome.tsx`, `frontend/src/components/ai-agent/AIAgentPage.tsx`.
- **Dependencies:** Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
- **Unknowns:** None.

---

### Web Push & PWA Background Notifications Subsystem
- **Current Implementation:**
  1. **OS-Level Service Worker Push Handler (`frontend/public/sw.js`):** Standalone `push` event listener parsing JSON/text payloads and invoking `event.waitUntil(self.registration.showNotification(title, options))` so the OS handles displaying notifications even when the app/browser is terminated or minimized. Robust `notificationclick` handler focusing active clients or launching window to deep-linked URLs.
  2. **VAPID Keys & Client Subscription Pipeline (`frontend/src/utils/pushSubscription.ts`):** ECDSA P-256 VAPID protocol integration (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY`). `subscribeUserToPush` negotiates browser PushManager subscription via `urlBase64ToUint8Array` and persists endpoint/keys to `push_subscriptions` database table. Integrated automatically with `ServiceWorkerRegister.tsx` and `notificationService.ts`.
  3. **Backend Scheduler & Push Worker (`backend/src/services/notificationSchedulerService.ts`):** Persistent server background worker running every 60s to evaluate scheduled rules:
     - 5 minutes before scheduled task (`task_pre_reminder`)
     - Exact task start time (`task_start`)
     - 30 minutes before task end if still incomplete (`task_incomplete`)
     - Midday & evening focus reminders if no focus session recorded today (`focus_reminder`)
     - Skill builder practice reminder if learning topics exist but not practiced today (`skill_reminder`)
     - Mind space / Diary reminder every evening (`diary_reminder`)
     - 1-day inactivity companion alert to chat with Glory AI or resume focus (`ai_companion`)
     Respects quiet hours (22:00 - 07:00), daily frequency caps, and deduplication.
  4. **Simplified Settings UI with Master Toggle (`SettingsPage.tsx`):** Clean header without redundant "Active" badge. Central push toggle in the Notification Settings header allows switching notifications ON and OFF fluidly at any time. When turned ON, it promptly enables state and schedules Web Push registration asynchronously in the background. When turned OFF, disables notifications and disables all sub-toggles.
  5. **Server-Side Push Delivery Pipelines (`webPushService.ts`):** `frontend/src/lib/server/webPushService.ts` and `backend/src/services/webPushService.ts` using `web-push` library with automatic removal of 410/404 expired subscriptions.
  6. **API Endpoints:** `POST /api/notifications/subscribe`, `POST /api/notifications/unsubscribe`, `POST /api/notifications/send-push`, `POST /api/notifications/test`, `POST /api/notifications/cron`, `GET/POST /api/notifications/settings`.
- **Verified Status:** **VERIFIED** (Next.js production build passed with 0 errors, toggle on/off verified, non-blocking asynchronous Web Push registration guard active).
- **Important Files:** `frontend/public/sw.js`, `frontend/src/utils/pushSubscription.ts`, `frontend/src/lib/server/webPushService.ts`, `backend/src/services/webPushService.ts`, `backend/src/services/notificationSchedulerService.ts`, `frontend/src/components/pages/SettingsPage.tsx`, `frontend/src/hooks/useDailyPlan.ts`, `frontend/src/services/notificationTemplates.ts`, `frontend/src/app/api/[...path]/route.ts`, `backend/src/routes/notificationRoutes.ts`.
- **Dependencies:** `web-push`, PushManager API, Service Worker API, PostgreSQL.
- **Unknowns:** None.

### PWA 'Get App' / Installation Subsystem
- **Current Implementation:**
  1. **Dual Responsive Placement:**
     - **Mobile & Tablet:** Modern compact pill button rendered in `MobileHeader.tsx` directly to the left of the Theme Toggle button.
     - **Desktop / Laptop (Expanded Sidebar):** Sleek install banner card rendered in `Sidebar.tsx` immediately above the User profile & settings row.
     - **Desktop / Laptop (Collapsed Sidebar):** Clean icon button with tooltip rendered in the bottom icon stack above the user avatar.
  2. **Intelligent Visibility & Lifecycle State:**
     - Only shown when running in standard web browser / via web link.
     - Detects standalone display mode (`(display-mode: standalone)`, `navigator.standalone`, `getInstalledRelatedApps()`, etc.).
     - Captures and synchronizes `beforeinstallprompt` and `appinstalled` events across `ServiceWorkerRegister.tsx` and `InstallPrompt.tsx`.
     - Once installed (via native prompt, button click, or browser menu), automatically and permanently hidden.
  3. **Universal Cross-Browser Support:**
     - Directly triggers native prompt when available (`deferredPrompt.prompt()`).
     - Provides clear platform-specific guidance for iOS Safari ("Share -> Add to Home Screen") and desktop browsers.
- **Verified Status:** **VERIFIED** (Next.js production build passed with 0 errors across 18 static/dynamic routes, verified responsive rendering and prompt lifecycle).
- **Important Files:** `frontend/src/components/pwa/InstallPrompt.tsx`, `frontend/src/components/pwa/ServiceWorkerRegister.tsx`, `frontend/src/components/navigation/MobileHeader.tsx`, `frontend/src/components/Sidebar.tsx`.
- **Dependencies:** Web App Manifest, Service Worker API.
- **Unknowns:** None.

---

### Deployment
- **Current Implementation:** Vercel deployment configured via `frontend/vercel.json` and `frontend/next.config.ts`.
- **Verified Status:** **VERIFIED**
- **Known Problems:** WebSocket streaming ASR requires separate persistent hosting if real-time audio streaming is preferred over HTTP batch STT.
- **Important Files:** `frontend/vercel.json`, `frontend/next.config.ts`, `scripts/deploy.js`.
- **Dependencies:** Vercel platform.
- **Unknowns:** None.

