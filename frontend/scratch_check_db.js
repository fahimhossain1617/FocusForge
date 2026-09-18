const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.mvielktfijxecszlqjxz:fahimhossain1314tushar@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres'
});
async function main() {
  const sessionId = '4b596c71-53d2-4f54-a11b-18d2db1cfc86';
  const msgs = await pool.query('SELECT id, session_id, role, content FROM ai_chat_messages WHERE session_id = $1', [sessionId]);
  console.log('Messages for Facing a Problem count:', msgs.rows.length);
  console.log('Messages:', msgs.rows);

  // Check Hello FocusForge session
  const hff = await pool.query("SELECT id, title FROM ai_chat_sessions WHERE title ILIKE '%FocusForge%'");
  console.log('FocusForge sessions:', hff.rows);
  if (hff.rows.length > 0) {
    const hffMsgs = await pool.query('SELECT id, session_id, role, content FROM ai_chat_messages WHERE session_id = $1', [hff.rows[0].id]);
    console.log('Messages for FocusForge count:', hffMsgs.rows.length);
    console.log('Messages:', hffMsgs.rows);
  }
  await pool.end();
}
main().catch(console.error);
