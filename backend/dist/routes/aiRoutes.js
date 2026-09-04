"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import { requireAuth } from '../middleware/auth';
const aiService_1 = require("../services/aiService");
const router = (0, express_1.Router)();
// Apply auth middleware to all AI routes
// router.use(requireAuth);
router.post('/what-should-i-do', async (req, res) => {
    try {
        const { tasks, context, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('whatShouldIDo', { tasks, context, options });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'AI request failed' });
    }
});
router.post('/breakdown', async (req, res) => {
    try {
        const { goal, breakdownOptions, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('taskBreakdown', { goal, breakdownOptions, options });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Task breakdown failed' });
    }
});
router.post('/parse-task', async (req, res) => {
    try {
        const { naturalInput, referenceDate, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('parseTask', { naturalInput, referenceDate, options });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Task parsing failed' });
    }
});
router.post('/daily-plan', async (req, res) => {
    try {
        const { tasks, plannerOptions, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('dailyPlanner', { tasks, plannerOptions, options });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Daily planning failed' });
    }
});
router.post('/ask', async (req, res) => {
    try {
        const { userQuery, context, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('askFocusForge', { userQuery, context, options });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'AI query failed' });
    }
});
router.post('/execute-agent', async (req, res) => {
    try {
        const { userQuery, context, options } = req.body;
        const result = await (0, aiService_1.executeAIAction)('executeAgenticTask', { userQuery, context, options });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Agent execution failed' });
    }
});
router.post('/custom', async (req, res) => {
    try {
        // Note: custom prompts might violate strict whitelisting, 
        // handle with caution or map to a safe handler.
        res.json({ response: "Custom AI execution not supported by strict whitelist yet." });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Custom query failed' });
    }
});
exports.default = router;
