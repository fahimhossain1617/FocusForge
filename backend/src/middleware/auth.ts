import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Initialize supabase client (ensure these vars are set in .env)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const apikey = req.headers['apikey'] as string | undefined;

    if (!authHeader && !apikey) {
      req.user = { id: 'guest', isGuest: true };
      return next();
    }

    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

    if (token === 'guest' || token === supabaseAnonKey || apikey === supabaseAnonKey) {
      req.user = { id: 'guest', isGuest: true };
      return next();
    }

    // Verify the JWT token using Supabase for logged-in users
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Gracefully fall back to guest mode
      req.user = { id: 'guest', isGuest: true };
      return next();
    }

    // Attach user to request for downstream handlers
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal authentication error' });
  }
};
