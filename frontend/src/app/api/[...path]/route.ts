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
import {
  dbGetTasks,
  dbUpsertTask,
  dbUpdateTask,
  dbDeleteTask,
  dbGetRoutineTemplates,
  dbUpsertRoutineTemplate,
  dbDeleteRoutineTemplate,
  dbGetNotes,
  dbUpsertNote,
  dbUpdateNote,
  dbDeleteNote,
  dbGetMindItems,
  dbUpsertMindItem,
  dbDeleteMindItem,
  dbDeleteAllMindItems,
  dbGetFocusSessions,
  dbUpsertFocusSession,
  dbEndFocusSession,
  dbAddDistraction,
  dbGetDiaryTopics,
  dbUpsertDiaryTopic,
  dbDeleteDiaryTopic,
  dbUpsertDiaryEntry,
  dbDeleteDiaryEntry,
  dbGetLearningData,
  dbUpsertLearningFolder,
  dbUpdateLearningFolder,
  dbDeleteLearningFolder,
  dbUpsertLearningLog,
  dbDeleteLearningLog,
  dbGetReviewPromptState,
  dbUpsertReviewPromptState,
  dbInsertReview,
  dbClearAllChatSessions,
  pool,
} from '@/lib/server/db';
import { supabase } from '@/lib/supabaseClient';

async function extractAuth(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lang = searchParams.get('lang') || request.headers.get('x-app-lang') || 'bn';
  const guestId = request.headers.get('x-guest-id') || 'guest';
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

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
      console.warn('[route auth] Token verification fallback:', err);
    }
  }

  return { userId, isGuest, guestId, lang, token };
}

// =========================================================================
// GET HANDLER
// =========================================================================
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');
  const searchParams = request.nextUrl.searchParams;

  const { userId, isGuest, guestId, lang } = await extractAuth(request);

  // 1. Token status
  if (pathStr === 'ai/tokens') {
    const status = await getUserTokenStatus(userId, isGuest, guestId, lang);
    return NextResponse.json(status);
  }

  // 2. Notifications API
  if (pathStr === 'notifications/reminders') {
    const isBengali = lang === 'bn';
    return NextResponse.json({
      success: true,
      message: isBengali ? 'রিমাইন্ডার তালিকা সক্রিয়' : 'Reminder queue active',
      timestamp: new Date().toISOString(),
    });
  }

  // 3. AI Agent Sessions & Messages
  if (pathStr === 'ai/agent/sessions' || pathStr === 'ai/sessions') {
    try {
      const sessions = await getChatSessions(userId);
      return NextResponse.json(sessions);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch sessions' }, { status: 500 });
    }
  }

  if (
    (pathStr.startsWith('ai/agent/sessions/') || pathStr.startsWith('ai/sessions/')) &&
    pathStr.endsWith('/messages')
  ) {
    const parts = pathStr.split('/');
    const sessionId = parts[parts.length - 2];
    if (!sessionId) return NextResponse.json([]);
    const messages = await getChatMessages(sessionId);
    return NextResponse.json(messages);
  }

  // 4. Tasks & Routine Templates
  if (pathStr === 'tasks/templates') {
    try {
      const templates = await dbGetRoutineTemplates(userId);
      return NextResponse.json(templates);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch routine templates' }, { status: 500 });
    }
  }

  if (pathStr === 'tasks') {
    try {
      const date = searchParams.get('date') || undefined;
      const status = searchParams.get('status') || undefined;
      const tasks = await dbGetTasks(userId, date, status);
      return NextResponse.json(tasks);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch tasks' }, { status: 500 });
    }
  }

  // 5. Notes
  if (pathStr === 'notes') {
    try {
      const notes = await dbGetNotes(userId);
      return NextResponse.json(notes);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch notes' }, { status: 500 });
    }
  }

  // 6. Mind Items
  if (pathStr === 'mind') {
    try {
      const items = await dbGetMindItems(userId);
      return NextResponse.json(items);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch mind items' }, { status: 500 });
    }
  }

  // 7. Focus Sessions
  if (pathStr === 'focus/sessions') {
    try {
      const sessions = await dbGetFocusSessions(userId);
      return NextResponse.json(sessions);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch focus sessions' }, { status: 500 });
    }
  }

  // 8. Diary Topics & Entries
  if (pathStr === 'diary/topics') {
    try {
      const topics = await dbGetDiaryTopics(userId);
      return NextResponse.json(topics);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch diary topics' }, { status: 500 });
    }
  }

  // 9. Learning Hub Data
  if (pathStr === 'learning/data') {
    try {
      const data = await dbGetLearningData(userId);
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch learning data' }, { status: 500 });
    }
  }

  // 10. Reviews Prompt State
  if (pathStr === 'reviews/prompt-state') {
    try {
      const state = await dbGetReviewPromptState(userId);
      return NextResponse.json(state || { status: 'eligible', meaningfulActions: 0, skipCount: 0 });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch review prompt state' }, { status: 500 });
    }
  }

  // 11. Health Check
  if (pathStr === 'health') {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  return NextResponse.json({ ok: true, path: pathStr });
}

