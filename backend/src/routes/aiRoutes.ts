import { Router } from 'express';
// import { requireAuth } from '../middleware/auth';
import { executeAIAction } from '../services/aiService';

const router = Router();

// Apply auth middleware to all AI routes
// router.use(requireAuth);

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
    // Note: custom prompts might violate strict whitelisting, 
    // handle with caution or map to a safe handler.
    res.json({ response: "Custom AI execution not supported by strict whitelist yet." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Custom query failed' });
  }
});

export default router;
