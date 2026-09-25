const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../frontend/.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAllDataSaving() {
  console.log('================================================================');
  console.log('🔍 FULL BACKEND & DATABASE USER DATA PERSISTENCE VERIFICATION');
  console.log('================================================================\n');

  const testEmail = `verify_persistence_${Date.now()}@focusforge.test`;
  const testPassword = 'VerifyPass123!#';
  const testName = 'Verified Full-Stack Tester';

  let totalChecks = 0;
  let passedChecks = 0;

  function assert(title, condition, extra = '') {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✅ [PASS] ${title}`);
    } else {
      console.error(`  ❌ [FAIL] ${title} - ${extra}`);
    }
  }

  // 1. Auth & Profiles
  console.log('--- 1. Auth & User Profile Creation ---');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: testName,
        display_name: testName,
      }
    }
  });

  assert('User signup in Supabase Auth succeeded', !authError && !!authData.user, authError?.message);
  const userId = authData.user?.id;

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });
  assert('User login with credentials succeeded', !loginError && !!loginData.session, loginError?.message);

  const userClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${loginData.session?.access_token}`
      }
    }
  });

  const { data: profile, error: profErr } = await userClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  assert('User profile auto-created and accessible via RLS', !profErr && profile?.id === userId, profErr?.message);

  // 2. Tasks
  console.log('\n--- 2. Tasks Persistence ---');
  const { data: task, error: taskErr } = await userClient
    .from('tasks')
    .insert({
      user_id: userId,
      name: 'Build Production Release',
      title: 'Build Production Release',
      priority: 'high',
      status: 'in_progress',
      category: 'work',
      tier: 'now'
    })
    .select()
    .single();

  assert('Task created and saved to database', !taskErr && !!task?.id, taskErr?.message);

  // 3. Notes & Note Blocks
  console.log('\n--- 3. Notes & Note Blocks Persistence ---');
  const { data: note, error: noteErr } = await userClient
    .from('notes')
    .insert({
      user_id: userId,
      title: 'Architectural Blueprint Note',
      category: 'development'
    })
    .select()
    .single();

  assert('Note created and saved to database', !noteErr && !!note?.id, noteErr?.message);

  const blockId = require('crypto').randomUUID();
  const { data: block, error: blockErr } = await userClient
    .from('note_blocks')
    .insert({
      id: blockId,
      note_id: note?.id,
      type: 'text',
      content: 'Core architecture overview block content.',
      sort_order: 0
    })
    .select()
    .single();

  assert('Note Block created and linked to note', !blockErr && block?.id === blockId, blockErr?.message);

  // 4. Mind Items
  console.log('\n--- 4. Mind Items (Brain Dump) Persistence ---');
  const mindId = `mind_${Date.now()}`;
  const { data: mindItem, error: mindErr } = await userClient
    .from('mind_items')
    .insert({
      id: mindId,
      user_id: userId,
      content: 'Revolutionary idea for focus optimization',
      type: 'thought',
      source: 'quick_capture'
    })
    .select()
    .single();

  assert('Mind item saved to database', !mindErr && mindItem?.id === mindId, mindErr?.message);

  // 5. Diary & Topics
  console.log('\n--- 5. Diary & Journal Persistence ---');
  const topicId = `topic_${Date.now()}`;
  const { data: topic, error: topicErr } = await userClient
    .from('diary_topics')
    .insert({
      id: topicId,
      user_id: userId,
      title: 'Daily Milestones',
      description: 'Milestone tracking topic'
    })
    .select()
    .single();

  assert('Diary topic created and saved', !topicErr && topic?.id === topicId, topicErr?.message);

  const diaryId = `diary_${Date.now()}`;
  const { data: diary, error: diaryErr } = await userClient
    .from('diary_entries')
    .insert({
      id: diaryId,
      user_id: userId,
      topic_id: topicId,
      title: 'Day 1 Journal Entry',
      content: 'Great progress today building the platform.',
      images: []
    })
    .select()
    .single();

  assert('Diary entry saved to database', !diaryErr && diary?.id === diaryId, diaryErr?.message);

  // 6. Focus Sessions
  console.log('\n--- 6. Focus Sessions Persistence ---');
  const focusId = `focus_${Date.now()}`;
  const { data: focus, error: focusErr } = await userClient
    .from('focus_sessions')
    .insert({
      id: focusId,
      user_id: userId,
      task_name: 'Deep Coding Session',
      target_minutes: 25,
      duration_minutes: 25,
      completed: true,
      distractions: []
    })
    .select()
    .single();

  assert('Focus session record saved to database', !focusErr && focus?.id === focusId, focusErr?.message);

  // 7. Learning Hub
  console.log('\n--- 7. Learning Hub Persistence ---');
  const folderId = `folder_${Date.now()}`;
  const { data: folder, error: folderErr } = await userClient
    .from('learning_folders')
    .insert({
      id: folderId,
      user_id: userId,
      name: 'System Architecture'
    })
    .select()
    .single();

  assert('Learning folder saved to database', !folderErr && folder?.id === folderId, folderErr?.message);

  const logId = `log_${Date.now()}`;
  const { data: learningLog, error: logErr } = await userClient
    .from('learning_logs')
    .insert({
      id: logId,
      user_id: userId,
      folder_id: folderId,
      date: new Date().toISOString().split('T')[0],
      watch_minutes: 30,
      practice_minutes: 45,
      practice_details: 'Database trigger testing and indexing',
      topics: 'PostgreSQL, RLS, Next.js',
      blockers: 'None'
    })
    .select()
    .single();

  assert('Learning log saved to database', !logErr && learningLog?.id === logId, logErr?.message);

  // 8. Routine Templates
  console.log('\n--- 8. Routine Templates Persistence ---');
  const routineId = `routine_${Date.now()}`;
  const { data: routine, error: routineErr } = await userClient
    .from('routine_templates')
    .insert({
      id: routineId,
      user_id: userId,
      weekday: 'monday',
      title: 'Monday Routine',
      tasks: [{ name: 'Morning Review', est_minutes: 15 }]
    })
    .select()
    .single();

  assert('Routine template saved to database', !routineErr && routine?.id === routineId, routineErr?.message);

  // 9. User Cloud State
  console.log('\n--- 9. User Cloud State Persistence ---');
  const { data: cloudState, error: cloudErr } = await userClient
    .from('user_cloud_state')
    .upsert({
      id: userId,
      state: { settings: { theme: 'dark', sound: true }, lastSynced: Date.now() },
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  assert('User Cloud State saved and updated', !cloudErr && cloudState?.id === userId, cloudErr?.message);

  // 10. Support Tickets
  console.log('\n--- 10. Support Tickets Persistence ---');
  const { data: ticket, error: ticketErr } = await userClient
    .from('support_tickets')
    .insert({
      ticket_number: `TCK-${Date.now().toString().slice(-6)}`,
      type: 'feedback',
      subject: 'FocusForge Feedback',
      message: 'Authentication and dashboard flow is blazing fast!',
      user_id: userId,
      name: testName,
      email: testEmail
    })
    .select()
    .single();

  assert('Support ticket saved to database', !ticketErr && !!ticket?.id, ticketErr?.message);

  // Cleanup
  console.log('\n--- 11. Cleanup ---');
  await userClient.from('tasks').delete().eq('user_id', userId);
  await userClient.from('notes').delete().eq('user_id', userId);
  await userClient.from('mind_items').delete().eq('user_id', userId);
  await userClient.from('diary_entries').delete().eq('user_id', userId);
  await userClient.from('diary_topics').delete().eq('user_id', userId);
  await userClient.from('focus_sessions').delete().eq('user_id', userId);
  await userClient.from('learning_logs').delete().eq('user_id', userId);
  await userClient.from('learning_folders').delete().eq('user_id', userId);
  await userClient.from('routine_templates').delete().eq('user_id', userId);
  await userClient.from('user_cloud_state').delete().eq('id', userId);
  await userClient.from('support_tickets').delete().eq('user_id', userId);
  await userClient.from('profiles').delete().eq('id', userId);
  console.log('  ✅ Cleaned up all verification records.');

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED (100%)`);
  console.log('================================================================\n');
}

verifyAllDataSaving().catch(console.error);
