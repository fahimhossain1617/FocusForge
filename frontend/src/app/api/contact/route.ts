import { NextResponse } from 'next/server';
import { sendToGoogleAppsScript } from '@/lib/server/googleSheetsService';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      type = 'support', // 'support' | 'report' | 'feedback'
      name = '',
      email = '',
      message = '',
      subject = '',
      category = '',
    } = body;

    const trimmedMsg = (message || body.description || '').trim();
    if (!trimmedMsg) {
      return NextResponse.json(
        { success: false, error: 'Message content is required.' },
        { status: 400 }
      );
    }

    const normalizedType = String(type).toLowerCase();
    const senderEmail = (email || '').trim();

    // Contact Support requires a valid email for communication
    if (normalizedType === 'support' || normalizedType === 'contact') {
      if (!senderEmail || !senderEmail.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'Valid email address is required for Contact Support.' },
          { status: 400 }
        );
      }
    }

    // Forward submission to Google Apps Script Web App (Spreadsheet & MailApp)
    const syncRes = await sendToGoogleAppsScript({
      type: normalizedType === 'contact' ? 'support' : normalizedType,
      name: (name || 'User').trim(),
      email: senderEmail || 'N/A',
      message: trimmedMsg,
      subject: (subject || body.title || '').trim(),
      category: (category || '').trim(),
    });

    return NextResponse.json({
      success: true,
      message: 'Submission successfully received and processed.',
      syncedToGoogleSheet: syncRes.success,
    });
  } catch (error: any) {
    console.error('[API /api/contact Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
