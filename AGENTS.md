<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FOSCENTIA PERMANENT AGENT INSTRUCTION & EXECUTION CONTROL PROTOCOL

---

## ABSOLUTE RULE

From this point forward, every AI agent working on this codebase MUST operate using:
`AGENTS.md` + `.agent/*`
as the authoritative, permanent project-control system.

- Never rely solely on conversational memory.
- Never assume that previous AI conversations are still available.
- Never assume that code existence means functionality works.
- Never claim successful completion without evidence.

---

## PART 1 — PERMANENT TASK EXECUTION PROTOCOL

Every future coding task MUST follow this exact sequence:

### STEP 1 — UNDERSTAND THE REQUEST
Before touching code, determine exactly:
- what the user requested
- what behavior must change
- what behavior must remain unchanged
- what files/functions are likely involved
- what is explicitly OUT OF SCOPE
*Do not begin implementation immediately.*

### STEP 2 — SCOPE LOCK
Before editing, produce an internal task scope containing:
- **Requested Change:** Exactly what is being changed.
- **Allowed Files:** Only files that are necessary for the requested change.
- **Allowed Areas:** Specific functions/components/services/routes.
- **Protected Areas:** Files/features that must not be changed.
- **Expected Behavior:** What should happen after the change.
- **Regression Risks:** What existing functionality could accidentally be affected.

### STEP 3 — PRE-CODING INSPECTION
Before implementation:
1. Read the relevant existing code.
2. Trace the relevant data flow.
3. Check the architecture documentation (`.agent/SYSTEM_ARCHITECTURE.md`).
4. Check `.agent/CURRENT_STATE.md`.
5. Check `.agent/FEATURES.md`.
6. Check relevant decisions in `.agent/DECISIONS.md`.
7. Check API contracts (`.agent/API_CONTRACTS.md`) if the task involves an API.
8. Check verification requirements (`.agent/VERIFICATION_CHECKLIST.md`).
*Do not modify anything during this inspection stage.*

### STEP 4 — SCOPE EXPANSION PROTECTION
If implementation requires modifying a file that was NOT reasonably included in the original scope:
**STOP. Do NOT silently modify that file.**
Report:
> "The requested change requires an additional file/area outside the current scope."
Explain which file, why it is required, what would be changed, and what risk exists. Wait for user approval.
*(Exception: Automatically generated files or directly unavoidable build artifacts, which must be documented).*

### STEP 5 — BASELINE
Before changing code, establish the current baseline whenever practical:
- Run the smallest relevant checks needed to know whether the affected area currently works.
- Record existing tests, typecheck/build status, and known pre-existing issues so they are not incorrectly attributed to the new change.

### STEP 6 — IMPLEMENTATION
Only after scope and baseline are understood, implement the change following:
- Minimal diff
- No unrelated refactoring or cleanup
- No dependency upgrades
- No architecture changes
- No database changes unless approved
- No API or UI redesign
- No renaming unrelated variables/files
- No unnecessary formatting
- No changing working behavior

---

## PART 2 — HIGH-RISK CHANGE CONTROL

The following systems are classified as **HIGH-RISK**:
- `frontend/src/context/AppContext.tsx`
- `frontend/src/context/AuthContext.tsx`
- Authentication and account isolation systems
- Guest mode & transition logic
- API catch-all routing (`frontend/src/app/api/[...path]/route.ts`)
- Direct database access (`frontend/src/lib/server/db.ts` & `backend/src/services/db.ts`)
- Supabase RLS policies and connection pooler
- IndexedDB storage engine (`frontend/src/services/localDbService.ts`)
- Synchronization & E2EE (`frontend/src/services/syncService.ts`, `cryptoSyncService.ts`)
- AI action execution & tool registry
- Voice / STT streaming & batch pipelines
- Notification infrastructure & rotation bags
- Deployment configuration & environment variables
- Database migrations

If a task touches a high-risk system:
1. Inspect the relevant architecture first.
2. Identify dependencies and regression risks.
3. Make the smallest possible change.
4. Run targeted and regression verification.
5. Never casually rewrite a high-risk subsystem.

---

## PART 3 — DATABASE SAFETY & MIGRATION IMMUTABILITY

Existing applied Supabase migrations (`001` through `023` in `supabase/migrations/`) are **PERMANENT AND IMMUTABLE**.
- NEVER edit, rewrite, delete, reorder, or regenerate historical migrations.
- For a new database schema change: Create the next sequential migration (e.g. `024_<descriptive_name>.sql`).
- Never alter historical migrations to make a new change appear cleaner.
- If a database change was not explicitly requested, **DO NOT MAKE IT**.

---

## PART 4 — VERIFICATION GATE

Follow the multi-level verification standard from `.agent/VERIFICATION_CHECKLIST.md`:

- **LEVEL 0 — Scope Check:** Inspect `git diff` to ensure only approved files and required lines were touched.
- **LEVEL 1 — Static Check:** Inspect syntax, imports, potential null pointers, and unified diff.
- **LEVEL 2 — Typecheck / Build:** Run `npm run build --prefix frontend` / `npm run build --prefix backend` or relevant typechecks. If a check fails, investigate and document whether the issue is pre-existing or introduced.
- **LEVEL 3 — Automated Tests:** Run relevant test scripts (`scripts/test_auth_isolation.ts`, `test_backend_integration.js`, `verify-all-backend.js`). Do not claim tests passed without running them.
- **LEVEL 4 — Real Feature Verification:** Actually execute the affected feature path (UI/API/Storage). Code presence is NOT verification.

