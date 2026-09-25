"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import { useAnimateExit } from "../hooks/useAnimateExit";
import { Brain } from "lucide-react";
import VoiceInput from "./mymind/VoiceInput";

export default function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [interim, setInterim] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addMindItem, showToast } = useAppContext();
  const { requireAuth } = useAuth();
  const { shouldRender, isExiting } = useAnimateExit({ isOpen, durationMs: 200 });

  useKeyboardShortcut("Space", () => setIsOpen(true), { ctrl: true });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleVoiceResult = (text: string, isFinal: boolean, isFullReplacement?: boolean) => {
    if (isFinal && text) {
      setValue((prev) => {
        if (isFullReplacement) return text;
        const needsSpace = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
        return prev + (needsSpace ? " " : "") + text;
      });
      setInterim("");
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 250)}px`;
        }
      }, 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 250)}px`;
    }
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    const text = value.trim();
    requireAuth(() => {
      addMindItem(text);
      showToast("Saved to My Mind", "success");
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
          className="app-capture-modal rounded-[18px] p-1 bg-white dark:bg-[#111827] border border-[#5B8DEF] shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:shadow-2xl"
        >
          <div className="flex items-start gap-3 p-4">
            <Brain className="w-5 h-5 text-[#5B8DEF] shrink-0 mt-1" />
            <textarea
              ref={textareaRef}
              value={value + (interim ? (value ? " " : "") + interim : "")}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind? (Speak in বাংলা or English...)"
              className="flex-1 py-1 text-base font-medium bg-transparent !border-none !shadow-none focus:!shadow-none resize-none text-[#111827] dark:text-foreground placeholder:text-[#8290A5]"
              style={{
                background: "transparent",
                border: "none",
                boxShadow: "none",
                minHeight: "44px",
                maxHeight: "250px",
              }}
            />
          </div>
          <div className="px-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VoiceInput onResult={handleVoiceResult} onInterimResult={setInterim} />
              {interim && (
                <span className="text-xs text-[#5B8DEF] animate-pulse font-medium">
                  Listening...
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!value.trim() && !interim.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#223A5E] hover:bg-[#2E4E7B] text-white shadow-sm"
            >
              Save
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
