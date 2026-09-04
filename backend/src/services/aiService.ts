import { GoogleGenAI } from '@google/genai';
import { isActionAllowed } from '../registry/aiActionRegistry';

// We'll import prompts from a shared or backend-specific location,
// For now, we mock the core execution structure to match the frontend signature.

const getGeminiApiKey = () => {
    return process.env.GEMINI_API_KEY || '';
};

const getGeminiClient = () => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        console.warn('[FocusForge AI Backend] GEMINI_API_KEY is missing.');
    }
    return new GoogleGenAI({ apiKey });
};

export const executeAIAction = async (action: string, payload: any) => {
    if (!isActionAllowed(action)) {
        throw new Error(`Action "${action}" is not permitted by the strict AI action registry.`);
    }

    const ai = getGeminiClient();
    
    // Switch based on the action whitelist to invoke specific logic
    switch (action) {
        case 'whatShouldIDo':
            // Implement whatShouldIDo logic here
            return {
                recommendedTaskId: 1,
                reasoning: 'AI Service placeholder',
                motivationMsg: 'Keep going!'
            };
            
        case 'taskBreakdown':
            // Implement taskBreakdown logic here
            return { subtasks: [] };
            
        case 'parseTask':
            return {
                title: 'Parsed Task',
                priority: 'medium',
                estimatedMinutes: 30
            };
            
        case 'dailyPlanner':
            return { slots: [] };
            
        case 'askFocusForge':
            return { response: 'Backend Ask AI logic executed.' };
            
        case 'executeAgenticTask':
            return {
                actionTaken: 'Placeholder action',
                details: 'Agent action executed via backend.'
            };
            
        default:
            throw new Error(`Unhandled allowed action: ${action}`);
    }
};
