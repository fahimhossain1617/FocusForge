import dns from 'node:dns';
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

import { NextRequest, NextResponse } from 'next/server';
import { executeAIAction, transcribeAudio } from '@/lib/server/aiService';
import { getUserTokenStatus, consumeUserTokens, estimateTokenUsage } from '@/lib/server/aiTokenService';
import { 
  getChatSessions, 
  getChatMessages, 
  createChatSession, 
  updateChatSessionTitle, 
  addChatMessage, 
  deleteChatSession, 
  generateSmartTitle 
} from '@/lib/server/aiChatDb';
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

  if (token && token !== 'guest') {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        isGuest = false;
      }
    } catch (err) {
      console.warn('[route GET] Token verification fallback:', err);
    }
  }

  // Token status
  if (pathStr === 'ai/tokens') {
    const status = await getUserTokenStatus(userId, isGuest, guestId, lang);
    return NextResponse.json(status);
  }

  // List chat sessions from Supabase
  if (pathStr === 'ai/agent/sessions') {
    try {
      const sbUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvielktfijxecszlqjxz.supabase.co').replace(/^["']|["']$/g, '').trim();
      const sbKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_3_7lyLjPZvHgZGiaZB9T3A_505QmmWf').replace(/^["']|["']$/g, '').trim();
      
      let restUrl = `${sbUrl}/rest/v1/ai_chat_sessions?select=id,user_id,title,created_at,updated_at&order=updated_at.desc&limit=50`;
      if (userId) {
        restUrl += `&user_id=eq.${userId}`;
      } else {
        restUrl += `&user_id=is.null`;
      }

      const res = await fetch(restUrl, {
        headers: {
          'apikey': sbKey,
          'Authorization': `Bearer ${token || sbKey}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `Supabase REST failed (${res.status}): ${errText}` }, { status: res.status });
      }

      const sessions = await res.json();
      return NextResponse.json(sessions);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || String(err), cause: err?.cause?.message || err?.cause?.code || String(err?.cause), stack: err?.stack }, { status: 500 });
    }
  }

  // List messages for a specific session from Supabase
  if (pathStr.startsWith('ai/agent/sessions/') && pathStr.endsWith('/messages')) {
    const parts = pathStr.split('/');
    const sessionId = parts[3];
    if (!sessionId) return NextResponse.json([]);
    const messages = await getChatMessages(sessionId);
    return NextResponse.json(messages);
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

  if (token && token !== 'guest') {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        isGuest = false;
      }
    } catch (err) {
      console.warn('[route POST] Token verification fallback:', err);
    }
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  // Explicit Create Session endpoint
  if (pathStr === 'ai/agent/sessions') {
    try {
      const title = body.title || (lang === 'bn' ? 'নতুন চ্যাট' : 'New Conversation');
      const session = await createChatSession(userId, title);
      return NextResponse.json(session);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to create session' }, { status: 500 });
    }
  }

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

    const { sessionId: requestedSessionId, message: userMsg, context: wsContext, history } = body;
    
    // Fetch prior messages from Supabase if not provided in request history
    let chatHistory = history || [];
    if ((!chatHistory || chatHistory.length === 0) && requestedSessionId && requestedSessionId !== 'guest-session') {
      try {
        const priorMsgs = await getChatMessages(requestedSessionId);
        if (Array.isArray(priorMsgs) && priorMsgs.length > 0) {
          chatHistory = priorMsgs.slice(-8).map(m => ({ role: m.role, content: m.content }));
        }
      } catch (err) {
        console.warn('[route POST] History fetch fallback:', err);
      }
    }

    const aiPayload = {
      userQuery: userMsg,
      context: wsContext,
      history: chatHistory,
      currentDate: new Date().toISOString().split('T')[0],
    };

    let rawResult: any;
    try {
      rawResult = await executeAIAction('agentChat', aiPayload);
    } catch (err) {
      console.warn('[route POST] agentChat error, using fallback:', err);
      rawResult = {
        intent: 'GREETING_OR_GENERAL',
        message: lang === 'bn' 
          ? 'কীভাবে আপনাকে স্টাডি প্ল্যান বা উৎপাদনশীলতায় সাহায্য করতে পারি?' 
          : 'How can I assist you with your productivity or study plan?',
        payload: null
      };
    }

    const tokensUsed = estimateTokenUsage(JSON.stringify(aiPayload), JSON.stringify(rawResult));
    const updatedTokens = await consumeUserTokens(userId, isGuest, guestId, tokensUsed, lang);

    // Save or update session in Supabase
    let activeSessionId = requestedSessionId;
    let sessionTitle: string | undefined = undefined;

    let dbStep = "start";
    try {
      if (!activeSessionId || activeSessionId === 'guest-session' || activeSessionId.startsWith('guest_') || activeSessionId.startsWith('local_')) {
        dbStep = "generateSmartTitle";
        sessionTitle = await generateSmartTitle(userMsg);
        dbStep = "createChatSession";
        const newSession = await createChatSession(userId, sessionTitle);
        activeSessionId = newSession.id;
      } else {
        // Existing session: if it has default title, update with smart title
        const existingMessages = await getChatMessages(activeSessionId);
        if (existingMessages.length <= 1) {
          dbStep = "generateSmartTitle_existing";
          sessionTitle = await generateSmartTitle(userMsg);
          dbStep = "updateChatSessionTitle";
          await updateChatSessionTitle(activeSessionId, sessionTitle);
        }
      }

      // Save user message to Supabase
      dbStep = "addChatMessage_user";
      await addChatMessage(activeSessionId, 'user', userMsg);

      // Save AI assistant response to Supabase
      dbStep = "addChatMessage_assistant";
      const savedAiRow = await addChatMessage(
        activeSessionId,
        'assistant',
        rawResult.message || (lang === 'bn' ? 'কীভাবে সাহায্য করতে পারি?' : 'How can I assist you?'),
        rawResult.intent || 'GREETING_OR_GENERAL',
        rawResult.payload || null
      );

      return NextResponse.json({
        sessionId: activeSessionId,
        sessionTitle,
        aiMessage: {
          id: savedAiRow.id,
          session_id: activeSessionId,
          role: 'assistant' as const,
          content: savedAiRow.content,
          intent: savedAiRow.intent,
          payload: savedAiRow.payload_json,
          createdAt: savedAiRow.created_at,
        },
        tokenStatus: updatedTokens,
      });
    } catch (dbErr: any) {
      const causeMsg = dbErr?.cause?.message || dbErr?.cause?.code || '';
      const stackLine = (dbErr?.stack || '').split('\n').slice(0, 3).join(' -> ');
      const errDetail = `[Step: ${dbStep}] ` + (dbErr?.message || String(dbErr)) + (causeMsg ? ` (Cause: ${causeMsg})` : '') + ` | Stack: ${stackLine}`;
      console.error('[route POST] Failed to persist chat to Supabase:', errDetail);
      
      // Graceful fallback response if DB save fails
      const fallbackAiMsg = {
        id: `msg_${Date.now()}`,
        role: 'assistant' as const,
        content: rawResult.message || (lang === 'bn' ? 'কীভাবে সাহায্য করতে পারি?' : 'How can I assist you?'),
        intent: rawResult.intent || 'GREETING_OR_GENERAL',
        payload: rawResult.payload || null,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        sessionId: activeSessionId || `session_${Date.now()}`,
        sessionTitle: sessionTitle || userMsg.substring(0, 25),
        aiMessage: fallbackAiMsg,
        tokenStatus: updatedTokens,
      });
    }
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
  const { path } = await context.params;
  const pathStr = path.join('/');

  if (pathStr.startsWith('ai/agent/sessions/')) {
    const parts = pathStr.split('/');
    const sessionId = parts[3];
    if (sessionId) {
      await deleteChatSession(sessionId);
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return NextResponse.json({ success: true });
}
