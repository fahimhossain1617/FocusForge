"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Edit3, Trash2, Calendar, BookOpen, ClipboardPenLine } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic, DiaryEntry, DiaryImage } from "../../types";
import { formatDiaryDate } from "../../services/diaryStorageService";
import DiaryEditor from "./DiaryEditor";
import DiaryTopicModal from "./DiaryTopicModal";
import ConfirmDeleteModal from "../ui/ConfirmDeleteModal";

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
  onUpdateTopic: (topicId: string, title: string, description?: string, category?: string, theme?: string) => void;
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

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
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onDeleteTopic(topic.id);
    onBackToTOC();
  };

  const wordCount = continuousEntry.content
    ? continuousEntry.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="motion-page max-w-6xl mx-auto w-full pb-14">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between gap-3 mb-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBackToTOC}
          className="inline-flex items-center justify-center w-9 h-9 -ml-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-colors cursor-pointer shrink-0"
          aria-label={t.diary?.backToTOC || "Table of Contents"}
          title={t.diary?.backToTOC || "Table of Contents"}
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Right Actions: Mode Toggle, Edit Topic Details & Delete */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
          {/* Mode Switcher: Read vs Edit */}
          {mode === "read" ? (
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="p-1.5 sm:p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-[#1E3E7B] dark:hover:text-blue-400 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-colors cursor-pointer shrink-0"
              title={t.diary?.edit || "Edit"}
              aria-label={t.diary?.edit || "Edit"}
            >
              <Edit3 size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("read")}
              className="p-1.5 sm:p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-[#1E3E7B] dark:hover:text-blue-400 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-colors cursor-pointer shrink-0"
              title={t.diary?.readMode || "Read"}
              aria-label={t.diary?.readMode || "Read"}
            >
              <BookOpen size={16} />
            </button>
          )}

          {/* Edit Topic Details Modal */}
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-[#1E3E7B] dark:hover:text-blue-400 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-colors cursor-pointer shrink-0"
            title={t.diary?.editTopic || "Edit Topic Details"}
            aria-label={t.diary?.editTopic || "Edit Topic Details"}
          >
            <ClipboardPenLine size={16} />
          </button>

          {/* Delete Topic */}
          <button
            type="button"
            onClick={handleDeleteEntireTopic}
            className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-colors cursor-pointer shrink-0"
            title={t.diary?.delete || "Delete Topic"}
            aria-label="Delete Topic"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Topic Title & Date Info Banner */}
      <div className="mb-4 sm:mb-6 px-1">
        <h1
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground"
        >
          {topic.title}
        </h1>

        {/* Entry Human Timestamp & Word Count */}
        <div className="flex items-center gap-2 mt-2 text-xs font-medium text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-blue-500/80" />
            <span>{formatDiaryDate(continuousEntry.createdAt, lang)}</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-600 select-none">•</span>
          <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium">
            {wordCount} {t.diary?.words || "words"}
          </span>
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
                        onClick={() => setViewingImage(img.url)}
                        className="w-full h-auto block rounded-xl object-contain max-h-[550px] cursor-zoom-in"
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
                <div className="pt-20 pb-16 text-center">
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-4 pt-2">
                    {t.diary?.blankPagePrompt || "This page is currently blank."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-none"
                  >
                    <Edit3 size={14} />
                    <span>{t.diary?.startWriting || "Start Writing"}</span>
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Edit Topic Modal */}
      <DiaryTopicModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={(newTitle, newDesc, newCat, newTheme) =>
          onUpdateTopic(topic.id, newTitle, newDesc, newCat, newTheme)
        }
        onDelete={() => {
          onDeleteTopic(topic.id);
          onBackToTOC();
        }}
        initialTopic={topic}
      />

      {/* Image Lightbox */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 cursor-zoom-out"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={viewingImage}
              alt="Fullscreen view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-none"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="absolute -top-10 right-0 sm:-right-10 text-white/70 hover:text-white p-2"
              onClick={() => setViewingImage(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={lang === "bn" ? "ডায়েরি টপিক মুছে ফেলতে চান?" : "Delete Diary Topic?"}
        message={
          lang === "bn"
            ? "আপনি কি নিশ্চিত যে এই টপিক এবং এর সমস্ত পৃষ্ঠা মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।"
            : "Are you sure you want to delete this topic and all its contents? This action cannot be undone."
        }
        confirmLabel={lang === "bn" ? "মুছুন" : "Delete"}
        cancelLabel={lang === "bn" ? "বাতিল" : "Cancel"}
      />
    </div>
  );
}
