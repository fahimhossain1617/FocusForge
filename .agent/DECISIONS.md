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
- **Decision:** Android PWA WebAPK startup sequence is fully unified with `#090c19` background across `manifest.json`, `manifest.webmanifest`, `<meta name="theme-color">`, and an inline pre-CSS `<style>` tag to eliminate all white flicker. An inline, vanilla HTML/CSS boot layer (`#ff-boot-layer`) reproduces the Android splash icon using the exact 512x512 splash icon asset (`/icons/icon-512x512.png` at 192px CSS centered, no artificial squircle border) at dead center, which seamlessly executes an ~850ms GPU-accelerated shared-element sequence:
  1. 0–100ms: Center hold matching splash state.
  2. 100–700ms: Straight-line GPU flight (`transform: translate + scale`, `cubic-bezier(.32, .72, 0, 1)`) from badge center to target header slot center. Target slot is resolved via strict viewport/hierarchy checks (MobileHeader on mobile, Sidebar on desktop) with `#app-shell` transforms neutralized. Supports `?ffdebug=1` for 3000ms diagnostic slow motion.
  3. 250–550ms: Dark skeleton/dashboard fades in (`opacity: 0 -> 1`, `translateY: 10px -> 0px`).
  4. Landing (~700ms): Same-frame handoff displaying real header logo tile/mark, removing `#ff-boot-layer` and `ff-launch`, followed by a 250ms fade-in of the brand title.
- **Reason:** Eliminates dark -> white -> dark screen flashing on Android PWA cold launch and creates a smooth native-quality transition with zero size jumps or logo gaps.
- **Impact:** `frontend/public/manifest.json`, `frontend/public/manifest.webmanifest`, `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/components/ui/skeleton/AppShellSkeleton.tsx`, `frontend/public/sw.js`.
- **Do Not Change Without Approval:** Never add white backgrounds to the startup boot layer, alter the 850ms flight timeline without testing, or remove the pre-CSS inline dark baseline.
---

## ADR-015: Glory AI Rebrand, Hardware Back Navigation, and Zero-Backdrop UI Polish

- **Date:** October 2026
- **Status:** Accepted
- **Decision:** 
  1. Rebrand the AI Agent system to **Glory AI** (`গ্লোরি এআই`) featuring the custom SVG `GloryOrbIcon` in sidebar and mobile bottom navigation.
  2. Deprecate the ephemeral "Private Chat" toggle and banner. The system defaults to client-side IndexedDB isolation with global AI consent preferences (`aiConsentService.ts`).
  3. Relocate the AI accuracy disclaimer to appear subtly below assistant messages during conversation, and only below the text composer on empty chat screens.
  4. Enforce strict, persistent 5,000 token daily quota caching in `localStorage` (`focusforge_auth_token_quota`) with automatic midnight countdown formatter to prevent bypass on chat refresh or tab re-opening.
  5. Intercept browser and hardware `popstate` back navigation in `AppContext.tsx` using synthetic URL state (`?view=...`) so pressing back navigates between dashboard and subviews rather than quitting the PWA.
  6. Eliminate dark/blurry backdrops on header dropdown menus (`MobileHeader.tsx`), replacing them with transparent click-catchers.
  7. Polish the Focus timer view by removing nested boxes from duration steppers and recent task items.
- **Reason:** Satisfies user requirements for high-polish responsive UI, instant theme toggles, native-like gesture navigation, clean Focus tracking, and persistent Glory AI token governance.
- **Impact:** `frontend/src/context/AppContext.tsx`, `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/services/aiAgentService.ts`, `frontend/src/components/navigation/MobileHeader.tsx`, `frontend/src/components/navigation/BottomNav.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/pages/FocusPage.tsx`, `frontend/src/components/icons/GloryOrbIcon.tsx`.
- **Do Not Change Without Approval:** Do not reintroduce ephemeral private chat toggles, remove the `popstate` history handler, or bypass token quota persistence.

---

## ADR-016: UI/UX De-boxing, Header Alignment, and Gradient Removal

- **Date:** October 2026
- **Status:** Accepted
- **Decision:**
  1. **Notifications Page (`NotificationsPage.tsx`):**
     - Removed the pill/border container from the unread counter badge ("3 new"), rendering it as clean inline text beside the title.
     - Removed outer segmented switch container box and sliding pill animations from the "All" / "Unread" filters, rendering them as standalone tab buttons.
     - Converted "Select All" and "Delete" bulk action triggers into clean text/icon buttons matching "Mark Read" (no boxed button wrappers).
     - Removed the bordered card wrapper around the browser notification banner so it sits directly on the main interface.
     - Removed the square box wrapper around the Settings button and vertically aligned it directly with the "Notifications" title text on the header row.
     - Removed all extra animations/scale effects from notification action buttons.
  2. **Dashboard Plus Buttons (`DashboardPage.tsx`):**
     - Removed boxed pill container and borders from '+' buttons in Today's Tasks, Today's Focus, and Time Log, converting them to clean icon buttons with subtle hover color.
  3. **Solid Uniform Background on Cards (`globals.css`, `DashboardSkeleton.tsx`):**
     - Replaced `linear-gradient` on `.dashboard-card` with solid uniform `#111827`, eliminating two-color split cuts.
  4. **Performance Section Summary Metrics (`DashboardPage.tsx`):**
     - Removed individual card box containers around "Total Weekly Focus Time", "Weekly Tasks Completed", and "Weekly Missed Tasks", displaying them as clean, flat metrics directly on the Performance card.
