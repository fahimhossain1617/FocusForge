import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!configuredSupabaseUrl || !configuredSupabaseAnonKey) {
  console.warn('[FocusForge Auth] Supabase URL or Anon Key is missing from .env.local');
}

// createClient throws during module initialization for an empty URL, which
// previously made the whole guest experience render as a blank page when a
// deployment was missing its public Supabase configuration. An unreachable
// placeholder keeps the app usable offline; requests still fail normally and
// are handled by each feature's existing error path.
const supabaseUrl = configuredSupabaseUrl || 'https://focusforge-unconfigured.invalid';
const supabaseAnonKey = configuredSupabaseAnonKey || 'unconfigured-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
