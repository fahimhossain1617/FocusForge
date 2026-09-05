"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Lock, Search, Edit3, Trash2, Calendar, BookOpen, Settings2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic, DiaryEntry, DiaryImage } from "../../types";
import { formatTopicNumber, formatDiaryDate } from "../../services/diaryStorageService";
import DiaryEditor from "./DiaryEditor";
import DiaryTopicModal from "./DiaryTopicModal";

interface DiaryTopicViewProps {
  topic: DiaryTopic;
  initialMode?: "read" | "edit";
  onBackToTOC: () => void;
  onSaveEntry: (
    topicId: string,
    entryId: string,
    title: string,
    content: string,
    images?: DiaryImage[]
  ) => void;
  onUpdateTopic: (topicId: string, title: string, description: string) => void;
  onDeleteTopic: (topicId: string) => void;
  onOpenSearch: () => void;
  lang: "en" | "bn";
}

export default function DiaryTopicView({
  topic,
  initialMode = "read",
  onBackToTOC,
  onSaveEntry,
  onUpdateTopic,
  onDeleteTopic,
  onOpenSearch,
  lang,
}: DiaryTopicViewProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"read" | "edit">(initialMode);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Sync mode whenever topic or initialMode changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, topic.id]);

  // Single continuous infinite document for this topic
  const continuousEntry: DiaryEntry = useMemo(() => {
    if (!topic.entries || topic.entries.length === 0) {
      return {
        id: "entry_" + topic.id,
        title: "",
        content: "",
        images: [],
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
    const combinedImages = topic.entries.flatMap((e) => e.images || []);
    return {
      ...topic.entries[0],
      content: combinedContent,
      images: combinedImages,
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

  const wordCount = continuousEntry.content
    ? continuousEntry.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

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

        {/* Right Actions: Mode Toggle, Privacy Badge & Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher: Read vs Edit */}
          {mode === "read" ? (
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-sm shadow-blue-600/30"
              title={t.diary?.edit || "Edit"}
            >
              <Edit3 size={14} />
              <span>{t.diary?.edit || "Edit"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("read")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-xs"
              style={{
                borderColor: "var(--color-border-subtle)",
                color: "var(--color-text-primary)",
              }}
              title={t.diary?.readMode || "Read"}
            >
              <BookOpen size={14} className="text-blue-500" />
              <span>{t.diary?.readMode || "Read"}</span>
            </button>
          )}

          {/* Subtle Privacy Indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border select-none"
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

          {/* Edit Topic Metadata */}
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="p-2 rounded-xl text-zinc-400 hover:text-blue-500 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-colors cursor-pointer"
            title={t.diary?.editTopic || "Edit Topic Settings"}
          >
            <Settings2 size={15} />
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

      {/* Realistic Ruled Notebook Surface */}
      <div className="diary-notebook-paper">
        {mode === "edit" ? (
          <DiaryEditor
            key={continuousEntry.id}
            entry={continuousEntry}
            onSave={(newTitle, newContent, newImages) =>
              onSaveEntry(topic.id, continuousEntry.id, newTitle, newContent, newImages)
            }
            lang={lang}
          />
        ) : (
          /* Clean Read View */
          <div className="relative px-5 sm:px-14 pt-6 pb-12">
            {/* Left spine binding decor */}
            <div className="diary-spine-binding" />

            {/* Entry Title if present */}
            {continuousEntry.title && (
              <h2
                className="text-xl sm:text-2xl font-bold tracking-tight mb-4 pb-2 border-b border-black/5 dark:border-white/5"
                style={{ color: "var(--color-text-primary)" }}
              >
                {continuousEntry.title}
              </h2>
            )}

            {/* Attached Images in Read Mode */}
            {continuousEntry.images && continuousEntry.images.length > 0 && (
              <div className="diary-image-container">
                {continuousEntry.images.map((img) => {
                  const sizeClass =
                    img.size === "small"
                      ? "diary-img-size-small"
                      : img.size === "large"
                      ? "diary-img-size-large"
                      : img.size === "full"
                      ? "diary-img-size-full"
                      : "diary-img-size-medium";

                  return (
                    <div key={img.id} className={`diary-image-wrapper ${sizeClass}`}>
                      <img
                        src={img.url}
                        alt={img.fileName || "Diary photo"}
                        className="w-full h-auto block rounded-xl object-contain max-h-[550px]"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Text Content in Read Mode */}
            {continuousEntry.content && continuousEntry.content.trim() ? (
              <div
                className="w-full whitespace-pre-wrap break-words diary-lined-textarea font-sans select-text text-[15px] sm:text-base leading-[32px]"
                style={{ minHeight: "240px", color: "var(--color-text-primary)" }}
              >
                {continuousEntry.content}
              </div>
            ) : (
              (!continuousEntry.images || continuousEntry.images.length === 0) && (
                <div className="py-16 text-center">
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-4">
                    {t.diary?.blankPagePrompt || "This page is currently blank."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-sm shadow-blue-600/30"
                  >
                    <Edit3 size={14} />
                    <span>{t.diary?.startWriting || "Start Writing"}</span>
                  </button>
                </div>
              )
            )}

            {/* Bottom Info Bar in Read Mode */}
            <div className="mt-8 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-zinc-400">
              <span>
                {wordCount} {t.diary?.words || "words"}
              </span>
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-400 font-semibold cursor-pointer"
              >
                <Edit3 size={13} />
                <span>{t.diary?.edit || "Edit"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Topic Modal */}
      <DiaryTopicModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={(newTitle, newDesc) => onUpdateTopic(topic.id, newTitle, newDesc)}
        onDelete={() => {
          onDeleteTopic(topic.id);
          onBackToTOC();
        }}
        initialTopic={topic}
      />
    </div>
  );
}
