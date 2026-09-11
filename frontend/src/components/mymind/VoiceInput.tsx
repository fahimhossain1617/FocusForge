"use client";

import { useEffect } from "react";
import { Mic, MicOff, Globe } from "lucide-react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useTranslation } from "../../hooks/useTranslation";
import { useAppContext } from "../../context/AppContext";

interface VoiceInputProps {
  onResult: (text: string, isFinal: boolean, isFullReplacement?: boolean) => void;
  onInterimResult?: (text: string) => void;
  onError?: (err: string) => void;
}

export default function VoiceInput({ onResult, onInterimResult, onError }: VoiceInputProps) {
  const { t } = useTranslation();
  const { showToast, isOnline, state } = useAppContext();

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
    onResult,
    onInterimResult,
    onError,
  });

  useEffect(() => {
    if (onInterimResult) {
      onInterimResult(interimText);
    }
  }, [interimText, onInterimResult]);

  if (!isSupported) return null;

  return (
    <div className={`voice-input flex items-center gap-2 ${isListening ? "is-listening" : ""}`}>
      <button
        type="button"
        onClick={() => {
          if (!isListening && !isOnline) {
            showToast(
              state.lang === "bn"
                ? "আপনি বর্তমানে অফলাইনে আছেন। ভয়েস ইনপুট শুধুমাত্র অনলাইনে কাজ করে।"
                : "You are currently offline. Voice input is only available online.",
              "error"
            );
            return;
          }
          isListening ? stopListening() : startListening(speechLanguage);
        }}
        className="voice-input__toggle w-10 h-10 flex items-center justify-center transition-all cursor-pointer"
        title={isListening ? t.myMind.stopListening : t.myMind.speakThought}
        aria-label={isListening ? t.myMind.stopListening : t.myMind.startVoiceInput}
        disabled={isTranscribing}
      >
        {isTranscribing ? (
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
        ) : isListening ? (
          <MicOff size={18} />
        ) : (
          <Mic size={18} />
        )}
      </button>

      {/* Interactive Language Mode Toggle Pill */}
      <button
        type="button"
        onClick={cycleLanguage}
        className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 cursor-pointer shadow-xs"
        title={
          speechLanguage === "auto"
            ? "স্বয়ংক্রিয় মোড: বাংলা ও ইংরেজি উভয়ই বোঝে (ক্লিক করে সুইচ করুন)"
            : speechLanguage === "bn-BD"
            ? "বাংলা মোড: শুধুমাত্র বাংলা (ক্লিক করে সুইচ করুন)"
            : "English Mode: Transcribe English (Click to switch)"
        }
      >
        <Globe size={12} className="opacity-70 text-blue-500" />
        <span className="font-semibold">{speechLanguage === "auto" ? "Auto" : speechLanguage === "bn-BD" ? "বাংলা" : "EN"}</span>
      </button>

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
