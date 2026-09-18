import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { dbGetNotes, dbUpsertNote, dbDeleteNote } from '../services/db';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/notes
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const notes = await dbGetNotes(userId);
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notes' });
  }
});

/**
 * POST /api/notes
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const note = await dbUpsertNote(userId, req.body);
    res.json(note);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save note' });
  }
});

/**
 * PATCH /api/notes/:id
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

    const note = await dbUpsertNote(userId, { ...req.body, id: noteId });
    res.json(note);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update note' });
  }
});

/**
 * DELETE /api/notes/:id
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

    await dbDeleteNote(userId, noteId);
    res.json({ success: true, id: noteId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete note' });
  }
});

export default router;
