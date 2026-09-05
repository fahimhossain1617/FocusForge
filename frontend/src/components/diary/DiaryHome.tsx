"use client";

import React, { useState } from "react";
import "./diary.css";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic, DiaryImage } from "../../types";
import DiaryTableOfContents from "./DiaryTableOfContents";
import DiaryTopicView from "./DiaryTopicView";
import DiarySearchModal from "./DiarySearchModal";

interface DiaryHomeProps {
  onBackToMind: () => void;
}

export default function DiaryHome({ onBackToMind }: DiaryHomeProps) {
  const {
    state,
    saveDiaryTopic,
    updateDiaryTopicItem,
    deleteDiaryTopicItem,
    addDiaryEntryItem,
    saveDiaryEntryItem,
    deleteDiaryEntryItem,
    showToast,
  } = useAppContext();

  const { requireAuth } = useAuth();
  const { t } = useTranslation();

  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [topicMode, setTopicMode] = useState<"read" | "edit">("read");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const topics = state.diaryTopics || [];

  // Active topic object
  const activeTopic = activeTopicId
    ? topics.find((t) => t.id === activeTopicId) || null
    : null;

  // Handlers
  const handleOpenTopic = (topicId: string, pageIndex: number = 0) => {
    setActiveTopicId(topicId);
    setActivePageIndex(pageIndex);
    setTopicMode("read"); // Opens in Read Mode when clicked from Table of Contents!
  };

  const handleBackToTOC = () => {
    setActiveTopicId(null);
    setActivePageIndex(0);
    setTopicMode("read");
  };

  const handleCreateTopic = (title: string, description: string) => {
    requireAuth(() => {
      const newTopic = saveDiaryTopic(title, description);
      showToast(t.diary?.saved || "Topic created", "success");
      // Immediately open the newly created topic in EDIT mode so the user can write
      if (newTopic) {
        setActiveTopicId(newTopic.id);
        setActivePageIndex(0);
        setTopicMode("edit");
      }
    }, "mind");
  };

  const handleUpdateTopic = (topicId: string, title: string, description: string) => {
    requireAuth(() => {
      updateDiaryTopicItem(topicId, { title, description });
      showToast(t.diary?.saved || "Topic updated", "success");
    }, "mind");
  };

  const handleDeleteTopic = (topicId: string) => {
    deleteDiaryTopicItem(topicId);
    if (activeTopicId === topicId) {
      setActiveTopicId(null);
    }
    showToast(t.diary?.delete || "Topic deleted", "info");
  };

  const handleSaveEntry = (
    topicId: string,
    entryId: string,
    title: string,
    content: string,
    images?: DiaryImage[]
  ) => {
    saveDiaryEntryItem(topicId, entryId, { title, content, images });
  };

  const handleNewPage = (topicId: string) => {
    return addDiaryEntryItem(topicId, "", "");
  };

  const handleDeletePage = (topicId: string, entryId: string) => {
    deleteDiaryEntryItem(topicId, entryId);
  };

  const handleSelectSearchResult = (topicId: string, pageIndex: number) => {
    setActiveTopicId(topicId);
    setActivePageIndex(pageIndex);
    setTopicMode("read");
    setIsSearchOpen(false);
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)]">
      {activeTopic ? (
        <DiaryTopicView
          key={activeTopic.id}
          topic={activeTopic}
          initialMode={topicMode}
          onBackToTOC={handleBackToTOC}
          onSaveEntry={handleSaveEntry}
          onUpdateTopic={handleUpdateTopic}
          onDeleteTopic={handleDeleteTopic}
          onOpenSearch={() => setIsSearchOpen(true)}
          lang={state.lang}
        />
      ) : (
        <DiaryTableOfContents
          topics={topics}
          onBackToMind={onBackToMind}
          onOpenTopic={handleOpenTopic}
          onCreateTopic={handleCreateTopic}
          onUpdateTopic={handleUpdateTopic}
          onDeleteTopic={handleDeleteTopic}
          onOpenSearch={() => setIsSearchOpen(true)}
          lang={state.lang}
        />
      )}

      {/* Global Memory Search Modal */}
      <DiarySearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        topics={topics}
        onSelectResult={handleSelectSearchResult}
      />
    </div>
  );
}
