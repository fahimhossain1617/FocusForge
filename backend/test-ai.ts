import dotenv from 'dotenv';
dotenv.config();
import { executeAIAction } from './src/services/aiService';

async function run() {
  try {
    console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Present" : "Missing");
    const result = await executeAIAction('agentChat', {
      userQuery: "I want to study Math",
      recentHistory: [],
      currentDate: new Date().toISOString(),
      context: {}
    });
    console.log("AI Result:", result);
  } catch (err) {
    console.error("AI Error:", err);
  }
}
run();
