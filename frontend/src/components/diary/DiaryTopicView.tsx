"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, Lock, Search, Edit3, Trash2, Calendar, BookOpen } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic, DiaryEntry } from "../../types";
import { formatTopicNumber, formatDiaryDate } from "../../services/diaryStorageService";
import DiaryEditor from "./DiaryEditor";
import DiaryTopicModal from "./DiaryTopicModal";

interface DiaryTopicViewProps {
  topic: DiaryTopic;
  onBackToTOC: () => void;
  onSaveEntry: (topicId: string, entryId: string, title: string, content: string) => void;
  onUpdateTopic: (topicId: string, title: string, description: string) => void;
  onDeleteTopic: (topicId: string) => void;
  onOpenSearch: () => void;
  lang: "en" | "bn";
}

export default function DiaryTopicView({
  topic,
  onBackToTOC,
  onSaveEntry,
  onUpdateTopic,
  onDeleteTopic,
  onOpenSearch,
  lang,
}: DiaryTopicViewProps) {
  const { t } = useTranslation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Single continuous infinite document for this topic
  const continuousEntry: DiaryEntry = useMemo(() => {
    if (!topic.entries || topic.entries.length === 0) {
      return {
        id: "entry_" + topic.id,
        title: "",
        content: "",
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
      };
    }
    if (topic.entries.length === 1) {
      return topic.entries[0];
    }
    // If legacy entries exist, smoothly merge their contents into a continuous document
    const combinedContent = topic.entries
      .map((e) => e.content)
      .filter(Boolean)
      .join("\n\n");
    return {
      ...topic.entries[0],
      content: combinedContent,
    };
  }, [topic]);

  const handleDeleteEntireTopic = () => {
    if (
      window.confirm(
        t.diary?.deleteTopicConfirm ||
          "Are you sure you want to delete this topic and its contents? This action cannot be undone."
      )
    ) {
      onDeleteTopic(topic.id);
      onBackToTOC();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pt-3 pb-8 animate-fade-in">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBackToTOC}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-xs"
          style={{
            borderColor: "var(--color-border-subtle)",
            color: "var(--color-text-primary)",
          }}
        >
          <ChevronLeft size={16} />
          <span>{t.diary?.backToTOC || "Table of Contents"}</span>
        </button>

        {/* Right Actions: Privacy Badge & Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Subtle Privacy Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border select-none"
            style={{
              borderColor: "var(--color-border-subtle)",
              color: "var(--color-text-secondary)",
              background: "rgba(59, 130, 246, 0.04)",
            }}
            title="Only saved locally on your private device"
          >
            <Lock size={11} className="text-blue-500" />
            <span>{t.diary?.privateToYou || "Private to you"}</span>
          </div>

          {/* Search Trigger */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-2 rounded-xl text-zinc-400 hover:text-blue-500 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-colors cursor-pointer"
            title={t.diary?.searchResults || "Search Diary"}
          >
            <Search size={15} />
          </button>

          {/* Edit Topic */}
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="p-2 rounded-xl text-zinc-400 hover:text-blue-500 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-colors cursor-pointer"
            title={t.diary?.editTopic || "Edit Topic"}
          >
            <Edit3 size={15} />
          </button>

          {/* Delete Topic */}
          <button
            type="button"
            onClick={handleDeleteEntireTopic}
            className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title={t.diary?.delete || "Delete Topic"}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Topic Title & Date Info Banner */}
      <div className="mb-4 sm:mb-6 px-1">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="diary-number-badge text-sm sm:text-base font-bold text-blue-500">
            {formatTopicNumber(topic.order)}.
          </span>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            {topic.title}
          </h1>
        </div>

        {topic.description && (
          <p className="text-xs sm:text-sm mt-1 text-zinc-500 dark:text-zinc-400">
            {topic.description}
          </p>
        )}

        {/* Entry Human Timestamp */}
        <div className="flex items-center gap-2 mt-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">
          <Calendar size={13} className="text-blue-500/80" />
          <span>{formatDiaryDate(continuousEntry.createdAt, lang)}</span>
        </div>
      </div>

      {/* Realistic Ruled Notebook Surface - Infinite Scroll */}
      <div className="diary-notebook-paper">
        <DiaryEditor
          key={continuousEntry.id}
          entry={continuousEntry}
          onSave={(newTitle, newContent) =>
            onSaveEntry(topic.id, continuousEntry.id, newTitle, newContent)
          }
          lang={lang}
        />
      </div>

      {/* Edit Topic Modal */}
      <DiaryTopicModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={(newTitle, newDesc) => onUpdateTopic(topic.id, newTitle, newDesc)}
        initialTopic={topic}
      />
    </div>
  );
}
