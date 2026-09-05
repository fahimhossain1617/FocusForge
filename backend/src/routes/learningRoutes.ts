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

// All learning routes require authentication
router.use(requireAuth);

/**
 * GET /api/learning/data
 * Fetches all learning folders and logs for the authenticated user
 */
router.get('/data', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ folders: [], logs: [] });
    }

    const [foldersRes, logsRes] = await Promise.all([
      supabase
        .from('learning_folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('learning_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false }),
    ]);

    if (foldersRes.error) {
      return res.status(500).json({ error: foldersRes.error.message });
    }
    if (logsRes.error) {
      return res.status(500).json({ error: logsRes.error.message });
    }

    const folders = (foldersRes.data || []).map((row) => ({
      id: row.id,
      name: row.name,
      completed: row.completed,
      createdAt: row.created_at,
    }));

    const logs = (logsRes.data || []).map((row) => ({
      id: row.id,
      folderId: row.folder_id,
      date: row.date,
      watchMinutes: row.watch_minutes,
      practiceMinutes: row.practice_minutes,
      practiceDetails: row.practice_details || '',
      topics: row.topics || '',
      blockers: row.blockers || '',
    }));

    res.json({ folders, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch learning hub data' });
  }
});

/**
 * POST /api/learning/folders
 * Create or upsert a learning folder
 */
router.post('/folders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id, name, completed = false, createdAt } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folderId = id || Math.random().toString(36).substring(2, 9);
    const { data, error } = await supabase
      .from('learning_folders')
      .upsert({
        id: folderId,
        user_id: userId,
        name: name.trim(),
        completed: Boolean(completed),
        created_at: createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      id: data.id,
      name: data.name,
      completed: data.completed,
      createdAt: data.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create learning folder' });
  }
});

/**
 * PATCH /api/learning/folders/:id
 * Update folder completion or name
 */
router.patch('/folders/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { name, completed } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (completed !== undefined) updates.completed = Boolean(completed);

    const { data, error } = await supabase
      .from('learning_folders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update folder' });
  }
});

/**
 * DELETE /api/learning/folders/:id
 * Deletes folder and its logs
 */
router.delete('/folders/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { error } = await supabase
      .from('learning_folders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete folder' });
  }
});

/**
 * POST /api/learning/logs
 * Create or record a new learning log
 */
router.post('/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id, folderId, date, watchMinutes = 0, practiceMinutes = 0, practiceDetails = '', topics = '', blockers = '' } = req.body;
    if (!folderId || !date) {
      return res.status(400).json({ error: 'folderId and date are required' });
    }

    const logId = id || Math.random().toString(36).substring(2, 9);
    const { data, error } = await supabase
      .from('learning_logs')
      .upsert({
        id: logId,
        user_id: userId,
        folder_id: folderId,
        date,
        watch_minutes: Number(watchMinutes) || 0,
        practice_minutes: Number(practiceMinutes) || 0,
        practice_details: practiceDetails,
        topics,
        blockers,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      id: data.id,
      folderId: data.folder_id,
      date: data.date,
      watchMinutes: data.watch_minutes,
      practiceMinutes: data.practice_minutes,
      practiceDetails: data.practice_details,
      topics: data.topics,
      blockers: data.blockers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save learning log' });
  }
});

/**
 * DELETE /api/learning/logs/:id
 * Delete a learning log
 */
router.delete('/logs/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { error } = await supabase
      .from('learning_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete learning log' });
  }
});

export default router;
