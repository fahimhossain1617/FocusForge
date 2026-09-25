import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  dbGetReviewPromptState,
  dbUpsertReviewPromptState,
  dbInsertReview,
} from '../services/db';

const router = Router();
router.use(requireAuth);

/**
 * Calculates progressive delay for subsequent prompts when user skips.
 */
export function calculateNextPromptDate(newSkipCount: number): Date {
  const now = Date.now();
  let delayHours = 36; // 1.5 days

  if (newSkipCount === 1) {
    delayHours = 36;
  } else if (newSkipCount === 2) {
    delayHours = 84; // 3.5 days
  } else if (newSkipCount === 3) {
    delayHours = 24 * 7; // 7 days
  } else if (newSkipCount === 4) {
    delayHours = 24 * 14; // 14 days
  } else if (newSkipCount === 5) {
    delayHours = 24 * 30; // 30 days
  } else {
    delayHours = 24 * 45; // 45 days
  }

  return new Date(now + delayHours * 60 * 60 * 1000);
}

/**
 * GET /api/reviews/state and GET /api/reviews/prompt-state
 */
router.get(['/state', '/prompt-state'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({
        status: 'guest',
        meaningfulActions: 0,
        skipCount: 0,
        nextPromptAt: null,
        submittedAt: null,
      });
    }

    const state = await dbGetReviewPromptState(userId);
    if (!state) {
      return res.json({
        status: 'eligible',
        meaningfulActions: 0,
        skipCount: 0,
        nextPromptAt: null,
        submittedAt: null,
      });
    }

    return res.json(state);
  } catch (err: any) {
    console.error('[reviewRoutes] Unexpected error in GET /state:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * POST /api/reviews/action
 */
router.post('/action', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true, count: 0 });
    }

    const state = await dbGetReviewPromptState(userId);
    if (state?.status === 'submitted') {
      return res.json({ success: true, status: 'submitted' });
    }

    const currentCount = state?.meaningfulActions || 0;
    const newCount = currentCount + 1;

    await dbUpsertReviewPromptState(userId, {
      status: state?.status || 'eligible',
      meaningfulActions: newCount,
      skipCount: state?.skipCount || 0,
    });

    res.json({ success: true, count: newCount });
  } catch (err: any) {
    console.error('[reviewRoutes] Error in POST /action:', err);
    res.status(500).json({ error: err.message || 'Failed to record action' });
  }
});

/**
 * POST /api/reviews/skip
 */
router.post('/skip', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true });
    }

    const state = await dbGetReviewPromptState(userId);
    if (state?.status === 'submitted') {
      return res.json({ success: true, status: 'submitted' });
    }

    const currentSkipCount = state?.skipCount || 0;
    const newSkipCount = currentSkipCount + 1;
    const nextPromptDate = calculateNextPromptDate(newSkipCount);
    const nowIso = new Date().toISOString();

    await dbUpsertReviewPromptState(userId, {
      status: 'skipped',
      meaningfulActions: 0,
      skipCount: newSkipCount,
      lastShownAt: nowIso,
      nextPromptAt: nextPromptDate.toISOString(),
    });

    res.json({
      success: true,
      skipCount: newSkipCount,
      nextPromptAt: nextPromptDate.toISOString(),
    });
  } catch (err: any) {
    console.error('[reviewRoutes] Error in POST /skip:', err);
    res.status(500).json({ error: err.message || 'Failed to record skip' });
  }
});

/**
 * POST /api/reviews/submit and POST /api/reviews
 */
router.post(['/submit', '/'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const isGuestUser = !userId || req.user?.isGuest || userId === 'guest';
    const effectiveUserId = isGuestUser ? null : userId;

    const { rating, comment } = req.body;
    const parsedRating = typeof rating === 'number' && rating >= 1 && rating <= 5 ? Math.round(rating) : null;
    const trimmedComment = typeof comment === 'string' && comment.trim().length > 0 ? comment.trim() : null;

    if (parsedRating === null && trimmedComment === null) {
      return res.status(400).json({ error: 'Please provide either a star rating or a comment.' });
    }

    if (effectiveUserId) {
      await dbInsertReview(effectiveUserId, parsedRating || 5, trimmedComment || '');
      await dbUpsertReviewPromptState(effectiveUserId, {
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: 'Review submitted successfully',
    });
  } catch (err: any) {
    console.error('[reviewRoutes] Error in POST /submit:', err);
    res.status(500).json({ error: err.message || 'Failed to submit review' });
  }
});

/**
 * POST /api/reviews/prompt-state
 */
router.post('/prompt-state', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true });
    }

    const saved = await dbUpsertReviewPromptState(userId, req.body);
    res.json(saved);
  } catch (err: any) {
    console.error('[reviewRoutes] Error in POST /prompt-state:', err);
    res.status(500).json({ error: err.message || 'Failed to update prompt state' });
  }
});

export default router;
