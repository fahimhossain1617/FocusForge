# API_CONTRACTS.md — Foscentia API Specification & Route Reference

**Document Version:** 1.0.0  
**Last Updated:** October 2026  
**Status:** Authoritative API Reference

---

## 1. API Architecture & Entry Points

Foscentia implements two mirror API layers:
1. **Next.js Serverless Catch-All Route:** `frontend/src/app/api/[...path]/route.ts` (Handles all `/api/*` paths on Vercel and local Next.js server).
2. **Companion Express API:** `backend/src/server.ts` (Handles `/api/*` routes on port 5000 + WebSocket server).

### Authentication Header
Protected endpoints require:
```http
Authorization: Bearer <supabase_access_token>
apikey: <supabase_anon_key>
Content-Type: application/json
```

---

## 2. Authentication & Account Endpoints

### `POST /api/auth/pre-signup`
- **Auth Required:** No
- **Request Body:** `{ fullName: string, email: string, password: string }`
- **Response:** `{ success: boolean, message?: string }`
- **Behavior:** Stores registration in `public.pending_signups`, hashes password with `scrypt`, sends 6-digit OTP email.

### `POST /api/auth/verify-signup`
- **Auth Required:** No
- **Request Body:** `{ email: string, otp: string }`
- **Response:** `{ success: boolean, user?: object, error?: string }`
- **Behavior:** Validates OTP, creates user in `auth.users` via Supabase Admin API with `email_confirm: true`, creates profile in `public.profiles`.

### `POST /api/auth/resend-signup-otp`
- **Auth Required:** No
- **Request Body:** `{ email: string }`
- **Response:** `{ success: boolean, message?: string }`

### `POST /api/auth/request-reset-otp`
- **Auth Required:** No (Rate-limited: 5 per 10 min)
- **Request Body:** `{ email: string, newPassword?: string }`
- **Response:** `{ success: boolean, message?: string, email?: string }`
- **Behavior:** Verifies user exists, stores request in `public.pending_password_resets`, sends 6-digit OTP email.

### `POST /api/auth/resend-reset-otp`
- **Auth Required:** No (Rate-limited: 1 per 60 sec)
- **Request Body:** `{ email: string }`
- **Response:** `{ success: boolean, message?: string }`

### `POST /api/auth/verify-reset-otp`
- **Auth Required:** No
- **Request Body:** `{ email: string, otp: string, newPassword?: string }`
- **Response:** `{ success: boolean, message?: string }`
- **Behavior:** Validates 6-digit OTP, securely updates user password in Supabase and PostgreSQL, cleans up pending reset record, dispatches security alert email.

---

## 3. User & Profile Endpoints

### `GET /api/user/profile`
- **Auth Required:** Yes
- **Response:** `{ id, email, fullName, displayName, phone, dateOfBirth, gender, country, city, bio, avatarUrl, preferredTheme, preferredLanguage }`

### `PATCH /api/user/profile`
- **Auth Required:** Yes
- **Request Body:** Partial profile fields with strict server-side regex/length validation.
- **Response:** Updated profile object.

### `GET /api/user/check-username?username=...`
- **Auth Required:** No (Rate-limited)
- **Response:** `{ available: boolean }` (Case-insensitive check on `profiles.display_name`).

### `POST /api/user/avatar` & `DELETE /api/user/avatar`
- **Auth Required:** Yes
- **Behavior:** Uploads/removes user avatar image stored in Supabase Storage.

### `POST /api/user/change-password`
- **Auth Required:** Yes
- **Request Body:** `{ oldPassword: string, newPassword: string }`
- **Behavior:** Re-authenticates, enforces complexity, updates password, dispatches security alert email.

### `DELETE /api/user/account`
- **Auth Required:** Yes
- **Request Body:** `{ password?: string }`
- **Behavior:** Re-verifies credentials, atomically deletes all user records across all tables (cascade delete), anonymizes support tickets, deletes `auth.users` record, sends confirmation email.

### `POST /api/user/migrate-guest-data`
- **Auth Required:** Yes
- **Request Body:** `{ tasks: [], notes: [], habits: [], focusLogs: [] }`
- **Behavior:** Merges local guest items into authenticated database tables.

---

## 4. Productivity Domain Endpoints

### Tasks & Routine Templates
- `GET /api/tasks` -> Returns array of tasks for authenticated user.
- `POST /api/tasks` -> Creates/upserts a task.
- `PATCH /api/tasks/:id` -> Updates task fields.
- `DELETE /api/tasks/:id` -> Deletes a task.
- `GET /api/tasks/templates` -> Returns routine templates.
- `POST /api/tasks/templates` -> Saves a weekday routine template.
- `DELETE /api/tasks/templates/:id` -> Deletes a routine template.

### Notes & Attachments
- `GET /api/notes` -> Returns user notes with JSONB blocks.
- `POST /api/notes` -> Creates a note.
- `PATCH /api/notes/:id` -> Updates a note.
- `DELETE /api/notes/:id` -> Deletes a note.

### My Mind (Capture & Brain Dump)
- `GET /api/mind` -> Returns mind capture items.
- `POST /api/mind` -> Creates/upserts a mind item.
- `DELETE /api/mind/:id` -> Deletes a mind item.
- `DELETE /api/mind` -> Clears all mind items.

