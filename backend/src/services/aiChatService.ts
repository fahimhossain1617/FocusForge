import { pool } from './db';

let tablesChecked = false;

async function ensureAiChatTablesExist() {
  if (tablesChecked) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT,
        title TEXT NOT NULL DEFAULT 'New Conversation',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        intent TEXT,
        payload_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON ai_chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);
    `);
    tablesChecked = true;
  } catch (err) {
    console.warn('[aiChatService] Table check notice:', err);
  }
}

export async function getChatSessions(userId: string) {
  await ensureAiChatTablesExist();
  const res = await pool.query(
    'SELECT * FROM ai_chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  return res.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }));
}

export async function getChatMessages(userId: string, sessionId: string) {
  await ensureAiChatTablesExist();
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
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  });
}

export async function createChatSession(userId: string, title: string = 'New Conversation') {
  await ensureAiChatTablesExist();
  const res = await pool.query(
    'INSERT INTO ai_chat_sessions (user_id, title) VALUES ($1, $2) RETURNING *',
    [userId, title]
  );
  const row = res.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function updateChatSessionTitle(sessionId: string, userId: string, title: string) {
  await ensureAiChatTablesExist();
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
  await ensureAiChatTablesExist();
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
  ).catch(() => {});

  const row = res.rows[0];
  return {
    id: row.id,
    session_id: row.session_id,
    role: row.role,
    content: row.content,
    intent: row.intent,
    payload_json: payload_json || null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function deleteChatSession(sessionId: string, userId?: string) {
  await ensureAiChatTablesExist();
  await pool.query('DELETE FROM ai_chat_messages WHERE session_id = $1', [sessionId]);
  if (userId) {
    await pool.query(
      'DELETE FROM ai_chat_sessions WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [sessionId, userId]
    );
  } else {
    await pool.query('DELETE FROM ai_chat_sessions WHERE id = $1', [sessionId]);
  }
  return { success: true };
}

export async function clearAllChatSessions(userId?: string) {
  await ensureAiChatTablesExist();
  if (userId) {
    await pool.query(
      'DELETE FROM ai_chat_messages WHERE session_id IN (SELECT id FROM ai_chat_sessions WHERE user_id = $1)',
      [userId]
    );
    await pool.query('DELETE FROM ai_chat_sessions WHERE user_id = $1', [userId]);
  } else {
    await pool.query(
      'DELETE FROM ai_chat_messages WHERE session_id IN (SELECT id FROM ai_chat_sessions WHERE user_id IS NULL)'
    );
    await pool.query('DELETE FROM ai_chat_sessions WHERE user_id IS NULL');
  }
  return { success: true };
}
