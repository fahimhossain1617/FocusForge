"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic } from "../../types";
import DiaryHeader from "./DiaryHeader";
import DiaryCard from "./DiaryCard";
import DiaryEmptyState from "./DiaryEmptyState";
import DiaryTopicModal from "./DiaryTopicModal";
import ConfirmDeleteModal from "../ui/ConfirmDeleteModal";

interface DiaryTableOfContentsProps {
  topics: DiaryTopic[];
  onOpenSidebar?: () => void;
  onOpenTopic: (topicId: string, pageIndex?: number) => void;
  onCreateTopic: (title: string, description?: string, category?: string, theme?: string) => void;
  onUpdateTopic: (topicId: string, title: string, description?: string, category?: string, theme?: string) => void;
  onDeleteTopic: (topicId: string) => void;
  onToggleBookmark: (topicId: string) => void;
  onOpenSearch: () => void;
  lang: "en" | "bn";
}

export default function DiaryTableOfContents({
  topics,
  onOpenTopic,
  onCreateTopic,
  onUpdateTopic,
  onDeleteTopic,
  onToggleBookmark,
  lang,
}: DiaryTableOfContentsProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<DiaryTopic | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return topics;

    return topics.filter((topic) => {
      const matchTitle = topic.title.toLowerCase().includes(q);
      const matchEntries = topic.entries?.some((e) => 
        (e.title && e.title.toLowerCase().includes(q)) || 
        (e.content && e.content.toLowerCase().includes(q))
      );
      return matchTitle || matchEntries;
    });
  }, [topics, searchQuery]);

  const handleCreateCardClick = () => {
    setEditingTopic(null);
    setIsCreateModalOpen(true);
  };

  const handleEditTopic = (topic: DiaryTopic) => {
    setEditingTopic(topic);
  };

  const handleDeleteTopic = (topicId: string) => {
    setDeletingTopicId(topicId);
  };

  const handleConfirmDelete = () => {
    if (deletingTopicId) {
      onDeleteTopic(deletingTopicId);
      setDeletingTopicId(null);
    }
  };

  const isSearching = searchQuery.trim().length > 0;
  const hasNoDiaries = topics.length === 0;

  return (
    <div className="w-full motion-page pb-12">
      {/* Page Header (Title, Subtitle, Search bar, + New Diary button) */}
      <DiaryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreateModal={handleCreateCardClick}
        lang={lang}
      />

      {/* Content Area: Empty State vs Search Empty State vs Saved Diaries Grid */}
      {hasNoDiaries && !isSearching ? (
        <DiaryEmptyState
          isSearch={false}
          onCreateNew={handleCreateCardClick}
          lang={lang}
        />
      ) : isSearching && filteredTopics.length === 0 ? (
        <DiaryEmptyState
          isSearch={true}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery("")}
          onCreateNew={handleCreateCardClick}
          lang={lang}
        />
      ) : (
        <div className="diary-grid-layout">
          {/* Saved Diary Cards */}
          {filteredTopics.map((topic, idx) => (
            <DiaryCard
              key={topic.id}
              topic={topic}
              index={idx}
              onOpen={onOpenTopic}
              onEdit={handleEditTopic}
              onDelete={handleDeleteTopic}
              onToggleBookmark={onToggleBookmark}
              lang={lang}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Topic Modal */}
      <DiaryTopicModal
        isOpen={isCreateModalOpen || !!editingTopic}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTopic(null);
        }}
        onSubmit={(title, desc, category, theme) => {
          if (editingTopic) {
            onUpdateTopic(editingTopic.id, title, desc, category, theme);
          } else {
            onCreateTopic(title, desc, category, theme);
          }
        }}
        onDelete={(topicId) => onDeleteTopic(topicId)}
        initialTopic={editingTopic}
      />

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingTopicId)}
        onClose={() => setDeletingTopicId(null)}
        onConfirm={handleConfirmDelete}
        title={lang === "bn" ? "ডায়েরি মুছে ফেলতে চান?" : "Delete Diary?"}
        message={
          lang === "bn"
            ? "আপনি কি নিশ্চিত যে এই ডায়েরি এবং এর সমস্ত পৃষ্ঠা মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।"
            : "Are you sure you want to delete this diary and all its contents? This action cannot be undone."
        }
        confirmLabel={lang === "bn" ? "মুছুন" : "Delete"}
        cancelLabel={lang === "bn" ? "বাতিল" : "Cancel"}
      />
    </div>
  );
}