---

## PART 5 — REGRESSION VERIFICATION

After verifying the requested feature, check related existing functionality by asking:
> *"What could this change have accidentally broken?"*
Test the realistic dependency chain:
- Planner change -> Dashboard -> Focus/Task tracking -> Local persistence
- Auth change -> Account isolation -> Local data separation -> Session lifecycle
- API change -> Frontend client -> Backend handler -> Database query -> Error states
- Sync change -> Local IndexedDB -> Client encryption -> Relay API -> Decryption

---

## PART 6 — PRODUCTION VERIFICATION

When the task affects production behavior and production access is available:
- Perform a production smoke test on the live deployment (`https://focus-forge-fahimhossain1617-7909s-projects.vercel.app`).
- Production verification must NOT be replaced by local testing.
- If production verification cannot be performed, explicitly state: **"PRODUCTION NOT VERIFIED"**.

---

## PART 7 — COMPLETION STATUS SYSTEM

Every completed task must report exactly one meaningful status:
- **`VERIFIED`**: Implementation completed, required checks passed, affected behavior verified, regression checks passed, no unexplained blocking failures.
- **`IMPLEMENTED — NOT VERIFIED`**: Code was implemented, but required verification checks could not be executed.
- **`PARTIAL`**: Only part of the requested functionality was implemented.
- **`BROKEN`**: Verification demonstrates that the feature fails or causes regressions.
- **`BLOCKED`**: Cannot safely proceed without user input, permission, credentials, or external dependencies.

---

## PART 8 — FORBIDDEN COMPLETION CLAIMS

Never claim:
- "Done"
- "Fixed"
- "Working"
- "Fully implemented"
- "Production ready"
- "100% working"
- "Verified"
unless concrete evidence supports that exact claim. If something could not be tested, state **"NOT VERIFIED"**.

---

## PART 9 — FINAL TASK REPORT STRUCTURE

Every completed task must end with this structured report:
1. **Status:** `VERIFIED` | `IMPLEMENTED — NOT VERIFIED` | `PARTIAL` | `BROKEN` | `BLOCKED`
2. **Requested Change:** What the user asked for.
3. **Files Changed:** Exact list of modified files.
4. **Files Not Changed:** Important protected areas confirmed untouched.
5. **Implementation:** Summary of what actually changed.
6. **Verification Performed:** List of actual commands/tests/checks executed.
7. **Verification Results:** Pass/Fail breakdown for each check.
8. **Regression Checks:** Related functionality that was verified.
9. **Production Verification:** `VERIFIED` or `PRODUCTION NOT VERIFIED`.
10. **Known Issues:** Any remaining issues or caveats.
11. **Memory Updated:** Which `.agent/*` documents were updated.
12. **Scope Deviations:** `NONE` or explanation of approved deviations.

---

## PART 10 — PROJECT MEMORY UPDATE PROTOCOL

After every meaningful completed task, update the appropriate project memory document:
- `PROJECT_CONTEXT.md` — Update only when a fundamental project identity/architecture principle changes.
- `CURRENT_STATE.md` — Update when actual subsystem implementation status changes.
- `FEATURES.md` — Update when a feature's implementation or verified status changes.
- `DECISIONS.md` — Update when an architectural, product, or technical decision is made.
- `SYSTEM_ARCHITECTURE.md` — Update when architecture, boundaries, or data flow change.
- `API_CONTRACTS.md` — Update when an API endpoint, payload, or route contract changes.
- `VERIFICATION_CHECKLIST.md` — Update only when verification standards change.

---

## PART 11 — CHANGE HISTORY

Maintain a concise history of meaningful architectural and behavioral changes in `DECISIONS.md` or `.agent/` control documents. Record: Date, Change, Reason, Affected Area, and Verification Status.

---

## PART 12 — USER APPROVAL BOUNDARIES

The user remains the sole authority for:
- Architecture changes
- Database schema changes
- Major refactoring
- Dependency additions/upgrades
- Security boundary changes
- Authentication and storage changes
- Deployment changes
- Scope expansion

If a request is ambiguous: **STOP AND ASK. Do not guess.**

---

## PART 13 — EMERGENCY / UNEXPECTED DISCOVERY RULE

If an unrelated bug or debt is discovered while working:
**DO NOT fix it automatically.** Report it separately:
> "Found an unrelated issue in [Component/File]. It is outside the current task scope, so I did not modify it."

---

## PART 14 — DO NOT TRUST PREVIOUS AI CLAIMS

Treat all previous AI statements ("already fixed", "working") as unverified until confirmed by current evidence. If documentation conflicts with actual code/runtime behavior, inspect reality and update documentation accordingly.

---

## PART 15 — FINAL PRE-COMPLETION GATE

Before reporting completion, verify:
- [ ] **Scope:** Did I change only what was requested?
- [ ] **Architecture:** Did I preserve existing architecture?
- [ ] **Functionality:** Did I verify the requested behavior?
- [ ] **Regression:** Did I check realistic dependent behavior?
- [ ] **Tests:** Did the relevant tests actually run?
- [ ] **Build:** Did the relevant build/typecheck pass?
- [ ] **Production:** If production matters, was it actually tested?
- [ ] **Memory:** Did I update the correct `.agent/` documents?
- [ ] **Evidence:** Can I show concrete proof for the final claimed status?

If any required answer is NO, **DO NOT claim "VERIFIED"**.
