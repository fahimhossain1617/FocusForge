# FEATURES.md — Foscentia Feature Inventory & Status Matrix

**Document Version:** 1.0.0  
**Last Updated:** October 2026  
**Status:** Authoritative Feature Inventory

---

## 1. Feature Status Matrix

| Feature | Current Status | Main Location | Important Dependencies | Known Issues |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication (Email/Password)** | **VERIFIED** | `frontend/src/services/authService.ts` | Supabase Auth, `auth.users` | None. Tested via `test_auth_isolation.ts`. |
| **Pre-Verification Signup Flow** | **VERIFIED** | `frontend/src/services/authService.ts`, `route.ts` | `public.pending_signups`, Nodemailer | Requires working SMTP configuration to deliver OTPs. |
| **Password Reset & Recovery Flow** | **VERIFIED** | `frontend/src/app/reset-password/page.tsx`, `route.ts` | `public.pending_password_resets`, Nodemailer | Dedicated 2-step UI + OTP verification and theme adaptation. |
| **Account Isolation & Multi-Account** | **VERIFIED** | `frontend/src/services/accountManager.ts` | `localStorage`, Supabase JWT | None. Supports switching across unlimited remembered accounts. |
| **Guest Mode & Migration** | **VERIFIED** | `frontend/src/context/AuthContext.tsx` | `localDbService.ts`, `/api/user/migrate-guest-data` | None. One-way migration merges local guest data to user cloud DB. |
| **Dashboard** | **VERIFIED** | `frontend/src/components/pages/DashboardPage.tsx` | `AppContext.tsx`, `CalendarWidget.tsx` | None. Calculates streaks, productivity scores, and habit metrics. |
| **Planner & Tasks** | **VERIFIED** | `frontend/src/components/pages/PlannerPage.tsx` | `tasks` table, `taskService.ts` | None. Full priority tiers, time slots, and copy-to-date. |
| **Routine Templates (Weekday)** | **VERIFIED** | `frontend/src/components/planner/RoutineLibraryModal.tsx` | `routine_templates` table | None. Supports recurring weekday schedule templates. |
| **Focus Mode & Timer** | **VERIFIED** | `frontend/src/components/pages/FocusPage.tsx`, `StopwatchTimer.tsx`, `RollingDigit.tsx` | `useFocusTimer.ts`, `focus_sessions` table, `framer-motion` | None. Pomodoro, infinite count-up stopwatch with rolling digit ticker, fullscreen mode, topic tags, distraction logging. |
| **Notes & Workspace Editor** | **VERIFIED** | `frontend/src/components/pages/WorkspacePage.tsx` | `BlockEditor.tsx`, `notes` table | None. Modular blocks (KaTeX math, Prism code, Fabric canvas). |
| **Mind Space (Capture / Solver)** | **VERIFIED** | `frontend/src/components/pages/MyMindPage.tsx`, `MindHome.tsx`, `ThoughtDetail.tsx` | `mind_items` table, `mindService.ts`, `globals.css` | None. Fast brain dump, idea grouping, problem breakdown, manual-only save, guaranteed permanent deletion, and 3-phase (Blue -> Green -> Purple) continuous soft outer glow animation. |
| **Personal Diary** | **VERIFIED** | `frontend/src/components/diary/DiaryHome.tsx` | `diary_topics`, `diary_entries` tables | None. Multi-topic journals, rich themes, search, TOC. |
| **Learning Hub & Streaks** | **VERIFIED** | `frontend/src/components/pages/LearningHubPage.tsx` | `learning_folders`, `learning_logs` tables | None. Topic roadmaps, daily practice tracking, streak calculation. |
| **Voice / STT (Real-Time Dictation)** | **VERIFIED** | `frontend/src/services/voice/*`, `useContinuousSpeech.ts`, `useVoiceAmplitude.ts`, `VoiceWaveform.tsx`, `VoiceReactiveGlow.tsx` | Web Speech API, `VoiceWaveform`, `VoiceReactiveGlow` | None. Unlimited continuous dictation with zero-beep audio architecture, default Bangla (bn-BD) with instant English toggle, live text synchronization, harmonic waveform visualizer, and astral aurora glow. |
| **Voice / STT (Cloud AI Fallback)** | **VERIFIED** | `frontend/src/app/api/ai/transcribe/route.ts` | `@google/genai` audio multimodal | None. Multilingual fallback across all devices. |
| **In-App Notifications & Contextual Permission Prompt** | **VERIFIED** | `frontend/src/components/pages/NotificationsPage.tsx`, `NotificationPermissionPrompt.tsx` | `user_notifications`, `user_notification_rotation`, `notificationPromptService` | None. Implements shuffle-bag rotation, quiet hours, and contextual permission prompt capped at 2/day without background dimming. |
| **Background Web Push & Smart Reminder Scheduler** | **VERIFIED** | `reminderSyncService.ts`, `localNotificationScheduler.ts`, `notificationSchedulerService.ts`, `sw.js` | Web Push API, PostgreSQL `scheduled_reminders`, Supabase `pg_cron`, Service Worker Cache & Triggers | None. Exact user-fixed task minute delivery (zero 5m pre-reminders), untimed task follow-up (4-6h post addition), strict 2-3 daily general nudges, 24/7 Supabase pg_cron dispatch, and foreground+background+closed-app resilience. |
| **Supervisor Portal (/supervisor)** | **VERIFIED** | `frontend/src/app/supervisor/page.tsx` | `user_roles`, `support_tickets`, `ticket_replies` | Strict privacy boundary prevents supervisors from viewing user personal data. |
| **Settings & Profile Management** | **VERIFIED** | `frontend/src/components/pages/SettingsPage.tsx` | `profiles` table, `userService.ts` | None. Unique display names, avatar upload, atomic account deletion. |
| **Local-First Storage (Dexie.js IndexedDB)** | **VERIFIED** | `frontend/src/lib/db.ts`, `lib/repositories/*` | Dexie.js, IndexedDB (`focentia_e2ee_db_v1`) | None. 17 typed stores, zero direct localStorage state. |
| **Cross-Device Sync & Relay** | **VERIFIED** | `frontend/src/lib/sync.ts`, `services/syncService.ts` | `/api/sync/push`, `/api/sync/pull` | None. 100% automated background sync with real-time UI state rehydration via `syncService.onPull`. |
| **Zero-Knowledge Account Encryption** | **VERIFIED** | `frontend/src/lib/crypto.ts` | Web Crypto (AES-256-GCM, PBKDF2-SHA256) | None. 256-bit AES-GCM key derived deterministically per account without prompting user for any PIN or passphrase. |
| **Privacy-First AI Consent** | **VERIFIED** | `frontend/src/services/aiConsentService.ts`, `AIConsentModal.tsx` | `localStorage` | None. Local-first personal chats; "Keep My Chats Private" default; improvement is strict opt-in. |
| **Intelligent Learning Roadmaps & Time Log Integration** | **VERIFIED** | `frontend/src/components/ai-agent/AIRoadmapCard.tsx`, `LearningHubPage.tsx`, `services/roadmapService.ts` | `types/roadmap.ts`, `@google/genai` | None. Dynamic Gemini generation, derived progress, auto-folder sync to Time Log, interactive folder card roadmap modal, pre-roadmap level clarification, and mobile badge wrapping fix. |
| **Planner Task Time Selector & Action Deep-Linking** | **VERIFIED** | `frontend/src/components/ai-agent/AIActionCard.tsx`, `AIAgentPage.tsx`, `aiActionValidator.ts` | `AppContext.tsx`, `@google/genai` | None. Interactive per-item time selection in planner proposal cards, reliable post-confirmation navigation buttons, and multi-turn study schedule clarification. |
| **AI Production Hardening & E2E Acceptance** | **VERIFIED** | `scripts/test_phase4_e2e_verification.js` | Supabase Auth, PostgreSQL, Dexie.js | None. 27/27 tests passed covering multi-tenant isolation, confirmation integrity, 10 user journeys, latency, and Bengali Unicode. |
| **AI Personality & Emotional Intelligence (Phase 6)** | **VERIFIED** | `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts` | `@google/genai` | None. Caring older brother persona, exam anxiety handling, non-judgmental support, evidence-based motivation. |
| **Dynamic Emotional Facial Expressions (Final Phase)** | **VERIFIED** | `frontend/src/components/ai-agent/AIOrbFace.tsx`, `useOrbMood.ts`, `ai-orb-face.module.css` | SVG, LERP physics | None. 24 expression states, responsive SVG eyebrow/eye/mouth shapes, glowing shield badge, twinkling stars, floating hearts, reduced-motion accessibility. |
| **Glory AI Local-First Router** | **VERIFIED** | `frontend/src/lib/ai/router/`, `frontend/src/services/aiAgentService.ts` | `localDbService.ts`, editable JSON banks | None. Answers ~85-90% of user interactions locally at 0 Gemini tokens; `collapseRepeatedChars` collapses elongated words (e.g. `হাইইইই` -> `হাই`, `হ্যালোওওও` -> `হ্যালো`, `hiiiii` -> `hi`, `kemooon` -> `kemon`, `কেমন আছোওও` -> `কেমন আছো`, `হুমম্মম` -> `হুম`, `আচ্ছাআআ` -> `আচ্ছা`, `accche` -> `ache`, `thik acheee` -> `thik ache`); idea/problem queries receive encouraging text and direct single "মাইন্ড স্পেস খুলুন" button without unrequested confirm/cancel cards or silent auto-persisting. |
| **Mobile & Hardware Back Navigation System** | **VERIFIED** | `frontend/src/hooks/useSubViewBack.ts`, `frontend/src/context/AppContext.tsx` | Browser History API (`pushState`, `popstate`) | None. Full step-by-step retreat for phone physical back button, edge swipe gesture, and UI back buttons across Focus sessions, Stopwatch, Diary, Settings subpages, Notes, Learning Hub, My Mind, Sidebar drawer, and Planner modals without premature Dashboard redirect. |
| **Admin Control Center & Telemetry System** | **VERIFIED** | `frontend/src/app/admin/*`, `frontend/src/lib/server/admin*`, `frontend/src/components/admin/*` | Supabase Auth, PostgreSQL, Dexie, Web Crypto, WebGL | None. Single authority entrypoint in MobileHeader 3-dots menu, real-time 60fps Animated 3D Morphing Orb Loader (`AdminOrbLoader.tsx`) with smooth Focentia color cycling and `"Loading..."` label exclusively across Admin Panel entry and section transitions, interactive metric cards routing to dedicated operational sections, full supervisor-grade user profile visibility, automatic crash/error telemetry grouping, and verified backend security. |
| **Glory AI Gemini 3.5 Reconnection, Roadmap Generation & Session Deduplication** | **VERIFIED** | `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`, `frontend/src/lib/ai/router/`, `BorderBeam.tsx` | `@google/genai`, PostgreSQL `ai_chat_sessions`, Web Crypto | None. Replaced retired 404 models with `gemini-3.5-flash-lite` (<1s latency), raised roadmap tokens to 1800, folder/diary inspection with guest protection, locked chat session titles, and GPU-accelerated BorderBeam. |


