"use client";

import React, { useState } from "react";
import { 
  ChevronLeft, 
  Plus, 
  Search, 
  BookOpen, 
  Calendar, 
  Clock, 
  Lock, 
  ChevronRight, 
  Edit3, 
  Trash2,
  Sparkles 
} from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic } from "../../types";
import { formatTopicNumber, formatDiaryDateTime } from "../../services/diaryStorageService";
import DiaryTopicModal from "./DiaryTopicModal";

interface DiaryTableOfContentsProps {
  topics: DiaryTopic[];
  onBackToMind: () => void;
  onOpenTopic: (topicId: string, pageIndex?: number) => void;
  onCreateTopic: (title: string, description: string) => void;
  onUpdateTopic: (topicId: string, title: string, description: string) => void;
  onDeleteTopic: (topicId: string) => void;
  onOpenSearch: () => void;
  lang: "en" | "bn";
}

export default function DiaryTableOfContents({
  topics,
  onBackToMind,
  onOpenTopic,
  onCreateTopic,
  onUpdateTopic,
  onDeleteTopic,
  onOpenSearch,
  lang,
}: DiaryTableOfContentsProps) {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<DiaryTopic | null>(null);

  const handleDelete = (e: React.MouseEvent, topic: DiaryTopic) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      window.confirm(
        t.diary?.deleteTopicConfirm ||
          "Are you sure you want to delete this topic and all its pages? This action cannot be undone."
      )
    ) {
      onDeleteTopic(topic.id);
    }
  };

  const handleEdit = (e: React.MouseEvent, topic: DiaryTopic) => {
    e.stopPropagation();
    setEditingTopic(topic);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 motion-page">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onBackToMind}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-xs"
          style={{
            borderColor: "var(--color-border-subtle)",
            color: "var(--color-text-primary)",
          }}
        >
          <ChevronLeft size={16} />
          <span>{t.diary?.backToMind || "My Mind"}</span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-xs"
            style={{
              borderColor: "var(--color-border-subtle)",
              color: "var(--color-text-primary)",
            }}
          >
            <Search size={14} className="text-blue-500" />
            <span className="hidden sm:inline">{t.diary?.searchResults || "Search"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-accent-solid flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-600/30 transition-all cursor-pointer"
            style={{ color: "#FFFFFF" }}
          >
            <Plus size={15} style={{ color: "#FFFFFF" }} />
            <span>{t.diary?.newTopic || "+ New Topic"}</span>
          </button>
        </div>
      </div>

      {/* Book Title Banner */}
      <div className="text-center my-6 sm:my-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 mb-3 shadow-sm">
          <BookOpen size={24} />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          {t.diary?.title || "My Diary"}
        </h1>
        <p
          className="text-xs sm:text-sm mt-2 max-w-md mx-auto"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {t.diary?.subtitle || "Your thoughts, memories and moments — all in one place."}
        </p>
      </div>

      {/* Index Book Card */}
      <div
        className="rounded-3xl border shadow-xl overflow-hidden"
        style={{
          background: "var(--color-bg-elevated)",
          borderColor: "var(--color-border-subtle)",
          boxShadow: "0 18px 40px -8px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Table of Contents Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-500">
              {t.diary?.tableOfContents || "Table of Contents"}
            </span>
            <span className="text-xs text-zinc-400">({topics.length})</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Lock size={11} className="text-blue-500" />
            <span>{t.diary?.privateToYou || "Private to you"}</span>
          </div>
        </div>

        {/* Index Rows or Empty State */}
        {topics.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-500">
              <Sparkles size={24} />
            </div>
            <h3
              className="text-base sm:text-lg font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t.diary?.emptyDiaryTitle || "Your diary is waiting for its first memory."}
            </h3>
            <p
              className="text-xs sm:text-sm mt-1 mb-6 max-w-sm mx-auto text-zinc-500 dark:text-zinc-400"
            >
              {t.diary?.emptyDiarySubtitle ||
                "Create a topic like University Life, Goals, or Daily Reflections to begin your journey."}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-accent-solid inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              style={{ color: "#FFFFFF" }}
            >
              <Plus size={16} style={{ color: "#FFFFFF" }} />
              <span>{t.diary?.writeFirstPage || "Write Your First Page"}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5 motion-stagger-fast">
            {topics.map((topic) => {
              const wordCount = topic.entries.reduce(
                (acc, e) => acc + (e.content ? e.content.trim().split(/\s+/).filter(Boolean).length : 0),
                0
              );
              return (
                <div
                  key={topic.id}
                  onClick={() => onOpenTopic(topic.id)}
                  className="diary-toc-row motion-grid-item card-interactive flex items-center justify-between gap-4 px-6 py-4 cursor-pointer group"
                >
                  {/* Left: Number & Title Info */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="diary-number-badge text-sm sm:text-base font-bold text-blue-500 shrink-0">
                      {formatTopicNumber(topic.order)}.
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-sm sm:text-base font-bold truncate group-hover:text-blue-500 transition-colors"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {topic.title}
                      </h3>

                      {topic.description ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {topic.description}
                        </p>
                      ) : null}

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDiaryDateTime(topic.updatedAt, lang)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Words count & Hover Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 font-mono">
                      {wordCount > 0 ? `${wordCount} ${t.diary?.words || "words"}` : "0 " + (t.diary?.words || "words")}
                    </span>

                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleEdit(e, topic)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title={t.diary?.editTopic || "Edit Topic"}
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, topic)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title={t.diary?.delete || "Delete Topic"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <ChevronRight
                      size={16}
                      className="text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Topic Modal */}
      <DiaryTopicModal
        isOpen={isCreateModalOpen || !!editingTopic}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTopic(null);
        }}
        onSubmit={(title, desc) => {
          if (editingTopic) {
            onUpdateTopic(editingTopic.id, title, desc);
          } else {
            onCreateTopic(title, desc);
          }
        }}
        onDelete={(topicId) => onDeleteTopic(topicId)}
        initialTopic={editingTopic}
      />
    </div>
  );
}
