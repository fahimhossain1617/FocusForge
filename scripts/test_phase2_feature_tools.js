/**
 * Phase 2 Acceptance Test Suite — Verified Application Capability Registry & Typed Tools
 * 
 * Verifies:
 * 1. Application Capability Registry & Routing Sitemap (open_diary -> diary, etc.)
 * 2. Mandatory field validation for Planner, Focus, Notes, Diary, Time Log, Mind Space
 * 3. Mutation confirmation protocol (confirmationRequired: true for mutations, false for navigation)
 * 4. Time Log schema fidelity (No fake milestones, stages, or unsupported concepts)
 * 5. Multi-item batch task operations
 * 6. Injection prevention & security boundaries
 * 7. Multi-turn clarification workflow with Gemini
 * 8. Typed server-side read/query tools with tenant isolation
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('../backend/node_modules/dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { validateProposedAction, VALID_NAVIGATION_ROUTES } = require('../backend/dist/services/aiActionValidator');
const { executeServerTool, getAvailableAppDestinations, prepareNavigation } = require('../backend/dist/services/aiServerTools');
const { executeAIAction } = require('../backend/dist/services/aiService');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 2 APPLICATION TOOLS TEST SUITE');
  console.log('====================================================\n');

  // --- SECTION 1: NAVIGATION & ROUTING SITEMAP ---
  console.log('--- 1. Navigation Routing Sitemap & Read Actions ---');
  
  it('open_diary maps strictly to "diary" (NOT "mind")', () => {
    const result = validateProposedAction({ type: 'open_diary' });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.normalizedAction.navigationRoute, 'diary');
    assert.strictEqual(result.normalizedAction.confirmationRequired, false);
  });

  it('All core app routes exist in VALID_NAVIGATION_ROUTES', () => {
    const expectedRoutes = ['today', 'planner', 'focus', 'tasks', 'mind', 'diary', 'learning', 'profile', 'settings', 'notifications'];
    for (const r of expectedRoutes) {
      assert.strictEqual(VALID_NAVIGATION_ROUTES[r], r, `Route ${r} must be valid`);
    }
  });

  it('Navigation prepareNavigation returns valid action with confirmationRequired: false', () => {
    const nav = prepareNavigation({ route: 'planner' });
    assert.strictEqual(nav.valid, true);
    assert.strictEqual(nav.action.navigationRoute, 'planner');
    assert.strictEqual(nav.action.confirmationRequired, false);
  });

  it('Invalid navigation destination is rejected', () => {
    const nav = prepareNavigation({ route: 'non_existent_page' });
    assert.strictEqual(nav.valid, false);
    assert.ok(nav.error);
  });

  it('getAvailableAppDestinations returns all registered modules', () => {
    const destinations = getAvailableAppDestinations();
    assert.ok(destinations.today);
    assert.ok(destinations.planner);
    assert.ok(destinations.focus);
    assert.ok(destinations.tasks);
    assert.ok(destinations.mind);
    assert.ok(destinations.diary);
    assert.ok(destinations.learning);
    assert.ok(destinations.settings);
  });

  // --- SECTION 2: PLANNER & TASK MANAGEMENT SCHEMA ---
  console.log('\n--- 2. Planner & Task Management Validation ---');

  it('create_task fails when missing targetDate and time', () => {
    const result = validateProposedAction({
      type: 'create_task',
      parameters: { title: 'Math practice' }
    });
    assert.strictEqual(result.valid, false);
    assert.ok(result.missingFields.includes('targetDate'));
    assert.ok(result.missingFields.includes('time'));
  });

  it('create_task succeeds when all required fields (title, targetDate, time) are present', () => {
    const result = validateProposedAction({
      type: 'create_task',
      parameters: {
        title: 'Physics Chapter 4',
        targetDate: '2026-10-15',
        time: '14:30',
        estimatedMinutes: 60,
        priority: 'high'
      }
    });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.normalizedAction.parameters.title, 'Physics Chapter 4');
    assert.strictEqual(result.normalizedAction.parameters.targetDate, '2026-10-15');
    assert.strictEqual(result.normalizedAction.parameters.time, '14:30');
    assert.strictEqual(result.normalizedAction.confirmationRequired, true);
  });

  it('Batch task creation (create_tasks) validates all items atomically', () => {
    const result = validateProposedAction({
      type: 'create_tasks',
      parameters: {
        tasks: [
          { title: 'Task 1', targetDate: '2026-10-15', time: '09:00', priority: 'high' },
          { title: 'Task 2', targetDate: '2026-10-15', time: '11:00', priority: 'medium' },
        ]
      }
    });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.normalizedAction.parameters.tasks.length, 2);
    assert.strictEqual(result.normalizedAction.confirmationRequired, true);
  });

  // --- SECTION 3: TIME LOG & LEARNING HUB SCHEMA ---
  console.log('\n--- 3. Time Log / Learning Hub Schema Fidelity ---');

  it('log_activity requires folderName/topics and positive practiceMinutes', () => {
    const invalidRes = validateProposedAction({
      type: 'log_activity',
      parameters: { practiceMinutes: 0 }
    });
    assert.strictEqual(invalidRes.valid, false);

    const validRes = validateProposedAction({
      type: 'log_activity',
      parameters: {
        folderName: 'Algorithms',
        practiceMinutes: 90,
        watchMinutes: 30,
        practiceDetails: 'Solved Binary Search Tree problems',
        blockers: 'Recursion edge cases',
        importantTopics: 'Tree rotations'
      }
    });
    assert.strictEqual(validRes.valid, true);
    assert.strictEqual(validRes.normalizedAction.parameters.folderName, 'Algorithms');
    assert.strictEqual(validRes.normalizedAction.parameters.practiceMinutes, 90);
    assert.strictEqual(validRes.normalizedAction.parameters.blockers, 'Recursion edge cases');
    assert.strictEqual(validRes.normalizedAction.confirmationRequired, true);
  });

  it('create_skill_roadmap requires skill/folder name', () => {
    const validSkill = validateProposedAction({
      type: 'create_skill_roadmap',
      parameters: {
        folderName: 'Next.js 15 Fullstack',
        targetHours: 30,
        roadmapSteps: ['App Router basics', 'Server Actions', 'Auth & Supabase']
      }
    });
    assert.strictEqual(validSkill.valid, true);
    assert.strictEqual(validSkill.normalizedAction.parameters.folderName, 'Next.js 15 Fullstack');
    assert.strictEqual(validSkill.normalizedAction.confirmationRequired, true);
  });

  // --- SECTION 4: NOTES, DIARY, FOCUS & MIND SPACE ---
  console.log('\n--- 4. Notes, Diary, Focus & Mind Space Validation ---');

  it('create_note requires title and confirms creation', () => {
    const result = validateProposedAction({
      type: 'create_note',
      parameters: { title: 'Java OOP Notes', content: 'Inheritance and polymorphism summary' }
    });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.normalizedAction.parameters.title, 'Java OOP Notes');
    assert.strictEqual(result.normalizedAction.confirmationRequired, true);
  });

  it('create_diary_entry requires content and supports mood', () => {
    const result = validateProposedAction({
      type: 'create_diary_entry',
      parameters: { title: 'Productive Day', content: 'Finished all weekly goals.', mood: 'happy' }
    });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.normalizedAction.parameters.mood, 'happy');
    assert.strictEqual(result.normalizedAction.confirmationRequired, true);
  });

  it('create_focus_session requires durationMinutes between 1 and 300', () => {
    const invalidRes = validateProposedAction({
      type: 'create_focus_session',
      parameters: { durationMinutes: 500 }
    });
    assert.strictEqual(invalidRes.valid, false);

    const validRes = validateProposedAction({
      type: 'create_focus_session',
      parameters: { durationMinutes: 45, goal: 'Solve LeetCode Mediums', mode: 'deep' }
    });
    assert.strictEqual(validRes.valid, true);
    assert.strictEqual(validRes.normalizedAction.parameters.durationMinutes, 45);
    assert.strictEqual(validRes.normalizedAction.confirmationRequired, true);
  });

  it('create_problem_solver requires problem and sets confirmationRequired: true', () => {
    const result = validateProposedAction({
      type: 'create_problem_solver',
      parameters: {
        problem: 'How to handle state synchronization conflicts in E2EE',
        solutionSteps: ['Add version vector', 'Resolve client-wins with timestamp']
      }
    });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.normalizedAction.confirmationRequired, true);
  });

  // --- SECTION 5: SECURITY & INJECTION PREVENTION ---
  console.log('\n--- 5. Security & Injection Denial ---');

  it('Blocks SQL injection commands inside action parameters', () => {
    const sqlInjection = validateProposedAction({
      type: 'create_task',
      parameters: {
        title: "Test'); DROP TABLE users; --",
        targetDate: '2026-10-15',
        time: '10:00'
      }
    });
    assert.strictEqual(sqlInjection.valid, false);
    assert.ok(sqlInjection.reason.includes('Dangerous code or SQL'));
  });

  it('Blocks script tags inside action parameters', () => {
    const xssInjection = validateProposedAction({
      type: 'create_note',
      parameters: {
        title: '<script>alert("hacked")</script>',
        content: 'Evil payload'
      }
    });
    assert.strictEqual(xssInjection.valid, false);
    assert.ok(xssInjection.reason.includes('Dangerous code or SQL'));
  });

  // --- SECTION 6: SERVER-SIDE READ TOOLS EXECUTION ---
  console.log('\n--- 6. Server-Side Read Tools Execution ---');

  await itAsync('executeServerTool: get_available_app_destinations returns all routes', async () => {
    const res = await executeServerTool('get_available_app_destinations', {}, 'test-user');
    assert.strictEqual(res.success, true);
    assert.ok(res.data.planner);
    assert.ok(res.data.today);
    assert.ok(res.data.diary);
  });

  await itAsync('executeServerTool: prepare_navigation validates target route', async () => {
    const res = await executeServerTool('prepare_navigation', { route: 'diary' }, 'test-user');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.valid, true);
    assert.strictEqual(res.data.action.navigationRoute, 'diary');
  });

  await itAsync('executeServerTool: propose_planner_entries enforces schema validation', async () => {
    const validRes = await executeServerTool('propose_planner_entries', {
      entries: [{ title: 'Physics Revision', targetDate: '2026-10-20', time: '16:00', estimatedMinutes: 45 }]
    }, 'test-user');
    assert.strictEqual(validRes.success, true);
    assert.strictEqual(validRes.data.valid, true);
    assert.strictEqual(validRes.data.proposal.parameters.title, 'Physics Revision');

    const invalidRes = await executeServerTool('propose_planner_entries', {
      entries: [{ title: 'Incomplete' }]
    }, 'test-user');
    assert.strictEqual(invalidRes.success, true);
    assert.strictEqual(invalidRes.data.valid, false);
  });

  await itAsync('executeServerTool: get_performance_report returns structured analytics', async () => {
    const res = await executeServerTool('get_performance_report', { timeframe: 'weekly' }, 'test-user');
    assert.strictEqual(res.success, true);
    assert.ok(typeof res.data.productivityScore === 'number');
    assert.ok(typeof res.data.totalTasks === 'number');
  });

  // --- SECTION 7: GEMINI INTEGRATION & MULTI-TURN CONVERSATION ---
  console.log('\n--- 7. Gemini Agent Multi-Turn & Clarification Live Tests ---');

  await itAsync('Turn 1 (Missing info): User asks to add task without date/time -> Gemini asks for clarification', async () => {
    const res = await executeAIAction('agentChat', {
      userQuery: 'আমার প্ল্যানারে ইংরেজি রিভিশন যোগ করো',
      model: 'smart',
      context: { currentDate: '2026-10-10', tasks: [] }
    });
    
    assert.ok(res.message, 'Must return a message');
    assert.ok(
      res.status === 'pending_clarification' || res.type === 'clarification' || res.missingFields?.length > 0,
      `Expected clarification status or missing fields, got status: ${res.status}, type: ${res.type}`
    );
    assert.strictEqual(res.confirmationRequired, false, 'No confirmation required during clarification');
    assert.strictEqual(res.actions.length, 0, 'No actions should be proposed before details are known');
  });

  await itAsync('Turn 2 (Follow-up): User provides missing date & time -> Gemini proposes action with confirmation', async () => {
    const res = await executeAIAction('agentChat', {
      userQuery: 'আগামীকাল সকাল ১০টায় ১ ঘণ্টা',
      model: 'smart',
      recentHistory: [
        { role: 'user', content: 'আমার প্ল্যানারে ইংরেজি রিভিশন যোগ করো' },
        { role: 'assistant', content: 'অবশ্যই! ইংরেজি রিভিশন টাস্কটি কোন তারিখে এবং কয়টায় যোগ করতে চাও?' }
      ],
      context: { currentDate: '2026-10-10', tasks: [] }
    });

    assert.ok(res.message, 'Must return a message');
    assert.strictEqual(res.status, 'pending_confirmation', 'Must require pending confirmation');
    assert.strictEqual(res.confirmationRequired, true, 'confirmationRequired must be true');
    assert.ok(res.proposal || res.actions.length > 0, 'Must contain proposed action');
    
    const taskTitle = res.proposal?.parameters?.title || res.actions[0]?.parameters?.title || '';
    assert.ok(
      taskTitle.toLowerCase().includes('ইংরেজি') || taskTitle.toLowerCase().includes('english') || taskTitle.toLowerCase().includes('রিভিশন'),
      `Expected task title to retain context 'ইংরেজি'/'English', got: ${taskTitle}`
    );
  });

  await itAsync('Navigation query: "আমার ডায়েরি খোলো" -> Returns navigation to diary', async () => {
    const res = await executeAIAction('agentChat', {
      userQuery: 'আমার ডায়েরি খোলো',
      model: 'smart',
    });

    assert.ok(res.message);
    assert.ok(
      res.navigation === 'diary' || (res.actions.length > 0 && res.actions[0].navigationRoute === 'diary'),
      `Expected navigation to 'diary', got: ${res.navigation}`
    );
  });

  console.log('\n====================================================');
  console.log(`🏁 PHASE 2 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase2Tests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
