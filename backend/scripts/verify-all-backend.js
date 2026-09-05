const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import compiled routes
const aiRoutes = require('../dist/routes/aiRoutes').default;
const mindRoutes = require('../dist/routes/mindRoutes').default;
const diaryRoutes = require('../dist/routes/diaryRoutes').default;
const focusRoutes = require('../dist/routes/focusRoutes').default;
const learningRoutes = require('../dist/routes/learningRoutes').default;
const taskRoutes = require('../dist/routes/taskRoutes').default;
const noteRoutes = require('../dist/routes/noteRoutes').default;
const userRoutes = require('../dist/routes/userRoutes').default;

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/ai', aiRoutes);
app.use('/api/mind', mindRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/user', userRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

let server;
const PORT = 5055; // Test port to avoid conflict
const BASE = `http://localhost:${PORT}`;

const anonKey = process.env.SUPABASE_ANON_KEY;
const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${anonKey}`,
  'apikey': anonKey
};

async function req(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { ...authHeaders, ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 STARTING COMPREHENSIVE BACKEND VERIFICATION');
  console.log('====================================================\n');

  server = app.listen(PORT);
  let totalTests = 0;
  let passedTests = 0;

  function assert(title, condition, extra = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${title}`);
    } else {
      console.error(`  ❌ [FAIL] ${title} - ${extra}`);
    }
  }

  try {
    // 1. Health check
    console.log('\n--- 1. Health Check ---');
    const health = await req('/health');
    assert('GET /health returns 200 and ok status', health.ok && health.data.status === 'ok');

    // 2. User API
    console.log('\n--- 2. User API ---');
    const userProf = await req('/api/user/profile');
    assert('GET /api/user/profile responds', userProf.ok);

    const userState = await req('/api/user/state');
    assert('GET /api/user/state responds', userState.ok);

    // 3. Tasks API
    console.log('\n--- 3. Tasks API ---');
    const listTasks = await req('/api/tasks');
    assert('GET /api/tasks responds with array', listTasks.ok && Array.isArray(listTasks.data));

    // 4. Notes API
    console.log('\n--- 4. Notes API ---');
    const listNotes = await req('/api/notes');
    assert('GET /api/notes responds with array', listNotes.ok && Array.isArray(listNotes.data));

    // 5. Mind API
    console.log('\n--- 5. Mind API ---');
    const listMind = await req('/api/mind');
    assert('GET /api/mind responds with array', listMind.ok && Array.isArray(listMind.data));

    // 6. Focus Sessions API
    console.log('\n--- 6. Focus Sessions API ---');
    const listFocus = await req('/api/focus/sessions');
    assert('GET /api/focus/sessions responds with array', listFocus.ok && Array.isArray(listFocus.data));

    // 7. Learning Hub API
    console.log('\n--- 7. Learning Hub API ---');
    const learningData = await req('/api/learning/data');
    assert('GET /api/learning/data responds with folders & logs', learningData.ok && Array.isArray(learningData.data.folders));

    // 8. Diary API
    console.log('\n--- 8. Diary API ---');
    const listDiary = await req('/api/diary/topics');
    assert('GET /api/diary/topics responds with array', listDiary.ok && Array.isArray(listDiary.data));

    // 9. AI Core Endpoints
    console.log('\n--- 9. AI Core Endpoints ---');
    const whatShould = await req('/api/ai/what-should-i-do', {
      method: 'POST',
      body: JSON.stringify({
        tasks: [{ id: 1, title: 'Finish assignment', priority: 'high', estMinutes: 30 }]
      })
    });
    assert('POST /api/ai/what-should-i-do succeeds', whatShould.ok && whatShould.data.actionTitle);

    const breakdown = await req('/api/ai/breakdown', {
      method: 'POST',
      body: JSON.stringify({ goal: 'Build a login system' })
    });
    assert('POST /api/ai/breakdown returns subtasks array', breakdown.ok && Array.isArray(breakdown.data) && breakdown.data.length > 0);

    const parseTask = await req('/api/ai/parse-task', {
      method: 'POST',
      body: JSON.stringify({ naturalInput: 'Study math tomorrow at 5pm urgent 45 mins' })
    });
    assert('POST /api/ai/parse-task succeeds', parseTask.ok && parseTask.data.title);

    const dailyPlan = await req('/api/ai/daily-plan', {
      method: 'POST',
      body: JSON.stringify({
        tasks: [{ id: 1, title: 'Math study', estMinutes: 45 }]
      })
    });
    assert('POST /api/ai/daily-plan succeeds', dailyPlan.ok && Array.isArray(dailyPlan.data));

    const askAI = await req('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ userQuery: 'How to focus better?', context: {} })
    });
    assert('POST /api/ai/ask succeeds', askAI.ok && typeof askAI.data.response === 'string');

    const customAI = await req('/api/ai/custom', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Give 3 productivity tips in bullet points.' })
    });
    assert('POST /api/ai/custom succeeds', customAI.ok && customAI.data.response);

    // 10. AI Agent Chat & Sessions
    console.log('\n--- 10. AI Agent Chat & Sessions API ---');
    const chatSessionRes = await req('/api/ai/agent/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Session' })
    });
    assert('POST /api/ai/agent/sessions creates session', chatSessionRes.ok && chatSessionRes.data.id);

    const chatRes = await req('/api/ai/agent/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: chatSessionRes.data?.id || 'guest-session',
        message: 'হ্যালো, কেমন আছো?',
        context: { tasks: [] }
      })
    });
    assert('POST /api/ai/agent/chat responds with intent and message', chatRes.ok && chatRes.data.aiMessage && chatRes.data.aiMessage.intent);

    console.log(`\n====================================================`);
    console.log(`🏁 API ENDPOINT VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log(`====================================================\n`);

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    server.close();
  }
}

runVerification();