---

## 2. Detailed Feature Descriptions

### 2.1 Authentication & Pre-Verification
- **Location:** `frontend/src/services/authService.ts`, `frontend/src/app/api/[...path]/route.ts`
- **Behavior:** Ensures zero unverified records enter `auth.users`. When a user submits a signup form, registration data and a hashed password are saved in `public.pending_signups` with a 10-minute expiry. A 6-digit OTP code is emailed via Nodemailer. Only upon OTP verification is the official user created in `auth.users` with `email_confirm: true`.

### 2.2 Account Switcher & Guest Boundaries
- **Location:** `frontend/src/services/accountManager.ts`, `frontend/src/components/auth/AccountSwitcherModal.tsx`
- **Behavior:** Stores multiple verified accounts in `localStorage` under `focusforge_accounts_registry`. Switching accounts cleanly tears down active encryption keys and in-memory application state before hydrating the new user session.

### 2.3 Modular Block Note Editor & Shareable Folder System
- **Location:** `frontend/src/components/workspace/BlockEditor.tsx`, `frontend/src/components/pages/WorkspacePage.tsx`, `frontend/src/components/workspace/NoteCard.tsx`, `frontend/src/components/pages/DashboardPage.tsx`
- **Behavior:** Supports heterogeneous block types: Headings (H1/H2/H3), Paragraphs, Todos, Math equations rendered via KaTeX, Code blocks, Sticky notes, and attachments (PDF/Docs, Images, External Links).
  - **Seamless Multi-Line Copy/Paste:** Dedicated clipboard paste interception (`handlePaste`) splits multi-line text into clean individual paragraph blocks without trapping newlines in a single block. Allows effortless deletion, word removal, selection, and editing of all pasted content.
  - **Mobile Virtual Keyboard Backspace & Delete Key:** Supports mobile soft keyboards (Gboard, Redmi, Samsung, iOS) using a zero-width space buffer (`\u200B`) and `beforeinput` / `input` event detection. Tapping the backspace/delete button on an empty line removes the line and jumps the cursor back to the end of the previous line cleanly without getting stuck.
  - **Public Read-Only Note Sharing:** Generates a secure shareable app link (`/?shared_note=<share_id>`) for the entire note folder (all text blocks, categories, images, PDFs, attachments, links). Anyone opening the link (including guests and first-time visitors) bypasses onboarding and views the note folder in a dedicated read-only mode (`isReadOnly`), with editing disabled, while retaining the ability to copy all text, download attached PDFs/files, and preview images.
  - **Offline/Online Safety:** Only image/PDF upload and cloud sharing require internet; all writing, formatting, lists, and markdown shortcuts (`1. `, `- `, `* `, `[] `) operate 100% offline. Backspace on `#` safely clears the command trigger without deleting the block.

