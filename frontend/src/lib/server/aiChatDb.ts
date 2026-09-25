import { Pool } from 'pg';
import { executeAIAction } from './aiService';

const connectionString = (
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  ''
).replace(/^["']|["']$/g, '').trim();

// Global connection pool instance
declare global {
  // eslint-disable-next-line no-var
  var __focusforge_pg_pool__: Pool | undefined;
}

const pool = global.__focusforge_pg_pool__ || new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== 'production') {
  global.__focusforge_pg_pool__ = pool;
}

export interface ChatSessionRow {
  id: string;
  user_id?: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string | null;
  payload_json?: any;
  created_at: string;
}

export async function getChatSessions(userId: string | null): Promise<ChatSessionRow[]> {
  try {
    let query: string;
    let params: any[];

    if (userId) {
      query = `
        SELECT id, user_id, title, created_at, updated_at
        FROM ai_chat_sessions
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 50
      `;
      params = [userId];
    } else {
      query = `
        SELECT id, user_id, title, created_at, updated_at
        FROM ai_chat_sessions
        WHERE user_id IS NULL
        ORDER BY updated_at DESC
        LIMIT 50
      `;
      params = [];
    }

    const res = await pool.query(query, params);
    return res.rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err: any) {
    console.error('[aiChatDb] getChatSessions error:', err);
    throw err;
  }
}

export function isValidUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function getChatMessages(sessionId: string): Promise<ChatMessageRow[]> {
  try {
    if (!sessionId) {
      return [];
    }
    const res = await pool.query(
      `
      SELECT id, session_id, role, content, intent, payload_json, created_at
      FROM ai_chat_messages
      WHERE session_id::text = $1
      ORDER BY created_at ASC
      `,
      [sessionId]
    );

    return res.rows.map(row => {
      let payload = row.payload_json;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch {}
      }
      return {
        id: row.id,
        session_id: row.session_id,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        intent: row.intent,
        payload_json: payload,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('[aiChatDb] getChatMessages error:', err);
    return [];
  }
}

export async function createChatSession(userId: string | null, title: string = 'New Conversation', customId?: string): Promise<ChatSessionRow> {
  try {
    const isCustomUuid = customId && isValidUuid(customId);
    let res;
    if (isCustomUuid) {
      res = await pool.query(
        `
        INSERT INTO ai_chat_sessions (id, user_id, title, created_at, updated_at)
        VALUES ($1::uuid, $2, $3, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
        RETURNING id, user_id, title, created_at, updated_at
        `,
        [customId, userId || null, title]
      );
    } else {
      res = await pool.query(
        `
        INSERT INTO ai_chat_sessions (id, user_id, title, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
        RETURNING id, user_id, title, created_at, updated_at
        `,
        [userId || null, title]
      );
    }

    const row = res.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  } catch (err) {
    console.error('[aiChatDb] createChatSession exception:', err);
    throw err;
  }
}

export async function updateChatSessionTitle(sessionId: string, title: string): Promise<ChatSessionRow | null> {
  try {
    if (!sessionId) return null;
    const res = await pool.query(
      `
      UPDATE ai_chat_sessions
      SET title = $1, updated_at = NOW()
      WHERE id::text = $2
      RETURNING id, user_id, title, created_at, updated_at
      `,
      [title, sessionId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  } catch (err) {
    console.error('[aiChatDb] updateChatSessionTitle exception:', err);
    return null;
  }
}

export async function addChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  intent?: string | null,
  payload_json?: any
): Promise<ChatMessageRow> {
  try {
    // Ensure parent session exists to avoid foreign key violation
    if (isValidUuid(sessionId)) {
      await pool.query(
        `
        INSERT INTO ai_chat_sessions (id, user_id, title, created_at, updated_at)
        VALUES ($1::uuid, NULL, 'New Conversation', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
        `,
        [sessionId]
      ).catch(() => {});
    }

    const payloadStr = payload_json ? (typeof payload_json === 'string' ? payload_json : JSON.stringify(payload_json)) : null;

    const res = await pool.query(
      `
      INSERT INTO ai_chat_messages (id, session_id, role, content, intent, payload_json, created_at)
      VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5::jsonb, NOW())
      RETURNING id, session_id, role, content, intent, payload_json, created_at
      `,
      [sessionId, role, content, intent || null, payloadStr]
    );

    const row = res.rows[0];

    // Keep session updated_at current
    await pool.query('UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id::text = $1', [sessionId]).catch(() => {});

    return {
      id: row.id,
      session_id: row.session_id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      intent: row.intent,
      payload_json: row.payload_json,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  } catch (err) {
    console.error('[aiChatDb] addChatMessage exception:', err);
    throw err;
  }
}

export async function deleteChatSession(sessionId: string): Promise<boolean> {
  try {
    if (!sessionId) {
      return true;
    }
    // Delete messages first, then session permanently from database
    await pool.query('DELETE FROM ai_chat_messages WHERE session_id::text = $1', [sessionId]);
    await pool.query('DELETE FROM ai_chat_sessions WHERE id::text = $1', [sessionId]);
    return true;
  } catch (err) {
    console.error('[aiChatDb] deleteChatSession exception:', err);
    return false;
  }
}

export async function generateSmartTitle(message: string): Promise<string> {
  try {
    const cleanMsg = message.trim().substring(0, 150);
    const titlePrompt = `Generate a very concise 2-4 word title representing this conversation starter: "${cleanMsg}". If the text is in Bengali or Banglish, return ONLY a natural short title in Bengali script (বাংলা). If English, return English. Return ONLY the title with no quotes and no symbols.`;
    
    const result: any = await executeAIAction('customAi', { prompt: titlePrompt });
    if (result && result.response) {
      let t = result.response.trim().replace(/^["'`]|["'`]$/g, '').trim();
      if (t.length > 40) t = t.substring(0, 40);
      if (t) return t;
    }
  } catch (err) {
    console.warn('[aiChatDb] Title generation failed, using fallback:', err);
  }

  // Graceful fallback
  const firstLine = message.trim().split('\n')[0];
  return firstLine.length > 25 ? firstLine.substring(0, 22) + '...' : firstLine;
}
