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

// All review routes require authentication
router.use(requireAuth);

/**
 * Calculates progressive delay for subsequent prompts when user skips.
 * 1st skip: ~1.5 days (36h)
 * 2nd skip: ~3.5 days (84h)
 * 3rd skip: ~7 days (1 week)
 * 4th skip: ~14 days (2 weeks)
 * 5th skip: ~30 days (1 month)
 * 6th+ skip: ~45 days (1.5 months)
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
 * GET /api/reviews/state
 * Fetch current review prompt state for the authenticated user
 */
router.get('/state', async (req: AuthenticatedRequest, res: Response) => {
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

    // Check if user already has a row in review_prompt_state
    const { data: stateData, error: stateError } = await supabase
      .from('review_prompt_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (stateError) {
      console.error('[reviewRoutes] Failed to fetch review prompt state:', stateError);
      return res.status(500).json({ error: 'Failed to fetch review state' });
    }

    if (!stateData) {
      // Check if user already submitted a review directly in reviews table
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('created_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingReview) {
        // Self-heal prompt state to submitted
        await supabase.from('review_prompt_state').upsert({
          user_id: userId,
          status: 'submitted',
          submitted_at: existingReview.created_at,
          updated_at: new Date().toISOString(),
        });

        return res.json({
          status: 'submitted',
          meaningfulActions: 0,
          skipCount: 0,
          nextPromptAt: null,
          submittedAt: existingReview.created_at,
        });
      }

      return res.json({
        status: 'eligible',
        meaningfulActions: 0,
        skipCount: 0,
        nextPromptAt: null,
        submittedAt: null,
      });
    }

    return res.json({
      status: stateData.status || 'eligible',
      meaningfulActions: stateData.meaningful_actions || 0,
      skipCount: stateData.skip_count || 0,
      lastShownAt: stateData.last_shown_at,
      nextPromptAt: stateData.next_prompt_at,
      submittedAt: stateData.submitted_at,
    });
  } catch (err: any) {
    console.error('[reviewRoutes] Unexpected error in GET /state:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * POST /api/reviews/action
 * Increments meaningful action count for the user
 */
router.post('/action', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true, count: 0 });
    }

    // Fetch existing state
    const { data: stateData } = await supabase
      .from('review_prompt_state')
      .select('status, meaningful_actions')
      .eq('user_id', userId)
      .maybeSingle();

    if (stateData?.status === 'submitted') {
      return res.json({ success: true, status: 'submitted' });
    }

    const currentCount = stateData?.meaningful_actions || 0;
    const newCount = currentCount + 1;

    const { error: upsertError } = await supabase
      .from('review_prompt_state')
      .upsert({
        user_id: userId,
        status: stateData?.status || 'eligible',
        meaningful_actions: newCount,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.warn('[reviewRoutes] Action increment warning:', upsertError.message);
    }

    res.json({ success: true, count: newCount });
  } catch (err: any) {
    console.error('[reviewRoutes] Error in POST /action:', err);
    res.status(500).json({ error: err.message || 'Failed to record action' });
  }
});

/**
 * POST /api/reviews/skip
 * Records user clicking "Maybe Later" / "Skip", schedules progressive retry
 */
router.post('/skip', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true });
    }

    // Get current skip count
    const { data: stateData } = await supabase
      .from('review_prompt_state')
      .select('skip_count, status')
      .eq('user_id', userId)
      .maybeSingle();

    if (stateData?.status === 'submitted') {
      return res.json({ success: true, status: 'submitted' });
    }

    const currentSkipCount = stateData?.skip_count || 0;
    const newSkipCount = currentSkipCount + 1;
    const nextPromptDate = calculateNextPromptDate(newSkipCount);
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('review_prompt_state')
      .upsert({
        user_id: userId,
        status: 'skipped',
        meaningful_actions: 0, // Require new meaningful actions before prompting again
        skip_count: newSkipCount,
        last_shown_at: nowIso,
        next_prompt_at: nextPromptDate.toISOString(),
        updated_at: nowIso,
      });

    if (updateError) {
      console.error('[reviewRoutes] Failed to record skip:', updateError);
      return res.status(500).json({ error: 'Failed to record skip' });
    }

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
 * POST /api/reviews/submit
 * Persists user review directly to Supabase and permanently disables future prompts
 */
router.post('/submit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const isGuestUser = !userId || req.user?.isGuest || userId === 'guest';
    const effectiveUserId = isGuestUser ? null : userId;

    const { rating, comment } = req.body;

    // Validate rating
    const parsedRating = typeof rating === 'number' && rating >= 1 && rating <= 5 ? Math.round(rating) : null;
    const trimmedComment = typeof comment === 'string' && comment.trim().length > 0 ? comment.trim() : null;

    // Reject empty review
    if (parsedRating === null && trimmedComment === null) {
      return res.status(400).json({ error: 'Please provide either a star rating or a comment.' });
    }

    // If authenticated user, check if already submitted to prevent duplicate insertion
    if (effectiveUserId) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (existingReview) {
        // Idempotent: already submitted
        await supabase.from('review_prompt_state').upsert({
          user_id: effectiveUserId,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return res.json({ success: true, message: 'Review already submitted' });
      }
    }

    // Insert into reviews table
    const nowIso = new Date().toISOString();
    const { error: insertError } = await supabase.from('reviews').insert({
      user_id: effectiveUserId,
      rating: parsedRating,
      comment: trimmedComment,
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (insertError) {
      console.error('[reviewRoutes] Review insert error:', insertError);
      return res.status(500).json({ error: 'Failed to save review. Please try again.' });
    }

    // Permanently mark user state as 'submitted' if logged in
    if (effectiveUserId) {
      try {
        await supabase.from('review_prompt_state').upsert({
          user_id: effectiveUserId,
          status: 'submitted',
          submitted_at: nowIso,
          updated_at: nowIso,
        });
      } catch (e) {
        console.warn('[reviewRoutes] Warning updating prompt state after submission:', e);
      }
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

export default router;
