import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const CANDIDATE_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { audio, mimeType = "audio/webm", language = "bn" } = body;

    if (!audio || typeof audio !== "string" || audio.trim().length === 0) {
      return NextResponse.json({ text: "" });
    }

    const cleanBase64 = audio.replace(/^data:[^;]+;base64,/, "").trim();
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env["NEXT_PUBLIC-GEMINI_API_KEY"];

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = [
      "You are an expert, multilingual speech-to-text transcriber for the FocusForge app.",
      "The speaker may speak in Bengali (বাংলা), English, or Banglish (Bengali spoken using colloquial or English mixed words).",
      "AUTOMATIC MULTILINGUAL TRANSCRIPTION RULES:",
      "1. If the speaker speaks in Bengali or Banglish (e.g. 'ami ajke routine banate chai', 'amar physics pora dorkar'):",
      "   - Transcribe directly into clear, natural Bengali script (বাংলা লিপি).",
      "2. If the speaker speaks in English (e.g. 'Help me plan my study schedule'):",
      "   - Transcribe into clean, punctuated English.",
      "3. If the speaker speaks code-mixed Bengali and English (e.g. 'ajke 2 ghonta React and Python shikhbo'):",
      "   - Transcribe naturally in Bengali script keeping technical English terms (e.g. 'আজকে ২ ঘণ্টা React এবং Python শিখব').",
      "4. If the audio is silent or only contains static/noise, return an empty string.",
      "Output ONLY the plain transcribed text without extra markdown, commentary, quotes, or JSON wrapping."
    ].join("\n");

    let lastError: any = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "audio/webm",
                    data: cleanBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        });

        const text = (response.text || "").trim();
        return NextResponse.json({ text });
      } catch (err: any) {
        console.warn(`[Transcribe API] Model ${model} failed, trying next:`, err?.message || err);
        lastError = err;
      }
    }

    throw lastError || new Error("Failed to transcribe audio");
  } catch (error: any) {
    console.error("[Transcribe API] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Audio transcription failed" },
      { status: 500 }
    );
  }
}
