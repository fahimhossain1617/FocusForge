# DECISIONS.md — Permanent Architectural Decision Records (ADR)

**Document Version:** 1.0.0  
**Last Updated:** October 2026  
**Status:** Authoritative Decision Log

---

## ADR-001: Local-First IndexedDB Engine

- **Date:** March 2026
- **Status:** Accepted
- **Decision:** All client mutations (tasks, notes, diary entries, mind items, focus logs) must commit immediately to local browser IndexedDB (`focusforge_local_v3`) before initiating any network requests.
- **Reason:** Ensures instant, zero-latency UI responsiveness, full offline capabilities, and resilience against intermittent network drops.
- **Impact:** `frontend/src/services/localDbService.ts`, `frontend/src/context/AppContext.tsx`, all UI creation/edit handlers.
- **Do Not Change Without Approval:** Do not replace IndexedDB with remote-only fetch calls or remove the local commit step.

---

## ADR-002: Dual-Backend Architecture (Serverless Catch-All + Companion Express)

- **Date:** March 2026
- **Status:** Accepted
- **Decision:** Support two backend execution paths:
  1. Next.js Serverless Catch-All API (`frontend/src/app/api/[...path]/route.ts`) for direct Vercel cloud deployment.
  2. Companion Express server (`backend/src/server.ts`) for local development and stateful WebSocket audio streaming.
  - Client API client (`apiClient.ts`) automatically detects environment and fails over between Express port 5000 and Next.js `/api/...` routes.
- **Reason:** Next.js Serverless routes allow seamless, zero-maintenance deployment on Vercel without provisioning dedicated server instances, while the companion Express server provides persistent WebSocket capabilities.
- **Impact:** `frontend/src/app/api/[...path]/route.ts`, `backend/src/server.ts`, `frontend/src/lib/apiClient.ts`, `frontend/src/lib/backendUrl.ts`.
- **Do Not Change Without Approval:** Do not delete either backend path or break the automatic failover in `apiClient.ts`.

---

## ADR-003: Pre-Verification Signup via `public.pending_signups`

- **Date:** March 2026
- **Status:** Accepted
- **Decision:** Unverified user registrations are stored in a dedicated `public.pending_signups` staging table with a 10-minute expiry and 6-digit OTP delivered via Nodemailer. A user is only inserted into `auth.users` upon successful OTP confirmation.
- **Reason:** Prevents ghost/unverified rows from polluting `auth.users` and eliminates trigger conflicts with Supabase auto-confirmation handlers.
- **Impact:** `frontend/src/services/authService.ts`, `frontend/src/app/api/[...path]/route.ts`, `supabase/migrations/022_cascade_deletes_and_pre_verification.sql`.
- **Do Not Change Without Approval:** Do not reintroduce direct client-side unconfirmed `supabase.auth.signUp` without explicit user confirmation.

---

## ADR-004: Multi-Account Isolation & Switcher

- **Date:** March 2026
- **Status:** Accepted
- **Decision:** Support multi-account switching on a single device via `accountManager.ts` storing verified account references in `localStorage`. On switch, all active in-memory encryption keys, cached state, and session tokens are cleanly purged before loading the target account.
- **Reason:** Allows multiple users or multiple personas (e.g. Work, Personal) to share a device without cross-tenant data leakage.
- **Impact:** `frontend/src/services/accountManager.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/components/auth/AccountSwitcherModal.tsx`.
- **Do Not Change Without Approval:** Do not weaken session teardown or share cached IndexedDB records across different user IDs.

---

## ADR-005: Zero-Knowledge End-to-End Encryption (E2EE) Sync Relay

- **Date:** March 2026
- **Status:** Accepted
- **Decision:** User personal records (notes, diary, mind maps) synced through the cloud relay are encrypted on-device using Web Crypto AES-256-GCM with 12-byte IVs and PBKDF2 key derivation. The cloud database stores only opaque ciphertext in `encrypted_sync_records`.
- **Reason:** Guarantees absolute user privacy so that database administrators, cloud hosts, and supervisor roles have zero access to plaintext personal reflections.
- **Impact:** `frontend/src/services/cryptoSyncService.ts`, `frontend/src/services/syncService.ts`, `supabase/migrations/021_e2ee_sync_and_personal_data_cleanup.sql`.
- **Do Not Change Without Approval:** Do not transmit unencrypted diary/note bodies through unauthenticated endpoints or bypass client-side encryption.

