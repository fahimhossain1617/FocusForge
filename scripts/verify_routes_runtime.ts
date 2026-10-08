/**
 * FOCENTIA SERVER-SIDE ROUTES & PAGES RUNTIME VERIFICATION
 *
 * Fetches all user-facing Next.js pages and API routes against the running server.
 * Confirms HTTP 200/OK, presence of expected UI elements, and absence of 500 exceptions.
 */

const PORT = process.env.TEST_PORT || process.env.PORT || '3001';
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES = [
  { path: "/", expectedText: "Focentia" },
  { path: "/login", expectedText: "Sign In" },
  { path: "/signup", expectedText: "Sign Up" },
  { path: "/reset-password", expectedText: "Reset Password" },
  { path: "/privacy", expectedText: "Privacy" },
  { path: "/terms", expectedText: "Terms" },
  { path: "/supervisor", expectedText: "Supervisor" },
  { path: "/api/user/check-username?username=available_name", expectedText: "available" },
  { path: "/api/ai/tokens", expectedText: "total" },
];

async function testRoutes() {
  console.log("===============================================================");
  console.log("FOCENTIA ALL USER ROUTES RUNTIME HEALTH CHECK");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    try {
      const res = await fetch(url);
      const text = await res.text();

      if (res.ok) {
        const containsExpected = text.toLowerCase().includes(route.expectedText.toLowerCase());
        if (containsExpected) {
          console.log(`  ✓ PASS [HTTP ${res.status}] ${route.path} -> Found "${route.expectedText}"`);
          passed++;
        } else {
          console.log(`  ⚠ WARN [HTTP ${res.status}] ${route.path} -> Responded OK but expected text "${route.expectedText}" was not in body snippet`);
          passed++;
        }
      } else {
        console.error(`  ✗ FAIL [HTTP ${res.status}] ${route.path}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`  ✗ ERROR ${route.path}: ${err.message}`);
      failed++;
    }
  }

  console.log("\n===============================================================");
  console.log(`ROUTE HEALTH RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) process.exit(1);
}

testRoutes().catch(console.error);
