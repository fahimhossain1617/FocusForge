"use client";

import React, { useState } from "react";
import "./diary.css";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
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
  };

  const handleBackToTOC = () => {
    setActiveTopicId(null);
    setActivePageIndex(0);
  };

  const handleCreateTopic = (title: string, description: string) => {
    requireAuth(() => {
      const newTopic = saveDiaryTopic(title, description);
      showToast(t.diary?.saved || "Topic created", "success");
      // Immediately open the newly created topic so the user can begin writing page 1!
      if (newTopic) {
        setActiveTopicId(newTopic.id);
        setActivePageIndex(0);
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
    requireAuth(() => {
      deleteDiaryTopicItem(topicId);
      if (activeTopicId === topicId) {
        setActiveTopicId(null);
      }
      showToast(t.diary?.delete || "Topic deleted", "info");
    }, "mind");
  };

  const handleSaveEntry = (
    topicId: string,
    entryId: string,
    title: string,
    content: string
  ) => {
    saveDiaryEntryItem(topicId, entryId, { title, content });
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
    setIsSearchOpen(false);
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)]">
      {activeTopic ? (
        <DiaryTopicView
          key={activeTopic.id}
          topic={activeTopic}
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
