import { Pool } from 'pg';

const connectionString = (
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  ''
).replace(/^["']|["']$/g, '').trim();

const isSsl = connectionString.includes('supabase') ||
  connectionString.includes('pooler') ||
  connectionString.includes('neon.tech') ||
  process.env.PGSSLMODE === 'require';

export const pool = global.__focusforge_pg_pool__ || new Pool({
  connectionString: connectionString || undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isSsl ? { rejectUnauthorized: false } : undefined,
});

if (process.env.NODE_ENV !== 'production') {
  global.__focusforge_pg_pool__ = pool;
}

// ==================== TASKS ====================

export function mapTaskRow(row: any) {
  const targetDateStr = row.target_date
    ? (typeof row.target_date === 'string'
        ? (row.target_date.includes('T') ? row.target_date.split('T')[0] : row.target_date)
        : new Date(row.target_date).toISOString().split('T')[0])
    : '';

  return {
    id: row.id,
    name: row.name || row.title || '',
    title: row.title || row.name || '',
    description: row.description || '',
    targetDate: targetDateStr,
    date: targetDateStr,
    time: row.time || '',
    endTime: row.end_time || '',
    priority: row.priority || 'medium',
    estHours: row.est_hours || 0,
    estMinutes: row.est_minutes || 0,
    status: row.status || 'not_started',
    completed: row.completed ?? (row.status === 'completed'),
    reminderEnabled: row.reminder_enabled ?? false,
    reminderTime: row.reminder_time || '',
    category: row.category || '',
    notes: row.notes || '',
    tier: row.tier || 'now',
    sourceType: row.source_type || 'custom',
    sourceRoutineId: row.source_routine_id || undefined,
    sourceRoutineTaskId: row.source_routine_task_id || undefined,
    importedAt: row.imported_at ? new Date(row.imported_at).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function dbGetTasks(userId: string | null, date?: string, status?: string) {
  if (!userId) return [];
  let query = 'SELECT * FROM tasks WHERE user_id = $1';
  const params: any[] = [userId];

  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }
  query += ' ORDER BY created_at DESC';

  const res = await pool.query(query, params);
  let tasks = res.rows.map(mapTaskRow);

  if (date) {
    tasks = tasks.filter((t) => t.targetDate === date || t.date === date);
  }
  return tasks;
}

export async function dbUpsertTask(userId: string, body: any) {
  const {
    id,
    name,
    title,
    description,
    targetDate,
    date,
    time,
    endTime,
    priority = 'medium',
    estHours = 0,
    estMinutes = 0,
    status = 'not_started',
    completed,
    reminderEnabled = false,
    reminderTime,
    category = '',
    notes = '',
    tier = 'now',
    sourceType = 'custom',
    sourceRoutineId = null,
    sourceRoutineTaskId = null,
    importedAt = null,
  } = body;

  const taskTitle = (title || name || '').trim();
  if (!taskTitle) throw new Error('Task title or name is required');

  const validStatus = ['not_started', 'in_progress', 'completed'].includes(status)
    ? status
    : (status === 'pending' ? 'not_started' : 'not_started');
  const isCompleted = completed !== undefined ? Boolean(completed) : validStatus === 'completed';

  const validPriority = ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium';
  const validTier = ['now', 'next', 'later'].includes(tier) ? tier : 'now';
  const targetDateVal = targetDate || date || null;

  if (id && typeof id === 'number') {
    const res = await pool.query(
      `
      INSERT INTO tasks (
        id, user_id, name, title, description, target_date, time, end_time,
        priority, est_hours, est_minutes, status, completed, reminder_enabled, reminder_time,
        category, notes, tier, source_type, source_routine_id, source_routine_task_id, imported_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        target_date = EXCLUDED.target_date,
        time = EXCLUDED.time,
        end_time = EXCLUDED.end_time,
        priority = EXCLUDED.priority,
        est_hours = EXCLUDED.est_hours,
        est_minutes = EXCLUDED.est_minutes,
        status = EXCLUDED.status,
        completed = EXCLUDED.completed,
        reminder_enabled = EXCLUDED.reminder_enabled,
        reminder_time = EXCLUDED.reminder_time,
        category = EXCLUDED.category,
        notes = EXCLUDED.notes,
        tier = EXCLUDED.tier,
        source_type = EXCLUDED.source_type,
        source_routine_id = EXCLUDED.source_routine_id,
        source_routine_task_id = EXCLUDED.source_routine_task_id,
        imported_at = EXCLUDED.imported_at,
        updated_at = NOW()
      WHERE tasks.user_id = $2
      RETURNING *;
      `,
      [
        id, userId, taskTitle, taskTitle, description || null, targetDateVal, time || null, endTime || null,
        validPriority, Number(estHours) || 0, Number(estMinutes) || 0, validStatus, isCompleted, Boolean(reminderEnabled), reminderTime || null,
        category || null, notes || null, validTier, sourceType || 'custom', sourceRoutineId || null, sourceRoutineTaskId || null, importedAt || null,
      ]
    );
    return mapTaskRow(res.rows[0]);
  }

  const res = await pool.query(
    `
    INSERT INTO tasks (
      user_id, name, title, description, target_date, time, end_time,
      priority, est_hours, est_minutes, status, completed, reminder_enabled, reminder_time,
      category, notes, tier, source_type, source_routine_id, source_routine_task_id, imported_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21, NOW()
    )
    RETURNING *;
    `,
    [
      userId, taskTitle, taskTitle, description || null, targetDateVal, time || null, endTime || null,
      validPriority, Number(estHours) || 0, Number(estMinutes) || 0, validStatus, isCompleted, Boolean(reminderEnabled), reminderTime || null,
      category || null, notes || null, validTier, sourceType || 'custom', sourceRoutineId || null, sourceRoutineTaskId || null, importedAt || null,
    ]
  );
  return mapTaskRow(res.rows[0]);
}

export async function dbUpdateTask(userId: string, taskId: number, body: any) {
  const fields: string[] = [];
  const params: any[] = [userId, taskId];

  const fieldMap: Record<string, string> = {
    title: 'title',
    name: 'name',
    description: 'description',
    targetDate: 'target_date',
    date: 'target_date',
    time: 'time',
    endTime: 'end_time',
    priority: 'priority',
    estHours: 'est_hours',
    estMinutes: 'est_minutes',
    status: 'status',
    completed: 'completed',
    reminderEnabled: 'reminder_enabled',
    reminderTime: 'reminder_time',
    category: 'category',
    notes: 'notes',
    tier: 'tier',
    sourceType: 'source_type',
    sourceRoutineId: 'source_routine_id',
    sourceRoutineTaskId: 'source_routine_task_id',
    importedAt: 'imported_at',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) {
      params.push(body[key]);
      fields.push(`${col} = $${params.length}`);
    }
  }

  // Synchronize status and completed if only one is passed
  if (body.status !== undefined && body.completed === undefined) {
    params.push(body.status === 'completed');
    fields.push(`completed = $${params.length}`);
  } else if (body.completed !== undefined && body.status === undefined) {
    params.push(body.completed ? 'completed' : 'not_started');
    fields.push(`status = $${params.length}`);
  }

  fields.push('updated_at = NOW()');

  const query = `
    UPDATE tasks 
    SET ${fields.join(', ')} 
    WHERE user_id = $1 AND id = $2 
    RETURNING *;
  `;

  const res = await pool.query(query, params);
  if (res.rows.length === 0) throw new Error('Task not found');
  return mapTaskRow(res.rows[0]);
}

export async function dbDeleteTask(userId: string, taskId: number) {
  await pool.query('DELETE FROM tasks WHERE user_id = $1 AND id = $2', [userId, taskId]);
  return { success: true, id: taskId };
}

// ==================== ROUTINE TEMPLATES ====================

export function mapRoutineTemplateRow(row: any) {
  let tasks = row.tasks;
  if (typeof tasks === 'string') {
    try { tasks = JSON.parse(tasks); } catch { tasks = []; }
  }
  return {
    id: row.id,
    weekday: row.weekday,
    title: row.title || '',
    tasks: Array.isArray(tasks) ? tasks : [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function dbGetRoutineTemplates(userId: string | null) {
  if (!userId) return [];
  const res = await pool.query(
    'SELECT * FROM routine_templates WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );
  return res.rows.map(mapRoutineTemplateRow);
}

export async function dbUpsertRoutineTemplate(userId: string, body: any) {
  const { id, weekday, title = '', tasks = [] } = body;
  if (!weekday) throw new Error('Weekday is required');

  const validWeekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const normWeekday = weekday.toLowerCase();
  if (!validWeekdays.includes(normWeekday)) throw new Error('Invalid weekday');

  const templateId = id || `tpl_${normWeekday}_${Date.now()}`;
  const tasksJson = JSON.stringify(Array.isArray(tasks) ? tasks : []);

  const res = await pool.query(
    `
    INSERT INTO routine_templates (id, user_id, weekday, title, tasks, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
    ON CONFLICT (user_id, weekday) DO UPDATE SET
      title = EXCLUDED.title,
      tasks = EXCLUDED.tasks,
      updated_at = NOW()
    RETURNING *;
    `,
    [templateId, userId, normWeekday, (title || '').trim(), tasksJson]
  );

  return mapRoutineTemplateRow(res.rows[0]);
}

export async function dbDeleteRoutineTemplate(userId: string, templateId: string) {
  await pool.query('DELETE FROM routine_templates WHERE user_id = $1 AND id = $2', [userId, templateId]);
  return { success: true, id: templateId };
}

// ==================== NOTES ====================

export function mapNoteRow(row: any) {
  let blocks = row.blocks;
  let attachments = row.attachments;
  let links = row.links;

  if (typeof blocks === 'string') { try { blocks = JSON.parse(blocks); } catch { blocks = []; } }
  if (typeof attachments === 'string') { try { attachments = JSON.parse(attachments); } catch { attachments = []; } }
  if (typeof links === 'string') { try { links = JSON.parse(links); } catch { links = []; } }

  return {
    id: typeof row.id === 'string' ? parseInt(row.id, 10) || Date.now() : row.id,
    title: row.title || '',
    category: row.category || undefined,
    blocks: Array.isArray(blocks) ? blocks : [],
    attachments: Array.isArray(attachments) ? attachments : [],
    links: Array.isArray(links) ? links : [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function dbGetNotes(userId: string | null) {
  if (!userId) return [];
  const res = await pool.query('SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
  return res.rows.map(mapNoteRow);
}

export async function dbUpsertNote(userId: string, body: any) {
  const { id, title = 'Untitled Note', category = '', blocks = [], attachments = [], links = [] } = body;
  const blocksJson = JSON.stringify(Array.isArray(blocks) ? blocks : []);
  const attachJson = JSON.stringify(Array.isArray(attachments) ? attachments : []);
  const linksJson = JSON.stringify(Array.isArray(links) ? links : []);

  if (id && (typeof id === 'number' || !isNaN(parseInt(id, 10)))) {
    const numId = typeof id === 'number' ? id : parseInt(id, 10);
    const res = await pool.query(
      `
      INSERT INTO notes (id, user_id, title, category, blocks, attachments, links, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        blocks = EXCLUDED.blocks,
        attachments = EXCLUDED.attachments,
        links = EXCLUDED.links,
        updated_at = NOW()
      WHERE notes.user_id = $2
      RETURNING *;
      `,
      [numId, userId, title, category || null, blocksJson, attachJson, linksJson]
    );
    return mapNoteRow(res.rows[0]);
  }

  const res = await pool.query(
    `
    INSERT INTO notes (user_id, title, category, blocks, attachments, links, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, NOW(), NOW())
    RETURNING *;
    `,
    [userId, title, category || null, blocksJson, attachJson, linksJson]
  );
  return mapNoteRow(res.rows[0]);
}

export async function dbUpdateNote(userId: string, noteId: number, body: any) {
  const fields: string[] = [];
  const params: any[] = [userId, noteId];

  if (body.title !== undefined) { params.push(body.title); fields.push(`title = $${params.length}`); }
  if (body.category !== undefined) { params.push(body.category); fields.push(`category = $${params.length}`); }
  if (body.blocks !== undefined) { params.push(JSON.stringify(body.blocks)); fields.push(`blocks = $${params.length}::jsonb`); }
  if (body.attachments !== undefined) { params.push(JSON.stringify(body.attachments)); fields.push(`attachments = $${params.length}::jsonb`); }
  if (body.links !== undefined) { params.push(JSON.stringify(body.links)); fields.push(`links = $${params.length}::jsonb`); }

  fields.push('updated_at = NOW()');

  const query = `UPDATE notes SET ${fields.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *;`;
  const res = await pool.query(query, params);
  if (res.rows.length === 0) throw new Error('Note not found');
  return mapNoteRow(res.rows[0]);
}

export async function dbDeleteNote(userId: string, noteId: number) {
  await pool.query('DELETE FROM notes WHERE user_id = $1 AND id = $2', [userId, noteId]);
  return { success: true, id: noteId };
}

// ==================== MIND ITEMS ====================

export async function dbGetMindItems(userId: string | null) {
  if (!userId) return [];
  const res = await pool.query('SELECT * FROM mind_items WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return res.rows.map((row) => ({
    id: row.id,
    content: row.content,
    type: row.type || 'thought',
    source: row.source || 'home',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : undefined,
  }));
}

export async function dbUpsertMindItem(userId: string, body: any) {
  const { id, content, type = 'thought', source = 'home', createdAt, processedAt } = body;
  if (!content || typeof content !== 'string') throw new Error('Content is required');

  const itemId = id || `mind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const res = await pool.query(
    `
    INSERT INTO mind_items (id, user_id, content, type, source, created_at, processed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      content = EXCLUDED.content,
      type = EXCLUDED.type,
      source = EXCLUDED.source,
      processed_at = EXCLUDED.processed_at
    WHERE mind_items.user_id = $2
    RETURNING *;
    `,
    [itemId, userId, content.trim(), type, source, createdAt || new Date(), processedAt || null]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    content: row.content,
    type: row.type,
    source: row.source,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : undefined,
  };
}

export async function dbDeleteMindItem(userId: string, id: string) {
  await pool.query('DELETE FROM mind_items WHERE user_id = $1 AND id = $2', [userId, id]);
  return { success: true, id };
}

export async function dbDeleteAllMindItems(userId: string) {
  await pool.query('DELETE FROM mind_items WHERE user_id = $1', [userId]);
  return { success: true };
}

// ==================== FOCUS SESSIONS ====================

export function mapFocusSessionRow(row: any) {
  let distractions = row.distractions;
  if (typeof distractions === 'string') {
    try { distractions = JSON.parse(distractions); } catch { distractions = []; }
  }
  return {
    id: row.id,
    taskId: row.task_id ? Number(row.task_id) : undefined,
    taskName: row.task_name,
    category: row.category || undefined,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : new Date().toISOString(),
    endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : undefined,
    targetMinutes: row.target_minutes || 25,
    durationMinutes: row.duration_minutes || 0,
    completed: row.completed ?? false,
    distractions: Array.isArray(distractions) ? distractions : [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function dbGetFocusSessions(userId: string | null) {
  if (!userId) return [];
  const res = await pool.query('SELECT * FROM focus_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 100', [userId]);
  return res.rows.map(mapFocusSessionRow);
}

export async function dbUpsertFocusSession(userId: string, body: any) {
  const { id, taskId, taskName, category = 'Focus Session', startedAt, targetMinutes = 25 } = body;
  if (!taskName) throw new Error('Task name is required');

  const sessionId = id || `focus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const res = await pool.query(
    `
    INSERT INTO focus_sessions (id, user_id, task_id, task_name, category, started_at, target_minutes, duration_minutes, completed, distractions)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, false, '[]'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      task_name = EXCLUDED.task_name,
      category = EXCLUDED.category
    RETURNING *;
    `,
    [sessionId, userId, taskId || null, taskName.trim(), category, startedAt || new Date(), targetMinutes]
  );
  return mapFocusSessionRow(res.rows[0]);
}

export async function dbEndFocusSession(userId: string, sessionId: string, durationMinutes: number, completed: boolean, endedAt?: string) {
  const res = await pool.query(
    `
    UPDATE focus_sessions 
    SET duration_minutes = $1, completed = $2, ended_at = $3
    WHERE user_id = $4 AND id = $5
    RETURNING *;
    `,
    [durationMinutes, completed, endedAt || new Date(), userId, sessionId]
  );
  if (res.rows.length === 0) throw new Error('Session not found');
  return mapFocusSessionRow(res.rows[0]);
}

export async function dbAddDistraction(userId: string, sessionId: string, distraction: any) {
  const distractionJson = JSON.stringify([distraction]);
  const res = await pool.query(
    `
    UPDATE focus_sessions
    SET distractions = distractions || $1::jsonb
    WHERE user_id = $2 AND id = $3
    RETURNING *;
    `,
    [distractionJson, userId, sessionId]
  );
  if (res.rows.length === 0) throw new Error('Session not found');
  return mapFocusSessionRow(res.rows[0]);
}

// ==================== MY DIARY ====================

export async function dbGetDiaryTopics(userId: string | null) {
  if (!userId) return [];
  const topicsRes = await pool.query('SELECT * FROM diary_topics WHERE user_id = $1 ORDER BY sort_order ASC', [userId]);
  const entriesRes = await pool.query('SELECT * FROM diary_entries WHERE user_id = $1 ORDER BY created_at ASC', [userId]);

  return topicsRes.rows.map((t) => {
    const topicEntries = entriesRes.rows
      .filter((e) => e.topic_id === t.id)
      .map((e) => {
        let imgs = e.images;
        if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
        return {
          id: e.id,
          title: e.title || '',
          content: e.content || '',
          images: Array.isArray(imgs) ? imgs : [],
          createdAt: e.created_at ? new Date(e.created_at).toISOString() : new Date().toISOString(),
          updatedAt: e.updated_at ? new Date(e.updated_at).toISOString() : new Date().toISOString(),
        };
      });

    return {
      id: t.id,
      order: t.sort_order,
      title: t.title,
      description: t.description || undefined,
      createdAt: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
      updatedAt: t.updated_at ? new Date(t.updated_at).toISOString() : new Date().toISOString(),
      entries: topicEntries,
    };
  });
}

export async function dbUpsertDiaryTopic(userId: string, body: any) {
  const { id, title, description, order = 0 } = body;
  if (!title) throw new Error('Title is required');

  const topicId = id || `diary_topic_${Date.now()}`;
  const res = await pool.query(
    `
    INSERT INTO diary_topics (id, user_id, title, description, sort_order, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    WHERE diary_topics.user_id = $2
    RETURNING *;
    `,
    [topicId, userId, title.trim(), description || null, order]
  );
  return res.rows[0];
}

export async function dbDeleteDiaryTopic(userId: string, topicId: string) {
  await pool.query('DELETE FROM diary_topics WHERE user_id = $1 AND id = $2', [userId, topicId]);
  return { success: true, id: topicId };
}

export async function dbUpsertDiaryEntry(userId: string, body: any) {
  const { id, topicId, title, content = '', images = [] } = body;
  if (!topicId) throw new Error('topicId is required');

  const entryId = id || `diary_entry_${Date.now()}`;
  const imagesJson = JSON.stringify(Array.isArray(images) ? images : []);

  const res = await pool.query(
    `
    INSERT INTO diary_entries (id, topic_id, user_id, title, content, images, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      images = EXCLUDED.images,
      updated_at = NOW()
    WHERE diary_entries.user_id = $3
    RETURNING *;
    `,
    [entryId, topicId, userId, title || null, content, imagesJson]
  );
  return res.rows[0];
}

export async function dbDeleteDiaryEntry(userId: string, entryId: string) {
  await pool.query('DELETE FROM diary_entries WHERE user_id = $1 AND id = $2', [userId, entryId]);
  return { success: true, id: entryId };
}

// ==================== LEARNING HUB ====================

export async function dbGetLearningData(userId: string | null) {
  if (!userId) return { folders: [], logs: [] };
  const foldersRes = await pool.query('SELECT * FROM learning_folders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  const logsRes = await pool.query('SELECT * FROM learning_logs WHERE user_id = $1 ORDER BY date DESC', [userId]);

  return {
    folders: foldersRes.rows.map((f) => ({
      id: f.id,
      name: f.name,
      completed: f.completed,
      createdAt: f.created_at ? new Date(f.created_at).toISOString() : new Date().toISOString(),
      updatedAt: f.updated_at ? new Date(f.updated_at).toISOString() : new Date().toISOString(),
    })),
    logs: logsRes.rows.map((l) => ({
      id: l.id,
      folderId: l.folder_id,
      date: l.date,
      watchMinutes: l.watch_minutes,
      practiceMinutes: l.practice_minutes,
      practiceDetails: l.practice_details,
      topics: l.topics,
      blockers: l.blockers,
      createdAt: l.created_at ? new Date(l.created_at).toISOString() : new Date().toISOString(),
    })),
  };
}

export async function dbUpsertLearningFolder(userId: string, body: any) {
  const { id, name, completed = false } = body;
  if (!name) throw new Error('Folder name is required');

  const folderId = id || `l_folder_${Date.now()}`;
  const res = await pool.query(
    `
    INSERT INTO learning_folders (id, user_id, name, completed, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      completed = EXCLUDED.completed,
      updated_at = NOW()
    WHERE learning_folders.user_id = $2
    RETURNING *;
    `,
    [folderId, userId, name.trim(), Boolean(completed)]
  );
  return res.rows[0];
}

export async function dbUpdateLearningFolder(userId: string, folderId: string, updates: any) {
  const fields: string[] = [];
  const params: any[] = [userId, folderId];

  if (updates.name !== undefined) { params.push(updates.name); fields.push(`name = $${params.length}`); }
  if (updates.completed !== undefined) { params.push(Boolean(updates.completed)); fields.push(`completed = $${params.length}`); }

  fields.push('updated_at = NOW()');

  const res = await pool.query(
    `UPDATE learning_folders SET ${fields.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *;`,
    params
  );
  if (res.rows.length === 0) throw new Error('Folder not found');
  return res.rows[0];
}

export async function dbDeleteLearningFolder(userId: string, folderId: string) {
  await pool.query('DELETE FROM learning_folders WHERE user_id = $1 AND id = $2', [userId, folderId]);
  return { success: true, id: folderId };
}

export async function dbUpsertLearningLog(userId: string, body: any) {
  const { id, folderId, date, watchMinutes = 0, practiceMinutes = 0, practiceDetails = '', topics = '', blockers = '' } = body;
  if (!folderId) throw new Error('folderId is required');

  const logId = id || `l_log_${Date.now()}`;
  const res = await pool.query(
    `
    INSERT INTO learning_logs (id, user_id, folder_id, date, watch_minutes, practice_minutes, practice_details, topics, blockers, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (id) DO UPDATE SET
      date = EXCLUDED.date,
      watch_minutes = EXCLUDED.watch_minutes,
      practice_minutes = EXCLUDED.practice_minutes,
      practice_details = EXCLUDED.practice_details,
      topics = EXCLUDED.topics,
      blockers = EXCLUDED.blockers
    WHERE learning_logs.user_id = $2
    RETURNING *;
    `,
    [logId, userId, folderId, date || new Date().toISOString().split('T')[0], Number(watchMinutes) || 0, Number(practiceMinutes) || 0, practiceDetails || '', topics || '', blockers || '']
  );
  return res.rows[0];
}

export async function dbDeleteLearningLog(userId: string, logId: string) {
  await pool.query('DELETE FROM learning_logs WHERE user_id = $1 AND id = $2', [userId, logId]);
  return { success: true, id: logId };
}

// ==================== REVIEWS ====================

export async function dbGetReviewPromptState(userId: string | null) {
  if (!userId) return null;
  const res = await pool.query('SELECT * FROM review_prompt_state WHERE user_id = $1', [userId]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    status: row.status,
    meaningfulActions: row.meaningful_actions,
    skipCount: row.skip_count,
    lastShownAt: row.last_shown_at,
    nextPromptAt: row.next_prompt_at,
    submittedAt: row.submitted_at,
  };
}

export async function dbUpsertReviewPromptState(userId: string, body: any) {
  const { status = 'eligible', meaningfulActions = 0, skipCount = 0, lastShownAt = null, nextPromptAt = null, submittedAt = null } = body;
  const res = await pool.query(
    `
    INSERT INTO review_prompt_state (user_id, status, meaningful_actions, skip_count, last_shown_at, next_prompt_at, submitted_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      status = EXCLUDED.status,
      meaningful_actions = EXCLUDED.meaningful_actions,
      skip_count = EXCLUDED.skip_count,
      last_shown_at = EXCLUDED.last_shown_at,
      next_prompt_at = EXCLUDED.next_prompt_at,
      submitted_at = EXCLUDED.submitted_at,
      updated_at = NOW()
    RETURNING *;
    `,
    [userId, status, meaningfulActions, skipCount, lastShownAt, nextPromptAt, submittedAt]
  );
  return res.rows[0];
}

export async function dbInsertReview(userId: string, rating: number, comment?: string) {
  const res = await pool.query(
    `
    INSERT INTO reviews (user_id, rating, comment, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    RETURNING *;
    `,
    [userId, rating, (comment || '').trim()]
  );
  return res.rows[0];
}

// ==================== AI CHAT SESSIONS ====================

export async function dbClearAllChatSessions(userId: string | null) {
  if (userId) {
    // Delete messages for user sessions first, then sessions
    await pool.query(
      `DELETE FROM ai_chat_messages WHERE session_id IN (SELECT id FROM ai_chat_sessions WHERE user_id = $1)`,
      [userId]
    );
    await pool.query('DELETE FROM ai_chat_sessions WHERE user_id = $1', [userId]);
  } else {
    // Guest mode: clear sessions with null user_id
    await pool.query(
      `DELETE FROM ai_chat_messages WHERE session_id IN (SELECT id FROM ai_chat_sessions WHERE user_id IS NULL)`
    );
    await pool.query('DELETE FROM ai_chat_sessions WHERE user_id IS NULL');
  }
  return { success: true };
}

// ==================== USER PROFILE & SETTINGS ====================

export function mapProfileRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    identifier: row.identifier,
    authMethod: row.auth_method || 'email',
    displayName: row.display_name || '',
    fullName: row.full_name || '',
    email: row.identifier || '',
    emailVerified: Boolean(row.email_verified || row.auth_method === 'google'),
    phone: row.phone || '',
    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : '',
    gender: row.gender || '',
    country: row.country || '',
    city: row.city || '',
    bio: row.bio || '',
    avatarUrl: row.avatar_url || null,
    preferredLanguage: row.preferred_language || 'en',
    preferredTheme: row.preferred_theme || 'dark',
    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function dbGetUserProfile(userId: string) {
  const res = await pool.query('SELECT * FROM profiles WHERE id = $1', [userId]);
  if (res.rows.length === 0) return null;
  return mapProfileRow(res.rows[0]);
}

export async function dbCheckUsernameAvailable(displayName: string, excludeUserId?: string): Promise<boolean> {
  const norm = displayName.trim().toLowerCase();
  if (!norm) return true;

  let query = 'SELECT id FROM profiles WHERE LOWER(TRIM(display_name)) = $1';
  const params: any[] = [norm];

  if (excludeUserId) {
    query += ' AND id <> $2';
    params.push(excludeUserId);
  }

  const res = await pool.query(query, params);
  return res.rows.length === 0;
}

export async function dbUpdateUserProfile(userId: string, updates: Record<string, any>) {
  const allowedFields: Record<string, string> = {
    displayName: 'display_name',
    fullName: 'full_name',
    phone: 'phone',
    dateOfBirth: 'date_of_birth',
    gender: 'gender',
    country: 'country',
    city: 'city',
    bio: 'bio',
    avatarUrl: 'avatar_url',
    preferredLanguage: 'preferred_language',
    preferredTheme: 'preferred_theme',
    emailVerified: 'email_verified',
    onboardingCompleted: 'onboarding_completed',
  };

  const fields: string[] = [];
  const params: any[] = [userId];

  for (const [key, col] of Object.entries(allowedFields)) {
    if (updates[key] !== undefined) {
      params.push(updates[key]);
      fields.push(`${col} = $${params.length}`);
    }
  }

  if (fields.length === 0) {
    return dbGetUserProfile(userId);
  }

  fields.push('updated_at = NOW()');

  const query = `
    UPDATE profiles
    SET ${fields.join(', ')}
    WHERE id = $1
    RETURNING *;
  `;

  const res = await pool.query(query, params);
  if (res.rows.length === 0) {
    // If profile row doesn't exist yet, insert it
    const insertRes = await pool.query(
      `
      INSERT INTO profiles (id, identifier, auth_method, display_name, full_name, created_at, updated_at)
      VALUES ($1, $2, 'email', $3, $4, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      RETURNING *;
      `,
      [userId, updates.email || 'user', updates.displayName || '', updates.fullName || '']
    );
    return mapProfileRow(insertRes.rows[0]);
  }

  return mapProfileRow(res.rows[0]);
}

// ==================== NOTIFICATIONS ====================

export async function dbGetNotificationSettings(userId: string) {
  const res = await pool.query('SELECT * FROM user_notification_settings WHERE user_id = $1', [userId]);
  if (res.rows.length === 0) {
    return {
      pushEnabled: true,
      taskReminders: true,
      focusReminders: true,
      dailyProgressReminders: true,
      dailyReminderTime: '20:00',
      timezone: 'UTC',
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      orbReactionsMode: 'on',
      dailyLimit: 5,
      skillReminders: true,
      inactivityReminders: true,
    };
  }
  const row = res.rows[0];
  return {
    pushEnabled: row.push_enabled ?? true,
    taskReminders: row.task_reminders ?? true,
    focusReminders: row.focus_reminders ?? true,
    dailyProgressReminders: row.daily_progress_reminders ?? true,
    dailyReminderTime: row.daily_reminder_time || '20:00',
    timezone: row.timezone || 'UTC',
    quietHoursEnabled: row.quiet_hours_enabled ?? true,
    quietHoursStart: row.quiet_hours_start || '22:00',
    quietHoursEnd: row.quiet_hours_end || '07:00',
    orbReactionsMode: row.orb_reactions_mode || 'on',
    dailyLimit: row.daily_limit || 5,
    skillReminders: row.skill_reminders ?? true,
    inactivityReminders: row.inactivity_reminders ?? true,
  };
}

export async function dbUpsertNotificationSettings(userId: string, settings: any) {
  const res = await pool.query(
    `
    INSERT INTO user_notification_settings (
      user_id, push_enabled, task_reminders, focus_reminders,
      daily_progress_reminders, daily_reminder_time, timezone,
      quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
      orb_reactions_mode, daily_limit, skill_reminders, inactivity_reminders, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      push_enabled = EXCLUDED.push_enabled,
      task_reminders = EXCLUDED.task_reminders,
      focus_reminders = EXCLUDED.focus_reminders,
      daily_progress_reminders = EXCLUDED.daily_progress_reminders,
      daily_reminder_time = EXCLUDED.daily_reminder_time,
      timezone = EXCLUDED.timezone,
      quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
      quiet_hours_start = EXCLUDED.quiet_hours_start,
      quiet_hours_end = EXCLUDED.quiet_hours_end,
      orb_reactions_mode = EXCLUDED.orb_reactions_mode,
      daily_limit = EXCLUDED.daily_limit,
      skill_reminders = EXCLUDED.skill_reminders,
      inactivity_reminders = EXCLUDED.inactivity_reminders,
      updated_at = NOW()
    RETURNING *;
    `,
    [
      userId,
      settings.pushEnabled ?? true,
      settings.taskReminders ?? true,
      settings.focusReminders ?? true,
      settings.dailyProgressReminders ?? true,
      settings.dailyReminderTime || '20:00',
      settings.timezone || 'UTC',
      settings.quietHoursEnabled ?? true,
      settings.quietHoursStart || '22:00',
      settings.quietHoursEnd || '07:00',
      settings.orbReactionsMode || 'on',
      Number(settings.dailyLimit) || 5,
      settings.skillReminders ?? true,
      settings.inactivityReminders ?? true,
    ]
  );
  const row = res.rows[0];
  return {
    pushEnabled: row.push_enabled ?? true,
    taskReminders: row.task_reminders ?? true,
    focusReminders: row.focus_reminders ?? true,
    dailyProgressReminders: row.daily_progress_reminders ?? true,
    dailyReminderTime: row.daily_reminder_time,
    timezone: row.timezone,
    quietHoursEnabled: row.quiet_hours_enabled ?? true,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    orbReactionsMode: row.orb_reactions_mode,
    dailyLimit: row.daily_limit,
    skillReminders: row.skill_reminders ?? true,
    inactivityReminders: row.inactivity_reminders ?? true,
  };
}

export async function dbSavePushSubscription(userId: string, subscription: any, userAgent?: string) {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys?.auth) throw new Error('Invalid subscription object');

  await pool.query(
    `
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id, endpoint) DO UPDATE SET
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      updated_at = NOW()
    `,
    [userId, endpoint, keys.p256dh, keys.auth, userAgent || '']
  );
  return { success: true };
}

export async function dbRemovePushSubscription(userId: string, endpoint: string) {
  await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
  return { success: true };
}

// ==================== SUPPORT TICKETS & SUPERVISOR ====================

export function mapTicketRow(row: any) {
  if (!row) return null;
  let attachments = row.attachments;
  if (typeof attachments === 'string') {
    try { attachments = JSON.parse(attachments); } catch { attachments = []; }
  }

  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    type: row.type,
    category: row.category,
    subject: row.subject,
    message: row.message,
    attachments: Array.isArray(attachments) ? attachments : [],
    userId: row.user_id,
    name: row.name,
    email: row.email,
    isGuest: Boolean(row.is_guest),
    appVersion: row.app_version,
    browserInfo: row.browser_info,
    language: row.language,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    internalNotes: row.internal_notes,
    readBySupervisor: Boolean(row.read_by_supervisor),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : undefined,
  };
}

export async function dbCreateSupportTicket(data: {
  type: string;
  category?: string;
  subject: string;
  message: string;
  attachments?: string[];
  userId?: string | null;
  name?: string;
  email?: string;
  isGuest?: boolean;
  appVersion?: string;
  browserInfo?: string;
  language?: string;
}) {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  let ticketNumber = `FF-${randomSuffix}`;
  const nowIso = new Date().toISOString();

  try {
    try {
      const seqRes = await pool.query("SELECT nextval('support_ticket_seq') as seq");
      if (seqRes?.rows?.[0]?.seq) {
        ticketNumber = `FF-${String(seqRes.rows[0].seq).padStart(6, '0')}`;
      }
    } catch {
      // Sequence might not exist, proceed with generated ticketNumber
    }

    const res = await pool.query(
      `
      INSERT INTO support_tickets (
        ticket_number, type, category, subject, message, attachments,
        user_id, name, email, is_guest, app_version, browser_info, language,
        status, priority, read_by_supervisor, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb,
        $7, $8, $9, $10, $11, $12, $13,
        'new', 'normal', false, NOW(), NOW()
      )
      RETURNING *;
      `,
      [
        ticketNumber,
        data.type,
        data.category || null,
        data.subject,
        data.message,
        JSON.stringify(data.attachments || []),
        data.userId || null,
        data.name || 'Anonymous',
        data.email || null,
        Boolean(data.isGuest),
        data.appVersion || '1.0.0',
        data.browserInfo || null,
        data.language || 'en',
      ]
    );

    if (res.rows?.[0]) {
      return mapTicketRow(res.rows[0]);
    }
  } catch (dbErr: any) {
    console.warn('[dbCreateSupportTicket] Database insert failed, falling back to in-memory ticket:', dbErr?.message);
  }

  // Graceful fallback ticket record
  return {
    id: `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ticketNumber,
    type: data.type,
    category: data.category || 'General',
    subject: data.subject,
    message: data.message,
    attachments: data.attachments || [],
    userId: data.userId || null,
    name: data.name || 'Anonymous',
    email: data.email || null,
    isGuest: Boolean(data.isGuest),
    appVersion: data.appVersion || '1.0.0',
    browserInfo: data.browserInfo || undefined,
    language: data.language || 'en',
    status: 'new',
    priority: 'normal',
    assignedTo: null,
    supervisorNotes: null,
    readBySupervisor: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function dbGetSupportTickets(filters: {
  type?: string;
  status?: string;
  priority?: string;
  unreadOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const params: any[] = [];
  let query = 'SELECT * FROM support_tickets WHERE 1=1';

  if (filters.type && filters.type !== 'all') {
    params.push(filters.type);
    query += ` AND type = $${params.length}`;
  }
  if (filters.status && filters.status !== 'all') {
    params.push(filters.status);
    query += ` AND status = $${params.length}`;
  }
  if (filters.priority && filters.priority !== 'all') {
    params.push(filters.priority);
    query += ` AND priority = $${params.length}`;
  }
  if (filters.unreadOnly) {
    query += ` AND read_by_supervisor = false`;
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    query += ` AND (ticket_number ILIKE $${params.length} OR subject ILIKE $${params.length} OR message ILIKE $${params.length} OR email ILIKE $${params.length} OR name ILIKE $${params.length})`;
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    params.push(filters.limit);
    query += ` LIMIT $${params.length}`;
  }
  if (filters.offset) {
    params.push(filters.offset);
    query += ` OFFSET $${params.length}`;
  }

  const res = await pool.query(query, params);
  return res.rows.map(mapTicketRow);
}

export async function dbGetSupportTicketById(idOrNumber: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);
  const query = isUuid
    ? 'SELECT * FROM support_tickets WHERE id = $1'
    : 'SELECT * FROM support_tickets WHERE ticket_number = $1';
  
  const res = await pool.query(query, [idOrNumber]);
  if (res.rows.length === 0) return null;
  return mapTicketRow(res.rows[0]);
}

export async function dbUpdateSupportTicket(id: string, updates: Record<string, any>) {
  const fields: string[] = [];
  const params: any[] = [id];

  const allowed: Record<string, string> = {
    status: 'status',
    priority: 'priority',
    assignedTo: 'assigned_to',
    internalNotes: 'internal_notes',
    readBySupervisor: 'read_by_supervisor',
  };

  for (const [key, col] of Object.entries(allowed)) {
    if (updates[key] !== undefined) {
      params.push(updates[key]);
      fields.push(`${col} = $${params.length}`);
    }
  }

  if (updates.status === 'resolved' || updates.status === 'closed') {
    fields.push('resolved_at = NOW()');
  }

  fields.push('updated_at = NOW()');

  const query = `
    UPDATE support_tickets
    SET ${fields.join(', ')}
    WHERE id = $1
    RETURNING *;
  `;

  const res = await pool.query(query, params);
  if (res.rows.length === 0) throw new Error('Ticket not found');
  return mapTicketRow(res.rows[0]);
}

export async function dbAddTicketReply(data: {
  ticketId: string;
  senderRole: 'supervisor' | 'user' | 'system';
  senderId?: string | null;
  senderName: string;
  message: string;
  attachments?: string[];
}) {
  const res = await pool.query(
    `
    INSERT INTO ticket_replies (ticket_id, sender_role, sender_id, sender_name, message, attachments, created_at)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    RETURNING *;
    `,
    [
      data.ticketId,
      data.senderRole,
      data.senderId || null,
      data.senderName,
      data.message,
      JSON.stringify(data.attachments || []),
    ]
  );

  await pool.query('UPDATE support_tickets SET updated_at = NOW() WHERE id = $1', [data.ticketId]);

  const row = res.rows[0];
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderRole: row.sender_role,
    senderId: row.sender_id,
    senderName: row.sender_name,
    message: row.message,
    attachments: row.attachments,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function dbGetTicketReplies(ticketId: string) {
  const res = await pool.query(
    'SELECT * FROM ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC',
    [ticketId]
  );
  return res.rows.map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    senderRole: row.sender_role,
    senderId: row.sender_id,
    senderName: row.sender_name,
    message: row.message,
    attachments: row.attachments,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }));
}

export async function dbCheckUserRole(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const res = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [userId]);
  return res.rows.map((r) => r.role);
}

export async function dbLogSupervisorAction(
  supervisorId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: any,
  ipAddress?: string
) {
  await pool.query(
    `
    INSERT INTO supervisor_audit_logs (supervisor_id, action, target_type, target_id, metadata, ip_address, created_at)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
    `,
    [supervisorId, action, targetType, targetId, JSON.stringify(metadata || {}), ipAddress || null]
  );
}

export async function dbGetSupervisorAuditLogs(limit: number = 50) {
  const res = await pool.query(
    'SELECT * FROM supervisor_audit_logs ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return res.rows.map((row) => ({
    id: row.id,
    supervisorId: row.supervisor_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }));
}

// ==================== SAFE IDEMPOTENT ACCOUNT DELETION ====================

export async function dbDeleteUserAccountCompletely(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete zero-knowledge encrypted sync records
    await client.query('DELETE FROM public.encrypted_sync_records WHERE user_id = $1', [userId]);

    // 2. Delete notification configs, push subscriptions, and roles
    await client.query('DELETE FROM public.user_notification_settings WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM public.push_subscriptions WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM public.sent_notifications_log WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM public.user_roles WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM public.review_prompt_state WHERE user_id = $1', [userId]).catch(() => {});

    // 3. Anonymize any customer support tickets
    await client.query(
      `
      UPDATE public.support_tickets 
      SET user_id = NULL, name = 'Deleted User', email = 'deleted@focusforge.app' 
      WHERE user_id = $1
      `,
      [userId]
    ).catch(() => {});

    // 4. Delete profile row
    await client.query('DELETE FROM public.profiles WHERE id = $1', [userId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ==================== NOTIFICATIONS HISTORY & ROTATION ====================

export async function dbGetNotifications(userId: string) {
  const res = await pool.query(
    'SELECT * FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
    [userId]
  );
  return res.rows.map(row => ({
    id: row.id,
    type: row.type,
    category: row.category,
    templateId: row.template_id,
    title: row.title,
    message: row.message,
    orbMood: row.orb_mood,
    actionRoute: row.action_route,
    read: row.read,
    taskId: row.task_id,
    skillId: row.skill_id,
    metadata: row.metadata,
    timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }));
}

export async function dbSaveNotification(userId: string, notif: any) {
  const res = await pool.query(
    `
    INSERT INTO user_notifications (
      id, user_id, type, category, template_id, title, message, orb_mood, action_route, read, task_id, skill_id, metadata, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14::timestamptz, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      read = EXCLUDED.read,
      action_route = EXCLUDED.action_route,
      metadata = EXCLUDED.metadata
    RETURNING *;
    `,
    [
      notif.id,
      userId,
      notif.type || 'system',
      notif.category || 'system',
      notif.templateId || null,
      notif.title,
      notif.message,
      notif.orbMood || 'attentive',
      notif.actionRoute || null,
      Boolean(notif.read),
      notif.taskId ? Number(notif.taskId) : null,
      notif.skillId || null,
      JSON.stringify(notif.metadata || {}),
      notif.timestamp || null,
    ]
  );
  return res.rows[0];
}

export async function dbMarkNotificationRead(userId: string, notificationId: string) {
  await pool.query('UPDATE user_notifications SET read = true WHERE user_id = $1 AND id = $2', [userId, notificationId]);
  return { success: true };
}

export async function dbMarkAllNotificationsRead(userId: string) {
  await pool.query('UPDATE user_notifications SET read = true WHERE user_id = $1', [userId]);
  return { success: true };
}

export async function dbDeleteNotification(userId: string, notificationId: string) {
  await pool.query('DELETE FROM user_notifications WHERE user_id = $1 AND id = $2', [userId, notificationId]);
  return { success: true };
}

export async function dbClearNotifications(userId: string) {
  await pool.query('DELETE FROM user_notifications WHERE user_id = $1', [userId]);
  return { success: true };
}

export async function dbGetRotationStates(userId: string) {
  const res = await pool.query('SELECT category, bag, last_used_id FROM user_notification_rotation WHERE user_id = $1', [userId]);
  const result: Record<string, { bag: string[]; lastUsedId: string | null }> = {};
  for (const row of res.rows) {
    result[row.category] = {
      bag: Array.isArray(row.bag) ? row.bag : [],
      lastUsedId: row.last_used_id || null,
    };
  }
  return result;
}

export async function dbSaveRotationState(userId: string, category: string, bag: string[], lastUsedId: string | null) {
  await pool.query(
    `
    INSERT INTO user_notification_rotation (user_id, category, bag, last_used_id, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (user_id, category) DO UPDATE SET
      bag = EXCLUDED.bag,
      last_used_id = EXCLUDED.last_used_id,
      updated_at = NOW()
    `,
    [userId, category, JSON.stringify(bag), lastUsedId]
  );
  return { success: true };
}

// ==================== SCHEDULED REMINDERS & QUEUE ====================

export interface ScheduledReminderInput {
  id: string;
  category: string;
  priority?: number;
  title: string;
  body: string;
  actionRoute?: string;
  targetTime: string | Date;
  dueDate: string;
  timezone?: string;
  taskId?: number | string | null;
  skillId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function dbSyncScheduledReminders(
  userId: string,
  reminders: ScheduledReminderInput[],
  cancelledIds: string[] = [],
  completedTaskIds: Array<number | string> = []
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Mark completed tasks' reminders as cancelled
    if (completedTaskIds && completedTaskIds.length > 0) {
      const numTaskIds = completedTaskIds.map(t => Number(t)).filter(t => !isNaN(t));
      if (numTaskIds.length > 0) {
        await client.query(
          `UPDATE scheduled_reminders 
           SET status = 'cancelled', updated_at = NOW() 
           WHERE user_id = $1 AND task_id = ANY($2::bigint[]) AND status = 'pending'`,
          [userId, numTaskIds]
        );
      }
    }

    // 2. Mark explicit cancelled IDs
    if (cancelledIds && cancelledIds.length > 0) {
      await client.query(
        `UPDATE scheduled_reminders 
         SET status = 'cancelled', updated_at = NOW() 
         WHERE user_id = $1 AND id = ANY($2::text[]) AND status = 'pending'`,
        [userId, cancelledIds]
      );
    }

    // 3. Upsert upcoming reminders
    let syncedCount = 0;
    if (Array.isArray(reminders) && reminders.length > 0) {
      for (const r of reminders) {
        if (!r.id || !r.title || !r.targetTime) continue;

        const targetTimeIso = typeof r.targetTime === 'string' ? r.targetTime : r.targetTime.toISOString();
        const taskIdNum = r.taskId ? Number(r.taskId) : null;

        await client.query(
          `
          INSERT INTO scheduled_reminders (
            id, user_id, category, priority, title, body, action_route,
            target_time, due_date, timezone, status, task_id, skill_id, metadata, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8::timestamptz, $9, $10, 'pending', $11, $12, $13::jsonb, NOW(), NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            action_route = EXCLUDED.action_route,
            priority = EXCLUDED.priority,
            target_time = EXCLUDED.target_time,
            due_date = EXCLUDED.due_date,
            timezone = EXCLUDED.timezone,
            task_id = EXCLUDED.task_id,
            skill_id = EXCLUDED.skill_id,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          WHERE scheduled_reminders.status = 'pending'
          `,
          [
            r.id,
            userId,
            r.category || 'system',
            r.priority ?? 2,
            r.title,
            r.body,
            r.actionRoute || 'today',
            targetTimeIso,
            r.dueDate || new Date().toISOString().split('T')[0],
            r.timezone || 'UTC',
            taskIdNum,
            r.skillId || null,
            JSON.stringify(r.metadata || {}),
          ]
        );
        syncedCount++;
      }
    }

    await client.query('COMMIT');
    return { success: true, syncedCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function dbGetScheduledReminders(userId: string, dueDate?: string) {
  let query = 'SELECT * FROM scheduled_reminders WHERE user_id = $1';
  const params: any[] = [userId];
  if (dueDate) {
    params.push(dueDate);
    query += ` AND due_date = $${params.length}`;
  }
  query += ' ORDER BY target_time ASC';

  const res = await pool.query(query, params);
  return res.rows.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    category: row.category,
    priority: row.priority,
    title: row.title,
    body: row.body,
    actionRoute: row.action_route,
    targetTime: row.target_time ? new Date(row.target_time).toISOString() : '',
    dueDate: row.due_date,
    timezone: row.timezone,
    status: row.status,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    sentAt: row.sent_at,
    providerStatus: row.provider_status,
    taskId: row.task_id,
    skillId: row.skill_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function dbClaimDueScheduledReminders(limit: number = 50) {
  const query = `
    WITH due_items AS (
      SELECT id
      FROM scheduled_reminders
      WHERE (
        status = 'pending'
        OR (status = 'processing' AND updated_at < NOW() - INTERVAL '5 minutes')
      )
      AND target_time <= NOW()
      AND attempt_count < 3
      ORDER BY priority ASC, target_time ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE scheduled_reminders sr
    SET status = 'processing',
        attempt_count = sr.attempt_count + 1,
        last_attempt_at = NOW(),
        updated_at = NOW()
    FROM due_items
    WHERE sr.id = due_items.id
    RETURNING sr.*;
  `;
  const res = await pool.query(query, [limit]);
  return res.rows;
}

export async function dbUpdateScheduledReminderStatus(
  id: string,
  status: 'sent' | 'failed' | 'cancelled' | 'suppressed' | 'expired' | 'pending',
  providerStatus?: string,
  sentAt?: Date
) {
  await pool.query(
    `
    UPDATE scheduled_reminders
    SET status = $1,
        provider_status = $2,
        sent_at = COALESCE($3, sent_at),
        updated_at = NOW()
    WHERE id = $4
    `,
    [status, providerStatus || null, sentAt || null, id]
  );
}