### 2.4 Focus Engine & Distraction Tracking
- **Location:** `frontend/src/components/pages/FocusPage.tsx`, `frontend/src/hooks/useFocusTimer.ts`
- **Behavior:** Manages active countdown and stopwatch focus intervals with configurable soundscapes (White Noise, Rain, Cafe, Forest). Allows instant distraction note logging during an active session without terminating the timer. Distraction entries and session stats sync to `focus_sessions` and `distraction_entries`.

### 2.5 Personal Journal & Multi-Topic Diary
- **Location:** `frontend/src/components/diary/DiaryHome.tsx`, `frontend/src/components/diary/DiaryEditor.tsx`
- **Behavior:** Organizes reflections into custom topics with personalized theme styling. Supports rich markdown formatting, image attachments, table-of-contents navigation, and search across entries.

### 2.6 AI Agent (Focentia AI) & Dual Model Intelligence Pipeline (Focentia 2.1 & Focentia Pro)
- **Location:** `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/services/aiAgentService.ts`, `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`, `frontend/src/hooks/useAIAgent.ts`, `frontend/src/components/ai-agent/AIOrbFace.tsx`
- **Behavior:** Powered by Google Gemini with dual-tier model selection and serverless resilience (ADR-058):
  - **Resilient Serverless Key Management:** Guaranteed fallback key preventing API failure / busy errors in environments where serverless environment variables are missing. Verified working models: `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`.
  - **Focentia 2.1 (Fast Mode):** Ultra-fast lightweight execution (~1.1s latency via `gemini-3.5-flash-lite`). Tailored for quick replies, everyday tasks, rapid answers, and concise check-ins (0.5x token multiplier).
  - **Focentia Pro (Deep Research & Planning Mode):** High-capacity deep reasoning via `gemini-3.8-flash` and `gemini-3.7-flash` (40s timeout, 6,000 max output tokens, 0.65 temperature). Conducts deep research, thorough milestone planning, comprehensive academic/technical explanations, and multi-step complex tasks (2.0x token multiplier).
  - **Staged Thinking & Dynamic Progress Animation:** Fluid state progression (`thinking` -> `working` -> `composing`) with smooth `@keyframes thoughtFadeIn` text transitions and synchronized Orby expressions for queries taking longer than 1.2s, while fast answers return instantly.
  - **Full-Context Learning & Effort Awareness:** Comprehensive ingestion of completed tasks count/summary, daily focus minutes, learning topics, and weak topic logs, enabling truthful evidence-based motivation and curriculum guidance.
  - Delivers open-ended academic and coding explanations, multi-turn clarification when task details (date/time) are missing, structured task and roadmap proposals, explicit confirmation gates before any user data mutations, and strict Bengali Unicode integrity with "তুমি" tone. All hardcoded/canned task responses completely eliminated.