// =========================================================================
// POST HANDLER
// =========================================================================
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');

  const { userId, isGuest, guestId, lang } = await extractAuth(request);

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  // Explicit Create Session endpoint
  if (pathStr === 'ai/agent/sessions' || pathStr === 'ai/sessions') {
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
    const { sessionId: requestedSessionId, message: userMsg, context: wsContext, history, model: selectedModel } = body;
    const tokenStatus = await getUserTokenStatus(userId, isGuest, guestId, lang);
    if (tokenStatus.isExhausted || tokenStatus.remaining <= 0) {
      const message = isGuest
        ? (lang === 'bn'
            ? `আপনার গেস্ট লিমিট শেষ হয়ে গেছে। আনলিমিটেড ব্যবহার ও ক্লাউড সেভ সুবিধা পেতে অনুগ্রহ করে লগইন করুন।`
            : `Your guest limit has been reached. Please log in to unlock full access and cloud sync.`)
        : (lang === 'bn'
            ? `আপনার আজকের লিমিট শেষ হয়ে গেছে।\n\n• লিমিট রিসেট হওয়ার তারিখ: ${tokenStatus.formattedResetDate}\n• অবশিষ্ট সময়: ${tokenStatus.formattedRemainingTime}\n\nঅনুগ্রহ করে রিসেট হওয়া পর্যন্ত অপেক্ষা করুন। লিমিট রিসেট হওয়ার পর FocusForge AI Agent পুনরায় আপনাকে সাহায্য করতে সম্পূর্ণ প্রস্তুত থাকবে!`
            : `Your daily limit has been reached.\n\n• Resets on: ${tokenStatus.formattedResetDate}\n• Remaining time: ${tokenStatus.formattedRemainingTime}\n\nPlease wait until the reset time. Once refreshed, FocusForge AI Agent will be fully ready to assist you!`);

      const exhaustedAiMsg = {
        id: 'msg_exhausted_' + Date.now(),
        role: 'assistant' as const,
        content: message,
        intent: isGuest ? 'REQUIRE_LOGIN' : 'LIMIT_EXHAUSTED',
        payload: isGuest ? { requireLogin: true } : { resetDate: tokenStatus.formattedResetDate, remainingTime: tokenStatus.formattedRemainingTime },
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        sessionId: requestedSessionId || (isGuest ? 'guest-session' : `session_${Date.now()}`),
        sessionTitle: userMsg ? userMsg.substring(0, 25) : 'FocusForge AI',
        aiMessage: exhaustedAiMsg,
        tokenStatus,
        isExhausted: true,
      });
    }
    
    // Fetch prior messages from database if not provided
    let recentHistory = history || [];
    if ((!recentHistory || recentHistory.length === 0) && requestedSessionId && requestedSessionId !== 'guest-session') {
      try {
        const priorMsgs = await getChatMessages(requestedSessionId);
        if (Array.isArray(priorMsgs) && priorMsgs.length > 0) {
          recentHistory = priorMsgs.slice(-8).map((m: any) => ({
            role: m.role,
            content: m.content
          }));
        }
      } catch (err) {
        console.warn('[route chat] Failed to retrieve prior messages:', err);
      }
    }

    let result: any;
    try {
      result = await executeAIAction('agentChat', {
        userQuery: userMsg,
        context: wsContext,
        recentHistory,
        currentDate: new Date().toISOString().split('T')[0],
        model: selectedModel || 'smart',
      });
    } catch (err: any) {
      result = {
        intent: 'GREETING_OR_GENERAL',
        message: lang === 'bn'
          ? 'দুঃখিত, এআই সার্ভার সাময়িক ব্যস্ত ছিল। আপনার পড়াশোনা বা কাজের বিষয়ে অন্য কোনো সাহায্য লাগলে বলতে পারেন!'
          : 'FocusForge AI is temporarily busy. Please let me know if you need help with anything else!',
        payload: null
      };
    }

    const tokensUsed = estimateTokenUsage(JSON.stringify(body), JSON.stringify(result), selectedModel || 'smart');
    const updatedTokens = await consumeUserTokens(userId, isGuest, guestId, tokensUsed, lang);

    let activeSessionId = requestedSessionId;
    let finalTitle: string | undefined = undefined;

    if (!activeSessionId || activeSessionId === 'guest-session' || activeSessionId.startsWith('guest_')) {
      finalTitle = await generateSmartTitle(userMsg);
      const newSession = await createChatSession(userId, finalTitle);
      activeSessionId = newSession.id;
    } else {
      try {
        const sessions = await getChatSessions(userId);
        const existing = sessions.find((s) => s.id === activeSessionId);
        if (existing && (existing.title === 'New Conversation' || !existing.title)) {
          finalTitle = await generateSmartTitle(userMsg);
          await updateChatSessionTitle(activeSessionId, finalTitle);
        } else if (existing) {
          finalTitle = existing.title;
        }
      } catch {}
    }

    await addChatMessage(activeSessionId, 'user', userMsg);
    const assistantRow = await addChatMessage(
      activeSessionId, 
      'assistant', 
      result.message, 
      result.intent, 
      result.payload
    );

    const aiMessage = {
      id: assistantRow.id,
      session_id: activeSessionId,
      role: 'assistant' as const,
      content: result.message,
      intent: result.intent,
      payload: result.payload,
      createdAt: assistantRow.created_at,
    };

    return NextResponse.json({
      sessionId: activeSessionId,
      sessionTitle: finalTitle,
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

  // 4. Tasks & Routine Templates
  if (pathStr === 'tasks/templates') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertRoutineTemplate(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save routine template' }, { status: 500 });
    }
  }

  if (pathStr === 'tasks') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertTask(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save task' }, { status: 500 });
    }
  }

  // 5. Notes
  if (pathStr === 'notes') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertNote(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save note' }, { status: 500 });
    }
  }

  // 6. Mind Items
  if (pathStr === 'mind') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertMindItem(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save mind item' }, { status: 500 });
    }
  }

  // 7. Focus Sessions & Distractions
  if (pathStr === 'focus/sessions') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertFocusSession(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save focus session' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('focus/sessions/') && pathStr.endsWith('/distractions')) {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sessionId = pathStr.split('/')[2];
    try {
      const saved = await dbAddDistraction(userId, sessionId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to add distraction' }, { status: 500 });
    }
  }

  // 8. Diary Topics & Entries
  if (pathStr === 'diary/topics') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertDiaryTopic(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save diary topic' }, { status: 500 });
    }
  }

  if (pathStr === 'diary/entries') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertDiaryEntry(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save diary entry' }, { status: 500 });
    }
  }

  // 9. Learning Hub Folders & Logs
  if (pathStr === 'learning/folders') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertLearningFolder(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save learning folder' }, { status: 500 });
    }
  }

  if (pathStr === 'learning/logs') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertLearningLog(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save learning log' }, { status: 500 });
    }
  }

  // 10. Reviews & Prompt State
  if (pathStr === 'reviews/prompt-state') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbUpsertReviewPromptState(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to update review prompt state' }, { status: 500 });
    }
  }

  if (pathStr === 'reviews') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const saved = await dbInsertReview(userId, body.rating, body.comment);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to submit review' }, { status: 500 });
    }
  }

  // 11. User Cloud State
  if (pathStr === 'user/cloud-state') {
    if (userId) {
      try {
        await pool.query(
          `
          INSERT INTO user_cloud_state (id, state, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            state = EXCLUDED.state,
            updated_at = NOW()
          `,
          [userId, JSON.stringify(body.stateData || body)]
        );
      } catch {}
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ ok: true, path: pathStr });
}

