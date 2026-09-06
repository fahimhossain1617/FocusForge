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

/**
 * GET /api/user/profile
 * Get current authenticated user profile
 */
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({
        id: 'guest',
        identifier: 'guest',
        authMethod: 'email',
        displayName: 'Guest User',
        avatarUrl: null,
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (data) {
      return res.json({
        id: data.id,
        identifier: data.identifier,
        authMethod: data.auth_method || 'email',
        displayName: data.display_name || 'User',
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
      });
    }

    // Fallback from auth metadata
    res.json({
      id: req.user.id,
      identifier: req.user.email || req.user.phone || 'User',
      authMethod: req.user.app_metadata?.provider || 'email',
      displayName: req.user.user_metadata?.display_name || 'User',
      avatarUrl: req.user.user_metadata?.avatar_url || null,
      createdAt: req.user.created_at || new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user profile' });
  }
});

/**
 * PATCH /api/user/profile
 * Update current user profile
 */
router.patch('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { displayName, avatarUrl, identifier } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined) updates.display_name = displayName;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    if (identifier !== undefined) updates.identifier = identifier;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user profile' });
  }
});

/**
 * GET /api/user/state
 * Get current user cloud state
 */
router.get('/state', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ state: null });
    }

    const { data, error } = await supabase
      .from('user_cloud_state')
      .select('state, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data ? data.state : null);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch cloud state' });
  }
});

/**
 * POST /api/user/state
 * Save or update current user cloud state
 */
router.post('/state', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { state } = req.body;
    if (!state) {
      return res.status(400).json({ error: 'State payload is required' });
    }

    const { data, error } = await supabase
      .from('user_cloud_state')
      .upsert({
        id: userId,
        state: state,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, updated_at: data.updated_at });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save cloud state' });
  }
});

/**
 * GET /api/user/onboarding
 * Get onboarding completion & preference state for authenticated user
 */
router.get('/onboarding', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({
        onboardingCompleted: false,
        onboardingCompletedAt: null,
        preferredLanguage: 'en',
        preferredTheme: 'dark',
        accountMode: 'guest',
        productTourCompleted: false,
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_completed_at, preferred_language, preferred_theme, account_mode, product_tour_completed')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (data) {
      return res.json({
        onboardingCompleted: Boolean(data.onboarding_completed),
        onboardingCompletedAt: data.onboarding_completed_at,
        preferredLanguage: data.preferred_language || 'en',
        preferredTheme: data.preferred_theme || 'dark',
        accountMode: data.account_mode || 'authenticated',
        productTourCompleted: Boolean(data.product_tour_completed),
      });
    }

    res.json({
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      preferredLanguage: 'en',
      preferredTheme: 'dark',
      accountMode: 'authenticated',
      productTourCompleted: false,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch onboarding state' });
  }
});

/**
 * POST /api/user/onboarding
 * Persist onboarding completion and preferences for current user
 */
router.post('/onboarding', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true, guest: true });
    }

    const {
      onboardingCompleted,
      preferredLanguage,
      preferredTheme,
      accountMode,
      productTourCompleted,
    } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (onboardingCompleted !== undefined) {
      updates.onboarding_completed = Boolean(onboardingCompleted);
      if (onboardingCompleted) {
        updates.onboarding_completed_at = new Date().toISOString();
      }
    }
    if (preferredLanguage !== undefined) updates.preferred_language = preferredLanguage;
    if (preferredTheme !== undefined) updates.preferred_theme = preferredTheme;
    if (accountMode !== undefined) updates.account_mode = accountMode;
    if (productTourCompleted !== undefined) updates.product_tour_completed = Boolean(productTourCompleted);

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('onboarding_completed, onboarding_completed_at, preferred_language, preferred_theme, account_mode, product_tour_completed')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save onboarding state' });
  }
});

export default router;
