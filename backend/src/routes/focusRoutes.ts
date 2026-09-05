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

// All focus routes require authentication
router.use(requireAuth);

/**
 * GET /api/focus/sessions
 * Fetch all focus sessions for the authenticated user
 */
router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const sessions = (data || []).map((row) => ({
      id: row.id,
      taskId: row.task_id ? Number(row.task_id) : undefined,
      taskName: row.task_name,
      category: row.category || '',
      startedAt: row.started_at,
      endedAt: row.ended_at || undefined,
      targetMinutes: row.target_minutes,
      durationMinutes: row.duration_minutes,
      completed: row.completed,
      distractions: Array.isArray(row.distractions) ? row.distractions : [],
    }));

    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch focus sessions' });
  }
});

/**
 * POST /api/focus/sessions
 * Create or record a new focus session
 */
router.post('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id, taskId, taskName, category, startedAt, targetMinutes } = req.body;
    if (!taskName) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    const payload = {
      id: id || `focus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      task_id: taskId || null,
      task_name: taskName.trim(),
      category: category?.trim() || null,
      started_at: startedAt || new Date().toISOString(),
      target_minutes: typeof targetMinutes === 'number' ? targetMinutes : 25,
      duration_minutes: 0,
      completed: false,
      distractions: [],
    };

    const { data, error } = await supabase
      .from('focus_sessions')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      id: data.id,
      taskId: data.task_id ? Number(data.task_id) : undefined,
      taskName: data.task_name,
      category: data.category || '',
      startedAt: data.started_at,
      endedAt: data.ended_at || undefined,
      targetMinutes: data.target_minutes,
      durationMinutes: data.duration_minutes,
      completed: data.completed,
      distractions: data.distractions || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create focus session' });
  }
});

/**
 * PATCH /api/focus/sessions/:id/end
 * Conclude a focus session (completed naturally or quit early)
 */
router.patch('/sessions/:id/end', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { durationMinutes, completed, endedAt } = req.body;

    const payload: Record<string, any> = {
      ended_at: endedAt || new Date().toISOString(),
      duration_minutes: typeof durationMinutes === 'number' ? durationMinutes : 0,
      completed: completed === true,
    };

    const { data, error } = await supabase
      .from('focus_sessions')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      id: data.id,
      taskId: data.task_id ? Number(data.task_id) : undefined,
      taskName: data.task_name,
      category: data.category || '',
      startedAt: data.started_at,
      endedAt: data.ended_at,
      targetMinutes: data.target_minutes,
      durationMinutes: data.duration_minutes,
      completed: data.completed,
      distractions: data.distractions || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update focus session' });
  }
});

/**
 * POST /api/focus/sessions/:id/distractions
 * Log a distraction during a focus session
 */
router.post('/sessions/:id/distractions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Distraction content is required' });
    }

    // Get current session
    const { data: session, error: fetchErr } = await supabase
      .from('focus_sessions')
      .select('distractions')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !session) {
      return res.status(404).json({ error: 'Focus session not found' });
    }

    const existing = Array.isArray(session.distractions) ? session.distractions : [];
    const newDistraction = {
      id: `dist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedDistractions = [...existing, newDistraction];

    const { error: updateErr } = await supabase
      .from('focus_sessions')
      .update({ distractions: updatedDistractions })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    res.json({ success: true, distraction: newDistraction });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to log distraction' });
  }
});

export default router;
