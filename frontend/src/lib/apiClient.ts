import { supabase } from './supabaseClient';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * A basic API client wrapper around fetch that automatically handles adding
 * the Authorization token for Supabase Auth.
 */
export async function fetchBackend<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
    if (anonKey) headers['apikey'] = anonKey;
  } else if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`;
    headers['apikey'] = anonKey;
  }


  // Send all backend requests to the Express backend
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${backendBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'Backend API request failed';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch {
      // If not JSON, ignore
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}
