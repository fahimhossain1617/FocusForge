import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { executeAIAction } from '../services/aiService';
import { getChatSessions, getChatMessages, createChatSession, addChatMessage, deleteChatSession } from '../services/aiChatService';

const router = Router();

// AI endpoints can incur paid provider usage and must never be public.
router.use(requireAuth);

router.post('/what-should-i-do', async (req, res) => {
  try {
    const { tasks, context, options } = req.body;
    const result = await executeAIAction('whatShouldIDo', { tasks, context, options });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI request failed' });
  }
});

router.post('/breakdown', async (req, res) => {
  try {
    const { goal, breakdownOptions, options } = req.body;
    const result = await executeAIAction('taskBreakdown', { goal, breakdownOptions, options });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Task breakdown failed' });
  }
});

router.post('/parse-task', async (req, res) => {
  try {
    const { naturalInput, referenceDate, options } = req.body;
    const result = await executeAIAction('parseTask', { naturalInput, referenceDate, options });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Task parsing failed' });
  }
});

router.post('/daily-plan', async (req, res) => {
  try {
    const { tasks, plannerOptions, options } = req.body;
    const result = await executeAIAction('dailyPlanner', { tasks, plannerOptions, options });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Daily planning failed' });
  }
});

router.post('/ask', async (req, res) => {
  try {
    const { userQuery, context, options } = req.body;
    const result = await executeAIAction('askFocusForge', { userQuery, context, options });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI query failed' });
  }
});

router.post('/execute-agent', async (req, res) => {
  try {
    const { userQuery, context, options } = req.body;
    const result = await executeAIAction('executeAgenticTask', { userQuery, context, options });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Agent execution failed' });
  }
});

router.post('/custom', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const result = await executeAIAction('customAi', { prompt });
    res.json(result);
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

    if (isGuest) {
      return res.json({
        sessionId: sessionId || 'guest-session',
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

    // 3. Authenticated: Create session in DB if none provided
    if (!sessionId || sessionId === 'guest-session') {
      const session = await createChatSession(userId, message.substring(0, 30) + '...');
      sessionId = session.id;
    }

    // 4. Save User Message & AI Message in DB
    await addChatMessage(sessionId, userId, 'user', message);
    const aiMessage = await addChatMessage(sessionId, userId, 'assistant', result.message, result.intent, result.payload);
    
    res.json({ sessionId, aiMessage });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    res.status(500).json({ error: error.message || 'Agent chat failed' });
  }
});

export default router;
