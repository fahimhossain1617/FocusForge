"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const aiService_1 = require("../services/aiService");
const aiChatService_1 = require("../services/aiChatService");
const aiTokenService_1 = require("../services/aiTokenService");
const router = (0, express_1.Router)();
// AI endpoints can incur paid provider usage and must never be public.
router.use(auth_1.requireAuth);
function getRequestClientMeta(req) {
    const user = req.user;
    const isGuest = !user || user.isGuest;
    const userId = user?.id;
    const guestId = req.headers['x-guest-id'] || req.ip || 'guest';
    const lang = req.headers['x-app-lang'] || req.query.lang || 'bn';
    return { isGuest, userId, guestId, lang };
}
// Check tokens and return error response if exhausted
async function checkTokensOrReject(req, res) {
    const { isGuest, userId, guestId, lang } = getRequestClientMeta(req);
    const status = await (0, aiTokenService_1.getUserTokenStatus)(userId, isGuest, guestId, lang);
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
async function deductTokens(req, promptData, responseData) {
    try {
        const { isGuest, userId, guestId, lang } = getRequestClientMeta(req);
        const tokensUsed = (0, aiTokenService_1.estimateTokenUsage)(JSON.stringify(promptData ?? ''), JSON.stringify(responseData ?? ''));
        return await (0, aiTokenService_1.consumeUserTokens)(userId, isGuest, guestId, tokensUsed, lang);
    }
    catch (err) {
        console.warn('[AI Routes] Token deduction error:', err);
        return null;
    }
}
// Endpoint to inspect current token balance and reset countdown
router.get('/tokens', async (req, res) => {
    try {
        const { isGuest, userId, guestId, lang } = getRequestClientMeta(req);
        const status = await (0, aiTokenService_1.getUserTokenStatus)(userId, isGuest, guestId, lang);
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch token status' });
    }
});
router.post('/what-should-i-do', async (req, res) => {
    try {
        const tokenCheck = await checkTokensOrReject(req, res);
        if (!tokenCheck)
            return;
        const { tasks, context, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('whatShouldIDo', { tasks, context, options });
        const tokenStatus = await deductTokens(req, req.body, result);
        res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'AI request failed' });
    }
});
router.post('/breakdown', async (req, res) => {
    try {
        const tokenCheck = await checkTokensOrReject(req, res);
        if (!tokenCheck)
            return;
        const { goal, breakdownOptions, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('taskBreakdown', { goal, breakdownOptions, options });
        await deductTokens(req, req.body, result);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Task breakdown failed' });
    }
});
router.post('/parse-task', async (req, res) => {
    try {
        const tokenCheck = await checkTokensOrReject(req, res);
        if (!tokenCheck)
            return;
        const { naturalInput, referenceDate, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('parseTask', { naturalInput, referenceDate, options });
        const tokenStatus = await deductTokens(req, req.body, result);
        res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Task parsing failed' });
    }
});
router.post('/daily-plan', async (req, res) => {
    try {
        const tokenCheck = await checkTokensOrReject(req, res);
        if (!tokenCheck)
            return;
        const { tasks, plannerOptions, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('dailyPlanner', { tasks, plannerOptions, options });
        await deductTokens(req, req.body, result);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Daily planning failed' });
    }
});
router.post('/ask', async (req, res) => {
    try {
        const tokenCheck = await checkTokensOrReject(req, res);
        if (!tokenCheck)
            return;
        const { userQuery, context, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('askFocusForge', { userQuery, context, options });
        const tokenStatus = await deductTokens(req, req.body, result);
        res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'AI query failed' });
    }
});
router.post('/execute-agent', async (req, res) => {
    try {
        const tokenCheck = await checkTokensOrReject(req, res);
        if (!tokenCheck)
            return;
        const { userQuery, context, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('executeAgenticTask', { userQuery, context, options });
        const tokenStatus = await deductTokens(req, req.body, result);
        res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Agent execution failed' });
    }
});
router.post('/custom', async (req, res) => {
    try {
        const tokenCheck = await checkTokensOrReject(req, res);
        if (!tokenCheck)
            return;
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        const result = await (0, aiService_1.executeAIAction)('customAi', { prompt });
        const tokenStatus = await deductTokens(req, req.body, result);
        res.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Custom query failed' });
    }
});
// --- FocusForge AI Agent - Chat & History Endpoints ---
router.get('/agent/sessions', async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.isGuest)
            return res.json([]);
        const sessions = await (0, aiChatService_1.getChatSessions)(user.id);
        res.json(sessions);
    }
    catch (error) {
        console.error('Fetch sessions error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch sessions' });
    }
});
router.post('/agent/sessions', async (req, res) => {
    try {
        const user = req.user;
        const { title } = req.body;
        if (!user || user.isGuest) {
            return res.json({ id: 'guest-session', title: title || 'New Conversation' });
        }
        const session = await (0, aiChatService_1.createChatSession)(user.id, title);
        res.json(session);
    }
    catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: error.message || 'Failed to create session' });
    }
});
router.delete('/agent/sessions/:id', async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.isGuest)
            return res.json({ success: true });
        await (0, aiChatService_1.deleteChatSession)(req.params.id, user.id);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete session' });
    }
});
router.get('/agent/sessions/:id/messages', async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.isGuest)
            return res.json([]);
        const messages = await (0, aiChatService_1.getChatMessages)(user.id, req.params.id);
        res.json(messages);
    }
    catch (error) {
        console.error('Fetch messages error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch messages' });
    }
});
async function generateSmartTitle(message) {
    try {
        const titlePrompt = `Generate a concise 2-5 word title for a chat session starting with this user message: "${message.substring(0, 150)}". If the query is in Bengali, reply with a short Bengali title. If in English, reply in English. Reply ONLY with the title text and nothing else. No quotes, no punctuation.`;
        const titleResult = await (0, aiService_1.executeAIAction)('customAi', { prompt: titlePrompt });
        if (titleResult && titleResult.message) {
            let title = titleResult.message.trim().replace(/^["'`]|["'`]$/g, '').trim();
            if (title.length > 50)
                title = title.substring(0, 50) + '...';
            if (title)
                return title;
        }
    }
    catch (e) {
        console.warn("Failed to generate chat title:", e);
    }
    return message.length > 30 ? message.substring(0, 27) + '...' : message;
}
router.post('/agent/chat', async (req, res) => {
    try {
        const tokenCheck = await checkTokensOrReject(req, res);
        if (!tokenCheck)
            return;
        const user = req.user;
        const isGuest = !user || user.isGuest;
        const userId = user?.id;
        let { sessionId, message, context, history } = req.body;
        // Fetch previous messages for multi-turn conversational context if in an active session
        let recentHistory = [];
        if (Array.isArray(history) && history.length > 0) {
            recentHistory = history.slice(-8);
        }
        else if (sessionId && sessionId !== 'guest-session' && userId) {
            try {
                const past = await (0, aiChatService_1.getChatMessages)(userId, sessionId);
                if (Array.isArray(past)) {
                    recentHistory = past.slice(-8).map((m) => ({
                        role: m.role,
                        content: m.content,
                    }));
                }
            }
            catch (err) {
                console.warn('Could not fetch prior messages for context:', err);
            }
        }
        // 1. Prepare payload for Gemini Intent Router
        const lightweightContext = {
            ...context,
            tasks: context?.tasks?.filter((t) => t.status !== 'completed').slice(0, 50) || []
        };
        const payload = {
            userQuery: message,
            recentHistory,
            currentDate: new Date().toISOString().split('T')[0],
            context: lightweightContext
        };
        // 2. Call Gemini via Intent Router
        const result = await (0, aiService_1.executeAIAction)('agentChat', payload);
        // Fallback if AI fails to return proper intent
        if (!result || !result.intent) {
            result.intent = "GREETING_OR_GENERAL";
            result.message = result.message || "I'm having trouble processing that right now.";
        }
        // 3. Deduct tokens
        const tokenStatus = await deductTokens(req, req.body, result);
        let sessionTitle = undefined;
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
        // 4. Authenticated: Create session in DB if none provided
        if (!sessionId || sessionId === 'guest-session') {
            sessionTitle = await generateSmartTitle(message);
            const session = await (0, aiChatService_1.createChatSession)(userId, sessionTitle);
            sessionId = session.id;
        }
        else {
            // Generate title if session was previously unnamed
            try {
                const existingSessions = await (0, aiChatService_1.getChatSessions)(userId);
                const currentSession = existingSessions.find(s => s.id === sessionId);
                if (currentSession && (currentSession.title === 'New Conversation' || !currentSession.title)) {
                    sessionTitle = await generateSmartTitle(message);
                    await (0, aiChatService_1.updateChatSessionTitle)(sessionId, userId, sessionTitle);
                }
                else if (currentSession) {
                    sessionTitle = currentSession.title;
                }
            }
            catch (err) {
                console.warn('Title update check failed:', err);
            }
        }
        // 5. Save User Message & AI Message in DB
        await (0, aiChatService_1.addChatMessage)(sessionId, userId, 'user', message);
        const aiMessage = await (0, aiChatService_1.addChatMessage)(sessionId, userId, 'assistant', result.message, result.intent, result.payload);
        res.json({ sessionId, sessionTitle, aiMessage, tokenStatus });
    }
    catch (error) {
        console.error('Agent chat error:', error);
        res.status(500).json({ error: error.message || 'Agent chat failed' });
    }
});
router.post('/transcribe', async (req, res) => {
    try {
        const tokenCheck = await checkTokensOrReject(req, res);
        if (!tokenCheck)
            return;
        const { audio, mimeType, language } = req.body;
        if (!audio) {
            return res.status(400).json({ error: 'Audio data is required' });
        }
        const text = await (0, aiService_1.transcribeAudio)(audio, mimeType || 'audio/webm', language);
        const tokenStatus = await deductTokens(req, { mimeType, language }, { text });
        res.json({ text, tokenStatus });
    }
    catch (error) {
        console.error('Audio transcribe error:', error);
        res.status(500).json({ error: error.message || 'Audio transcription failed' });
    }
});
exports.default = router;
