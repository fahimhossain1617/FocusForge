"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import { Brain } from "lucide-react";

export default function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addMindItem, showToast } = useAppContext();
  const { requireAuth } = useAuth();

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center pt-[20vh] fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
          setValue("");
        }
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-4 scale-in">
        <div
          className="app-capture-modal rounded-2xl p-1 border shadow-2xl"
          style={{
            background: "var(--color-bg-elevated)",
            borderColor: "var(--color-border-active)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.1)",
          }}
        >
          <div className="flex items-start gap-3 p-4">
            <Brain className="w-5 h-5 text-indigo-400 shrink-0 mt-1" />
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind?"
              className="flex-1 py-1 text-base font-medium bg-transparent !border-none !shadow-none focus:!shadow-none resize-none"
              style={{
                background: "transparent",
                border: "none",
                boxShadow: "none",
                color: "var(--color-text-primary)",
                minHeight: "44px",
                maxHeight: "250px",
              }}
            />
          </div>
          <div className="px-4 pb-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: value.trim()
                  ? "var(--color-purple-primary)"
                  : "var(--color-bg-secondary)",
                color: value.trim()
                  ? "white"
                  : "var(--color-text-muted)",
              }}
            >
              Save
            </button>
          </div>
        </div>
        <p className="text-center mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Press <kbd className="font-mono bg-black/30 px-1 rounded">Enter</kbd> to save · <kbd className="font-mono bg-black/30 px-1 rounded">Shift + Enter</kbd> for new line · <kbd className="font-mono bg-black/30 px-1 rounded">Esc</kbd> to dismiss
        </p>
      </div>
    </div>
  );
}
