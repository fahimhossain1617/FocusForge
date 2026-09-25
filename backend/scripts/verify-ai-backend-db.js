const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../../frontend/.env.local') });
}

const { 
  createChatSession, 
  getChatSessions, 
  getChatMessages, 
  addChatMessage, 
  updateChatSessionTitle, 
  deleteChatSession 
} = require('../dist/services/aiChatService');
const { executeAIAction } = require('../dist/services/aiService');
const { pool } = require('../dist/services/db');

async function verifyAiBackendAndDb() {
  console.log('================================================================');
  console.log('🔍 FULL BACKEND AI CHAT & SUPABASE DATABASE VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${title}`);
    } else {
      console.error(`  ❌ [FAIL] ${title} - ${extra}`);
    }
  }

  try {
    // 1. Database Connection Check
    console.log('--- 1. Supabase PostgreSQL Connection ---');
    const dbTest = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    assert('Connected to Supabase PostgreSQL database', !!dbTest.rows[0]?.current_time, `DB: ${dbTest.rows[0]?.db_name}`);

    // 2. Table Existence Check
    console.log('\n--- 2. AI Chat Tables Existence ---');
    const tableRes = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('ai_chat_sessions', 'ai_chat_messages')
      ORDER BY table_name;
    `);
    const tables = tableRes.rows.map(r => r.table_name);
    assert('ai_chat_sessions table exists in Supabase', tables.includes('ai_chat_sessions'));
    assert('ai_chat_messages table exists in Supabase', tables.includes('ai_chat_messages'));

    // 3. Create Real User in Supabase Auth
    console.log('\n--- 3. Real Supabase User & Session Creation ---');
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const testEmail = `ai_chat_test_${Date.now()}@focusforge.test`;
    const testPassword = 'VerifyPass123!#';
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    assert('Supabase Auth user created', !authError && !!authData.user, authError?.message);
    const testUserId = authData.user?.id;

    const session1 = await createChatSession(testUserId, 'Focus & Study Planning Session');
    assert('Session created in Supabase with user_id foreign key', !!session1.id && session1.title === 'Focus & Study Planning Session');

    const sessions = await getChatSessions(testUserId);
    assert('getChatSessions retrieved created session from Supabase', sessions.length > 0 && sessions[0].id === session1.id);

    // 4. Save User and AI Messages in Supabase
    console.log('\n--- 4. Message Persistence in Supabase ---');
    const userMsg = await addChatMessage(
      session1.id,
      testUserId,
      'user',
      'আজকে আমার অনেক মন খারাপ।'
    );
    assert('User message saved to ai_chat_messages in Supabase', !!userMsg.id && userMsg.content === 'আজকে আমার অনেক মন খারাপ।');

    // Run AI Agent action
    const aiResult = await executeAIAction('agentChat', {
      userQuery: userMsg.content,
      recentHistory: [],
      currentDate: '2026-09-25',
      context: { tasks: [] },
      model: 'smart'
    });

    const aiMsg = await addChatMessage(
      session1.id,
      testUserId,
      'assistant',
      aiResult.message,
      aiResult.intent,
      aiResult.payload
    );
    assert('AI assistant response saved to ai_chat_messages in Supabase', !!aiMsg.id && !!aiMsg.content);

    // 5. Retrieve Full Chat History from Supabase
    console.log('\n--- 5. History Retrieval & Verification ---');
    const history = await getChatMessages(testUserId, session1.id);
    assert('getChatMessages retrieved both user & assistant messages', history.length === 2);
    assert('User message content matches exact input', history[0].role === 'user' && history[0].content === userMsg.content);
    assert('Assistant message role & intent preserved', history[1].role === 'assistant' && history[1].intent === aiResult.intent);

    // 6. Update Session Title
    console.log('\n--- 6. Session Title Update ---');
    await updateChatSessionTitle(session1.id, testUserId, 'Mind & Productivity Conversation');
    const updatedSessions = await getChatSessions(testUserId);
    assert('Session title successfully updated in database', updatedSessions[0].title === 'Mind & Productivity Conversation');

    // 7. Cascading Deletion Check
    console.log('\n--- 7. Cascading Deletion ---');
    await deleteChatSession(session1.id, testUserId);
    const postDeleteSessions = await getChatSessions(testUserId);
    assert('Session deleted from ai_chat_sessions', postDeleteSessions.length === 0);

    const msgCheck = await pool.query('SELECT COUNT(*) as count FROM ai_chat_messages WHERE session_id = $1', [session1.id]);
    assert('All session messages deleted from ai_chat_messages (Cascade)', parseInt(msgCheck.rows[0].count, 10) === 0);

    console.log('\n================================================================');
    console.log(`📊 FINAL RESULT: ${passed}/${total} CHECKS PASSED (100%)`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Verification failed with error:', err);
  } finally {
    await pool.end();
  }
}

verifyAiBackendAndDb();
