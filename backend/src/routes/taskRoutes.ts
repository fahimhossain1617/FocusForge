import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

router.use(requireAuth);

function mapRowToTask(row: any) {
  const targetDateStr = row.target_date 
    ? (row.target_date.includes('T') ? row.target_date.split('T')[0] : row.target_date)
    : '';

  return {
    id: row.id,
    name: row.name || row.title || '',
    title: row.title || row.name || '',
    description: row.description || '',
    targetDate: targetDateStr,
    date: targetDateStr,
    priority: row.priority || 'medium',
    estHours: row.est_hours || 0,
    estMinutes: row.est_minutes || 0,
    status: row.status || 'not_started',
    completed: row.status === 'completed',
    category: row.category || '',
    notes: row.notes || '',
    tier: row.tier || 'now',
    sourceType: row.source_type || 'custom',
    sourceRoutineId: row.source_routine_id || undefined,
    sourceRoutineTaskId: row.source_routine_task_id || undefined,
    importedAt: row.imported_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Routine Templates Endpoints
 */

/**
 * GET /api/tasks/templates
 * Fetch all routine templates for the user
 */
router.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('routine_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const templates = (data || []).map((row) => ({
      id: row.id,
      weekday: row.weekday,
      title: row.title || '',
      tasks: Array.isArray(row.tasks) ? row.tasks : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch routine templates' });
  }
});

/**
 * POST /api/tasks/templates
 * Create or upsert a routine template
 */
router.post('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id, weekday, title, tasks } = req.body;
    if (!weekday) {
      return res.status(400).json({ error: 'Weekday is required' });
    }

    const validWeekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!validWeekdays.includes(weekday.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid weekday' });
    }

    const templateId = id || `tpl_${weekday.toLowerCase()}_${Date.now()}`;

    if (!userId || req.user?.isGuest) {
      return res.json({
        id: templateId,
        weekday: weekday.toLowerCase(),
        title: (title || '').trim(),
        tasks: Array.isArray(tasks) ? tasks : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const payload = {
      id: templateId,
      user_id: userId,
      weekday: weekday.toLowerCase(),
      title: (title || '').trim(),
      tasks: Array.isArray(tasks) ? tasks : [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('routine_templates')
      .upsert(payload, { onConflict: 'user_id,weekday' })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      id: data.id,
      weekday: data.weekday,
      title: data.title || '',
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save routine template' });
  }
});

/**
 * DELETE /api/tasks/templates/:id
 * Delete a routine template
 */
router.delete('/templates/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId || req.user?.isGuest) {
      return res.json({ success: true, id });
    }

    const { error } = await supabase
      .from('routine_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete routine template' });
  }
});

/**
 * GET /api/tasks
 * Fetch all tasks for the user, with optional date or status filter
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const { date, status } = req.query;

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    let tasks = (data || []).map(mapRowToTask);

    if (date && typeof date === 'string') {
      tasks = tasks.filter(t => t.targetDate === date || t.date === date);
    }

    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch tasks' });
  }
});

/**
 * POST /api/tasks
 * Create or upsert a task
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      id,
      name,
      title,
      description,
      targetDate,
      date,
      priority = 'medium',
      estHours = 0,
      estMinutes = 0,
      status = 'not_started',
      category = '',
      notes = '',
      tier = 'now',
      sourceType = 'custom',
      sourceRoutineId = null,
      sourceRoutineTaskId = null,
      importedAt = null,
    } = req.body;

    const taskTitle = (title || name || '').trim();
    if (!taskTitle) {
      return res.status(400).json({ error: 'Task title or name is required' });
    }

    const validStatus = ['not_started', 'in_progress', 'completed'].includes(status) 
      ? status 
      : (status === 'pending' ? 'not_started' : 'not_started');

    const validPriority = ['low', 'medium', 'high', 'urgent'].includes(priority)
      ? priority
      : 'medium';

    const validTier = ['now', 'next', 'later'].includes(tier) ? tier : 'now';

    const targetDateValue = targetDate || date || null;

    const payload: Record<string, any> = {
      user_id: userId,
      name: taskTitle,
      title: taskTitle,
      description: description || null,
      target_date: targetDateValue,
      priority: validPriority,
      est_hours: Number(estHours) || 0,
      est_minutes: Number(estMinutes) || 0,
      status: validStatus,
      category: category || null,
      notes: notes || null,
      tier: validTier,
      source_type: sourceType || 'custom',
      source_routine_id: sourceRoutineId || null,
      source_routine_task_id: sourceRoutineTaskId || null,
      imported_at: importedAt || null,
      updated_at: new Date().toISOString(),
    };

    if (id && typeof id === 'number') {
      payload.id = id;
    }

    const { data, error } = await supabase
      .from('tasks')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(mapRowToTask(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save task' });
  }
});

/**
 * PATCH /api/tasks/:id
 * Partially update a task
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const taskId = parseInt(req.params.id as string, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const {
      name,
      title,
      description,
      targetDate,
      date,
      priority,
      estHours,
      estMinutes,
      status,
      completed,
      category,
      notes,
      tier,
      sourceType,
      sourceRoutineId,
      sourceRoutineTaskId,
      importedAt,
    } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (targetDate !== undefined) updates.target_date = targetDate;
    else if (date !== undefined) updates.target_date = date;

    if (priority !== undefined) {
      updates.priority = ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium';
    }
    if (estHours !== undefined) updates.est_hours = Number(estHours) || 0;
    if (estMinutes !== undefined) updates.est_minutes = Number(estMinutes) || 0;

    if (status !== undefined) {
      updates.status = ['not_started', 'in_progress', 'completed'].includes(status) ? status : 'not_started';
    } else if (completed !== undefined) {
      updates.status = completed ? 'completed' : 'not_started';
    }

    if (category !== undefined) updates.category = category;
    if (notes !== undefined) updates.notes = notes;
    if (tier !== undefined) {
      updates.tier = ['now', 'next', 'later'].includes(tier) ? tier : 'now';
    }
    if (sourceType !== undefined) updates.source_type = sourceType;
    if (sourceRoutineId !== undefined) updates.source_routine_id = sourceRoutineId;
    if (sourceRoutineTaskId !== undefined) updates.source_routine_task_id = sourceRoutineTaskId;
    if (importedAt !== undefined) updates.imported_at = importedAt;

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(mapRowToTask(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update task' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const taskId = parseInt(req.params.id as string, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, id: taskId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete task' });
  }
});

export default router;
