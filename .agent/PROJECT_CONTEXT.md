# PROJECT_CONTEXT.md — Foscentia Project Overview

**Document Version:** 1.0.0  
**Last Updated:** October 2026  
**Status:** Authoritative Project Context

---

## 1. Project Identity

- **Product Name:** Foscentia (internal codebase identifiers, package manifests, and UI brands also reference `FocusForge`).
- **Core Purpose:** An intelligent, high-performance daily planner, habit tracker, markdown/canvas notes editor, deep focus timer, and AI-assisted personal productivity workspace.
- **Production URL:** `https://focus-forge-fahimhossain1617-7909s-projects.vercel.app` (configured as live production deployment target).
- **Technology Stack:**
  - **Frontend:** Next.js 16.3.3 (App Router), React 19.2.8, TypeScript 5, Tailwind CSS v4, Lucide React, Framer Motion, KaTeX, Fabric.js, Monaco Editor, Recharts.
  - **Backend Layer (Dual):**
    1. Next.js Serverless Catch-All API Route (`frontend/src/app/api/[...path]/route.ts`) executing direct PostgreSQL queries via `pg.Pool`.
    2. Companion Express 5.2 backend (`backend/src/server.ts`) on Node.js port 5000 with WebSocket server (`ws://.../api/ai/transcribe-stream`).
  - **Database & Auth:** PostgreSQL hosted on Supabase; Supabase Auth SDK (`@supabase/supabase-js` v2.115.0); 24 SQL schema migrations.
  - **AI & Speech:** Google Gen AI SDK (`@google/genai` v2.21.0 and `@google/generative-ai` v0.24.1); Google Gemini models; Web Speech API & WebSocket streaming ASR.
  - **Email Deliverability:** Nodemailer with SMTP transport for OTP verification and supervisor ticket notifications.
- **Development Environment:** Node.js (v20+), npm workspaces/scripts, concurrently dev runner (`npm run dev`).
- **Deployment Platform:** Vercel (Next.js frontend + serverless API routes) + companion Node.js host for Express/WebSockets if real-time streaming is active.

---

## 2. Permanent Development Principles

As established in [`/AGENTS.md`](file:///c:/Users/fahim/OneDrive/Desktop/My%20all%20learning%20project%20files/my%20app/AGENTS.md):

1. **Strict Task Scope:** Agents must modify ONLY the explicitly requested feature, file, function, or component.
2. **Minimal Changes:** Every change must prefer the smallest safe diff; zero unrequested refactoring, cleanup, or formatting.
3. **No Silent Scope Expansion:** Discoveries of unrelated technical debt or bugs must be reported, never silently fixed.
4. **Preserve Existing Functionality:** Untouched features and systems are treated as immutable and fragile.
5. **Verify Before Claiming Completion:** Code existence does NOT prove functionality. Claims must be backed by evidence (static, build, automated test, local runtime, or production verification).
6. **Project Memory is Authoritative:** The documentation in `.agent/` is persistent project memory and overrides conversational assumptions.
7. **Ask Before Touching Protected Systems:** Any unexpected modification to high-risk files or database schemas requires explicit user confirmation.

---

## 3. Data Philosophy & Architecture

### Current Implementation vs. Intended Architecture

| Architecture Tier | Current Implementation State | Intended Long-Term Architecture |
| :--- | :--- | :--- |
| **Local-First Storage** | **IMPLEMENTED & VERIFIED LOCALLY**<br>IndexedDB database `focusforge_local_v3` with 15 object stores managed by `localDbService.ts`. Local storage fallback with per-user isolation keys (`getUserStorageKey`). | All client actions commit instantly to local IndexedDB before any network request; offline-first capability across all 9 pages. |
| **Guest Mode** | **IMPLEMENTED & VERIFIED LOCALLY**<br>Guest users have full local read/write access. First authenticated login permanently disables guest mode, clears guest storage, and triggers migration (`/api/user/migrate-guest-data`). | One-way progression from Guest to Authenticated user with zero data loss. |
| **Multi-Account Isolation** | **IMPLEMENTED & VERIFIED LOCALLY**<br>`accountManager.ts` stores multiple remembered accounts. `AuthContext` wipes active in-memory encryption keys and state on switch. Every SQL query filters by `WHERE user_id = $1`. | Strict cryptographic and session boundaries between multiple logged-in accounts on the same device. |
| **Zero-Knowledge E2EE Sync** | **IMPLEMENTED — PARTIALLY VERIFIED**<br>`cryptoSyncService.ts` derives AES-256-GCM keys via Web Crypto PBKDF2 (100,000 rounds). Encrypted records are relayed via `POST /api/sync/push` and `POST /api/sync/pull` storing opaque ciphertext in `encrypted_sync_records`. | Complete zero-knowledge sync relay where the server never receives unencrypted personal data (notes, diary, tasks). |
| **Direct Database Persistence** | **IMPLEMENTED & VERIFIED LOCALLY**<br>Direct REST CRUD endpoints for `tasks`, `notes`, `mind_items`, `diary_topics`, `focus_sessions`, `learning_logs` executing parameterized SQL queries. | Dual-layer persistence: immediate local IndexedDB write + asynchronous REST/E2EE cloud backup. |

---

## 4. AI & Voice Architecture

- **AI Engine:** Google Gemini models invoked via `@google/genai` with fallback cascading: `gemini-3.6-flash` -> `gemini-3.8-flash` -> `gemini-3.5-flash` -> `gemini-3.5-flash-lite` -> `gemini-flash-latest` -> rule-based generator.
- **AI Agent Capabilities:** Intent classification (`PROBLEM_SOLVER`, `IDEA_CAPTURE`, `PLANNER_CREATE`, `FOCUS_SESSION`, etc.) with 23+ validated tool actions in `aiActionValidator.ts`. Destructive actions require explicit user confirmation.
- **Token Quota System:** `ai_tokens` table tracks daily token consumption (5,000 limit for authenticated users, 1,000 for guest users).
- **Speech-to-Text (STT):**
  - Primary Streaming: WebSocket connection to `/api/ai/transcribe-stream` on Express backend (Port 5000).
  - Secondary Batch: HTTP POST of base64 audio to `/api/ai/transcribe` invoking Gemini audio transcription.
  - Transcript Stitching: Overlap deduplication (`stitchTranscripts`) and stutter removal in `useSpeechRecognition.ts`.
