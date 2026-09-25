import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { executeAIAction, transcribeAudio } from '../services/aiService';
import { getChatSessions, getChatMessages, createChatSession, updateChatSessionTitle, addChatMessage, deleteChatSession, clearAllChatSessions } from '../services/aiChatService';
import { getUserTokenStatus, consumeUserTokens, estimateTokenUsage } from '../services/aiTokenService';

const router = Router();

// AI endpoints can incur paid provider usage and must never be public.
router.use(requireAuth);

function getRequestClientMeta(req: any) {
  const user = req.user;
  const isGuest = !user || user.isGuest;
  const userId = user?.id;
  const guestId = (req.headers['x-guest-id'] as string) || req.ip || 'guest';
  const lang = (req.headers['x-app-lang'] as string) || (req.query.lang as string) || 'bn';
  return { isGuest, userId, guestId, lang };
}

// Check tokens and return error response if exhausted
async function checkTokensOrReject(req: any, res: any) {
  const { isGuest, userId, guestId, lang } = getRequestClientMeta(req);
  const status = await getUserTokenStatus(userId, isGuest, guestId, lang);
  if (status.isExhausted || status.remaining <= 0) {
    const message = isGuest
      ? (lang === 'bn'
          ? `আমি তোমাকে সাহায্য করতে খুব পছন্দ করি! 🥰 কিন্তু তুমি তো এখনও লগইন করোনি আর তোমার গেস্ট লিমিট শেষ হয়ে গেছে। একটু লগইন করে নাও না? তখন আমি আবার জেগে উঠে তোমাকে প্রাণখুলে সাহায্য করব! ততক্ষণ আমি একটু ঘুমিয়ে নিই... 😴💤`
          : `I really love helping you! 🥰 But you haven't logged in yet and your guest limit is reached. Please log in! Once you log in, I'll wake up and help you with all my heart. Until then, let me take a quick nap... 😴💤`)
      : (lang === 'bn'
          ? `আমি তোমাকে সাহায্য করতে চাই! কিন্তু আজকের জন্য তোমার ফ্রি লিমিট শেষ হয়ে গেছে।\n\n• লিমিট রিসেট হবে: ${status.formattedResetDate}\n• বাকি সময়: ${status.formattedRemainingTime}\n\nপ্লিজ একটু অপেক্ষা করো। লিমিট রিসেট হলে আমি আবার জেগে তোমাকে সাহায্য করব! ততক্ষণ আমি একটু ঘুমিয়ে নিই... 😴💤`
          : `I really want to help you! But your daily limit for today has been reached.\n\n• Resets on: ${status.formattedResetDate}\n• Remaining time: ${status.formattedRemainingTime}\n\nPlease wait a little bit. Once it resets, I'll wake right up to help you! Until then, let me take a quick nap... 😴💤`);

    res.status(429).json({
      error: 'AI_TOKENS_EXHAUSTED',
      code: 'TOKENS_EXHAUSTED',
      tokenStatus: status,
      requireLogin: isGuest,
      message,
    });
    return null;
  }
  return status;
}

// Deduct tokens after successful execution
async function deductTokens(req: any, promptData: any, responseData: any) {
  try {
    const { isGuest, userId, guestId, lang } = getRequestClientMeta(req);
    const modelMode = req.body?.model || 'smart';
    const tokensUsed = estimateTokenUsage(JSON.stringify(promptData ?? ''), JSON.stringify(responseData ?? ''), modelMode);
    return await consumeUserTokens(userId, isGuest, guestId, tokensUsed, lang);
  } catch (err) {
    console.warn('[AI Routes] Token deduction error:', err);
    return null;
  }
}

// Endpoint to inspect current token balance and reset countdown
router.get('/tokens', async (req, res) => {
  try {
    const { isGuest, userId, guestId, lang } = getRequestClientMeta(req);
    const status = await getUserTokenStatus(userId, isGuest, guestId, lang);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch token status' });
  }
});

