"use client";

import React, { useEffect, type RefObject } from "react";
import { Mic, Square, Languages } from "lucide-react";
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
    initialLang: "bn-BD",
    onTranscriptChange: (nextVal) => {
      if (onValueChange) {
        onValueChange(nextVal);
      } else if (onInsertText) {
        onInsertText(nextVal);
      }
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
          ? "আপনি বর্তমানে অফলাইনে আছেন। ভয়েস ইনপুটের জন্য ইন্টারনেট প্রয়োজন।"
          : "You are currently offline. Voice input needs internet.",
        "error"
      );
      onError?.(
        state.lang === "bn"
          ? "আপনি বর্তমানে অফলাইনে আছেন। ভয়েস ইনপুটের জন্য ইন্টারনেট প্রয়োজন।"
          : "You are currently offline. Voice input needs internet."
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
      {/* Mic / Stop Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
          isListening
            ? "bg-purple-600 dark:bg-purple-500 text-white shadow-purple-500/20"
            : "bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
        }`}
        title={isListening ? (isBn ? "ভয়েস থামান" : "Stop Voice") : (isBn ? "ভয়েস ইনপুট" : "Voice Input")}
        aria-label={isListening ? "Stop voice dictation" : "Start voice dictation"}
      >
        {isListening ? <Square size={13} fill="currentColor" /> : <Mic size={16} strokeWidth={1.8} />}
      </button>

      {/* Language Toggle Button */}
      <button
        type="button"
        onClick={handleToggleLanguage}
        className="h-8 sm:h-9 px-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95 select-none"
        title={isBn ? "Switch to English (ইংরেজি সিলেক্ট করুন)" : "Switch to Bangla (বাংলা সিলেক্ট করুন)"}
        aria-label={isBn ? "Switch to English speech recognition" : "Switch to Bangla speech recognition"}
      >
        <Languages size={12} className="text-purple-600 dark:text-purple-400 shrink-0" />
        <span>{isBn ? "বাং" : "EN"}</span>
      </button>

      {isListening && (
        <span className="text-[10px] sm:text-[11px] font-medium text-purple-600 dark:text-purple-400/90 select-none animate-pulse">
          {isBn ? "শুনছি..." : "Listening..."}
        </span>
      )}
    </div>
  );
}
