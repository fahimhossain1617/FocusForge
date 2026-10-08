"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import { useAnimateExit } from "../hooks/useAnimateExit";
import { Brain } from "lucide-react";
import VoiceInput from "./mymind/VoiceInput";
import VoiceReactiveGlow from "./voice/VoiceReactiveGlow";
import VoiceWaveform from "./voice/VoiceWaveform";


export default function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addMindItem, showToast, state } = useAppContext();
  const { requireAuth } = useAuth();
  const { t } = useTranslation();
  const { shouldRender, isExiting } = useAnimateExit({ isOpen, durationMs: 200 });

  useKeyboardShortcut("Space", () => setIsOpen(true), { ctrl: true });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      if (scrollH > 240) {
        textareaRef.current.style.height = "240px";
        textareaRef.current.style.overflowY = "auto";
      } else {
        textareaRef.current.style.height = `${Math.max(scrollH, 44)}px`;
        textareaRef.current.style.overflowY = "hidden";
      }
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    const text = value.trim();
    requireAuth(() => {
      addMindItem(text);
      showToast(t.myMind.toastChangesSaved || "Saved to My Mind", "success");
      setValue("");
      setIsOpen(false);
      
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, 'mind');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setValue("");
      
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick capture"
      className={`fixed inset-0 z-[95] flex items-start justify-center pt-[10vh] sm:pt-[18vh] p-3 sm:p-4 ${isExiting ? "motion-exit-fade" : "motion-overlay"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
          setValue("");
        }
      }}
    >
      {/* Overlay: Navy #223A5E at 38% opacity, light blur */}
      <div className="absolute inset-0 bg-[#223A5E]/38 backdrop-blur-sm" />
      <div className={`relative w-full max-w-lg mx-4 ${isExiting ? "motion-exit-reveal" : "motion-reveal"}`}>
        <div
          className="app-capture-modal rounded-[18px] p-1 bg-white dark:bg-[#111827] border border-[#5B8DEF] shadow-none relative"
        >
          <VoiceReactiveGlow active={isVoiceListening} rounded="rounded-[18px]" />
          <div className="flex items-start gap-3 p-4">
            <Brain className="w-5 h-5 text-[#5B8DEF] shrink-0 mt-1" />
            <div className="flex-1 flex flex-col min-w-0">
              {isVoiceListening && (
                <div className="w-full h-[22px] flex items-center overflow-hidden mb-1 pointer-events-none">
                  <VoiceWaveform active={isVoiceListening} isBengali={state.lang === 'bn'} />
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  isVoiceListening
                    ? (state.lang === 'bn' ? "বলুন, কথা শোনা হচ্ছে..." : "Listening, speak now...")
                    : (state.lang === 'bn' ? "আপনার মনে কী চলছে? (বাংলা বা ইংরেজিতে বলুন...)" : "What's on your mind? (Speak in বাংলা or English...)")
                }
                className="w-full py-1 text-base font-medium bg-transparent !border-none !shadow-none focus:!shadow-none resize-none text-[#111827] dark:text-foreground placeholder:text-[#8290A5]"
                style={{
                  background: "transparent",
                  border: "none",
                  boxShadow: "none",
                  minHeight: "44px",
                  maxHeight: "240px",
                  height: "auto",
                  overflowY: "hidden",
                }}
              />
            </div>
          </div>
          <div className="px-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 max-w-[calc(100%-90px)]">
              <VoiceInput
                editorRef={textareaRef}
                currentValue={value} 
                onValueChange={(val) => {
                  setValue(val);
                }}
                onListeningChange={setIsVoiceListening}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#223A5E] hover:bg-[#2E4E7B] text-white shadow-none"
            >
              {t.myMind.save || "Save"}
            </button>
          </div>
        </div>
        <p className="text-center mt-3 text-xs text-[#8290A5]">
          Press <kbd className="font-mono bg-black/10 dark:bg-black/30 px-1 rounded">Enter</kbd> to save · <kbd className="font-mono bg-black/10 dark:bg-black/30 px-1 rounded">Shift + Enter</kbd> for new line · <kbd className="font-mono bg-black/10 dark:bg-black/30 px-1 rounded">Esc</kbd> to dismiss
        </p>
      </div>
    </div>
  );
}
