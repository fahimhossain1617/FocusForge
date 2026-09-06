import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getChatSessions(userId: string) {
  const res = await pool.query(
    'SELECT * FROM ai_chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  return res.rows;
}

export async function getChatMessages(userId: string, sessionId: string) {
  // Verify ownership first
  const sessionRes = await pool.query(
    'SELECT id FROM ai_chat_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  if (sessionRes.rows.length === 0) {
    throw new Error('Session not found or unauthorized');
  }

  const res = await pool.query(
    'SELECT * FROM ai_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
    [sessionId]
  );

  return res.rows.map(row => {
    let payload = row.payload_json;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {}
    }
    return {
      id: row.id,
      session_id: row.session_id,
      role: row.role,
      content: row.content,
      intent: row.intent,
      payload_json: payload,
      created_at: row.created_at,
    };
  });
}

export async function createChatSession(userId: string, title: string = 'New Conversation') {
  const res = await pool.query(
    'INSERT INTO ai_chat_sessions (user_id, title) VALUES ($1, $2) RETURNING *',
    [userId, title]
  );
  return res.rows[0];
}

export async function updateChatSessionTitle(sessionId: string, userId: string, title: string) {
  const res = await pool.query(
    'UPDATE ai_chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
    [title, sessionId, userId]
  );
  return res.rows[0];
}

export async function addChatMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  intent?: string,
  payload_json?: any
) {
  // First, verify session ownership
  const sessionRes = await pool.query(
    'SELECT id FROM ai_chat_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  if (sessionRes.rows.length === 0) {
    throw new Error('Session not found or unauthorized');
  }

  const res = await pool.query(
    'INSERT INTO ai_chat_messages (session_id, role, content, intent, payload_json) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [sessionId, role, content, intent || null, payload_json ? JSON.stringify(payload_json) : null]
  );

  // Update session updated_at
  await pool.query(
    'UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = $1',
    [sessionId]
  );

  return res.rows[0];
}

export async function deleteChatSession(sessionId: string, userId: string) {
  await pool.query(
    'DELETE FROM ai_chat_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
  return { success: true };
}

