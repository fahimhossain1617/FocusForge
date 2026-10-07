"use client";

import React, { useEffect, type RefObject } from "react";
import { Mic, MicOff, Languages } from "lucide-react";
import { useContinuousSpeech } from "@/hooks/useContinuousSpeech";
import { useTranslation } from "../../hooks/useTranslation";
import { useAppContext } from "../../context/AppContext";

interface DiaryVoiceInputProps {
  editorRef?: RefObject<HTMLTextAreaElement | null>;
  value?: string;
  onValueChange?: (next: string) => void;
  onInsertText?: (text: string) => void;
  onError?: (err: string) => void;
}

export default function DiaryVoiceInput({
  editorRef,
  value = "",
  onValueChange,
  onInsertText,
  onError,
}: DiaryVoiceInputProps) {
  const { t } = useTranslation();
  const { showToast, isOnline, state } = useAppContext();

  const handleAdjustEditor = () => {
    if (editorRef?.current) {
      const el = editorRef.current;
      el.style.height = "auto";
      const scrollH = el.scrollHeight;
      const maxH = 240;
      if (scrollH > maxH) {
        el.style.height = `${maxH}px`;
        el.style.overflowY = "auto";
      } else {
        el.style.height = `${scrollH}px`;
        el.style.overflowY = "hidden";
      }
      el.scrollTop = el.scrollHeight;
    }
  };

  const {
    isListening,
    lang,
    toggleListening: baseToggleListening,
    toggleLanguage,
    setManualText,
    isSupported,
  } = useContinuousSpeech({
    initialLang: state.lang === "bn" ? "bn-BD" : "en-US",
    onTranscriptChange: (nextVal) => {
      onValueChange?.(nextVal);
      onInsertText?.(nextVal);
      requestAnimationFrame(handleAdjustEditor);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  useEffect(() => {
    if (!isListening) {
      setManualText(value);
    }
  }, [value, isListening, setManualText]);

  const handleToggle = () => {
    if (isListening) {
      baseToggleListening();
      return;
    }
    if (!isOnline) {
      showToast(
        state.lang === "bn"
          ? "আপনি বর্তমানে অফলাইনে আছেন।"
          : "You are currently offline.",
        "error"
      );
      return;
    }
    baseToggleListening(value);
  };

  const isBn = lang === "bn-BD";

  const handleToggleLanguage = () => {
    toggleLanguage();
  };

  if (!isSupported) return null;

  return (
    <div className={`voice-input flex items-center gap-1.5 relative ${isListening ? "is-listening" : ""}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          isListening
            ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse "
            : "bg-blue-500/10 text-blue-400 border border-blue-500/25 hover:bg-blue-500/20 hover:text-blue-300"
        }`}
        title={isListening ? (t.myMind?.stopListening || "Stop Voice") : (t.myMind?.speakThought || "Voice Input")}
        aria-label={isListening ? "Stop voice dictation" : "Start voice dictation"}
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      <button
        type="button"
        onClick={handleToggleLanguage}
        className="h-8 px-2 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-white/5 hover:bg-blue-50/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95 select-none"
        title={isBn ? "Switch to English (ইংরেজি সিলেক্ট করুন)" : "Switch to Bangla (বাংলা সিলেক্ট করুন)"}
        aria-label={isBn ? "Switch to English speech recognition" : "Switch to Bangla speech recognition"}
      >
        <Languages size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
        <span>{isBn ? "বাং" : "Eng"}</span>
      </button>

      {isListening && (
        <span className="text-[10px] sm:text-[11px] font-medium text-blue-400/90 select-none">
          {state.lang === "bn" ? "শুনছি..." : "Listening..."}
        </span>
      )}
    </div>
  );
}
