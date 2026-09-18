import { supabase } from './supabaseClient';
import { getBackendUrl } from './backendUrl';

/**
 * A resilient API client wrapper around fetch that automatically handles adding
 * the Authorization token for Supabase Auth.
 * Includes intelligent failover from Express port 5000 to internal Next.js /api routes
 * when port 5000 is not running.
 */
export async function fetchBackend<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      if (anonKey) headers['apikey'] = anonKey;
    } else if (anonKey) {
      headers['Authorization'] = `Bearer ${anonKey}`;
      headers['apikey'] = anonKey;
    }
  } catch {}

  const backendBase = getBackendUrl();
  const primaryUrl = endpoint.startsWith('http') 
    ? endpoint 
    : `${backendBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const relativeUrl = endpoint.startsWith('http')
    ? endpoint
    : `${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const executeFetch = async (targetUrl: string, timeoutMs: number = 10000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    };

    try {
      const res = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  let response: Response;

  try {
    response = await executeFetch(primaryUrl, 10000);
  } catch (err: any) {
    // If primary backend failed (e.g. port 5000 not started or offline) and primary was different from relative:
    if (primaryUrl !== relativeUrl && !options.signal?.aborted) {
      try {
        response = await executeFetch(relativeUrl, 10000);
      } catch (fallbackErr: any) {
        if (fallbackErr.name === 'AbortError' && !options.signal) {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw fallbackErr;
      }
    } else {
      if (err.name === 'AbortError' && !options.signal) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      throw err;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your session has expired. Please log in again.');
    }
    
    let errorMsg = 'Backend API request failed';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}