### Focus Sessions & Distractions
- `GET /api/focus/sessions` -> Returns focus session history.
- `POST /api/focus/sessions` -> Starts a focus session.
- `PATCH /api/focus/sessions/:id/end` -> Ends session with completed duration and metrics.
- `POST /api/focus/sessions/:id/distractions` -> Logs a distraction event during an active session.

### Personal Diary
- `GET /api/diary/topics` -> Returns diary topics.
- `POST /api/diary/topics` -> Creates/updates a diary topic.
- `DELETE /api/diary/topics/:id` -> Deletes topic and associated entries (cascade).
- `POST /api/diary/entries` -> Creates/updates a diary entry.
- `DELETE /api/diary/entries/:id` -> Deletes a diary entry.

### Learning Hub & Skill Tracker
- `GET /api/learning/data` -> Returns learning folders and daily practice logs.
- `POST /api/learning/folders` & `PATCH /api/learning/folders/:id` & `DELETE /api/learning/folders/:id`
- `POST /api/learning/logs` & `DELETE /api/learning/logs/:id`

---

## 5. AI & Voice Endpoints

### AI Core Actions
- `POST /api/ai/what-should-i-do` -> Selects and prioritizes next immediate action.
- `POST /api/ai/breakdown` -> Breaks a goal into structured subtasks.
- `POST /api/ai/parse-task` -> Parses natural language into structured task properties.
- `POST /api/ai/daily-plan` -> Generates daily schedule slots.
- `POST /api/ai/ask` -> Answers general productivity questions.
- `POST /api/ai/custom` -> Custom prompt execution.
- `POST /api/ai/execute-agent` -> Executes agentic tool calling.
- `GET /api/ai/tokens` -> Returns user token quota status.

### AI Agent Chat Sessions
- `GET /api/ai/agent/sessions` -> Client-side managed via IndexedDB.
- `POST /api/ai/agent/sessions` -> Client-side managed via IndexedDB.
- `DELETE /api/ai/agent/sessions/:id` -> Client-side managed via IndexedDB.
- `POST /api/ai/agent/chat` -> Stateless Gemini proxy: receives `{ message, history, context, preferredLanguage, privacyMode }`, prompts Google Gemini, extracts tool action intents, and returns `{ message, action, actionPayload }`. Zero database storage on server; sessions persist strictly in client IndexedDB (`ai_sessions`, `ai_messages`, `ai_memory`) when not in Private Chat mode.

### Speech-to-Text (STT) Endpoints
- `POST /api/ai/transcribe` -> Accepts `{ audio: base64, mimeType: string, language: string }` and returns transcribed text via Gemini multimodal audio.
- `WS /api/ai/transcribe-stream?language=...` -> Real-time streaming WebSocket endpoint hosted by Express backend (`backend/src/services/webSocketService.ts`).

---

## 6. Notifications & Reviews

- `GET /api/notifications/settings` & `POST /api/notifications/settings` -> Manages push settings, quiet hours, and daily limits.
- `GET /api/notifications` -> In-app notification history.
- `GET /api/notifications/rotation` -> Retrieves current shuffle-bag rotation state per category.
- `POST /api/notifications/subscribe` -> Saves Web Push subscription (`endpoint`, `p256dh`, `auth`, `user_agent`).
- `POST /api/notifications/unsubscribe` -> Removes Web Push subscription endpoint from database.
- `POST /api/notifications/send-push` -> Dispatches OS-level Web Push notification to user's devices via VAPID protocol.
- `POST /api/notifications/test` / `POST /api/notifications/test-push` -> Dispatches test Web Push notification to verify background delivery.
- `GET /api/reviews/state` & `POST /api/reviews/action` & `POST /api/reviews/skip` & `POST /api/reviews/submit` -> Smart in-app review prompt trigger pipeline.

---

## 7. Zero-Knowledge E2EE Sync Relays

### `POST /api/sync/push`
- **Auth Required:** Yes
- **Request Body:** `{ items: Array<{ storeName, recordId, ciphertext, iv, salt, version, isDeleted, clientUpdatedAt }>, deviceId: string }`
- **Behavior:** Upserts opaque ciphertext blobs into `public.encrypted_sync_records`. Never receives plaintext or encryption keys.

### `POST /api/sync/pull`
- **Auth Required:** Yes
- **Request Body:** `{ since?: string, deviceId: string, limit?: number }`
- **Behavior:** Returns array of encrypted records updated since the specified timestamp from other devices.

### `DELETE /api/sync/purge`
- **Auth Required:** Yes
- **Behavior:** Permanently purges all encrypted sync records for the authenticated user from `public.encrypted_sync_records`.

---

## 8. Supervisor Portal Endpoints

- `GET /api/supervisor/role` -> Verifies supervisor/admin RBAC status.
- `GET /api/supervisor/tickets` -> Lists support tickets with filters (type, status, priority, search).
- `GET /api/supervisor/tickets/:id` -> Returns full ticket details and reply thread.
- `PATCH /api/supervisor/tickets/:id` -> Updates status, priority, and internal notes.
- `POST /api/supervisor/tickets/:id/reply` -> Sends reply to customer via email and appends to thread.
- `GET /api/supervisor/audit-logs` -> Returns supervisor action audit logs.
