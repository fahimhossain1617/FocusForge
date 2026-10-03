# VERIFICATION_CHECKLIST.md — Foscentia Permanent Verification Standard

**Document Version:** 1.1.0  
**Last Updated:** October 2026  
**Status:** Authoritative Verification Protocol

---

## 1. Multi-Level Verification Standard

Every coding task executed on the Foscentia repository must be verified using the highest applicable level:

### Level 0 — Scope Verification
- Confirm that ONLY files and functions within the explicitly requested task scope were modified.
- Run `git status` / `git diff` to ensure zero accidental, unrelated, or reformatted files exist in the work tree.

### Level 1 — Static Verification
- Check syntax, missing imports, unhandled null/undefined variables, and obvious runtime pitfalls in modified files.
- Inspect the complete unified diff before reporting.

### Level 2 — Typecheck & Build Verification
- Run TypeScript typechecks and production builds to ensure zero type errors:
  - Frontend: `npm run build --prefix frontend` (or `next build` / `tsc`)
  - Backend: `npm run build --prefix backend` (or `tsc`)
  - Linting: `npm run lint --prefix frontend`

### Level 3 — Automated Test Verification
- Execute relevant automated test scripts:
  - Auth & Data Isolation: `npx ts-node scripts/test_auth_isolation.ts`
  - Direct Database & Ticket Flow: `node frontend/test_backend_integration.js`
  - Full Backend Endpoints: `node backend/scripts/verify-all-backend.js`
  - Pre-Verification E2E: `node backend/scripts/test_pre_verification_e2e.js`
  - AI Prompts & Gemini Integration: `node backend/scripts/test-agent-prompts.js`

### Level 4 — Feature & Local Runtime Verification
- Start local servers (`npm run dev`) and interactively test the exact feature path modified.
- Verify browser console output for unhandled exceptions or rejected promises.
- Verify that IndexedDB writes commit and database API endpoints respond with 200 OK.

### Level 5 — Regression Verification
- Ask: *"What could this change have accidentally broken?"*
- Verify adjacent features that could be impacted by the change (e.g. if modifying `taskService.ts`, check that `DashboardPage` and `PlannerPage` still load tasks properly).
- Verify that multi-account switching and guest mode transitions remain intact.

### Level 6 — Production Verification
- When the user explicitly requests production verification or when validating deployed environments:
  - Inspect the live Vercel production deployment (`https://focus-forge-fahimhossain1617-7909s-projects.vercel.app`).
  - Verify network requests, SSL headers, and live database responses.
  - If production cannot be accessed, explicitly state: **"PRODUCTION NOT VERIFIED"**.

---

## 2. Completion Status Definitions

Agents must use strictly defined terminology:

- **`VERIFIED`**: Implementation completed, required checks passed, affected behavior verified, regression checks passed where required, no unexplained blocking failures.
- **`IMPLEMENTED — NOT VERIFIED`**: Code was written or inspected, but required verification checks could not be performed.
- **`PARTIAL`**: Only part of the requested functionality was implemented.
- **`BROKEN`**: Evidence demonstrates failure, regression, or unhandled errors.
- **`BLOCKED`**: Cannot safely proceed without user input, permission, credentials, deployment access, or another required dependency.

---

## 3. Strict Reporting Rule

**THE AGENT MUST NEVER CLAIM "VERIFIED", "FIXED", "WORKING", "DONE", OR "100% WORKING" AS PRODUCTION-CORRECT WITHOUT EVIDENCE.**

If any verification level could not be completed, the agent MUST explicitly state:
> **"NOT VERIFIED: [Specific reason why the check could not be run]"**

---

## 4. Pre-Completion Gate Checklist

Before reporting task completion, verify:
- [ ] **Scope:** Did I change only what was requested?
- [ ] **Architecture:** Did I preserve existing architecture?
- [ ] **Functionality:** Did I verify the requested behavior?
- [ ] **Regression:** Did I check realistic dependent behavior?
- [ ] **Tests:** Did the relevant tests actually run?
- [ ] **Build:** Did the relevant build/typecheck pass?
- [ ] **Production:** If production matters, was it actually tested?
- [ ] **Memory:** Did I update the correct `.agent/` documents?
- [ ] **Evidence:** Can I show concrete proof for the final claimed status?
