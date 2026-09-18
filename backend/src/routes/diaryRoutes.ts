import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  dbGetDiaryTopics,
  dbUpsertDiaryTopic,
  dbDeleteDiaryTopic,
  dbUpsertDiaryEntry,
  dbDeleteDiaryEntry,
} from '../services/db';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/diary/topics
 */
router.get('/topics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const topics = await dbGetDiaryTopics(userId);
    res.json(topics);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch diary topics' });
  }
});

/**
 * POST /api/diary/topics
 */
router.post('/topics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const topic = await dbUpsertDiaryTopic(userId, req.body);
    res.json(topic);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save diary topic' });
  }
});

/**
 * DELETE /api/diary/topics/:id
 */
router.delete('/topics/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    await dbDeleteDiaryTopic(userId, id as string);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete diary topic' });
  }
});

/**
 * POST /api/diary/entries
 */
router.post('/entries', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { topicId } = req.body;
    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    const entry = await dbUpsertDiaryEntry(userId, req.body);
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save diary entry' });
  }
});

/**
 * DELETE /api/diary/entries/:id
 */
router.delete('/entries/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    await dbDeleteDiaryEntry(userId, id as string);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete diary entry' });
  }
});

export default router;
