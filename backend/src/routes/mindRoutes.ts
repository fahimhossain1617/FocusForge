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

// All mind routes require authentication
router.use(requireAuth);

/**
 * GET /api/mind
 * Fetch all mind items for the authenticated user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('mind_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const items = (data || []).map((row) => ({
      id: row.id,
      content: row.content,
      type: row.type || 'thought',
      source: row.source || 'home',
      createdAt: row.created_at,
      processedAt: row.processed_at,
    }));

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch mind items' });
  }
});

/**
 * POST /api/mind
 * Upsert a mind item for the user
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id, content, type = 'thought', source = 'home', createdAt, processedAt } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Valid sources: quick_capture, problem_solver, idea_capture, home
    const allowedSources = ['quick_capture', 'problem_solver', 'idea_capture', 'home'];
    const validSource = allowedSources.includes(source) ? source : 'home';

    const payload = {
      id: id || `mind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      content: content.trim(),
      type: type || 'thought',
      source: validSource,
      created_at: createdAt || new Date().toISOString(),
      processed_at: processedAt || null,
    };

    const { data, error } = await supabase
      .from('mind_items')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      id: data.id,
      content: data.content,
      type: data.type,
      source: data.source,
      createdAt: data.created_at,
      processedAt: data.processed_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save mind item' });
  }
});

/**
 * DELETE /api/mind/:id
 * Delete a specific mind item
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { error } = await supabase
      .from('mind_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete mind item' });
  }
});

/**
 * DELETE /api/mind
 * Delete all mind items for the user
 */
router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { error } = await supabase
      .from('mind_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete all mind items' });
  }
});

export default router;
