# SYSTEM_ARCHITECTURE.md — Foscentia Technical Architecture Reference

**Document Version:** 1.0.0  
**Last Updated:** October 2026  
**Status:** Authoritative Architectural Specification

---

## 1. High-Level System Overview

```
                                  ┌──────────────────────────────────────────────┐
                                  │           FOSCENTIA USER CLIENT              │
                                  │   (Next.js 16 SPA + React 19 + PWA SW)       │
                                  └──────────────┬──────────────────┬────────────┘
                                                 │                  │
                         Local-First IndexedDB   │                  │ WebSocket
                         & Crypto Sync (AES-GCM) │                  │ Live Stream
                                                 │                  ▼
                                                 │   ┌───────────────────────────┐
                                                 │   │ Express Backend (Port 5000│
                                                 │   │  - WebSocket ASR Stream   │
                                                 │   │  - Standalone REST Engine │
                                                 │   └──────────────┬────────────┘
                                                 │                  │
                                                 ▼                  │
                        ┌─────────────────────────────────┐         │
                        │ Next.js Serverless API Route    │         │
                        │ (/api/[...path] Catch-All)      │◄────────┘
                        └────────────────┬────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
┌──────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────────────┐
│ Supabase PostgreSQL  │   │ Google Gemini AI SDK      │   │ Transactional Email Engine   │
│  - Direct PG Pool    │   │  - Multimodal STT         │   │  - Nodemailer (SMTP / Gmail) │
│  - Auth & RBAC       │   │  - Intent & Tool Calling  │   │  - Ticket Alerts & Security  │
│  - Encrypted Relays  │   │  - Daily Planning Engine  │   │  - Google Apps Script Relay  │
└──────────────────────┘   └───────────────────────────┘   └──────────────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 State Management & Context Layer
- **`AuthContext.tsx`**: Manages the authentication state machine (`INITIALIZING` -> `GUEST` -> `AUTHENTICATED` -> `SWITCHING_ACCOUNT` -> `SIGNING_OUT`), multi-account switcher state, guest migration triggers, and login modal routing.
- **`AppContext.tsx`**: Holds the comprehensive in-memory domain state (`AppState`), hydrating immediately from IndexedDB/LocalStorage, then asynchronously fetching fresh cloud data and initiating background E2EE sync (`syncService.syncNow`).

### 2.2 Routing & Navigation
- **`app/page.tsx`**: Single-Page App (SPA) view switcher that conditionally mounts page components based on `state.activePage` (`today`, `mind`, `diary`, `tasks`, `planner`, `focus`, `learning`, `profile`, `settings`, `ai-agent`, `notifications`).
- **Dedicated Route Pages**: `/login`, `/signup`, `/verify`, `/supervisor`, `/privacy`, `/terms`.

### 2.3 Client Services Architecture
- `localDbService.ts`: Low-level IndexedDB multi-store wrapper.
- `cryptoSyncService.ts`: Web Crypto API encryption engine.
- `syncService.ts`: Synchronization queue orchestrator.
- `authService.ts`: Supabase Auth client and pre-verification OTP coordinator.
- `taskService.ts`, `noteService.ts`, `diaryStorageService.ts`, `focusDbService.ts`, `learningDbService.ts`, `mindService.ts`, `userService.ts`, `notificationService.ts`.

---

## 3. Backend Architecture (Dual-Execution Design)

### 3.1 Next.js Serverless Catch-All Route
- **File:** `frontend/src/app/api/[...path]/route.ts` (1,873 lines).
- **Execution:** Runs as a serverless function on Vercel or locally inside Next.js dev server.
- **Scope:** Implements all REST endpoints for Auth Pre-Verification, User Profiles, Tasks, Routines, Notes, Mind Items, Focus Sessions, Diary Topics/Entries, Learning Hub, AI Prompts/Tokens, Notifications, Support Tickets, and E2EE Sync Relays.
- **Database Connection:** Connects directly to PostgreSQL via `pg.Pool` with parameterized queries (`WHERE user_id = $1`).

### 3.2 Companion Express Backend
- **File:** `backend/src/server.ts` (Node.js port 5000).
- **Scope:** Express 5.2 application mounting 12 route modules (`aiRoutes`, `diaryRoutes`, `focusRoutes`, `learningRoutes`, `mindRoutes`, `noteRoutes`, `notificationRoutes`, `reviewRoutes`, `supervisorRoutes`, `syncRoutes`, `taskRoutes`, `userRoutes`).
- **WebSocket Engine:** `webSocketService.ts` handles persistent bi-directional WebSocket connections at `/api/ai/transcribe-stream` for live speech-to-text chunk streaming.

### 3.3 Dynamic Client Failover
- **File:** `frontend/src/lib/apiClient.ts`
- **Mechanism:** `fetchBackend` attempts the primary backend URL (Express) with a 10s timeout; if unreachable, it automatically falls back to internal relative `/api/...` routes without throwing an unhandled error to the UI.

---

## 4. Storage & Synchronization Architecture

### 4.1 IndexedDB Multi-Store Layout
Database: `focusforge_local_v3` (Version 1)
- `tasks` (Index: `by_user`, `by_user_updated`, `by_user_date`)
- `routine_templates` (Index: `by_user`, `by_user_updated`)
- `notes` (Index: `by_user`, `by_user_updated`, `by_user_category`)
- `attachments` (Binary file/image storage)
- `mind_items` (Index: `by_user`, `by_user_updated`)
- `diary_topics` (Index: `by_user`, `by_user_updated`)
- `diary_entries` (Index: `by_user`, `by_user_updated`, `by_user_topic`)
- `focus_sessions` (Index: `by_user`, `by_user_updated`)
- `learning_folders` (Index: `by_user`, `by_user_updated`)
- `learning_logs` (Index: `by_user`, `by_user_updated`)
- `ai_sessions` & `ai_messages` & `ai_memory`
- `app_preferences` & `sync_queue`

### 4.2 Zero-Knowledge E2EE Sync Relay
1. When a record is created or modified, it is appended to IndexedDB `sync_queue`.
2. `syncService.syncNow` drains the queue, derives an AES-256-GCM key, and encrypts the record payload into a base64 ciphertext with a unique 12-byte IV.
3. The encrypted payload is transmitted to `POST /api/sync/push` and stored in PostgreSQL `encrypted_sync_records`.
4. Remote devices poll `POST /api/sync/pull`, receive the encrypted blobs, decrypt them locally, and merge them into their local IndexedDB.

---

## 5. Authentication & Account Isolation Architecture

1. **Pre-Verification:** User registration data is temporarily stored in `public.pending_signups` with hashed password and OTP. No unconfirmed row enters `auth.users`.
2. **User Confirmation:** `POST /api/auth/verify-signup` validates OTP and creates the verified user in `auth.users` via Supabase Admin API.
3. **Session Verification:** Every API endpoint validates the incoming JWT Bearer token via `supabase.auth.getUser(token)` and enforces `user_id = $1` in all SQL queries.
4. **Supervisor RBAC:** Protected by `user_roles` table. Supervisors only access `support_tickets` and audit logs; personal user data tables are inaccessible.

---

## 6. AI & Voice Architecture

1. **Google Gemini Models:** `gemini-3.6-flash`, `gemini-3.8-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-flash-latest`.
2. **Sanitization:** `sanitizePayloadForGemini` redacts potential tokens, passwords, and API keys before dispatching context to Gemini.
3. **Action Execution:** 23+ intent actions verified through `aiActionValidator.ts`. Destructive actions require explicit confirmation.
4. **Speech-to-Text & Real-Time Dictation System:**
   - `VoiceSessionManager`: Typed Finite State Machine (`IDLE`, `LISTENING`, `PAUSED`, `RECOVERING`, `STOPPING`, `ERROR`) providing unlimited continuous listening, transparent session rollover, backoff recovery, and intentional pause/resume handling.
   - `TranscriptReconciler`: Pure deterministic transcript normalization, jitter stutter filtering, and word boundary overlap deduplication for Bengali (`bn-BD`), English (`en-US`), and mixed Banglish speech.
   - `VoiceEditingController`: Caret-anchored text insertion and manual edit / backspace / delete protection.
   - Serverless Multimodal Audio Fallback: `/api/ai/transcribe` invoking Google Gemini multimodal audio transcription with cascading model fallbacks.

---

## 7. High-Risk Files (Critical Systems)

Future agents must treat the following files as **HIGH-RISK**. Changes require extra impact analysis and regression testing:

1. `frontend/src/context/AppContext.tsx` — Core state manager and IndexedDB hydration hub.
2. `frontend/src/context/AuthContext.tsx` — Auth state machine and session controller.
3. `frontend/src/app/api/[...path]/route.ts` — Unified serverless API catch-all handler.
4. `frontend/src/lib/server/db.ts` & `backend/src/services/db.ts` — Direct PostgreSQL connection pool and SQL queries.
5. `frontend/src/services/localDbService.ts` — IndexedDB database manager and object store schema.
6. `frontend/src/services/syncService.ts` & `cryptoSyncService.ts` — E2EE encryption and sync queue.
7. `supabase/migrations/` (Migrations `001`–`023`) — Immutable database schemas.