router.post('/what-should-i-do', async (req, res) => {
  try {
    const tokenCheck = await checkTokensOrReject(req, res);
    if (!tokenCheck) return;

    const { tasks, context, options } = req.body;
    const result = await executeAIAction('whatShouldIDo', { tasks, context, options });
    const tokenStatus = await deductTokens(req, req.body, result);
    res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI request failed' });
  }
});

router.post('/breakdown', async (req, res) => {
  try {
    const tokenCheck = await checkTokensOrReject(req, res);
    if (!tokenCheck) return;

    const { goal, breakdownOptions, options } = req.body;
    const result = await executeAIAction('taskBreakdown', { goal, breakdownOptions, options });
    await deductTokens(req, req.body, result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Task breakdown failed' });
  }
});

router.post('/parse-task', async (req, res) => {
  try {
    const tokenCheck = await checkTokensOrReject(req, res);
    if (!tokenCheck) return;

    const { naturalInput, referenceDate, options } = req.body;
    const result = await executeAIAction('parseTask', { naturalInput, referenceDate, options });
    const tokenStatus = await deductTokens(req, req.body, result);
    res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Task parsing failed' });
  }
});

router.post('/daily-plan', async (req, res) => {
  try {
    const tokenCheck = await checkTokensOrReject(req, res);
    if (!tokenCheck) return;

    const { tasks, plannerOptions, options } = req.body;
    const result = await executeAIAction('dailyPlanner', { tasks, plannerOptions, options });
    await deductTokens(req, req.body, result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Daily planning failed' });
  }
});

router.post('/ask', async (req, res) => {
  try {
    const tokenCheck = await checkTokensOrReject(req, res);
    if (!tokenCheck) return;

    const { userQuery, context, options } = req.body;
    const result = await executeAIAction('askFocusForge', { userQuery, context, options });
    const tokenStatus = await deductTokens(req, req.body, result);
    res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI query failed' });
  }
});

router.post('/execute-agent', async (req, res) => {
  try {
    const tokenCheck = await checkTokensOrReject(req, res);
    if (!tokenCheck) return;

    const { userQuery, context, options } = req.body;
    const result = await executeAIAction('executeAgenticTask', { userQuery, context, options });
    const tokenStatus = await deductTokens(req, req.body, result);
    res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Agent execution failed' });
  }
});

router.post('/custom', async (req, res) => {
  try {
    const tokenCheck = await checkTokensOrReject(req, res);
    if (!tokenCheck) return;

    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const result = await executeAIAction('customAi', { prompt });
    const tokenStatus = await deductTokens(req, req.body, result);
    res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Custom query failed' });
  }
});

// --- FocusForge AI Agent - Chat & History Endpoints ---

router.get('/agent/sessions', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.isGuest) return res.json([]);
    const sessions = await getChatSessions(user.id);
    res.json(sessions);
  } catch (error: any) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch sessions' });
  }
});

router.post('/agent/sessions', async (req, res) => {
  try {
    const user = (req as any).user;
    const { title } = req.body;
    if (!user || user.isGuest) {
      return res.json({ id: 'guest-session', title: title || 'New Conversation' });
    }
    const session = await createChatSession(user.id, title);
    res.json(session);
  } catch (error: any) {
    console.error('Create session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create session' });
  }
});

router.delete('/agent/sessions', async (req, res) => {
  try {
    const user = (req as any).user;
    await clearAllChatSessions(user?.isGuest ? undefined : user?.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Clear sessions error:', error);
    res.status(500).json({ error: error.message || 'Failed to clear sessions' });
  }
});

router.delete('/agent/sessions/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    await deleteChatSession(req.params.id, user?.isGuest ? undefined : user?.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete session' });
  }
});

router.get('/agent/sessions/:id/messages', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.isGuest) return res.json([]);
    const messages = await getChatMessages(user.id, req.params.id);
    res.json(messages);
  } catch (error: any) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
});

