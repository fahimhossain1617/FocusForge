"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, BookOpen, Trash2, Palette } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic } from "../../types";
import { useAnimateExit } from "../../hooks/useAnimateExit";
import { DIARY_THEMES } from "./diaryThemes";
import ConfirmDeleteModal from "../ui/ConfirmDeleteModal";

interface DiaryTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description?: string, category?: string, theme?: string) => void;
  onDelete?: (topicId: string) => void;
  initialTopic?: DiaryTopic | null;
}

export default function DiaryTopicModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialTopic,
}: DiaryTopicModalProps) {
  const { shouldRender, isExiting } = useAnimateExit(isOpen, 200);
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState<string>("auto");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTopicRef = useRef<DiaryTopic | null | undefined>(initialTopic);

  if (initialTopic) {
    lastTopicRef.current = initialTopic;
  }

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTopic?.title || "");
      setTheme(initialTopic?.theme || "auto");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialTopic]);

  if (!shouldRender) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const finalTheme = theme === "auto" ? undefined : theme;
    onSubmit(title.trim(), "", undefined, finalTheme);
    onClose();
  };

  const isEditing = !!(initialTopic || lastTopicRef.current);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent"
      style={{
        animation: isExiting ? "app-fade-out 0.2s ease-in forwards" : "app-overlay-enter 0.2s ease-out both"
      }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-3xl border p-6 shadow-none ${
          isExiting ? "motion-exit-reveal" : "motion-dialog"
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-bg-elevated)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                {isEditing
                  ? t.diary?.editTopic || "Edit Diary"
                  : t.diary?.createTopic || "Create Topic"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t.diary?.topicTitle || "Topic Title"}
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.diary?.topicTitlePlaceholder || "e.g. Personal Thoughts, Daily Reflections..."}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500 transition-colors"
              style={{
                background: "var(--color-bg-base)",
                borderColor: "var(--color-border-subtle)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Cover Color Palette Picker */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Cover Theme
            </label>
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setTheme("auto")}
                className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                  theme === "auto" ? "border-blue-500 ring-2 ring-blue-500/30" : "border-border/60 hover:border-border"
                }`}
                title="Auto-assign theme"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-teal-400 mb-1" />
                <span className="text-[10px] text-muted-foreground">Auto</span>
              </button>

              {Object.values(DIARY_THEMES).slice(0, 4).map((tDef) => (
                <button
                  key={tDef.id}
                  type="button"
                  onClick={() => setTheme(tDef.id)}
                  className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                    theme === tDef.id ? "border-blue-500 ring-2 ring-blue-500/30" : "border-border/60 hover:border-border"
                  }`}
                  title={tDef.name}
                >
                  <div 
                    className="w-6 h-6 rounded-lg mb-1 border"
                    style={{ background: tDef.coverBg, borderColor: tDef.coverBorder }}
                  />
                  <span className="text-[10px] text-muted-foreground truncate max-w-[48px]">{tDef.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-3">
            <div>
              {isEditing && initialTopic && onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>{t.diary?.delete || "Delete"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {t.diary?.cancel || "Cancel"}
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="btn-accent-solid px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                style={{ color: "#FFFFFF" }}
              >
                {isEditing ? t.diary?.save || "Save" : t.diary?.createTopic || "Create Diary"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {isEditing && initialTopic && onDelete && (
        <ConfirmDeleteModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete(initialTopic.id);
            onClose();
          }}
          title={t.diary?.delete || "Delete Diary?"}
          message={
            t.diary?.deleteTopicConfirm ||
            "Are you sure you want to delete this diary and all its pages? This action cannot be undone."
          }
          confirmLabel={t.diary?.delete || "Delete"}
          cancelLabel={t.diary?.cancel || "Cancel"}
        />
      )}
    </div>
  );
}
