"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, BookOpen, FileText, ChevronRight } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic } from "../../types";
import { searchDiary, DiarySearchResult, formatTopicNumber } from "../../services/diaryStorageService";
import { useAnimateExit } from "../../hooks/useAnimateExit";

interface DiarySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: DiaryTopic[];
  onSelectResult: (topicId: string, pageIndex: number) => void;
}

export default function DiarySearchModal({
  isOpen,
  onClose,
  topics,
  onSelectResult,
}: DiarySearchModalProps) {
  const { shouldRender, isExiting } = useAnimateExit(isOpen, 200);
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const results = query.trim() ? searchDiary(query, topics) : [];

  const handleSelect = (res: DiarySearchResult) => {
    onSelectResult(res.topic.id, res.pageIndex ?? 0);
    onClose();
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/60 backdrop-blur-sm ${
        isExiting ? "motion-exit-fade" : "motion-overlay"
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${
          isExiting ? "motion-exit-reveal" : "motion-dialog"
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-bg-elevated)",
          borderColor: "var(--color-border-subtle)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b border-black/5 dark:border-white/5">
          <Search size={18} className="text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.diary?.searchPlaceholder || "Search memories, thoughts, and moments..."}
            className="flex-1 bg-transparent border-0 text-sm focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            style={{ color: "var(--color-text-primary)" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs font-semibold px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 motion-stagger-fast">
          {query.trim() === "" ? (
            <div className="text-center py-10 text-xs text-zinc-400 dark:text-zinc-500">
              {t.diary?.searchPlaceholder || "Type a word or phrase to search across your diary..."}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-400 dark:text-zinc-500">
              {t.diary?.noResults || "No memories found matching your search."}
            </div>
          ) : (
            results.map((res, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(res)}
                className="w-full flex items-start gap-3 p-3 rounded-2xl border text-left transition-all hover:bg-blue-500/5 hover:border-blue-500/30 cursor-pointer group"
                style={{
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
                  {res.entry ? <FileText size={16} /> : <BookOpen size={16} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="diary-number-badge text-[11px] text-blue-500">
                      {formatTopicNumber(res.topic.order)}.
                    </span>
                    <h4
                      className="text-xs font-bold truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {res.topic.title}
                    </h4>
                    {res.pageIndex !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-zinc-500">
                        Page {res.pageIndex + 1}
                      </span>
                    )}
                  </div>

                  <p
                    className="text-[11px] text-zinc-400 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed"
                  >
                    {res.snippet}
                  </p>
                </div>

                <ChevronRight
                  size={14}
                  className="text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-2"
                />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
