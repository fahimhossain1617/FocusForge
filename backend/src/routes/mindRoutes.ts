import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { dbGetMindItems, dbUpsertMindItem, dbDeleteMindItem, dbDeleteAllMindItems } from '../services/db';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/mind
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const items = await dbGetMindItems(userId);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch mind items' });
  }
});

/**
 * POST /api/mind
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const item = await dbUpsertMindItem(userId, req.body);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save mind item' });
  }
});

/**
 * DELETE /api/mind/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    await dbDeleteMindItem(userId, id as string);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete mind item' });
  }
});

/**
 * DELETE /api/mind
 */
router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await dbDeleteAllMindItems(userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete all mind items' });
  }
});

export default router;