---

## ADR-006: Database Migration Immutability

- **Date:** October 2026
- **Status:** Accepted
- **Decision:** Historical Supabase migrations in `supabase/migrations/` (`001` through `023`) are permanent and immutable. Any new schema addition, index, table, or column must be created as a new sequential migration file (`024_<descriptive_name>.sql`).
- **Reason:** Preserves production schema history and prevents database migration checksum corruption.
- **Impact:** `supabase/migrations/`, `backend/supabase/migrations/`.
- **Do Not Change Without Approval:** Never modify or delete existing migration files `001` to `023`.

---

## ADR-007: Google Gemini AI SDK & Tool Execution Validation

- **Date:** March 2026
- **Status:** Accepted
- **Decision:** Use Google Gen AI SDK (`@google/genai` v2.21.0) with cascading model fallbacks and structured JSON output contracts. All agent action payloads must pass through `aiActionValidator.ts` before triggering client/server mutations. Destructive actions require explicit UI confirmation.
- **Reason:** Ensures robust AI uptime, protects against hallucinations, and prevents unintended data deletion.
- **Impact:** `frontend/src/services/aiAgentService.ts`, `frontend/src/lib/server/aiService.ts`, `frontend/src/lib/ai/aiActionValidator.ts`.
- **Do Not Change Without Approval:** Do not allow the AI agent to execute destructive actions (delete task/note/diary) without confirmation.

---

## ADR-008: Supervisor Role-Based Access Control (RBAC) & Privacy Boundary

- **Date:** March 2026
- **Status:** Accepted
- **Decision:** The `/supervisor` portal is restricted to users with `supervisor` or `admin` entries in `public.user_roles`. Supervisors have access strictly to `support_tickets`, `ticket_replies`, and `supervisor_audit_logs`.
- **Reason:** Enables customer support ticket resolution while strictly maintaining customer privacy boundaries.
- **Impact:** `frontend/src/app/supervisor/page.tsx`, `backend/src/routes/supervisorRoutes.ts`, `supabase/migrations/016_full_backend_and_supervisor.sql`.
- **Do Not Change Without Approval:** Under no circumstances give supervisors access to user `notes`, `tasks`, `diary_entries`, or `focus_sessions`.

---

## ADR-009: Dedicated Two-Step Password Reset & Verification Flow

- **Date:** October 2026
- **Status:** Accepted
- **Decision:** When a password reset link is opened, redirect the user directly to a dedicated full-page `/reset-password` interface matching the user's active theme (dark/light). The flow operates in two sequential steps:
  1. Step 1: Input and validate new password and password confirmation with visual strength meter.
  2. Step 2: 6-digit OTP verification using `OtpSuccessTransition` staged in `public.pending_password_resets` with 15-minute expiry and 60-second cooldown resend timer.
  - On verification success, update password in Supabase/PostgreSQL, dispatch a security alert email, play audio chime, and smoothly log the user into the app.
- **Reason:** Prevents dead-end home redirects upon clicking password reset emails, provides seamless UX with theme matching, and ensures robust account security verification.
- **Impact:** `frontend/src/app/reset-password/page.tsx`, `frontend/src/app/auth/callback/page.tsx`, `frontend/src/app/api/[...path]/route.ts`, `frontend/src/services/authService.ts`, `supabase/migrations/024_pending_password_resets.sql`.
- **Do Not Change Without Approval:** Do not replace the dedicated reset interface with modal popups or bypass the OTP verification stage.

---

## ADR-010: Form Input Field Padding & Overlay Standardization

- **Date:** October 2026
- **Status:** Accepted
- **Decision:** All form inputs across Settings, Account Security, Profile, and Modals must use standard `px-3.5 py-2.5 rounded-xl` container padding with descriptive placeholders (`"Enter your email address"`, `"Enter current password"`, `"Enter new password (min. 6 characters)"`, `"Re-enter new password"`). Redundant decorative icons inside editable inputs are avoided to ensure zero collision, clipping, or text overlap across all themes and screen sizes.
- **Reason:** Prevents absolute positioned icons from colliding with user typed text or placeholders.
- **Impact:** `frontend/src/components/pages/SettingsPage.tsx`, `frontend/src/components/auth/ForgotPasswordModal.tsx`, `frontend/src/app/reset-password/page.tsx`.
- **Do Not Change Without Approval:** Do not place absolute icons over inputs without matching left padding.