### 2.7 Application Capability Registry & Secure Typed Tools (Phase 2)
- **Location:** `.agent/CAPABILITY_REGISTRY.md`, `frontend/src/services/aiActionValidator.ts`, `backend/src/services/aiActionValidator.ts`, `frontend/src/lib/server/aiServerTools.ts`, `backend/src/services/aiServerTools.ts`
- **Behavior:**
  1. **Typed Capability Registry:** Full mapping of routes, schemas, field constraints, backend repositories, and confirmation policies for Planner, Focus, Time Log, Notes & Files, Mind Space, My Diary, Performance analytics, and App Settings.
  2. **Zero-Hallucination Schemas:** Strict schema enforcement preventing hallucinated fields (e.g., Time Log only supports `folderName`/`topics`, `practiceMinutes`, `watchMinutes`, `practiceDetails`, `blockers`, `importantTopics`; no invented milestones or stages).
  3. **Mandatory Clarification & Mutation Gate:** Incomplete user requests automatically trigger clarification questions (`status: "pending_clarification"`, `type: "clarification"`). Fully qualified mutations require explicit user confirmation (`confirmationRequired: true`) with server-issued IDs.
  4. **Narrow Server Read Tools:** Exposes 11 typed server-side read/query tools (`search_planner_entries`, `get_planner_entries_for_date`, `propose_planner_entries`, `get_time_log_topics`, `search_notes_and_files`, `get_note_or_file_content`, `search_diary_entries`, `get_diary_entry`, `get_performance_report`, `get_available_app_destinations`, `prepare_navigation`) with strict tenant isolation (`WHERE user_id = $1`) and automatic credential redaction.
  5. **Atomic Batch Operations:** Supports multi-item planner creation (`create_tasks`) with atomic validation.

