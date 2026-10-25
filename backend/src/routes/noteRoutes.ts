import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { dbGetNotes, dbUpsertNote, dbDeleteNote, dbSaveSharedNote, dbGetSharedNote } from '../services/db';
import crypto from 'node:crypto';

const router = Router();

/**
 * GET /api/notes/shared/:id (Public - no auth required)
 */
router.get('/shared/:id', async (req: Request, res: Response) => {
  try {
    const shareId = req.params.id as string;
    if (!shareId) {
      return res.status(400).json({ error: 'Missing share ID' });
    }
    const note = await dbGetSharedNote(shareId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found or link expired' });
    }
    res.json({ success: true, note });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch shared note' });
  }
});

/**
 * POST /api/notes/share (Create shareable link)
 */
router.post('/share', async (req: Request, res: Response) => {
  try {
    const { title, category, blocks, attachments, links } = req.body || {};
    const shareId = crypto.randomBytes(6).toString('hex');
    const authHeader = req.headers.authorization;
    let authorId: string | null = null;
    const authUser = (req as AuthenticatedRequest).user;
    if (authUser && !authUser.isGuest) {
      authorId = authUser.id;
    }

    const saved = await dbSaveSharedNote(
      shareId,
      {
        title: title || '',
        category: category || 'Personal',
        blocks: Array.isArray(blocks) ? blocks : [],
        attachments: Array.isArray(attachments) ? attachments : [],
        links: Array.isArray(links) ? links : [],
      },
      authorId
    );

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const shareUrl = `${protocol}://${host}/?shared_note=${shareId}`;

    res.json({
      success: true,
      shareId,
      shareUrl,
      note: saved,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to share note' });
  }
});

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
