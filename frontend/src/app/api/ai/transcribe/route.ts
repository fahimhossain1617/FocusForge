import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { audio, mimeType = "audio/webm", language = "auto" } = body;

    if (!audio || typeof audio !== "string" || audio.trim().length === 0) {
      return NextResponse.json({ text: "" });
    }

    const cleanBase64 = audio.replace(/^data:[^;]+;base64,/, "").trim();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = [
      "You are a state-of-the-art, ultra-accurate multilingual speech-to-text transcriber.",
      "The speaker may speak in Bengali (বাংলা), English, or mixed Banglish (code-switching).",
      "",
      "CRITICAL ACCURACY & LANGUAGE DETECTION GUIDELINES:",
      "1. EXACT ACCURACY & SPEED TOLERANCE:",
      "   - Accurately capture EVERY SINGLE WORD, even when the speaker talks very rapidly, murmurs, connects words fast, or uses colloquial expressions.",
      "   - Never drop, hallucinate, skip, or summarize words. Transcribe verbatim with high phonetic precision.",
      "",
      "2. AUTOMATIC LANGUAGE DETECTION & SCRIPT RULES:",
      "   - Bengali / Banglish: If the speaker speaks in Bengali or phonetic Banglish (e.g. 'ami ajke porbo', 'amar presentation banano lagbe'), transcribe into authentic Bengali script (বাংলা লিপি) with grammatically correct Bengali spelling.",
      "   - English: If the speaker speaks in English, transcribe into clean, properly punctuated English.",
      "   - Mixed (Bengali + English Code-Switching): Transcribe naturally in Bengali script, preserving English technical words, software names, brand names, and subject terminology in clean English (e.g., 'আজকে ৩ ঘণ্টা Next.js এবং Python প্র্যাকটিস করব', 'Physics চ্যাপ্টার ৪ রিভিশন দিতে হবে').",
      "",
      "3. NUMBER & PUNCTUATION FORMATTING:",
      "   - Format numbers, times, percentages, and currencies naturally (e.g., '৫০%', '১০টা ৩০', '৫০০ টাকা', '2 hours').",
      "   - Add natural punctuation (দাঁড়ি, কমা, ?, !) for clear readability.",
      "",
      "4. SILENCE / NOISE:",
      "   - If the audio contains only silence, background noise, or clicks, return an empty string.",
      "",
      "Output ONLY the pure transcribed text without quotes, markdown formatting, prefixes, or explanations."
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
