import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  dbGetTasks,
  dbUpsertTask,
  dbDeleteTask,
  dbGetRoutineTemplates,
  dbUpsertRoutineTemplate,
  dbDeleteRoutineTemplate,
} from '../services/db';

const router = Router();
router.use(requireAuth);

/**
 * Routine Templates Endpoints
 */

/**
 * GET /api/tasks/templates
 */
router.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }
    const templates = await dbGetRoutineTemplates(userId);
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch routine templates' });
  }
});

/**
 * POST /api/tasks/templates
 */
router.post('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id, weekday, title, tasks } = req.body;
    if (!weekday) {
      return res.status(400).json({ error: 'Weekday is required' });
    }

    const validWeekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!validWeekdays.includes(weekday.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid weekday' });
    }

    if (!userId || req.user?.isGuest) {
      return res.json({
        id: id || `tpl_${weekday.toLowerCase()}_${Date.now()}`,
        weekday: weekday.toLowerCase(),
        title: (title || '').trim(),
        tasks: Array.isArray(tasks) ? tasks : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const template = await dbUpsertRoutineTemplate(userId, req.body);
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save routine template' });
  }
});

/**
 * DELETE /api/tasks/templates/:id
 */
router.delete('/templates/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId || req.user?.isGuest) {
      return res.json({ success: true, id });
    }

    await dbDeleteRoutineTemplate(userId, id as string);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete routine template' });
  }
});

/**
 * GET /api/tasks
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json([]);
    }

    const { date, status } = req.query;
    const tasks = await dbGetTasks(
      userId,
      typeof date === 'string' ? date : undefined,
      typeof status === 'string' ? status : undefined
    );
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch tasks' });
  }
});

/**
 * POST /api/tasks
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const taskTitle = (req.body.title || req.body.name || '').trim();
    if (!taskTitle) {
      return res.status(400).json({ error: 'Task title or name is required' });
    }

    const task = await dbUpsertTask(userId, req.body);
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save task' });
  }
});

/**
 * PATCH /api/tasks/:id
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const taskId = parseInt(req.params.id as string, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = await dbUpsertTask(userId, { ...req.body, id: taskId });
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update task' });
  }
});

/**
 * DELETE /api/tasks/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const taskId = parseInt(req.params.id as string, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    await dbDeleteTask(userId, taskId);
    res.json({ success: true, id: taskId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete task' });
  }
});

export default router;