- **Reason:** Direct user request for a cleaner, unified, non-boxed interface without intrusive animations or card gradients.
- **Impact:** `frontend/src/components/pages/NotificationsPage.tsx`, `frontend/src/components/pages/DashboardPage.tsx`, `frontend/src/app/globals.css`, `frontend/src/components/ui/skeleton/pages/DashboardSkeleton.tsx`.
- **Do Not Change Without Approval:** Do not re-add boxed containers to the Notifications header/controls, plus buttons, or summary metrics without user direction.

---

## ADR-017: Snappy Navigation Switching, AI Border Beam, Luxury Emblem, and Disclaimer Relocation

- **Date:** October 2026
- **Status:** Superseded by ADR-018 for navigation transitions and Glory AI icon
- **Decision:**
  1. **Snappy Navigation Switching (`Sidebar.tsx`, `BottomNav.tsx`):**
     - Increased spring physics stiffness (`stiffness: 750, damping: 40`) for active sliding indicators across both Desktop Sidebar and Mobile Bottom Navigation to make tab-to-tab switching instant and snappy without lag.
  2. **AI Input Border Beam (`AIAgentPage.tsx`):**
     - Integrated `BorderBeam` on the Glory AI chat composer capsule pill input bar (`.composerPillBox`).
  3. **AI Accuracy Disclaimer Relocation (`AIAgentPage.tsx`):**
     - Removed the inner disclaimer text from within message bubble boxes.
     - Moved the disclaimer outside the message bubble and restricted it to appear strictly under the single latest AI response message in the thread.
  4. **Luxury AI Sparkle Icon (`GloryOrbIcon.tsx`):**
     - Replaced the smiley emoji icon with a sleek, luxury, dual-sparkle AI emblem.
- **Reason:** Satisfies user requirements for high-performance navigation transitions, glowing text bar effects, clean single-instance AI disclaimer rendering, and luxury branding.
- **Impact:** `frontend/src/components/Sidebar.tsx`, `frontend/src/components/navigation/BottomNav.tsx`, `frontend/src/components/ai-agent/AIAgentPage.tsx`, `frontend/src/components/icons/GloryOrbIcon.tsx`.
- **Do Not Change Without Approval:** Do not repeat the disclaimer on all previous AI messages or degrade navigation spring responsiveness.

---

## ADR-018: Eye-Soothing Navigation Transitions, Glory AI Mascot Face Icon, and Clean Mind/Focus/Notes Polish

- **Date:** October 2026
- **Status:** Accepted
- **Decision:**
  1. **Smooth, Eye-Soothing Navigation Sliding Indicator (`Sidebar.tsx`, `BottomNav.tsx`):**
     - Tuned spring physics from overly abrupt `stiffness: 750, damping: 40` to an organic, swift yet eye-soothing `stiffness: 350, damping: 30` across both desktop sidebar and mobile bottom navigation.
  2. **Glory AI Mascot Face Icon (`GloryOrbIcon.tsx`):**
     - Updated `GloryOrbIcon` to render Glory AI's spherical mascot face with crisp eyes, eyebrows, sweet smile/lips, and blush marks.
  3. **Mind Space Empty State & Textarea Polish (`MindHome.tsx`, `ReviewAll.tsx`, `ThoughtDetail.tsx`, `IdeaCapture.tsx`, `ProblemSolver.tsx`):**
     - Removed hover pop/scale animation from Recent Thoughts empty state icon.
     - Removed bright blue borders and blue focus shadows from textareas and cards across Mind Space (MindHome, ReviewAll search, ThoughtDetail, IdeaCapture, ProblemSolver), preserving normal cursor focus without blue outline.
  4. **Notes & Files UI Polish (`EmptyState.tsx`, `WorkspacePage.tsx`):**
     - Matched empty state icon container background and color to Mind Space (`bg-blue-500/10 dark:bg-blue-500/15 text-blue-500 dark:text-blue-400`).
     - Removed the pill box container around the notes counter badge, displaying it as clean inline text.
  5. **Focus Custom Duration Steppers (`FocusPage.tsx`):**
     - Removed blue focus-within border glow and ring on Hours and Minutes steppers, keeping them clean, single rounded boxes with no nested inner box styling.
  6. **Mind Space Card Background Uniformity (`MindHome.tsx`, `ThoughtDetail.tsx`, `IdeaCapture.tsx`, `ProblemSolver.tsx`):**
     - Replaced translucent `var(--color-bg-card)` with solid, uniform `bg-white dark:bg-[#111827] border border-[#DCE5F0] dark:border-white/10 shadow-none` on textarea cards to eliminate dark corner contrast artifacts.
- **Reason:** Direct user request for eye-soothing navigation transitions, Glory AI mascot face representation, removal of intrusive blue focus borders, clean non-boxed UI elements, and uniform solid card backgrounds.
- **Impact:** `frontend/src/components/Sidebar.tsx`, `frontend/src/components/navigation/BottomNav.tsx`, `frontend/src/components/icons/GloryOrbIcon.tsx`, `frontend/src/components/mymind/*`, `frontend/src/components/pages/WorkspacePage.tsx`, `frontend/src/components/pages/FocusPage.tsx`, `frontend/src/components/ui/EmptyState.tsx`.
- **Do Not Change Without Approval:** Do not reintroduce abrupt navigation spring values, re-box notes count badges, add blue focus rings to non-AI text inputs, or use translucent background tokens causing card corner disparity.

