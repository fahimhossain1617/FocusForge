import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  dbGetFocusSessions,
  dbUpsertFocusSession,
  dbEndFocusSession,
  dbAddDistraction,
} from '../services/db';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/focus/sessions
 */
router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const sessions = await dbGetFocusSessions(userId);
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch focus sessions' });
  }
});

/**
 * POST /api/focus/sessions
 */
router.post('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { taskName } = req.body;
    if (!taskName) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    const session = await dbUpsertFocusSession(userId, req.body);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create focus session' });
  }
});

/**
 * PATCH /api/focus/sessions/:id/end
 */
router.patch('/sessions/:id/end', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { durationMinutes, completed, endedAt } = req.body;

    const session = await dbEndFocusSession(
      userId,
      id as string,
      typeof durationMinutes === 'number' ? durationMinutes : 0,
      completed === true,
      endedAt
    );
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update focus session' });
  }
});

/**
 * POST /api/focus/sessions/:id/distractions
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

    const newDistraction = {
      id: `dist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    await dbAddDistraction(userId, id as string, newDistraction);
    res.json({ success: true, distraction: newDistraction });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to log distraction' });
  }
});

export default router;
