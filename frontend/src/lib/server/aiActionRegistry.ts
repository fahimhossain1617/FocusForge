export const ALLOWED_AI_ACTIONS = {
  WHAT_SHOULD_I_DO: 'whatShouldIDo',
  TASK_BREAKDOWN: 'taskBreakdown',
  PARSE_TASK: 'parseTask',
  DAILY_PLANNER: 'dailyPlanner',
  ASK_FOCUS_FORGE: 'askFocusForge',
  EXECUTE_AGENTIC_TASK: 'executeAgenticTask',
  AGENT_CHAT: 'agentChat',
  CUSTOM_AI: 'customAi',
} as const;

export type AllowedAIAction = typeof ALLOWED_AI_ACTIONS[keyof typeof ALLOWED_AI_ACTIONS];

export const isActionAllowed = (actionName: string): actionName is AllowedAIAction => {
  return Object.values(ALLOWED_AI_ACTIONS).includes(actionName as AllowedAIAction);
};
