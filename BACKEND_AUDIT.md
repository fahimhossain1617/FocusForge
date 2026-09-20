# FocusForge Full Codebase Backend & Database Audit (BACKEND_AUDIT.md)

**Audit Date**: March 2026  
**Application**: FocusForge  
**Architecture**: Next.js 16 App Router (Hybrid direct PostgreSQL pool + Supabase Auth + Supabase Storage + Express engine)

---

## 1. Executive Summary & Inventory

| Feature / Domain | Current Storage Mechanism | Status Before Audit | Problem Identified | Fix Applied & Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | Client state aggregated from Tasks, Focus, Notes, Skills | Partially Connected | Relied on client-side memory if tasks/sessions were unsynced | Unified DB queries for tasks, focus sessions, and learning logs; calculates real-time streak & stats |
| **Planner & Tasks** | PostgreSQL `tasks` table | Connected | Missing reminder scheduler integration; needed recurring routine templates sync | Extended DB handlers for routines, import templates, and reminder timeframes |
| **Routine Templates** | PostgreSQL `routine_templates` table | Connected | Needed weekday-based conflict updates and delete verification | Robust upsert & delete queries with full JSONB task definitions |
| **Focus Mode & Timer** | PostgreSQL `focus_sessions` table | Connected | Distraction entries lacked structured JSON validation | Full upsert for sessions, distraction logging, duration calculations |
| **Notes & Blocks** | PostgreSQL `notes` table with JSONB blocks | Connected | File attachments needed verified storage URLs and ownership checks | Added RLS-compliant note and attachment handlers |
| **Capture / My Mind** | PostgreSQL `mind_items` table | Connected | Mind items lacked clear categorization filters and bulk clear | Added full mind item CRUD and clear endpoints |
| **My Diary** | PostgreSQL `diary_topics` & `diary_entries` | Connected | Images array validation and cascade topic deletion | Integrated strict ownership RLS and topic-entry cascade queries |
| **Skill Builder / Learning Hub** | PostgreSQL `learning_folders` & `learning_logs` | Connected | Date-based streak logic needed server validation | Complete endpoints for folder management, daily logs, and streak tracking |
| **FocusForge AI Agent** | PostgreSQL `ai_chat_sessions`, `ai_chat_messages`, `ai_tokens` | Connected | Session title generation and token quota tracking | Added smart auto-titling, Gemini streaming & token management, session purge |
| **Settings - Profile** | PostgreSQL `profiles` table | Partially Connected | Missing `phone`, `bio`, `date_of_birth`, `gender`, `country`, `city`, unique case-insensitive `displayName`; email prefix prefill bug | Extended `profiles` schema with migration 016, added username uniqueness check, avatar upload/remove endpoints, strict server validation |
| **Settings - Security & Password** | Supabase Auth | Mocked / Client-only | Google accounts attempted password changes; lack of failed attempt rate limiting & security alert email | Server-side provider detection (`PASSWORD_MANAGED_BY_PROVIDER`), re-auth requirement, rate limiting, and password change security email |
| **Settings - Notifications** | Local storage / partial API | Unconnected | Push settings and reminder cron were not persisting to database or firing real alerts | Created `user_notification_settings`, `push_subscriptions`, `sent_notifications_log`, and automated reminder scheduler with idempotency |
| **Settings - Theme & Language** | Local storage / client state | Partially Connected | Themes and language preference reset across devices | Added user profile persistence (`preferred_language`, `preferred_theme`) synced on initial load |
| **Settings - Legal & About** | Hardcoded strings | Fragmented | App version and legal dates were scattered across components | Consolidated into single-source `src/config.ts` and versioned legal content files |
| **Settings - Delete Account** | Client request | Incomplete | Did not cleanly wipe all DB records or handle support tickets | Implemented atomic, idempotent deletion across all tables and Supabase Auth with ticket anonymization and confirmation email |
| **Support - Report a Problem** | Incomplete endpoint | Missing Supervisor & Email | Submissions were not visible to supervisors and did not notify owner | Created `support_tickets` table, instant owner email alert with `Reply-To`, confirmation email to sender, and supervisor portal |
| **Support - Contact Support** | Incomplete endpoint | Missing Supervisor & Email | Form submissions lacked ticket numbering and thread tracking | Auto-generates `FF-XXXXXX` ticket number, saves to DB, dispatches transactional emails, supervisor reply thread |
| **Support - Feedback & Ideas** | Incomplete endpoint | Missing Supervisor & Email | Feedback was not categorized or tracked | Stored in unified `support_tickets`, real-time supervisor list with priority & categorization |
| **Supervisor Portal** | None | Missing | No admin or supervisor portal existed to manage support tickets | Created protected `/supervisor` portal with RBAC (`user_roles`), ticket filters, status updates, internal notes, email replies, and audit logs |
| **Guest Flow & Migration** | IndexedDB / localStorage | Isolated | Guest data was lost or disconnected when signing up or logging in | Created safe one-time guest data migration handler merging local tasks, notes, habits into user database account |

---

## 2. Detailed Gap Analysis & Remediation Plan

### A. Data Isolation & Security Enforcement
1. **Server-side Ownership**: Every database query filters by `user_id = $1` verified from Supabase JWT token.
2. **Private Content Isolation**: Supervisors only have access to `support_tickets` and `ticket_replies`. Under no circumstances can supervisors view `diary_entries`, `notes`, `tasks`, or user personal details.
3. **Input Sanitization & Server Validation**: All incoming requests are validated on the server for length, regex formats, and allowed values.
4. **Rate Limiting**: Applied to sensitive endpoints (password change, username check, support submission, account deletion).

### B. Transactional Email System
1. Nodemailer SMTP engine with support for Gmail, Brevo, SendGrid, Amazon SES, or custom SMTP.
2. Background queue with exponential backoff and retry guarantees.
3. Sanitized HTML and clean plain-text templates without emojis.

---

## 3. Database Schema Overview (Post Migration 016)

- `profiles` (User metadata, display name, full name, phone, bio, DOB, gender, country, city, theme, language)
- `user_roles` (RBAC for supervisor and admin roles)
- `user_notification_settings` (Push switches, reminder schedules, timezone)
- `push_subscriptions` (Web push endpoints and keys per user/device)
- `support_tickets` (Problem reports, contact inquiries, feedback items with ticket numbers `FF-XXXXXX`)
- `ticket_replies` (Two-way thread history between supervisor and user)
- `supervisor_audit_logs` (Audit trails for supervisor actions)
- `sent_notifications_log` (Notification idempotency keys)
- `tasks` & `routine_templates` (Planner tasks, recurring habits, and import routines)
- `notes` & `note_blocks` (Notes and rich content blocks)
- `mind_items` (Quick capture thoughts and ideas)
- `focus_sessions` & `distraction_entries` (Pomodoro and focus analytics)
- `diary_topics` & `diary_entries` (Personal journaling)
- `learning_folders` & `learning_logs` (Skill builder and daily practice tracker)
- `ai_chat_sessions` & `ai_chat_messages` (AI conversation history)
- `ai_tokens` & `user_cloud_state` (AI quotas and encrypted sync cache)
