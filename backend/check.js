const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    // 1. Test Task with all new columns
    const testTask = await pool.query(`
      INSERT INTO tasks (user_id, name, title, status, completed, time, end_time, reminder_enabled, reminder_time, priority, tier, target_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `, [
      '6f977ef4-c341-4312-a897-ea22b9a80d5e',
      'Test Task Backend',
      'Test Task Backend',
      'not_started',
      false,
      '10:00',
      '11:30',
      true,
      '09:45',
      'high',
      'now',
      '2026-09-18'
    ]);
    console.log("Successfully inserted task with new fields:", testTask.rows[0].id, testTask.rows[0].time, testTask.rows[0].end_time);

    await pool.query('DELETE FROM tasks WHERE id = $1', [testTask.rows[0].id]);
    console.log("Successfully deleted test task!");

    // 2. Test AI Chat Session & Messages
    const testSessionId = require('crypto').randomUUID();
    await pool.query(`
      INSERT INTO ai_chat_sessions (id, user_id, title)
      VALUES ($1, $2, $3)
    `, [testSessionId, '6f977ef4-c341-4312-a897-ea22b9a80d5e', 'Test AI Session']);

    await pool.query(`
      INSERT INTO ai_chat_messages (session_id, role, content)
      VALUES ($1, $2, $3)
    `, [testSessionId, 'user', 'Hello AI!']);

    console.log("Successfully inserted session & message");

    // Cascading delete
    await pool.query('DELETE FROM ai_chat_messages WHERE session_id = $1', [testSessionId]);
    await pool.query('DELETE FROM ai_chat_sessions WHERE id = $1', [testSessionId]);
    console.log("Successfully deleted session and its messages!");

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();