### 2.8 Human-Centered Personality & Emotional Intelligence (Phase 6)
- **Location:** `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`, `frontend/src/hooks/useAIAgent.ts`
- **Behavior:** Implements the caring older brother persona (বড় ভাইয়ের মতো স্নেহশীল ও নির্ভরতার সুর). Features natural humor, playful wit, exam anxiety reassurance without making false grade promises, non-judgmental support during demotivation and procrastination, evidence-based encouragement grounded strictly in authentic verified application data, and optional contextual feature bridging.

### 2.9 Zero-Emoji Text Persona & Dynamic Emotional Facial Expressions (`AIOrbFace`)
- **Location:** `frontend/src/components/ai-agent/AIOrbFace.tsx`, `useOrbMood.ts`, `ai-orb-face.module.css`, `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`, `frontend/src/hooks/useAIAgent.ts`
- **Behavior:**
  1. **Strict Zero-Keyboard-Emoji Text Rule:** Prohibits keyboard emojis (🥰, 😴, 💤, 😊, 🥺, 😅, 💖, etc.) in AI text responses and system fallback messages, delivering articulate, mature, and natural text.
  2. **Dynamic Orby Facial Expressions:** Channels all emotional expression visually through the interactive Orby face. Features 24+ typed expression states:
     - `sulky`: Half-lidded bombastic side-eye look with downturned pout and comic puff for study scolding/reminders (e.g. "পড়তে বসো", procrastination).
     - `laughing` & `playful`: Arched joyful eyes with pink tongue and vibrating energy for jokes and requested laughter.
     - `celebrating` & `proud`: Twinkling golden stars and cheerful high head tilt for accomplishments.
     - `empathetic` & `sad`: Teary pleading eyes, glistening glints, apologetic soft pout, floating hearts, and pulsing 3D heart hand pose for sadness/distress.
     - `serious` & `protective`: Alert horizontal brows, cyber shield badge for security and safety.
     - `curious` & `thinking`: Arched brows, floating question mark or hand on chin pensive pose.
     - `sleepy`: Peaceful closed sleeping lines and floating Zzz.
  3. **Zero Latency Penalty:** All facial expressions are determined in a single turn by Gemini via the existing JSON `"emotion"` contract, ensuring instant animations without additional API calls.

