import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = (
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  ''
).replace(/^["']|["']$/g, '').trim();

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

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

// ==================== ACCOUNT DELETION & SUPPORT ====================

export async function dbDeleteUserAccount(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete AI chat messages and sessions
    await client.query(
      'DELETE FROM ai_chat_messages WHERE session_id IN (SELECT id FROM ai_chat_sessions WHERE user_id = $1)',
      [userId]
    ).catch(() => {});
    await client.query('DELETE FROM ai_chat_sessions WHERE user_id = $1', [userId]).catch(() => {});

    // 2. Delete tasks and routine templates
    await client.query('DELETE FROM tasks WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM routine_templates WHERE user_id = $1', [userId]).catch(() => {});

    // 3. Delete notes and mind items
    await client.query('DELETE FROM notes WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM mind_items WHERE user_id = $1', [userId]).catch(() => {});

    // 4. Delete focus sessions and distractions
    await client.query('DELETE FROM distraction_entries WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM focus_sessions WHERE user_id = $1', [userId]).catch(() => {});

    // 5. Delete diary entries and topics
    await client.query('DELETE FROM diary_entries WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM diary_topics WHERE user_id = $1', [userId]).catch(() => {});

    // 6. Delete learning logs and folders
    await client.query('DELETE FROM learning_logs WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM learning_folders WHERE user_id = $1', [userId]).catch(() => {});

    // 7. Delete review prompt states and reviews
    await client.query('DELETE FROM review_prompt_state WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM reviews WHERE user_id = $1', [userId]).catch(() => {});

    // 8. Delete user cloud state & profiles
    await client.query('DELETE FROM user_cloud_state WHERE id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM profiles WHERE id = $1', [userId]).catch(() => {});

    // 9. Delete auth user from auth.users (if accessible via direct DB connection)
    await client.query('DELETE FROM auth.users WHERE id = $1', [userId]).catch((err) => {
      console.warn('[dbDeleteUserAccount] Could not direct-delete from auth.users:', err?.message);
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function dbSaveSupportSubmission(
  userId: string | null,
  type: 'report' | 'contact' | 'feedback',
  payload: Record<string, any>
) {
  // Ensure support_submissions table exists (graceful create)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(() => {});

  const res = await pool.query(
    `
    INSERT INTO support_submissions (user_id, type, payload, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, created_at;
    `,
    [userId, type, JSON.stringify(payload)]
  ).catch((err) => {
    console.warn('[dbSaveSupportSubmission] Table insert warning, logging payload:', err?.message);
    return { rows: [{ id: 'temp_' + Date.now(), created_at: new Date().toISOString() }] };
  });

  return res.rows[0];
}

