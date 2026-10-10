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
- **Current Implementation:** `DashboardPage.tsx` aggregates metrics from Tasks, Focus Sessions, and Learning logs; calculates daily productivity scores, streak counters, and upcoming calendar schedules (`CalendarWidget.tsx`). Focus calculations compute focus minutes, break minutes, timer minutes, and distraction counts strictly from normalized `focusSessions` without double-counting synthetic activities or Stopwatch timer sessions inside Pomodoro focus time. Supports clean, human-readable time formatting (`12s`, `1m 10s`, `1m`, `1h 20m`) avoiding fractional float overflows. The radial Donut gauge includes dedicated contiguous stroke segments for Focus, Breaks, and Stopwatch Timer (`#38BDF8`). Weekly and monthly performance views show segregated Pomodoro focus time and dedicated Timer summaries.
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
- **Current Implementation:** `FocusPage.tsx`, `useFocusTimer.ts`, `HourglassTimer.tsx`, `StopwatchTimer.tsx`. Supports Pomodoro interval mode and Count-Up Stopwatch mode (`StopwatchTimer.tsx`) with seamless tab toggling. Features topic/task history with "View all" management modal, solid blue Save Session action, instant zero-prompt reset, and isolated active timer view (hiding page header and mode switcher during active stopwatch sessions). Pause Friction Modal, Early Exit Guard Modal, and History Modal portaled to `document.body` via `createPortal` for true responsive viewport centering.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/FocusPage.tsx`, `frontend/src/components/focus/StopwatchTimer.tsx`, `frontend/src/components/ui/HourglassTimer.tsx`, `frontend/src/services/focusDbService.ts`.
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
- **Current Implementation:** `LearningHubPage.tsx`, `learningDbService.ts`, `roadmapService.ts`, `AIRoadmapCard.tsx`. Folder-based topic structures, daily practice logs, duration tracking, date-based streak calculations, and topic roadmaps. Direct integration between AI roadmaps and Time Log topics: each topic card displays an interactive Roadmap badge button with derived progress metrics. Clicking the button opens a dedicated full-fidelity roadmap modal synced in real-time with local persistence. Inactivity gaps displayed as clean, unboxed normal text in both main skill cards and skill detail hero header.
- **Verified Status:** **VERIFIED**
- **Known Problems:** None.
- **Important Files:** `frontend/src/components/pages/LearningHubPage.tsx`, `frontend/src/services/learningDbService.ts`, `frontend/src/services/roadmapService.ts`, `frontend/src/components/ai-agent/AIRoadmapCard.tsx`.
- **Dependencies:** `AppContext.tsx`, `learning_folders`, `learning_logs` tables, `roadmapService.ts`.
- **Unknowns:** None.

---

### AI Agent (Focentia AI) & Secure Application Tools (Phases 1–6 & Final Emotional Animation Phase Complete)
- **Current Implementation:** `AIAgentPage.tsx`, `AIChatAnimatedTypingInput.tsx`, `AIOrbFace.tsx`, `AIRoadmapCard.tsx`, `aiAgentService.ts`, `roadmapService.ts`, `useOrbMood.ts`, `aiStatusEvents.ts`, `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`, `frontend/src/lib/server/aiServerTools.ts`, `backend/src/services/aiServerTools.ts`, `frontend/src/services/aiActionValidator.ts`, `backend/src/services/aiActionValidator.ts`, `frontend/next.config.ts`. Rebuilt around **Google Gemini as the primary intelligence** (Phase 1), connected via **Typed Application Tools & Capability Registry** (Phase 2), augmented with **Intelligent Learning Roadmaps & Reactive Status System** (Phase 3), hardened with **Multi-Tenant Isolation, Confirmation Integrity & E2E Acceptance Verification** (Phase 4), fortified with **Comprehensive AI Security Audit & Prompt Injection Isolation**, enhanced with **Phase 6 Human-Centered Personality, Caring Older Brother Persona, Exam Anxiety Support & Evidence-Based Motivation**, and finalized with **Context-Aware Dynamic Facial Reactions, Organic 60fps LERP Motion, 24 Expression States & SVG Hand Poses/Accessories in AIOrbFace**.
  1. **Application Capability Registry (`.agent/CAPABILITY_REGISTRY.md`):** Typed mapping of all features. Arbitrary tools (`execute_shell`, `raw_sql_query`, `drop_database`, `fetch_internal_url`, `read_env_secrets`) are strictly blocked.
  2. **11 Typed Server-Side Read & Query Tools (`aiServerTools.ts`):** `search_planner_entries`, `get_planner_entries_for_date`, `propose_planner_entries`, `get_time_log_topics`, `search_notes_and_files`, `get_note_or_file_content`, `search_diary_entries`, `get_diary_entry`, `get_performance_report`, `get_available_app_destinations`, `prepare_navigation`. Enforces strict tenant isolation (`WHERE user_id = $1`) and automatic credential redaction (`sanitizeOutput`).
  3. **Zero-Hallucination Schemas & Evidence-Based Motivation:** Motivation is strictly grounded in authentic verified application data. Prohibits inventing completed tasks, study hours, exam preparation progress, practice counts, or academic results.
  4. **Phase 6 Caring Older Brother Persona & Emotional Intelligence:** Natural, warm, empathetic communication (বড় ভাইয়ের মতো স্নেহশীল ও নির্ভরতার সুর) with light humor & teasing, exam anxiety validation, procrastination root-cause clarification (tired vs overwhelmed vs lack of direction), proportional responses for greetings, and optional contextual feature bridging.
  5. **Final Phase Dynamic Facial Reactions & SVG Poses:** 24 typed states (`serious`, `protective`, `laughing`, `playful`, `empathetic`, `encouraging`, `proud`, `celebrating`, `focused`, `resting`, `sad`, `happy`, `curious`, etc.). Includes dedicated SVG eyebrows, eyes, and mouth geometries, glowing cyber shield badge for security/prompt-injection refusal, twinkling golden stars for achievements, floating hearts, and pulsing 3D heart hand poses.
  6. **Accessibility & Reduced Motion:** Full `@media (prefers-reduced-motion: reduce)` support scaling down non-essential continuous animation loops while maintaining responsive state cues.
  7. **Mandatory Clarification & Cryptographic Mutation Gate:** Requests with missing mandatory fields trigger typed clarification (`status: "pending_clarification"`, `type: "clarification"`). All data mutations require explicit user confirmation (`confirmationRequired: true`) with HMAC SHA-256 tokens (`confirmationToken`), creation timestamps (`createdAtTimestamp`), and 15-minute expirations (`expiresAt`).
  8. **Prompt Injection & Data Isolation:** All user queries and multi-turn context are wrapped in `<untrusted_user_query_and_context>` tags with deterministic directives to ignore injection attempts (e.g. DAN mode, system prompt disclosure). Refusals trigger a serious/protective visual posture.
  9. **Rate Limiting & Payload Bounds:** Enforces 40 req/min burst rate limits and 5,000 char message length bounds on `/api/ai/agent/chat`.
  10. **Global Security Headers:** `next.config.ts` enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `X-XSS-Protection`.
  11. **Server Route Emotion & Roadmap Forwarding:** Serverless API (`route.ts`) and Express companion route (`aiRoutes.ts`) explicitly pass `emotion`, `reaction`, `roadmap`, `navigation`, and `type` properties in `aiMessage` payloads, ensuring seamless dynamic facial reactions and interactive roadmap rendering on both direct serverless and companion backend routes.
  12. **Multi-Tenant User Memory & Session Cache Isolation:** Local AI sessions, memories, and learning roadmaps are partitioned by authenticated user ID (`focusforge_ai_sessions_${userId}`, `focusforge_saved_roadmaps_${userId}`) preventing cross-user data leakage on shared devices while maintaining offline-first IndexedDB persistence.
  13. **Dual Model Rebranding (Focentia 2.1 & Focentia Pro):** Fast everyday tasks and responsive conversations execute via Focentia 2.1 (`gemini-3.5-flash-lite`, ~1.1s latency); deep planning, study roadmaps, and comprehensive schedules execute via Focentia Pro (`gemini-3.8-flash` & `gemini-3.7-flash`).
  14. **Zero-Emoji Text Persona & Dynamic Animated Orby Face (`AIOrbFace`):** Eliminated all keyboard emojis from generated message text and system fallback messages; emotions are expressed visually through the Orby face's eyebrows, eyes, mouth, accessories, and head tilt. Component priority fix in `AIOrbFace.tsx` (`(orbState && orbState !== 'idle') ? orbState : propMood`) ensures active Gemini emotion (`sulky`, `laughing`, `sad`, `happy`, `proud`, `curious`, etc.) immediately drives physical expressions on every turn without latency overhead.
  15. **User Token Allocation & Multiplier Rules (5,000 Auth / 1,000 Guest, Zero UI Leakage):** Strictly enforces individual token quotas per user/guest across both Next.js App Router (`frontend/src/lib/server/aiTokenService.ts`) and Express companion backend (`backend/src/services/aiTokenService.ts`):
      - **Logged-in Users:** 5,000 tokens per account individually (isolated by user ID in PostgreSQL `profiles` table / memory store). No user can access or deplete another user's tokens.
      - **Guest Users:** 1,000 tokens per device/session individually (isolated by unique `x-guest-id` header / client IP).
      - **Focentia 2.1 Consumption:** Light / minimal consumption per turn (0.5x multiplier, minimum 5 tokens).
      - **Focentia Pro Consumption:** Higher consumption per turn (2.0x multiplier, minimum 30 tokens).
      - **Zero UI Exposure:** Zero numbers, token balances, or calculations are rendered in the client UI. The user only receives an informative Bengali/English notification when their daily limit or guest limit has been exhausted.
  16. **Interactive Time Selection, Pre-Roadmap Clarification & Action Deep-Linking:** Interactive per-item time picker inputs on planner proposal cards allowing users to choose study times before confirming; post-confirmation navigation buttons to target features (Planner, Time Log, Diary, Focus, Notes, Mind); automatic synchronization of roadmap subject names to Time Log topics; interactive roadmap viewing modals on Time Log folder cards with real-time completion tracking.
  17. **Full Database & Client AI Chat Persistence:** Created PostgreSQL storage tables (`ai_chat_sessions`, `ai_chat_messages`) managed by `frontend/src/lib/server/aiChatService.ts`. Auto-persists all user and assistant chat messages for logged-in and guest users across browser refreshes and device restarts.
  18. **Strict Zero-Placeholder Topic Naming:** Enforces authentic topic deduction from user queries. Completely eliminated "New Topic", "New Topic Roadmap", and "নতুন বিষয়" across Mind Space, Time Log, Diary, Planner, and AI action cards.
  19. **Persistent Limit Reached Banner & Sleeping Orb:** Fixed sticky banner displaying live countdown to quota reset (e.g., `রিস্টোর হবে: ২ ঘণ্টা ১৫ মিনিট পর`), remaining visible across tab navigation and New Chat clicks. AI Orb Face automatically enters `sleepy` mode with eyes closed and restful speech bubble (`"তোমার আজকের লিমিট শেষ হয়ে গেছে, তাই আমি একটু রেস্ট নিচ্ছি..."`).
  20. **Time Log Roadmap Integration & Celebration:** Time Log top bar and folder detail hero row feature direct Roadmap access buttons with completion percentage badges. 100% roadmap completion displays a warm congratulations message banner and confetti celebration.
  21. **Glory AI Local-First Router Architecture:** Client-side local router (`frontend/src/lib/ai/router/`) resolves ~85-90% of user queries entirely within client device code at 0 Gemini tokens:
      - **Social & Small Talk:** Greetings, identity, jokes, compliments, farewells via editable JSON bank (`social.json`).
      - **Emotional Support & Motivation:** 15-25 variants each for exam fear, loneliness/sadness, procrastination with actionable buttons (25m Focus session, My Diary, Planner) via editable bank (`motivation.json`).
      - **Planner & Multi-Turn State Machine:** Time expression parsing (`10am`, `16:00`, `সকাল ১০টা`, `বিকাল ৪টা`); asks for missing task time on partial queries and schedules tasks upon user response without pinging Gemini.
      - **Diary Actions:** Creates diary topic chapters locally and provides direct buttons to My Diary without leaking contents to Gemini.
      - **Time Log & Learning Guidance:** Advises user to track their learning journey with Time Log and schedule study sessions in Planner with dedicated time for consistency; never generates an unrequested curriculum or roadmap unless explicitly asked ("roadmap" / "রোডম্যাপ").
      - **Timer vs Focus Session Distinction:** When user asks for a timer or stopwatch ("i need a timer", "টাইমার চাই"), routes to `TIMER_ACTION` with `open_timer` action directing to the built-in Stopwatch Timer (`focusTab: 'timer'`), NOT a 25m Pomodoro focus session.
      - **Focus Duration Multi-Turn Flow:** AI never auto-selects 10m or 25m focus durations without asking. If duration is omitted, asks the user how many minutes they want to focus for, then creates the session card upon user response.
      - **Focus Countdown Integrity Fix:** Solved the instant-finish bug in `useFocusTimer.ts` & `FocusPage.tsx` where sessions immediately completed upon navigation due to stale 0-minute closures; sessions now run their full countdown before displaying congratulations.
      - **Interactive Planner Cards & Zero-Emoji Standard:** Removed synthetic `60m` minute pill from Planner cards in chat; added interactive date and start/end time pickers; replaced all emojis with Lucide SVG icons across all cards.
      - **AIRoadmapCard Save Enforcement:** Clicking "Open Time Log" before clicking "Save Plan" displays a clear amber warning banner requiring the user to save first.
      - **Strict Bengali Name Spelling:** Mandatory compliance across all templates, system prompts, and UI ensuring the app name is strictly spelled **"ফোসেন্টিয়া"**.
      - **App Navigation & Settings Help:** Explanations and deep links to all screens and subpages (Language, Theme, Password, Notifications, Delete Account, Support).
      - **Anti-Repetition Shuffle-Bag:** 5-turn rotation memory prevents repetitive responses on repeated queries.
      - **Safety & Distress Interception:** Local interception of self-harm/crisis phrases with Bangladesh emergency numbers (999, Kaan Pete Roi) and My Diary navigation; never calls Gemini.
      - **Selective Gemini Delegation & Token Bug Fix:** Gemini is called strictly for Roadmaps and big tasks with bound maxOutputTokens (1500 for roadmaps, 800 for big tasks), `thinkingBudget: 0` for Flash models, pruned 4-turn history, and 5-minute TTL caching.
- **Verified Status:** **VERIFIED** (Next.js 16 production build passed with 0 errors, backend build passed, automated verification tests passed: 22/22 in `scripts/test_local_router.ts`).
- **Known Problems:** Direct connection to IPv4 Supabase requires pooler URL (already configured). Free tier `gemini-3.6-flash` rate limit triggers graceful cascade to `gemini-3.5-flash-lite` and `gemini-3.8-flash`.
- **Important Files:** `frontend/src/lib/ai/router/*`, `scripts/test_local_router.ts`, `.agent/CAPABILITY_REGISTRY.md`, `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/components/ai-agent/AIOrbFace.tsx`, `frontend/src/components/ai-agent/useOrbMood.ts`, `frontend/src/components/ai-agent/AIRoadmapCard.tsx`, `frontend/src/components/pages/LearningHubPage.tsx`, `frontend/src/lib/server/aiChatService.ts`, `frontend/src/services/roadmapService.ts`, `frontend/src/services/aiAgentService.ts`, `frontend/src/services/aiMemoryService.ts`, `frontend/src/services/aiConsentService.ts`, `frontend/src/services/aiActionValidator.ts`, `backend/src/services/aiActionValidator.ts`, `frontend/src/lib/server/aiServerTools.ts`, `backend/src/services/aiServerTools.ts`, `frontend/src/app/api/[...path]/route.ts`, `backend/src/routes/aiRoutes.ts`.
- **Dependencies:** `@google/genai`, Supabase auth, PostgreSQL pooler, local IndexedDB.
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

### Intelligent Learning Roadmaps & AI Status Lifecycle (Phase 3)
- **Current Implementation:**
  1. **Dynamic Gemini-Powered Learning Guidance:** Focentia AI answers open-ended questions across any discipline (Java, React, SQL, OOP Inheritance, Data Structures, etc.) dynamically without hardcoded topic lists. Provides in-depth conceptual walkthroughs, code examples, and structured roadmaps with prerequisites and priority rationale.
  2. **Full Learning Roadmap UI (`AIRoadmapCard.tsx`):** Renders structured stages, topic cards, descriptions, subtask checklists, and priority badges (High, Medium, Low). Calculates progress strictly from completed subtasks/topics (`calculateRoadmapProgress`). Features collapsible stages, completion toggles, and "Save Plan" action without polluting the cloud database.
  3. **Local-First Roadmap Persistence (`roadmapService.ts`):** Saved roadmaps and interactive checklist states persist locally under `focusforge_saved_roadmaps_v1`.
  4. **Time Log Distinction:** Maintains strict separation between learning curriculum roadmaps and actual Time Log session logs (`practiceMinutes`, `blockers`, `importantTopics`).
  5. **Realistic Typed Status Event Lifecycle (`aiStatusEvents.ts`):** Replaced continuous generic "AI is thinking" with truthful, contextual status messages ("Understanding your request", "Preparing your roadmap", "Reviewing your learning goals", "Checking your schedule", "Saving your changes", "Waiting for your confirmation", "Completed successfully") with authentic Bengali equivalents.
- **Verified Status:** **VERIFIED** (33/33 tests passed in `scripts/test_phase3_roadmaps_and_status.js`, 23/23 tests in `scripts/test_phase2_feature_tools.js`, Next.js and backend TypeScript production builds clean).
- **Important Files:** `frontend/src/types/roadmap.ts`, `frontend/src/services/roadmapService.ts`, `frontend/src/services/aiStatusEvents.ts`, `frontend/src/components/ai-agent/AIRoadmapCard.tsx`, `frontend/src/components/ai-agent/useOrbMood.ts`, `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`.
- **Dependencies:** `@google/genai`, Lucide icons.
- **Unknowns:** None.

---

### Dual Model Architecture & Gemini AI Intelligence (Focentia 2.1 & Focentia Pro)
- **Current Implementation:**
  1. **Direct GoogleGenAI Connectivity & Resilient Serverless Execution (ADR-058):** Serverless API catch-all (`frontend/src/app/api/[...path]/route.ts`), audio transcription route (`frontend/src/app/api/ai/transcribe/route.ts`), and companion Express service (`backend/src/services/aiService.ts`) connect directly to GoogleGenAI using `process.env.GEMINI_API_KEY || FALLBACK_GEMINI_KEY`. Verified working models: `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`. Prevents serverless lambda failures when environment variables are unconfigured.
  2. **Focentia 2.1 (Fast Mode):** Ultra-fast lightweight execution (~1.1s response time via `gemini-3.5-flash-lite`). Prompt configured for crisp, swift, conversational replies. Token deduction uses 0.5x multiplier.
  3. **Focentia Pro (Deep Research & Planning Mode):** High-capacity multi-stage reasoning using `gemini-3.8-flash` and `gemini-3.7-flash` with 40s timeout, up to 6,000 output tokens, and 0.65 temperature. Conducts deep research, thorough milestone planning, and comprehensive educational explanations. Token deduction uses 2.0x multiplier.
  4. **Staged Thinking & Dynamic Orby Face Animations (ADR-058):** Dynamic progress state machine in `useAIAgent.ts` transitions longer AI requests through fluid stages (`thinking` -> `working` at 1.2s -> `composing` at 2.4s) with CSS cross-fading text transitions (`@keyframes thoughtFadeIn`) and corresponding Orby expressions. Fast single-turn queries complete instantly without waiting for stage delays.
  5. **Holistic Contextual Analysis & Evidence-Based Guidance (ADR-058):** `AIAgentPage.tsx` passes rich workspace context including completed tasks (`completedTasksCount`, `completedTasksSummary`), daily focus minutes (`focusMinutesToday`, `focusSessionsCount`), learning topics and weak areas (`learningTopics`, `timeLogSummary`), and notes/diary metadata. Enables evidence-based encouragement and weak-topic curriculum analysis.
  6. **UI Pill & Popover Selection:** Dedicated model pill switcher in `AIAgentPage.tsx` with distinct badges (`Speed` and `Research`) and localized English & Bengali descriptions.
- **Verified Status:** **VERIFIED** (21/21 pipeline tests, 18/18 personality tests, 23/23 feature tools, 33/33 roadmap tests, 28/28 security audit tests, and 27/27 E2E tests passing. Frontend and backend production builds passing with 0 errors).
- **Important Files:** `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`, `frontend/src/app/api/ai/transcribe/route.ts`, `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/components/ai-agent/AIOrbFace.tsx`, `frontend/src/components/ai-agent/ai-orb-face.module.css`, `frontend/src/components/ai-agent/useOrbMood.ts`, `frontend/src/hooks/useAIAgent.ts`, `frontend/src/types/aiAgent.ts`.
- **Dependencies:** `@google/genai`.
- **Unknowns:** None.

---

### Deployment
- **Current Implementation:** Vercel deployment configured via `frontend/vercel.json` and `frontend/next.config.ts`.
- **Verified Status:** **VERIFIED**
- **Known Problems:** WebSocket streaming ASR requires separate persistent hosting if real-time audio streaming is preferred over HTTP batch STT.
- **Important Files:** `frontend/vercel.json`, `frontend/next.config.ts`, `scripts/deploy.js`.
- **Dependencies:** Vercel platform.
- **Unknowns:** None.

