"use strict";
/**
 * AI Action Registry
 * Enforces the "Absolute AI Restriction" policy.
 * The AI cannot execute arbitrary functions or query the database directly.
 * It is only allowed to return structured outputs mapping to these registered actions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isActionAllowed = exports.ALLOWED_AI_ACTIONS = void 0;
exports.ALLOWED_AI_ACTIONS = {
    WHAT_SHOULD_I_DO: 'whatShouldIDo',
    TASK_BREAKDOWN: 'taskBreakdown',
    PARSE_TASK: 'parseTask',
    DAILY_PLANNER: 'dailyPlanner',
    ASK_FOCUS_FORGE: 'askFocusForge',
    EXECUTE_AGENTIC_TASK: 'executeAgenticTask',
};
/**
 * Validates if a requested action is in the whitelist.
 */
const isActionAllowed = (actionName) => {
    return Object.values(exports.ALLOWED_AI_ACTIONS).includes(actionName);
};
exports.isActionAllowed = isActionAllowed;
