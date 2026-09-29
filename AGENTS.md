<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# STRICT SCOPE & CODE ISOLATION PROTOCOL

1. SCOPE BOUNDARY (CRITICAL):
   - You must modify ONLY the exact file, function, or component necessary to fulfill the user's specific prompt.
   - Do NOT touch, open, or edit any unrelated files under any circumstances.

2. ZERO UNREQUESTED CHANGES:
   - NEVER refactor, reformat, clean up, or optimize existing code outside the requested scope.
   - NEVER rename variables, adjust imports, or change styles in code you were not explicitly asked to change.
   - Do NOT update package versions, configs, or project structures without explicit permission.

3. PRESERVE FUNCTIONALITY:
   - Treat all existing untouched features, logic, and components as immutable and fragile.
   - Ensure your additions do not break, modify, or override pre-existing behaviors.

4. PERMISSION ENFORCEMENT:
   - If completing a task strictly requires changing another file or external dependency, STOP immediately.
   - List the required changes and ask the user for confirmation before touching any additional file.