---

## ADR-011: Auth-Only Supabase & Local-First Personal Storage Architecture

- **Date:** October 2026
- **Status:** Accepted
- **Decision:** Supabase cloud database is strictly restricted to storing authentication, account identity, supervisor support tickets, and push subscriptions. All personal user data (notes, diary, tasks, mind maps, focus logs, learning tracks, AI chats, and AI memory) is stored locally on the client in IndexedDB (`focusforge_local_v3`). All legacy plaintext personal tables on Supabase have been removed and backed up.
- **Reason:** Enforces zero-knowledge privacy, eliminates central server honeypots of personal reflections, complies with strict privacy-first principles, and guarantees lightning-fast local performance.
- **Impact:** `frontend/src/lib/server/db.ts`, `frontend/src/app/api/[...path]/route.ts`, `supabase/migrations/025_encrypted_sync_and_auth_only_cleanup.sql`.
- **Do Not Change Without Approval:** Never reintroduce plaintext personal data tables to Supabase.

---

## ADR-012: Zero-Knowledge E2EE Sync Relay & User Recovery Keys

- **Date:** October 2026
- **Status:** Accepted
- **Decision:** Cross-device synchronization operates via client-side Web Crypto AES-256-GCM encryption with 12-byte random IVs and PBKDF2 key derivation. The cloud database (`public.encrypted_sync_records`) serves solely as a zero-knowledge ciphertext relay. Users manage their 16-character recovery key (`FF-XXXX-...`) to link multiple physical devices (laptop, mobile, tablet). Supabase never receives the recovery key or plaintext content.
- **Reason:** Enables seamless multi-device productivity without sacrificing zero-knowledge privacy.
- **Impact:** `frontend/src/services/cryptoSyncService.ts`, `frontend/src/services/syncService.ts`, `frontend/src/components/pages/SettingsPage.tsx`, `backend/src/routes/syncRoutes.ts`.
- **Do Not Change Without Approval:** Never send user recovery keys or unencrypted sync blobs to any server or API.

---

## ADR-013: Privacy-First AI Consent & Ephemeral Private Chat Mode

- **Date:** October 2026
- **Status:** Accepted
- **Decision:** The AI Agent defaults to strict privacy ("Keep My Chats Private" / "মেমোরি ছাড়া চ্যাট"). Consent for product improvement is strictly opt-in. A dedicated "Private Chat" toggle allows temporary conversational interactions with zero persistence in IndexedDB, `sessionStorage`, or `localStorage`, clearly indicated by an amber disclaimer banner.
- **Reason:** Guarantees that sensitive or fleeting thoughts shared with the AI are never cached or inadvertently persisted.
- **Impact:** `frontend/src/services/aiConsentService.ts`, `frontend/src/components/ai/AIConsentModal.tsx`, `frontend/src/services/aiAgentService.ts`, `frontend/src/components/ai-agent/AIAgentPage.tsx`.
- **Do Not Change Without Approval:** Never default AI consent to opt-in or persist Private Chat sessions to disk.

---

## ADR-014: Seamless Android PWA Startup & Shared-Element Splash Continuation

- **Date:** October 2026
- **Status:** Accepted
- **Decision:** Android PWA WebAPK startup sequence is fully unified with `#090c19` background across `manifest.json`, `manifest.webmanifest`, `<meta name="theme-color">`, and an inline pre-CSS `<style>` tag to eliminate all white flicker. An inline, vanilla HTML/CSS boot layer (`#ff-boot-layer`) reproduces the Android splash icon (white rounded badge with real `#061f52` SVG mark) at dead center, which seamlessly executes a GPU-accelerated shared-element flight (`transform: translate + scale`, ~650ms, `cubic-bezier(.2, .8, .2, 1)`) directly into the header logo position while the dark skeleton/dashboard fades in with 10px translateY. The boot layer is then permanently removed from the DOM.
- **Reason:** Eliminates dark -> white -> dark screen flashing on Android PWA cold launch and creates a smooth native-quality transition.
- **Impact:** `frontend/public/manifest.json`, `frontend/public/manifest.webmanifest`, `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/public/sw.js`.
- **Do Not Change Without Approval:** Never add white backgrounds to the startup boot layer or remove the pre-CSS inline dark baseline.



