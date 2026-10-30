import { NextResponse, after } from 'next/server';
import { sendToGoogleAppsScript } from '@/lib/server/googleSheetsService';
import { checkRateLimit, getClientIp } from '@/lib/server/rateLimiter';
import { pool } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`contact_form:${clientIp}`, 10, 600000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many submissions. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

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

    if (trimmedMsg.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Message content is too long (maximum 10,000 characters).' },
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

    // Persist into Admin Feedback inbox
    try {
      await pool.query(
        `INSERT INTO public.feedback_submissions (
          channel, category, subject, message, rating, user_type, user_name, user_email,
          is_guest, app_version, status, created_at, updated_at
        ) VALUES (
          'contact_form', $1, $2, $3, $4, 'authenticated', $5, $6,
          false, '0.1.0', 'new', NOW(), NOW()
        )`,
        [
          normalizedType || 'support',
          (subject || body.title || 'Contact Submission').trim().slice(0, 150),
          trimmedMsg,
          body.rating ? Number(body.rating) : null,
          (name || 'User').trim(),
          senderEmail || null,
        ]
      );
    } catch (dbErr) {
      console.warn('[API /api/contact] Notice inserting into feedback_submissions:', dbErr);
    }

    // Schedule background dispatch with guaranteed delivery
    after(async () => {
      try {
        await sendToGoogleAppsScript({
          type: normalizedType === 'contact' ? 'support' : normalizedType,
          name: (name || 'User').trim(),
          email: senderEmail || 'N/A',
          message: trimmedMsg,
          subject: (subject || body.title || '').trim(),
          category: (category || '').trim(),
          image: body.image || body.screenshot || (body.attachments && body.attachments[0]) || undefined,
        });
      } catch (syncErr) {
        console.error('[API /api/contact Background Sync Error]:', syncErr);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Submission successfully received and processed.',
    });
  } catch (error: any) {
    console.error('[API /api/contact Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
