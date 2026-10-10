/**
 * Glory AI Local-First Router — Unified Pipeline Entry Point
 * Orchestrates: Normalize -> Safety -> Flows -> Local Handlers -> Gemini Fallback -> Quota Gate
 */

import { normalizeInput, type NormalizedInput } from './normalize';
import { checkSafety, type SafetyResponse } from './safety';
import { classifyIntent, type ClassifiedIntent } from './intents';
import { handleLocalIntent, type HandlerResult } from './handlers';
import { processFlowTurn, getActiveFlow } from './flows';
import { checkQuotaGate } from './quota';
import {
  getGeminiConfigForTask,
  getCachedResponse,
  setCachedResponse,
  pruneHistoryForGemini,
  sanitizeContextForGemini,
  buildRoadmapActionButtons,
} from './geminiClient';
import type { ActionRequest, WorkspaceContext } from '../../../types/aiAgent';
import { buildActionRequest } from '../aiActionValidator';

export interface RouteResolution {
  message: string;
  intent: string;
  actions: ActionRequest[];
  orbEmotion: string;
  navigationRoute?: string | null;
  roadmap?: any;
  handledLocally: boolean;
  tokenCost: number;
  shouldCallGemini: boolean;
  geminiConfig?: ReturnType<typeof getGeminiConfigForTask>;
  quotaBlocked?: boolean;
}

export async function routeUserMessage(
  rawMessage: string,
  context?: WorkspaceContext,
  history?: Array<{ role: string; content: string }>,
  isAuth: boolean = false,
  userName?: string
): Promise<RouteResolution> {
  // Step 1: Normalize
  const norm = normalizeInput(rawMessage);
  const isBn = norm.detectedLang === 'bn';

  // Step 2: Safety Check (Local, First)
  const safety = checkSafety(norm);
  if (safety) {
    const act = safety.actionButton
      ? buildActionRequest(safety.actionButton.type as any, {}, isBn ? safety.actionButton.labelBn : safety.actionButton.labelEn)
      : null;

    return {
      message: safety.message,
      intent: 'SAFETY_SUPPORT',
      actions: act ? [act] : [],
      orbEmotion: safety.orbEmotion,
      navigationRoute: safety.navigationRoute,
      handledLocally: true,
      tokenCost: 0,
      shouldCallGemini: false,
    };
  }

  // Step 3: Multi-step Conversational Flows (e.g. user answering missing time in Planner or focus duration)
  const flowResult = processFlowTurn(norm.raw, isBn);
  if (flowResult && flowResult.handled) {
    return {
      message: flowResult.reply,
      intent: flowResult.intent || 'PLANNER_CREATE',
      actions: flowResult.actions,
      orbEmotion: flowResult.orbEmotion || 'focused',
      navigationRoute: flowResult.navigationRoute !== undefined ? flowResult.navigationRoute : 'planner',
      handledLocally: true,
      tokenCost: 0,
      shouldCallGemini: false,
    };
  }

  // Step 4: Intent Classification
  const classification = classifyIntent(norm);

  // Step 5: Local Handler by Intent
  if (!classification.isBigTask && classification.intent !== 'UNKNOWN') {
    const localResult = handleLocalIntent(norm, classification, context, userName);
    if (localResult.handledLocally) {
      return {
        ...localResult,
        shouldCallGemini: false,
      };
    }
  }

  // Step 6: Big Task / Gemini Required (Roadmaps, 30-day plans, or complex fallback)
  const isRoadmap = classification.intent === 'BIG_TASK_ROADMAP';
  const taskType = isRoadmap ? 'roadmap' : (classification.isBigTask ? 'big_task' : 'fallback');
  const geminiConfig = getGeminiConfigForTask(taskType);

  // Check cache for identical big-task requests
  const cached = getCachedResponse(norm.clean);
  if (cached) {
    return {
      message: cached.message,
      intent: cached.intent || (isRoadmap ? 'LEARNING_HUB' : 'GREETING_OR_GENERAL'),
      actions: cached.actions || [],
      orbEmotion: cached.emotion || 'happy',
      roadmap: cached.roadmap || null,
      handledLocally: true,
      tokenCost: 0, // Cache hits cost 0 tokens
      shouldCallGemini: false,
    };
  }

  // Step 7: Quota Gate Check before Gemini call
  const quota = await checkQuotaGate(isAuth, isBn ? 'bn' : 'en');
  if (!quota.allowed) {
    const defaultExhausted = isBn
      ? 'আজকের জন্য ফ্রি এআই কোটা শেষ হয়ে গেছে। তবে তোমার লোকাল ফিচারগুলো (টাইমার, প্ল্যানার, ডায়েরি) সবসময় সক্রিয় আছে!'
      : 'Your AI token quota has been reached. However, all your local productivity tools continue to work uninterrupted!';

    const act = quota.isGuest
      ? buildActionRequest('open_settings', {}, isBn ? 'লগইন করুন' : 'Log In')
      : null;

    return {
      message: quota.exhaustedMessage || defaultExhausted,
      intent: 'LIMIT_EXHAUSTED',
      actions: act ? [act] : [],
      orbEmotion: 'sleepy',
      handledLocally: true,
      tokenCost: 0,
      shouldCallGemini: false,
      quotaBlocked: true,
    };
  }

  // Return decision to call Gemini with optimized configurations
  return {
    message: '',
    intent: isRoadmap ? 'LEARNING_HUB' : 'GREETING_OR_GENERAL',
    actions: [],
    orbEmotion: 'thinking',
    handledLocally: false,
    tokenCost: 0,
    shouldCallGemini: true,
    geminiConfig,
  };
}

export * from './normalize';
export * from './safety';
export * from './intents';
export * from './handlers';
export * from './variation';
export * from './flows';
export * from './quota';
export * from './geminiClient';