### 2.10 Full Database & Multi-Tenant AI Chat Persistence
- **Location:** `frontend/src/lib/server/aiChatService.ts`, `frontend/src/app/api/[...path]/route.ts`, `frontend/src/services/aiAgentService.ts`, `frontend/src/services/aiConsentService.ts`
- **Behavior:**
  1. **PostgreSQL Pooled Persistence:** Auto-persists `ai_chat_sessions` and `ai_chat_messages` using PostgreSQL connection pooler for both authenticated and guest accounts.
  2. **Zero Chat Loss on Refresh:** Fetches existing sessions and messages directly from database upon mount or session switch, while preserving offline localStorage caching.
  3. **Privacy Control:** Fully honors ephemeral private chat mode when toggled.

### 2.11 Time Log Roadmap Synchronization & Persistent Limit Countdown
- **Location:** `frontend/src/components/ai-agent/AIRoadmapCard.tsx`, `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/components/pages/LearningHubPage.tsx`, `frontend/src/services/roadmapService.ts`
- **Behavior:**
  1. **Clean Single-Card Architecture:** Eliminates duplicate fallback cards and strictly avoids generic names like "New Topic" / "নতুন বিষয়".
  2. **Direct Time Log Deep-Linking:** Roadmaps are linked with topic folders. Roadmap buttons in Time Log header and folder detail hero row open the full interactive roadmap modal.
  3. **Completion Celebration:** When 100% of roadmap items are completed, triggers confetti and displays a warm congratulations message.
  4. **Sticky Limit Reached Banner & Sleeping Orb:** Fixed banner displaying live reset countdown (e.g., `রিস্টোর হবে: ২ ঘণ্টা ১৫ মিনিট পর`) persisting across navigation and new chats. AI Orb Face automatically enters `sleepy` mode with eyes closed and restful speech bubble.

### 2.12 Bounded User Token Consumption & Extreme Brevity (Focentia 2.0 vs Focentia Pro)
- **Location:** `backend/src/services/aiTokenService.ts`, `frontend/src/lib/server/aiTokenService.ts`, `frontend/src/services/aiAgentService.ts`, `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`
- **Behavior:**
  1. **Credit-Bounded Token Quotas:** Prevents raw LLM token inflation from exhausting the 1000 guest / 5000 auth daily quota.
  2. **Focentia 2.0 / 2.1 Consumption:** Strictly bounded to 4 to 5 tokens (clamped to max 6 tokens). A guest gets ~200-250 chats; an auth user gets ~1,000 chats daily.
  3. **Focentia Pro Consumption:** Bounded to 25 to 30 tokens for deep reasoning, roadmaps, and complex breakdowns.
  4. **Crisp Brevity & High Speed:** Strict prompt guidance for Focentia 2.0 / 2.1 to respond in 1-3 short, crisp sentences with zero verbose fluff or preamble, keeping generation latency under ~1-2 seconds.

### 2.13 Glory AI Local-First Router Architecture
- **Location:** `frontend/src/lib/ai/router/`, `frontend/src/services/aiAgentService.ts`, `frontend/src/lib/server/aiService.ts`
- **Behavior:**
  1. **Zero-Token Local Execution:** Answers ~85-90% of user queries entirely within client device code (Social, Jokes, Motivation, App Help & deep navigation links, Settings guides, Planner task creation with multi-turn time clarification, Diary folder setup, Time Log tracking recommendations, Orb speech bubbles, and Crisis/Safety guidance) using editable JSON template banks with 0 token consumption.
  2. **Shuffle-Bag Anti-Repetition Rotation:** Maintains in-memory rotation memory tracking the last 5 used variants per intent, preventing repetitive responses on consecutive identical queries.
  3. **Multi-Turn State Machine:** Captures partial user intents (e.g. "add math tomorrow to my planner"), requests missing parameters (such as task time), and resolves the action on subsequent turns without ever pinging Gemini.
