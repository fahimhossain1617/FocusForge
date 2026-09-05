"use client";

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import VoiceInput from "./VoiceInput";

interface EmptySessionProps {
  navigate: (view: string) => void;
}

export default function EmptySession({ navigate }: EmptySessionProps) {
  const { addMindItem } = useAppContext();
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [interim, setInterim] = useState("");
  const [capturedCount, setCapturedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setInput((prev) => {
        const needsSpace = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
        return prev + (needsSpace ? " " : "") + text;
      });
      if (textareaRef.current) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
          }
        }, 0);
      }
    }
  }, []);

  const handleSubmit = () => {
    if (!input.trim()) return;
    addMindItem(input.trim(), 'empty_session');
    setCapturedCount((prev) => prev + 1);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  if (isFinished) {
    return (
      <div className="fade-in max-w-md mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
          {t.myMind.sessionComplete}
        </h2>
        <p className="mb-10 text-lg" style={{ color: "var(--color-text-secondary)" }}>
          {t.myMind.youCaptured} {capturedCount} {capturedCount === 1 ? t.myMind.thoughtSingle : t.myMind.thoughtPlural}.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('review_all')}
            className="py-3 rounded-xl font-medium transition-colors"
            style={{ background: "var(--color-purple-primary)", color: "white" }}
          >
            {t.myMind.reviewThoughts}
          </button>
          <button
            onClick={() => navigate('home')}
            className="py-3 rounded-xl font-medium transition-colors border hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          >
            {t.myMind.returnHome}
          </button>
        </div>
      </div>
    );
  }

  const displayValue = input + (interim ? ((input && !input.endsWith(" ") && !input.endsWith("\n")) ? " " : "") + interim : "");

  return (
    <div className="fade-in max-w-3xl mx-auto py-6 min-h-[75vh] flex flex-col relative">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate('home')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-xs"
          style={{
            borderColor: "var(--color-border-subtle)",
            color: "var(--color-text-primary)",
          }}
          aria-label="Back to Capture"
        >
          <ArrowLeft size={16} />
          <span>{t.myMind.backToMyMind || "Back to Capture"}</span>
        </button>
      </div>

      <div className="text-center mb-10 opacity-70">
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
          {t.myMind.emptyMyMind}
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {t.myMind.writeOrSpeak}
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full relative">
        <textarea
          ref={textareaRef}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t.myMind.iNeedTo}
          className="w-full text-2xl md:text-3xl font-medium bg-transparent border-none outline-none resize-none text-center my-mind-textarea"
          style={{ color: "var(--color-text-primary)", minHeight: "100px" }}
        />
        
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3">
          <VoiceInput onResult={handleResult} onInterimResult={setInterim} />
          {input.trim() && (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all"
              style={{ background: "var(--color-purple-primary)" }}
            >
              {t.myMind.save}
            </button>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
        <div className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          {capturedCount} {t.myMind.capturedSuffix}
        </div>
        <button
          onClick={() => {
            if (input.trim()) handleSubmit();
            setIsFinished(true);
          }}
          className="text-xs font-medium px-4 py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {t.myMind.finishSession}
        </button>
      </div>
    </div>
  );
}
