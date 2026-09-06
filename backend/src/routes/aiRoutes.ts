import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { executeAIAction, transcribeAudio } from '../services/aiService';
import { getChatSessions, getChatMessages, createChatSession, addChatMessage, deleteChatSession } from '../services/aiChatService';
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
    const message = lang === 'bn'
      ? `আপনার ৫,০০০ AI টোকেন শেষ হয়ে গেছে। টোকেন রিসেট হওয়ার তারিখ: ${status.formattedResetDate} (বাকি: ${status.formattedRemainingTime})`
      : `Your 5,000 AI tokens have been exhausted. Tokens will reset on: ${status.formattedResetDate} (${status.formattedRemainingTime} remaining)`;

    res.status(429).json({
      error: 'AI_TOKENS_EXHAUSTED',
      code: 'TOKENS_EXHAUSTED',
      tokenStatus: status,
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
    const tokensUsed = estimateTokenUsage(JSON.stringify(promptData ?? ''), JSON.stringify(responseData ?? ''));
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

router.delete('/agent/sessions/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.isGuest) return res.json({ success: true });
    await deleteChatSession(req.params.id, user.id);
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

router.post('/agent/chat', async (req, res) => {
  try {
    const tokenCheck = await checkTokensOrReject(req, res);
    if (!tokenCheck) return;

    const user = (req as any).user;
    const isGuest = !user || user.isGuest;
    const userId = user?.id;
    
    let { sessionId, message, context, history } = req.body;

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
      context: lightweightContext
    };

    // 2. Call Gemini via Intent Router
    const result: any = await executeAIAction('agentChat', payload);
    
    // Fallback if AI fails to return proper intent
    if (!result || !result.intent) {
      result.intent = "GREETING_OR_GENERAL";
      result.message = result.message || "I'm having trouble processing that right now.";
    }

    // 3. Deduct tokens
    const tokenStatus = await deductTokens(req, req.body, result);

    if (isGuest) {
      return res.json({
        sessionId: sessionId || 'guest-session',
        tokenStatus,
        aiMessage: {
          id: 'guest_msg_' + Date.now(),
          session_id: sessionId || 'guest-session',
          role: 'assistant',
          content: result.message,
          intent: result.intent,
          payload_json: result.payload || null,
          created_at: new Date().toISOString()
        }
      });
    }

    // 4. Authenticated: Create session in DB if none provided
    if (!sessionId || sessionId === 'guest-session') {
      let sessionTitle = message.substring(0, 30) + '...';
      try {
        const titlePrompt = `Generate a short 2-5 word title for a chat that starts with this message: "${message}". Reply ONLY with the title string and nothing else. Don't use quotes.`;
        const titleResult: any = await executeAIAction('customAi', { prompt: titlePrompt });
        if (titleResult && titleResult.message) {
            sessionTitle = titleResult.message.trim().replace(/["']/g, '');
        }
      } catch (e) {
        console.warn("Failed to generate chat title, falling back to substring", e);
      }
      const session = await createChatSession(userId, sessionTitle);
      sessionId = session.id;
    }

    // 5. Save User Message & AI Message in DB
    await addChatMessage(sessionId, userId, 'user', message);
    const aiMessage = await addChatMessage(sessionId, userId, 'assistant', result.message, result.intent, result.payload);
    
    res.json({ sessionId, aiMessage, tokenStatus });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    res.status(500).json({ error: error.message || 'Agent chat failed' });
  }
});

router.post('/transcribe', async (req, res) => {
  try {
    const tokenCheck = await checkTokensOrReject(req, res);
    if (!tokenCheck) return;

    const { audio, mimeType, language } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    const text = await transcribeAudio(audio, mimeType || 'audio/webm', language);
    const tokenStatus = await deductTokens(req, { mimeType, language }, { text });
    res.json({ text, tokenStatus });
  } catch (error: any) {
    console.error('Audio transcribe error:', error);
    res.status(500).json({ error: error.message || 'Audio transcription failed' });
  }
});

export default router;
