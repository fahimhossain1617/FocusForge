"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, BookOpen, Sparkles, Trash2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic } from "../../types";

interface DiaryTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
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
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTopic?.title || "");
      setDescription(initialTopic?.description || "");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialTopic]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim());
    onClose();
  };

  const isEditing = !!initialTopic;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl border p-6 shadow-2xl scale-in"
        style={{
          background: "var(--color-bg-elevated)",
          borderColor: "var(--color-border-subtle)",
          boxShadow: "0 24px 50px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                {isEditing
                  ? t.diary?.editTopic || "Edit Topic"
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
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t.diary?.topicTitle || "Topic Title"} <span className="text-blue-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.diary?.topicTitlePlaceholder || "e.g. My University Life, Personal Thoughts..."}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500 transition-colors"
              style={{
                background: "var(--color-bg-base)",
                borderColor: "var(--color-border-subtle)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t.diary?.topicDesc || "Description (optional)"}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.diary?.topicDescPlaceholder || "A brief note about what this chapter is for..."}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
              style={{
                background: "var(--color-bg-base)",
                borderColor: "var(--color-border-subtle)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-2">
            <div>
              {isEditing && initialTopic && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        t.diary?.deleteTopicConfirm ||
                          "Are you sure you want to delete this topic and all its pages? This action cannot be undone."
                      )
                    ) {
                      onDelete(initialTopic.id);
                      onClose();
                    }
                  }}
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
                className="btn-accent-solid px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-600/30 transition-all cursor-pointer"
                style={{ color: "#FFFFFF" }}
              >
                {isEditing ? t.diary?.save || "Save" : t.diary?.createTopic || "Create Topic"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
