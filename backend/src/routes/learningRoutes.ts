import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  dbGetLearningData,
  dbUpsertLearningFolder,
  dbDeleteLearningFolder,
  dbUpsertLearningLog,
  dbDeleteLearningLog,
} from '../services/db';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/learning/data
 */
router.get('/data', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ folders: [], logs: [] });
    }

    const data = await dbGetLearningData(userId);

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch learning hub data' });
  }
});

/**
 * POST /api/learning/folders
 */
router.post('/folders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await dbUpsertLearningFolder(userId, req.body);
    res.status(201).json(folder);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create learning folder' });
  }
});

/**
 * PATCH /api/learning/folders/:id
 */
router.patch('/folders/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const folder = await dbUpsertLearningFolder(userId, { ...req.body, id });
    res.json(folder);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update folder' });
  }
});

/**
 * DELETE /api/learning/folders/:id
 */
router.delete('/folders/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    await dbDeleteLearningFolder(userId, id as string);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete folder' });
  }
});

/**
 * POST /api/learning/logs
 */
router.post('/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { folderId, date } = req.body;
    if (!folderId || !date) {
      return res.status(400).json({ error: 'folderId and date are required' });
    }

    const log = await dbUpsertLearningLog(userId, req.body);
    res.status(201).json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save learning log' });
  }
});

/**
 * DELETE /api/learning/logs/:id
 */
router.delete('/logs/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    await dbDeleteLearningLog(userId, id as string);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete learning log' });
  }
});

export default router;
