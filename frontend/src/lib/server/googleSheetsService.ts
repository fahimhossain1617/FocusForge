/**
 * Google Apps Script / Google Spreadsheet Webhook Service
 * 
 * Synchronizes support messages, problem reports, and feedback submissions
 * with a connected Google Sheet and triggers email notifications via Google Apps Script.
 */

export interface GoogleSyncPayload {
  type: 'support' | 'report' | 'feedback' | string;
  name?: string;
  email?: string;
  message?: string;
  subject?: string;
  category?: string;
  ticketNumber?: string;
  [key: string]: any;
}

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyXfmpwZBNBWuI-JcOS7Egtt9p1GJRqhaODNEbbvYUTzd91jgndM-LW1hjpACRJnAPy/exec';

export async function sendToGoogleAppsScript(
  payload: GoogleSyncPayload
): Promise<{ success: boolean; error?: string; data?: any }> {
  const scriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_WEBAPP_URL ||
    process.env.GOOGLE_SHEETS_SCRIPT_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL ||
    DEFAULT_APPS_SCRIPT_URL;

  if (!scriptUrl) {
    console.warn(
      '[GoogleAppsScript] GOOGLE_APPS_SCRIPT_WEBAPP_URL is not configured in .env.local. Skipping Google Sheet sync.'
    );
    return { success: false, error: 'GOOGLE_APPS_SCRIPT_WEBAPP_URL not set' };
  }

  try {
    const formattedMessage =
      payload.subject && payload.subject !== payload.message
        ? `[${payload.subject}] ${payload.message || ''}`
        : payload.message || '';

    const bodyData = {
      type: (payload.type || 'support').toLowerCase(),
      name: payload.name?.trim() || 'Anonymous User',
      email: payload.email?.trim() || 'N/A',
      message: formattedMessage.trim(),
      timestamp: new Date().toISOString(),
      ticketNumber: payload.ticketNumber || '',
      category: payload.category || '',
    };

    // Google Apps Script redirects (302) on successful POST.
    // 'text/plain;charset=utf-8' prevents CORS preflight and body parsing complications.
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(bodyData),
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`[GoogleAppsScript] Request failed with HTTP status ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const resJson = await response.json().catch(() => ({ success: true }));
    return { success: true, data: resJson };
  } catch (error: any) {
    console.error('[GoogleAppsScript] Error posting to Google Apps Script:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}