// =========================================================================
// PATCH HANDLER
// =========================================================================
export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');

  const { userId } = await extractAuth(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  // 1. Tasks: PATCH /api/tasks/:id
  if (pathStr.startsWith('tasks/')) {
    const taskId = parseInt(pathStr.split('/')[1], 10);
    if (!isNaN(taskId)) {
      try {
        const updated = await dbUpdateTask(userId, taskId, body);
        return NextResponse.json(updated);
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to update task' }, { status: 500 });
      }
    }
  }

  // 2. Notes: PATCH /api/notes/:id
  if (pathStr.startsWith('notes/')) {
    const noteId = parseInt(pathStr.split('/')[1], 10);
    if (!isNaN(noteId)) {
      try {
        const updated = await dbUpdateNote(userId, noteId, body);
        return NextResponse.json(updated);
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to update note' }, { status: 500 });
      }
    }
  }

  // 3. Focus: PATCH /api/focus/sessions/:id/end
  if (pathStr.startsWith('focus/sessions/') && pathStr.endsWith('/end')) {
    const sessionId = pathStr.split('/')[2];
    try {
      const updated = await dbEndFocusSession(
        userId,
        sessionId,
        Number(body.durationMinutes) || 0,
        body.completed ?? true,
        body.endedAt
      );
      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to end focus session' }, { status: 500 });
    }
  }

  // 4. Learning: PATCH /api/learning/folders/:id
  if (pathStr.startsWith('learning/folders/')) {
    const folderId = pathStr.split('/')[2];
    try {
      const updated = await dbUpdateLearningFolder(userId, folderId, body);
      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to update learning folder' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, path: pathStr });
}

// =========================================================================
// DELETE HANDLER
// =========================================================================
export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');

  const { userId } = await extractAuth(request);

  // 1. AI Agent Sessions
  if (pathStr === 'ai/agent/sessions' || pathStr === 'ai/sessions') {
    // Bulk clear all sessions
    await dbClearAllChatSessions(userId);
    return NextResponse.json({ success: true });
  }

  if (pathStr.startsWith('ai/agent/sessions/') || pathStr.startsWith('ai/sessions/')) {
    const parts = pathStr.split('/');
    const sessionId = parts[parts.length - 1];
    if (sessionId) {
      await deleteChatSession(sessionId);
    }
    return NextResponse.json({ success: true });
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Tasks & Templates
  if (pathStr.startsWith('tasks/templates/')) {
    const templateId = decodeURIComponent(pathStr.split('/')[2]);
    try {
      await dbDeleteRoutineTemplate(userId, templateId);
      return NextResponse.json({ success: true, id: templateId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete template' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('tasks/')) {
    const taskId = parseInt(pathStr.split('/')[1], 10);
    if (!isNaN(taskId)) {
      try {
        await dbDeleteTask(userId, taskId);
        return NextResponse.json({ success: true, id: taskId });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to delete task' }, { status: 500 });
      }
    }
  }

  // 3. Notes
  if (pathStr.startsWith('notes/')) {
    const noteId = parseInt(pathStr.split('/')[1], 10);
    if (!isNaN(noteId)) {
      try {
        await dbDeleteNote(userId, noteId);
        return NextResponse.json({ success: true, id: noteId });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to delete note' }, { status: 500 });
      }
    }
  }

  // 4. Mind Items
  if (pathStr === 'mind') {
    try {
      await dbDeleteAllMindItems(userId);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete mind items' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('mind/')) {
    const mindId = pathStr.split('/')[1];
    try {
      await dbDeleteMindItem(userId, mindId);
      return NextResponse.json({ success: true, id: mindId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete mind item' }, { status: 500 });
    }
  }

  // 5. Diary
  if (pathStr.startsWith('diary/topics/')) {
    const topicId = pathStr.split('/')[2];
    try {
      await dbDeleteDiaryTopic(userId, topicId);
      return NextResponse.json({ success: true, id: topicId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete diary topic' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('diary/entries/')) {
    const entryId = pathStr.split('/')[2];
    try {
      await dbDeleteDiaryEntry(userId, entryId);
      return NextResponse.json({ success: true, id: entryId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete diary entry' }, { status: 500 });
    }
  }

  // 6. Learning Hub
  if (pathStr.startsWith('learning/folders/')) {
    const folderId = pathStr.split('/')[2];
    try {
      await dbDeleteLearningFolder(userId, folderId);
      return NextResponse.json({ success: true, id: folderId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete learning folder' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('learning/logs/')) {
    const logId = pathStr.split('/')[2];
    try {
      await dbDeleteLearningLog(userId, logId);
      return NextResponse.json({ success: true, id: logId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete learning log' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