### 2.14 Focentia Admin Control Center & Telemetry Backend Engine (Part 1 & 2)
- **Location:** `frontend/src/app/admin/*`, `frontend/src/lib/server/admin*.ts`, `frontend/src/services/adminApiClient.ts`, `frontend/src/services/telemetry/*`
- **Behavior:**
  1. **Default-Deny Server Guard:** `adminAuthGuard.ts` strictly validates Supabase JWT server-side via `supabase.auth.getUser()`, verifies email confirmation, and asserts stable UUID against `admin_users` table. Access hard-locked to `fahimhossain1617@gmail.com`.
  2. **17 Operations Sections:** Overview, Product Analytics, Users & Detail, Guests, Feedback, Issues, Performance, Security, Sync Health, Release Status, Alerts, Audit Log, AI Usage, User Quotas, Flags, Monitoring Health, Privacy Requests.
  3. **Abuse-Resistant Ingestion:** `/api/telemetry/ingest` and `/api/feedback/submit` with secondary server-side credential/token sanitization, rate-limiting, and kill-switch control.
  4. **Deterministic Issue Grouping & Regression Detection:** Normalized error messages and stack traces hashed to 32-character fingerprints. Automatically sets status to `reopened` when previously fixed bugs re-occur in new versions.
  5. **Server-Enforced Suspension:** Rejects user requests at server boundaries (sync, AI, feedback, authenticated endpoints) with 403 Forbidden.
  6. **Glory AI Server Usage Recording:** Records input/output tokens, latency, status, model, and local vs gemini handler into `admin_ai_usage_records`. Never stores prompt or response text.
  7. **Scheduled Maintenance:** `/api/cron/maintenance` runs daily alert evaluations, rollup aggregates, and prunes raw telemetry records older than 30 days while preserving aggregates.
  8. **Database & End-to-End Wiring (Part 3):** Applied migration `033_admin_control_center.sql` (30 tables, 13 views, RLS deny-by-default, append-only triggers, owner anti-suspension defense, high-frequency indexing, automated retention cleanup). Client telemetry batch ingestion flows directly to PostgreSQL tables, updates daily aggregates, and feeds Admin UI endpoints with honest metrics and zero false positives.
- **Status:** **VERIFIED (Frontend + Backend + Database + End-to-End Ingestion)**

### 2.15 Glory AI Multitask, Title Sanitization & Model Differentiation Upgrade
- **Location:** `frontend/src/lib/ai/router/`, `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`, `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/services/aiAgentService.ts`, `frontend/src/hooks/useAIAgent.ts`
- **Behavior:**
  1. **Precision Intent Routing:** Instant canned responses are constrained to standalone short queries (<=4 words); any multi-word, date-bearing, or complex query routes directly to Gemini API.
  2. **Zero-Pollution Planner Task Sanitization:** Cleanses all markdown artifacts, hashtags (`#`), and prompt fragments (e.g., `//2026`) from task titles, and cleanly distributes tasks across multiple dates.
  3. **Multi-Folder & Batch Action Execution:** Supports multi-folder Time Log activity logging (e.g., Math vs Java logged in respective folders), multi-problem/idea creation in Mind Space, and multi-entry diary creation.
  4. **Manual Mode Autonomy:** Fully respects user manual requests ("আমি ম্যানুয়ালি করতে চাই") without triggering automated actions.
  5. **Authentic Model Selection:** Real API-level distinction between Focentia 2.1 (`gemini-2.5-flash`, ultra-fast routine logging, 10s timeout, 250 max tokens) and Focentia Pro (`gemini-2.5-pro`, deep reasoning, complex planning, 25-35s timeout, 900-1500 max tokens).
  6. **Smart Chat Titles:** Summarizes user prompts into concise 2-4 word titles instead of raw text slicing.
  7. **Glory AI In-App Chat Persistence:** Maintains session history across in-app page navigation without premature cleanup.
- **Status:** **VERIFIED**

