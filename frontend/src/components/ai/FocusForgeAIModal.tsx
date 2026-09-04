"use client";

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import FocusForgeAIAssistant from "./FocusForgeAIAssistant";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

export default function FocusForgeAIModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Shortcut: Ctrl+J or Cmd+J to toggle AI Assistant
  useKeyboardShortcut("j", () => setIsOpen((prev) => !prev), { ctrl: true });

  return (
    <>
      {/* Floating AI Action Button (Bottom Right) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-600/30 border border-violet-400/30 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
        title="FocusForge AI Intelligence (Ctrl+J)"
      >
        <Sparkles className="w-4 h-4 animate-pulse group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-semibold tracking-wide hidden sm:inline">
          FocusForge AI
        </span>
        <kbd className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-violet-200 border border-white/10 font-mono">
          ^J
        </kbd>
      </button>

      {/* Modal Popup */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md fade-in">
          <div
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <FocusForgeAIAssistant onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