async function generateSmartTitle(message: string): Promise<string> {
  try {
    const titlePrompt = `Generate a concise 2-5 word title for a chat session starting with this user message: "${message.substring(0, 150)}". If the query is in Bengali, reply with a short Bengali title. If in English, reply in English. Reply ONLY with the title text and nothing else. No quotes, no punctuation.`;
    const titleResult: any = await executeAIAction('customAi', { prompt: titlePrompt });
    if (titleResult && titleResult.message) {
      let title = titleResult.message.trim().replace(/^["'`]|["'`]$/g, '').trim();
      if (title.length > 50) title = title.substring(0, 50) + '...';
      if (title) return title;
    }
  } catch (e) {
    console.warn("Failed to generate chat title:", e);
  }
  return message.length > 30 ? message.substring(0, 27) + '...' : message;
}

router.post('/agent/chat', async (req, res) => {
  try {
    const { isGuest, userId, guestId, lang } = getRequestClientMeta(req);
    const initialTokenStatus = await getUserTokenStatus(userId, isGuest, guestId, lang);
    let { sessionId, message, context, history, model } = req.body;

    if (initialTokenStatus.isExhausted || initialTokenStatus.remaining <= 0) {
      const exhaustedMessage = isGuest
        ? (lang === 'bn'
            ? `তোমার গেস্ট লিমিট শেষ হয়ে গেছে। আনলিমিটেড ব্যবহার ও ক্লাউড সেভ সুবিধা পেতে প্লিজ একটু লগইন করে নাও না? 🥰`
            : `Your guest limit has been reached. Please log in to unlock full access and cloud sync.`)
        : (lang === 'bn'
            ? `তোমার আজকের ফ্রি লিমিট শেষ হয়ে গেছে।\n\n• লিমিট রিসেট হওয়ার তারিখ: ${initialTokenStatus.formattedResetDate}\n• অবশিষ্ট সময়: ${initialTokenStatus.formattedRemainingTime}\n\nঅনুগ্রহ করে রিসেট হওয়া পর্যন্ত একটু অপেক্ষা করো। লিমিট রিসেট হওয়ার পর FocusForge AI Agent আবার জেগে তোমাকে সাহায্য করতে প্রস্তুত থাকবে! 😴💤`
            : `Your daily limit has been reached.\n\n• Resets on: ${initialTokenStatus.formattedResetDate}\n• Remaining time: ${initialTokenStatus.formattedRemainingTime}\n\nPlease wait until the reset time. Once refreshed, FocusForge AI Agent will be fully ready to assist you!`);

      return res.json({
        sessionId: sessionId || (isGuest ? 'guest-session' : `session_${Date.now()}`),
        sessionTitle: message ? message.substring(0, 25) : 'FocusForge AI',
        aiMessage: {
          id: 'msg_exhausted_' + Date.now(),
          role: 'assistant',
          content: exhaustedMessage,
          intent: isGuest ? 'REQUIRE_LOGIN' : 'LIMIT_EXHAUSTED',
          payload: isGuest ? { requireLogin: true } : { resetDate: initialTokenStatus.formattedResetDate, remainingTime: initialTokenStatus.formattedRemainingTime },
          createdAt: new Date().toISOString(),
        },
        tokenStatus: initialTokenStatus,
        isExhausted: true,
      });
    }

    // Fetch previous messages for multi-turn conversational context if in an active session
    let recentHistory: Array<{ role: string; content: string }> = [];
    if (Array.isArray(history) && history.length > 0) {
      recentHistory = history.slice(-8);
    } else if (sessionId && sessionId !== 'guest-session' && userId) {
      try {
        const past = await getChatMessages(userId, sessionId);
        if (Array.isArray(past)) {
          recentHistory = past.slice(-8).map((m: any) => ({
            role: m.role,
            content: m.content,
          }));
        }
      } catch (err) {
        console.warn('Could not fetch prior messages for context:', err);
      }
    }

    // 1. Prepare payload for Gemini Intent Router
    const lightweightContext = {
      ...context,
      tasks: context?.tasks?.filter((t: any) => t.status !== 'completed').slice(0, 50) || []
    };

    const payload = {
      userQuery: message,
      recentHistory,
      currentDate: new Date().toISOString().split('T')[0],
      context: lightweightContext,
      model: model || 'smart'
    };

    // 2. Call Gemini via Intent Router
    let result: any;
    try {
      result = await executeAIAction('agentChat', payload);
    } catch (aiError) {
      console.warn('AI execution failed, using fallback:', aiError);
      const { lang } = getRequestClientMeta(req);
      const isBn = lang === 'bn' || !/[a-zA-Z]/.test(message);
      result = {
        intent: "GREETING_OR_GENERAL",
        message: isBn
          ? "দুঃখিত, এআই সার্ভার সাময়িক একটু ব্যস্ত ছিল। তোমার পড়াশোনা, কাজ বা অন্য যেকোনো বিষয়ে কিছু জানার থাকলে বলো, আমি শুনছি!"
          : "FocusForge AI is temporarily busy. Please let me know if you need help with anything else, I'm here!",
        payload: null
      };
    }
    
    // Fallback if AI fails to return proper intent
    if (!result || !result.intent) {
      result.intent = "GREETING_OR_GENERAL";
      result.message = result.message || "I'm having trouble processing that right now.";
    }

    // 3. Deduct tokens
    const tokenStatus = await deductTokens(req, req.body, result);

    let sessionTitle: string | undefined = undefined;

    if (isGuest) {
      const activeGuestSessionId = sessionId || 'guest_' + Date.now();
      sessionTitle = await generateSmartTitle(message);

      return res.json({
        sessionId: activeGuestSessionId,
        sessionTitle,
        tokenStatus,
        aiMessage: {
          id: 'guest_msg_' + Date.now(),
          session_id: activeGuestSessionId,
          role: 'assistant',
          content: result.message,
          intent: result.intent,
          payload_json: result.payload || null,
          created_at: new Date().toISOString()
        }
      });
    }

    // 4. Authenticated: Create session in DB if none provided or if not yet in DB
    if (!sessionId || sessionId === 'guest-session') {
      sessionTitle = await generateSmartTitle(message);
      const session = await createChatSession(userId, sessionTitle);
      sessionId = session.id;
    } else {
      // Generate title if session was previously unnamed
      try {
        const existingSessions = await getChatSessions(userId);
        const currentSession = existingSessions.find(s => s.id === sessionId);
        if (currentSession && (currentSession.title === 'New Conversation' || !currentSession.title)) {
          sessionTitle = await generateSmartTitle(message);
          await updateChatSessionTitle(sessionId, userId, sessionTitle);
        } else if (currentSession) {
          sessionTitle = currentSession.title;
        } else {
          sessionTitle = await generateSmartTitle(message);
          const newSession = await createChatSession(userId, sessionTitle, sessionId);
          sessionId = newSession.id;
        }
      } catch (err) {
        console.warn('Title update check failed:', err);
      }
    }

    // 5. Save User Message & AI Message in DB
    await addChatMessage(sessionId, userId, 'user', message);
    const aiMessage = await addChatMessage(sessionId, userId, 'assistant', result.message, result.intent, result.payload);
    
    res.json({ sessionId, sessionTitle, aiMessage, tokenStatus });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    res.status(500).json({ error: error.message || 'Agent chat failed' });
  }
});


router.post('/transcribe', async (req, res) => {
  try {
    const { audio, mimeType, language } = req.body;
    if (!audio || typeof audio !== 'string' || audio.trim().length === 0) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    const text = await transcribeAudio(audio, mimeType || 'audio/webm', language);
    res.json({ text, success: true });
  } catch (error: any) {
    console.error('Audio transcribe error:', error);
    res.status(500).json({ error: error.message || 'Audio transcription failed' });
  }
});

export default router;
