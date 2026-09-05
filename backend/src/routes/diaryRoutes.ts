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

// All diary routes require authentication
router.use(requireAuth);

/**
 * GET /api/diary/topics
 * Fetch all topics with their entries for the authenticated user
 */
router.get('/topics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const { data: topicsData, error: topicsError } = await supabase
      .from('diary_topics')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (topicsError) {
      return res.status(500).json({ error: topicsError.message });
    }

    const { data: entriesData, error: entriesError } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (entriesError) {
      return res.status(500).json({ error: entriesError.message });
    }

    // Map entries to their respective topics
    const topics = (topicsData || []).map((t) => {
      const topicEntries = (entriesData || [])
        .filter((e) => e.topic_id === t.id)
        .map((e) => ({
          id: e.id,
          title: e.title || '',
          content: e.content || '',
          images: Array.isArray(e.images) ? e.images : [],
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        }));

      return {
        id: t.id,
        order: t.sort_order,
        title: t.title,
        description: t.description || undefined,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        entries: topicEntries,
      };
    });

    res.json(topics);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch diary topics' });
  }
});

/**
 * POST /api/diary/topics
 * Upsert a diary topic
 */
router.post('/topics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id, title, description, order } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const payload = {
      id: id || `diary_topic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      title: title.trim(),
      description: description?.trim() || null,
      sort_order: typeof order === 'number' ? order : 1,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('diary_topics')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      id: data.id,
      order: data.sort_order,
      title: data.title,
      description: data.description || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save diary topic' });
  }
});

/**
 * DELETE /api/diary/topics/:id
 * Delete a diary topic
 */
router.delete('/topics/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { error } = await supabase
      .from('diary_topics')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete diary topic' });
  }
});

/**
 * POST /api/diary/entries
 * Upsert a diary entry (including image attachments)
 */
router.post('/entries', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id, topicId, title, content, images } = req.body;
    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    const payload = {
      id: id || `diary_entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      topic_id: topicId,
      user_id: userId,
      title: title || '',
      content: content || '',
      images: Array.isArray(images) ? images : [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('diary_entries')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      id: data.id,
      title: data.title,
      content: data.content,
      images: data.images,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save diary entry' });
  }
});

/**
 * DELETE /api/diary/entries/:id
 * Delete a diary entry
 */
router.delete('/entries/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete diary entry' });
  }
});

export default router;
