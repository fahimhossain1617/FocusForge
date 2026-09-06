import dotenv from 'dotenv';
import { executeAIAction } from '../src/services/aiService';

dotenv.config();

async function runTest() {
  console.log("Testing AI agentChat action...");
  try {
    const result = await executeAIAction('agentChat', {
      userQuery: "hi",
      recentHistory: [],
      currentDate: "2026-09-06",
      context: {}
    });
    console.log("AI Result:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("AI Error:", err.message || err);
  }
}

runTest();
