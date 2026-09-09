"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Globe } from "lucide-react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useTranslation } from "../../hooks/useTranslation";

interface DiaryVoiceInputProps {
  onInsertText: (text: string, replaceLength?: number) => void;
  onError?: (err: string) => void;
}

export default function DiaryVoiceInput({ onInsertText, onError }: DiaryVoiceInputProps) {
  const { t } = useTranslation();
  const sessionInsertedCharsRef = useRef(0);

  const onInsertTextRef = useRef(onInsertText);
  useEffect(() => {
    onInsertTextRef.current = onInsertText;
  }, [onInsertText]);

  const handleResult = useCallback((text: string, isFinal: boolean, isFullReplacement?: boolean) => {
    if (isFinal && text.trim()) {
      if (onInsertTextRef.current) {
        if (isFullReplacement) {
          onInsertTextRef.current(text, sessionInsertedCharsRef.current);
          sessionInsertedCharsRef.current = text.length;
        } else {
          onInsertTextRef.current(text, 0);
          sessionInsertedCharsRef.current += text.length + 1;
        }
      }
    }
  }, []);

  const {
    isSupported,
    isListening,
    isTranscribing,
    interimText,
    speechLanguage,
    cycleLanguage,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult: handleResult,
    onError,
  });

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      sessionInsertedCharsRef.current = 0;
      startListening(speechLanguage);
    }
  }, [isListening, speechLanguage, startListening, stopListening]);

  if (!isSupported) return null;

  return (
    <div className={`voice-input flex items-center gap-1.5 relative ${isListening ? "is-listening" : ""}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          isListening
            ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse shadow-sm shadow-red-500/20"
            : "bg-blue-500/10 text-blue-400 border border-blue-500/25 hover:bg-blue-500/20 hover:text-blue-300"
        }`}
        title={isListening ? t.myMind.stopListening : t.myMind.speakThought}
        aria-label={isListening ? t.myMind.stopListening : t.myMind.startVoiceInput}
        disabled={isTranscribing}
      >
        {isTranscribing ? (
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        ) : isListening ? (
          <MicOff size={16} />
        ) : (
          <Mic size={16} />
        )}
      </button>

      {/* Language Switcher Pill */}
      <button
        type="button"
        onClick={cycleLanguage}
        className="px-2 py-1 text-[11px] font-medium rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-1 text-zinc-600 dark:text-zinc-300 cursor-pointer shadow-xs"
        title={
          speechLanguage === "auto"
            ? "স্বয়ংক্রিয় মোড: বাংলা ও ইংরেজি উভয়ই বোঝে (ক্লিক করে পরিবর্তন করুন)"
            : speechLanguage === "bn-BD"
            ? "বাংলা মোড: শুধুমাত্র বাংলা (ক্লিক করে পরিবর্তন করুন)"
            : "English Mode (Click to switch)"
        }
      >
        <Globe size={11} className="opacity-70 text-blue-500" />
        <span className="font-semibold">{speechLanguage === "auto" ? "Auto" : speechLanguage === "bn-BD" ? "বাং" : "EN"}</span>
      </button>

      {/* Floating live text preview so user sees it typing simultaneously */}
      {isListening && interimText && (
        <div className="absolute top-12 left-0 w-max max-w-[250px] bg-black/90 dark:bg-zinc-800/95 text-white dark:text-zinc-100 text-xs p-2.5 rounded-xl shadow-xl backdrop-blur-md pointer-events-none z-50 animate-fade-in whitespace-normal border border-white/10 text-left leading-relaxed">
          {interimText}
          <span className="animate-pulse ml-1">...</span>
        </div>
      )}

      {isListening ? (
        <div className="voice-wave" role="status" aria-label="Listening">
          <svg viewBox="0 0 240 48" aria-hidden="true" focusable="false">
            <path
              className="voice-wave__line voice-wave__line--back"
              d="M-16 25 C4 10 21 10 41 25 S78 40 98 25 S135 10 155 25 S192 40 212 25 S239 10 258 25"
            />
            <path
              className="voice-wave__line voice-wave__line--mid"
              d="M-16 25 C4 40 21 40 41 25 S78 10 98 25 S135 40 155 25 S192 10 212 25 S239 40 258 25"
            />
            <path
              className="voice-wave__line voice-wave__line--front"
              d="M-16 25 C4 17 21 17 41 25 S78 33 98 25 S135 17 155 25 S192 33 212 25 S239 17 258 25"
            />
          </svg>
        </div>
      ) : isTranscribing ? (
        <div className="text-xs text-blue-400 animate-pulse font-medium">Processing...</div>
      ) : null}
    </div>
  );
}