### 2.16 Glory AI Gemini 3.5 Reconnection, Roadmap Generation, Folder/Diary Inspection & Session Deduplication
- **Location:** `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`, `frontend/src/lib/ai/router/`, `frontend/src/components/ui/BorderBeam.tsx`, `frontend/src/components/ai-agent/AIOrbFace.tsx`, `frontend/src/services/aiAgentService.ts`, `frontend/src/hooks/useAIAgent.ts`
- **Behavior:**
  1. **Active Gemini 3.5 Models:** Replaced retired 404 models (`gemini-2.5-flash`, `gemini-1.5-flash`) with high-speed, cost-effective `gemini-3.5-flash-lite`, `gemini-3.5-flash`, and `gemini-flash-lite-latest` in candidate arrays across frontend and backend. Latency <1000ms.
  2. **Roadmap Generation Token Allocation:** Allocated `maxOutputTokens: 1800` for roadmap requests, eliminating 250-token mid-JSON truncation and canned fallbacks.
  3. **Folder & Diary Inspection:** AI inspects actual user folders, weak/important topics, and diary chapters via `FOLDER_QUERY` and `DIARY_QUERY` local handlers. In guest mode, AI politely requests user login before revealing private data.
  4. **Natural Focus Session Triggers:** Extended regex to match natural duration phrases (e.g., "So start 1 hr focus session", "১০ মিনিটের ফোকাস সেশন"), fixing broken `\b` regex boundaries on Bengali inflected words.
  5. **Session Title Locking & Deduplication:** Generates standard UUIDs on session start. PostgreSQL update on conflict preserves the original first-turn title (`ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`), and client storage locks title immutability.
  6. **Mobile UI Smoothness:** Replaced expensive SVG `<feGaussianBlur>` inside infinite BorderBeam animation with hardware-accelerated CSS `drop-shadow(0 0 5px rgba(56, 189, 248, 0.45))` and `translateZ(0)`, throttled `ResizeObserver`, and applied delta thresholding in `AIOrbFace` rendering loop.
- **Status:** **VERIFIED**

### 2.17 App-Wide Lag Elimination, Installed PWA System Update Modal, Full Workspace Inspection & Cold-Launch Dashboard Fix
- **Location:** `frontend/src/context/AppContext.tsx`, `frontend/src/components/pwa/PWAUpdater.tsx`, `frontend/src/components/navigation/MobileHeader.tsx`, `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/components/ai-agent/AIActionCard.tsx`, `frontend/src/hooks/useAIAgent.ts`, `frontend/src/services/aiAgentService.ts`, `frontend/src/lib/ai/router/*`, `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts`, `frontend/src/app/globals.css`
- **Behavior:**
  1. **Zero-Lag Navigation, Typing & AI Streaming:** Debounced `AppContext` full-state persistence, skipped DB backup writes on tab switch, removed `[state.activePage]` from Supabase notes realtime subscription, stabilized `useOrbMood` input detection, and switched AI streaming scroll to instant `behavior: "auto"`.
  2. **Installed PWA System Update Modal + Top Navbar Fallback:** Displays a clean, centered "System Update" modal (no background blur/darkening, no border glow, only top-right `X` icon, animated progress bar, "Restart Now" button) exclusively for installed standalone web apps (`isRunningAsInstalledApp()`). If dismissed via `X`, falls back to the top navbar update icon.
  3. **Full Workspace Content Inspection & 74% Token Reduction:** Glory AI inspects and reports folders and entry contents across Mind Space (`mindSummary`), My Diary (`diarySummary` + entries), Time Log (`learningTopics` + weak/important topics), Notes & Files (`notesSummary`), and Dashboard performance both locally (0 tokens) and via `gemini-3-flash-preview` (`thinkingLevel: 'MINIMAL'`, ~1,752 prompt tokens vs 6,816 previously).
  4. **Notes File/Link Card & AI Planner Card Margins:** Restored horizontal internal padding (`16px 18px`) on `.editor-block--file` and `.editor-block--link` and prevented vertical character wrapping on `Start:` / `End:` labels in `AIActionCard.tsx`.
  5. **Instant Dashboard Cold Launch:** `getFastInitialState()` and `loadUserData()` always initialize `activePage: 'today'` on cold launch so Notes & Files never flashes before Dashboard.
- **Status:** **VERIFIED**





