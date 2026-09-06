import { NextRequest, NextResponse } from 'next/server';
import { executeAIAction, transcribeAudio } from '@/lib/server/aiService';
import { getUserTokenStatus, consumeUserTokens, estimateTokenUsage } from '@/lib/server/aiTokenService';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');

  const searchParams = request.nextUrl.searchParams;
  const lang = searchParams.get('lang') || request.headers.get('x-app-lang') || 'bn';
  const guestId = request.headers.get('x-guest-id') || 'guest';
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  let userId: string | null = null;
  let isGuest = true;

  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      userId = user.id;
      isGuest = false;
    }
  }

  if (pathStr === 'ai/tokens') {
    const status = await getUserTokenStatus(userId, isGuest, guestId, lang);
    return NextResponse.json(status);
  }

  if (pathStr === 'ai/agent/sessions') {
    return NextResponse.json([]);
  }

  if (pathStr.startsWith('ai/agent/sessions/') && pathStr.endsWith('/messages')) {
    return NextResponse.json([]);
  }

  if (pathStr === 'health') {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  return NextResponse.json({ ok: true, path: pathStr });
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');

  const searchParams = request.nextUrl.searchParams;
  const lang = searchParams.get('lang') || request.headers.get('x-app-lang') || 'bn';
  const guestId = request.headers.get('x-guest-id') || 'guest';
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  let userId: string | null = null;
  let isGuest = true;

  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      userId = user.id;
      isGuest = false;
    }
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  // 1. AI Agent Chat
  if (pathStr === 'ai/agent/chat') {
    const tokenStatus = await getUserTokenStatus(userId, isGuest, guestId, lang);
    if (tokenStatus.isExhausted || tokenStatus.remaining <= 0) {
      const message = lang === 'bn'
        ? `আপনার ৫,০০০ AI টোকেন শেষ হয়ে গেছে। টোকেন রিসেট হওয়ার তারিখ: ${tokenStatus.formattedResetDate} (বাকি: ${tokenStatus.formattedRemainingTime})`
        : `Your 5,000 AI tokens have been exhausted. Tokens will reset on: ${tokenStatus.formattedResetDate} (${tokenStatus.formattedRemainingTime} remaining)`;

      return NextResponse.json({
        error: 'AI_TOKENS_EXHAUSTED',
        code: 'TOKENS_EXHAUSTED',
        tokenStatus,
        message,
      }, { status: 429 });
    }

    const { sessionId, message: userMsg, context: wsContext, history } = body;
    const aiPayload = {
      userQuery: userMsg,
      context: wsContext,
      history: history || [],
      currentDate: new Date().toISOString().split('T')[0],
    };

    const rawResult: any = await executeAIAction('agentChat', aiPayload);
    const tokensUsed = estimateTokenUsage(JSON.stringify(aiPayload), JSON.stringify(rawResult));
    const updatedTokens = await consumeUserTokens(userId, isGuest, guestId, tokensUsed, lang);

    const activeSessionId = sessionId || `session_${Date.now()}`;
    const aiMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant' as const,
      content: rawResult.message || (lang === 'bn' ? 'কীভাবে সাহায্য করতে পারি?' : 'How can I assist you?'),
      intent: rawResult.intent || 'GREETING_OR_GENERAL',
      payload: rawResult.payload || null,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      sessionId: activeSessionId,
      aiMessage,
      tokenStatus: updatedTokens,
    });
  }

  // 2. Audio Voice Transcription
  if (pathStr === 'ai/transcribe') {
    const { audio, mimeType, language } = body;
    const text = await transcribeAudio(audio, mimeType || 'audio/webm', language || lang);
    return NextResponse.json({ text });
  }

  // 3. Specific AI Actions (what-should-i-do, breakdown, parse-task, etc.)
  if (pathStr.startsWith('ai/')) {
    const actionName = pathStr.replace(/^ai\//, '');
    let actionKey = actionName;
    if (actionName === 'what-should-i-do') actionKey = 'whatShouldIDo';
    if (actionName === 'breakdown') actionKey = 'taskBreakdown';
    if (actionName === 'parse-task') actionKey = 'parseTask';

    try {
      const result = await executeAIAction(actionKey, body);
      const tokensUsed = estimateTokenUsage(JSON.stringify(body), JSON.stringify(result));
      const tokenStatus = await consumeUserTokens(userId, isGuest, guestId, tokensUsed, lang);
      return NextResponse.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'AI execution failed' }, { status: 500 });
    }
  }

  // 4. User Cloud State
  if (pathStr === 'user/cloud-state') {
    if (userId) {
      try {
        await supabase.from('user_cloud_state').upsert({
          user_id: userId,
          state_data: body.stateData || body,
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ ok: true, path: pathStr });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return NextResponse.json({ success: true });
}
