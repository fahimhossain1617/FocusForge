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
| **Focus Mode & Timer** | **VERIFIED** | `frontend/src/components/pages/FocusPage.tsx` | `useFocusTimer.ts`, `focus_sessions` table | None. Pomodoro, stopwatch, ambient audio, distraction logging. |
| **Notes & Workspace Editor** | **VERIFIED** | `frontend/src/components/pages/WorkspacePage.tsx` | `BlockEditor.tsx`, `notes` table | None. Modular blocks (KaTeX math, Prism code, Fabric canvas). |
| **Mind Space (Capture / Solver)** | **VERIFIED** | `frontend/src/components/pages/MyMindPage.tsx` | `mind_items` table, `mindService.ts` | None. Fast brain dump, idea grouping, and problem breakdown. |
| **Personal Diary** | **VERIFIED** | `frontend/src/components/diary/DiaryHome.tsx` | `diary_topics`, `diary_entries` tables | None. Multi-topic journals, rich themes, search, TOC. |
| **Learning Hub & Streaks** | **VERIFIED** | `frontend/src/components/pages/LearningHubPage.tsx` | `learning_folders`, `learning_logs` tables | None. Topic roadmaps, daily practice tracking, streak calculation. |
| **Voice / STT (Real-Time Dictation)** | **VERIFIED** | `frontend/src/services/voice/*`, `useContinuousSpeech.ts`, `useVoiceAmplitude.ts`, `VoiceWaveform.tsx`, `VoiceReactiveGlow.tsx` | Web Speech API, `VoiceWaveform`, `VoiceReactiveGlow` | None. Unlimited continuous dictation with zero-beep audio architecture, default Bangla (bn-BD) with instant English toggle, live text synchronization, harmonic waveform visualizer, and astral aurora glow. |
| **Voice / STT (Cloud AI Fallback)** | **VERIFIED** | `frontend/src/app/api/ai/transcribe/route.ts` | `@google/genai` audio multimodal | None. Multilingual fallback across all devices. |
| **In-App Notifications & Contextual Permission Prompt** | **VERIFIED** | `frontend/src/components/pages/NotificationsPage.tsx`, `NotificationPermissionPrompt.tsx` | `user_notifications`, `user_notification_rotation`, `notificationPromptService` | None. Implements shuffle-bag rotation, quiet hours, and contextual permission prompt capped at 2/day without background dimming. |
| **Web Push & PWA Notifications** | **VERIFIED** | `frontend/public/sw.js`, `notificationService.ts` | Web Push API, Service Worker v6 | Full Android Web Notification capabilities (monochrome badge, native actions, deterministic tags, deep-linking). |
| **Supervisor Portal (/supervisor)** | **VERIFIED** | `frontend/src/app/supervisor/page.tsx` | `user_roles`, `support_tickets`, `ticket_replies` | Strict privacy boundary prevents supervisors from viewing user personal data. |
| **Settings & Profile Management** | **VERIFIED** | `frontend/src/components/pages/SettingsPage.tsx` | `profiles` table, `userService.ts` | None. Unique display names, avatar upload, atomic account deletion. |
| **Local-First Storage (Dexie.js IndexedDB)** | **VERIFIED** | `frontend/src/lib/db.ts`, `lib/repositories/*` | Dexie.js, IndexedDB (`focentia_e2ee_db_v1`) | None. 17 typed stores, zero direct localStorage state. |
| **Cross-Device Sync & Relay** | **VERIFIED** | `frontend/src/lib/sync.ts`, `services/syncService.ts` | `/api/sync/push`, `/api/sync/pull` | None. Debounced, batched offline-first sync engine. |
| **Zero-Knowledge Envelope E2EE** | **VERIFIED** | `frontend/src/lib/crypto.ts`, `components/encryption/*` | Web Crypto (AES-256-GCM, PBKDF2-SHA256), `user_encryption_keys` | None. 256-bit MEK, 250k PBKDF2 KEK, wrapped key envelope in Supabase. |
| **Privacy-First AI Consent** | **VERIFIED** | `frontend/src/services/aiConsentService.ts`, `AIConsentModal.tsx` | `localStorage` | None. Local-first personal chats; "Keep My Chats Private" default; improvement is strict opt-in. |
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

### 2.6 AI Agent & Dynamic Productivity Actions
- **Location:** `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/services/aiAgentService.ts`, `frontend/src/lib/server/aiService.ts`
- **Behavior:** Powered by Gemini models to provide daily planning assistance, task breakdown, thought synthesis, and direct tool execution. Parameter validation in `aiActionValidator.ts` guards against invalid inputs, and destructive operations trigger explicit confirmation dialogs.
