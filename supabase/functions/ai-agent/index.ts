import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify User (Supabase Auth)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // 2. Route AI Request
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop(); // Gets 'what-should-i-do', 'breakdown', etc.
    const body = await req.json();

    // 3. Initialize Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
        throw new Error("GEMINI_API_KEY is missing in Edge Function secrets.");
    }
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    let result;

    // For now, we return mock responses identical to what the backend Express app returned, 
    // ensuring the UI continues to function without breaking. 
    // In a real scenario, you would use `ai.models.generateContent` here.
    switch (path) {
      case 'what-should-i-do':
        result = {
            recommendedTaskId: 1,
            actionTitle: "Focus on your top priority",
            category: "General",
            estimatedMinutes: 30,
            reason: 'AI Service placeholder',
            immediateNextStep: "Start a timer",
            momentumTip: 'Keep going!'
        };
        break;
      case 'breakdown':
        result = []; // SubTaskItem[]
        break;
      case 'parse-task':
        result = {
            title: body.naturalInput || 'Parsed Task',
            priority: 'medium',
            estimatedMinutes: 30,
            category: 'General',
            deadline: null,
            time: null,
            notes: null
        };
        break;
      case 'daily-plan':
        result = []; // DailyPlanSlot[]
        break;
      case 'ask':
        result = { response: 'This is the serverless AI Agent responding securely via Supabase Edge Functions.' };
        break;
      case 'execute-agent':
        result = {
            message: 'Agent action executed via Edge Function.',
            actions: []
        };
        break;
      case 'custom':
        result = { response: "Custom AI execution not supported by strict whitelist yet." };
        break;
      default:
        throw new Error(`Unhandled AI endpoint: ${path}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
