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

function mapRowToNote(row: any) {
  return {
    id: typeof row.id === 'string' ? parseInt(row.id, 10) || Date.now() : row.id,
    title: row.title || '',
    category: row.category || undefined,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    links: Array.isArray(row.links) ? row.links : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/notes
 * Fetch all notes for the authenticated user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const notes = (data || []).map(mapRowToNote);
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notes' });
  }
});

/**
 * POST /api/notes
 * Create or upsert a note
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id, title, category, blocks, attachments, links } = req.body;

    const payload: Record<string, any> = {
      user_id: userId,
      title: title || 'Untitled Note',
      category: category || null,
      blocks: Array.isArray(blocks) ? blocks : [],
      attachments: Array.isArray(attachments) ? attachments : [],
      links: Array.isArray(links) ? links : [],
      updated_at: new Date().toISOString(),
    };

    if (id && (typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id, 10))))) {
      payload.id = typeof id === 'string' ? parseInt(id, 10) : id;
    }

    const { data, error } = await supabase
      .from('notes')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(mapRowToNote(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save note' });
  }
});

/**
 * PATCH /api/notes/:id
 * Partially update a note
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const noteId = parseInt(req.params.id as string, 10);
    if (isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }

    const { title, category, blocks, attachments, links } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (blocks !== undefined) updates.blocks = Array.isArray(blocks) ? blocks : [];
    if (attachments !== undefined) updates.attachments = Array.isArray(attachments) ? attachments : [];
    if (links !== undefined) updates.links = Array.isArray(links) ? links : [];

    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(mapRowToNote(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update note' });
  }
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const noteId = parseInt(req.params.id as string, 10);
    if (isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, id: noteId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete note' });
  }
});

export default router;
