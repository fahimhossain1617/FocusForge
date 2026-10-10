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
| **Mind Space (Capture / Solver)** | **VERIFIED** | `frontend/src/components/pages/MyMindPage.tsx` | `mind_items` table, `mindService.ts` | None. Fast brain dump, idea grouping, and problem breakdown. |
| **Personal Diary** | **VERIFIED** | `frontend/src/components/diary/DiaryHome.tsx` | `diary_topics`, `diary_entries` tables | None. Multi-topic journals, rich themes, search, TOC. |
| **Learning Hub & Streaks** | **VERIFIED** | `frontend/src/components/pages/LearningHubPage.tsx` | `learning_folders`, `learning_logs` tables | None. Topic roadmaps, daily practice tracking, streak calculation. |
| **Voice / STT (Real-Time Dictation)** | **VERIFIED** | `frontend/src/services/voice/*`, `useContinuousSpeech.ts`, `useVoiceAmplitude.ts`, `VoiceWaveform.tsx`, `VoiceReactiveGlow.tsx` | Web Speech API, `VoiceWaveform`, `VoiceReactiveGlow` | None. Unlimited continuous dictation with zero-beep audio architecture, default Bangla (bn-BD) with instant English toggle, live text synchronization, harmonic waveform visualizer, and astral aurora glow. |
| **Voice / STT (Cloud AI Fallback)** | **VERIFIED** | `frontend/src/app/api/ai/transcribe/route.ts` | `@google/genai` audio multimodal | None. Multilingual fallback across all devices. |
| **In-App Notifications & Contextual Permission Prompt** | **VERIFIED** | `frontend/src/components/pages/NotificationsPage.tsx`, `NotificationPermissionPrompt.tsx` | `user_notifications`, `user_notification_rotation`, `notificationPromptService` | None. Implements shuffle-bag rotation, quiet hours, and contextual permission prompt capped at 2/day without background dimming. |
| **Background Web Push & Smart Reminder Scheduler** | **VERIFIED** | `reminderSyncService.ts`, `schedulerService.ts`, `notificationSchedulerService.ts`, `sw.js` | Web Push API, PostgreSQL `scheduled_reminders`, Vercel Cron, `node-cron` | None. Full background scheduling, 5m pre-reminders, start reminders, atomic concurrency claiming, anti-clustering, and closed-app deep-linking verified. |
| **Supervisor Portal (/supervisor)** | **VERIFIED** | `frontend/src/app/supervisor/page.tsx` | `user_roles`, `support_tickets`, `ticket_replies` | Strict privacy boundary prevents supervisors from viewing user personal data. |
| **Settings & Profile Management** | **VERIFIED** | `frontend/src/components/pages/SettingsPage.tsx` | `profiles` table, `userService.ts` | None. Unique display names, avatar upload, atomic account deletion. |
| **Local-First Storage (Dexie.js IndexedDB)** | **VERIFIED** | `frontend/src/lib/db.ts`, `lib/repositories/*` | Dexie.js, IndexedDB (`focentia_e2ee_db_v1`) | None. 17 typed stores, zero direct localStorage state. |
| **Cross-Device Sync & Relay** | **VERIFIED** | `frontend/src/lib/sync.ts`, `services/syncService.ts` | `/api/sync/push`, `/api/sync/pull` | None. Debounced, batched offline-first sync engine. |
| **Zero-Knowledge Envelope E2EE** | **VERIFIED** | `frontend/src/lib/crypto.ts`, `components/encryption/*` | Web Crypto (AES-256-GCM, PBKDF2-SHA256), `user_encryption_keys` | None. 256-bit MEK, 250k PBKDF2 KEK, wrapped key envelope in Supabase. |
| **Privacy-First AI Consent** | **VERIFIED** | `frontend/src/services/aiConsentService.ts`, `AIConsentModal.tsx` | `localStorage` | None. Local-first personal chats; "Keep My Chats Private" default; improvement is strict opt-in. |
| **Intelligent Learning Roadmaps** | **VERIFIED** | `frontend/src/components/ai-agent/AIRoadmapCard.tsx`, `services/roadmapService.ts` | `types/roadmap.ts`, `@google/genai` | None. Dynamic Gemini generation, derived progress, local persistence, interactive checklist. |
| **Realistic AI Status Lifecycle** | **VERIFIED** | `frontend/src/services/aiStatusEvents.ts`, `useOrbMood.ts` | `AIOrbFace.tsx` | None. Contextual truthful status events in Bengali and English based on active lifecycle. || **AI Capability Registry & Typed Tools** | **VERIFIED** | `frontend/src/services/aiActionValidator.ts`, `backend/src/services/aiServerTools.ts` | `.agent/CAPABILITY_REGISTRY.md`, `@google/genai` | None. 11 typed server read/query tools, zero-hallucination schemas, tenant isolation. |
| **AI Production Hardening & E2E Acceptance** | **VERIFIED** | `scripts/test_phase4_e2e_verification.js` | Supabase Auth, PostgreSQL, Dexie.js | None. 27/27 tests passed covering multi-tenant isolation, confirmation integrity, 10 user journeys, latency, and Bengali Unicode. |
| **AI Personality & Emotional Intelligence (Phase 6)** | **VERIFIED** | `frontend/src/lib/server/aiService.ts`, `backend/src/services/aiService.ts` | `@google/genai` | None. Caring older brother persona, exam anxiety handling, non-judgmental support, evidence-based motivation. |
| **Dynamic Emotional Facial Expressions (Final Phase)** | **VERIFIED** | `frontend/src/components/ai-agent/AIOrbFace.tsx`, `useOrbMood.ts`, `ai-orb-face.module.css` | SVG, LERP physics | None. 24 expression states, responsive SVG eyebrow/eye/mouth shapes, glowing shield badge, twinkling stars, floating hearts, reduced-motion accessibility. |
| **Auth-Only Cloud DB** | **VERIFIED** | `frontend/src/lib/server/db.ts`, `supabase/migrations/` | Supabase pooler, `026_user_encryption_keys_and_e2ee.sql` | None. Zero plaintext personal data in cloud DB. |


---

## 2. Detailed Feature Descriptions

### 2.1 Authentication & Pre-Verification
- **Location:** `frontend/src/services/authService.ts`, `frontend/src/app/api/[...path]/route.ts`
- **Behavior:** Ensures zero unverified records enter `auth.users`. When a user submits a signup form, registration data and a hashed password are saved in `public.pending_signups` with a 10-minute expiry. A 6-digit OTP code is emailed via Nodemailer. Only upon OTP verification is the official user created in `auth.users` with `email_confirm: true`.

### 2.2 Account Switcher & Guest Boundaries
- **Location:** `frontend/src/services/accountManager.ts`, `frontend/src/components/auth/AccountSwitcherModal.tsx`
- **Behavior:** Stores multiple verified accounts in `localStorage` under `focusforge_accounts_registry`. Switching accounts cleanly tears down active encryption keys and in-memory application state before hydrating the new user session.

### 2.3 Modular Block Note Editor
- **Location:** `frontend/src/components/workspace/BlockEditor.tsx`, `frontend/src/components/pages/WorkspacePage.tsx`
- **Behavior:** Supports heterogeneous block types: Headings (H1/H2/H3), Paragraphs, Todos, Math equations rendered via KaTeX, Code blocks highlighted via Prism.js, Sticky notes (Violet, Amber, Rose), Freehand drawings via Fabric.js canvas, and local attachments.

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



