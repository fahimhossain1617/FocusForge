"use client";

import React, { useState, useEffect } from "react";
import "./diary.css";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { DiaryTopic, DiaryImage } from "../../types";
import DiaryTableOfContents from "./DiaryTableOfContents";
import DiaryTopicView from "./DiaryTopicView";
import DiarySearchModal from "./DiarySearchModal";

interface DiaryHomeProps {
  onOpenSidebar?: () => void;
}

export default function DiaryHome({ onOpenSidebar }: DiaryHomeProps) {
  const {
    state,
    saveDiaryTopic,
    updateDiaryTopicItem,
    deleteDiaryTopicItem,
    addDiaryEntryItem,
    saveDiaryEntryItem,
    deleteDiaryEntryItem,
    showToast,
    setSubViewActive,
  } = useAppContext();

  const { requireAuth } = useAuth();
  const { t } = useTranslation();

  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [topicMode, setTopicMode] = useState<"read" | "edit">("read");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  useEffect(() => {
    setSubViewActive(Boolean(activeTopicId));
    return () => setSubViewActive(false);
  }, [activeTopicId, setSubViewActive]);

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

  const handleCreateTopic = (
    title: string, 
    description?: string, 
    category?: string, 
    theme?: string
  ) => {
    requireAuth(() => {
      const newTopic = saveDiaryTopic(title, description || "", category, theme);
      showToast(t.diary?.saved || "Diary created", "success");
      // Immediately open the newly created topic in EDIT mode so the user can write
      if (newTopic) {
        setActiveTopicId(newTopic.id);
        setActivePageIndex(0);
        setTopicMode("edit");
      }
    }, "mind");
  };

  const handleUpdateTopic = (
    topicId: string, 
    title: string, 
    description?: string, 
    category?: string, 
    theme?: string
  ) => {
    requireAuth(() => {
      updateDiaryTopicItem(topicId, { title, description: description || "", category, theme });
      showToast(t.diary?.saved || "Diary updated", "success");
    }, "mind");
  };

  const handleToggleBookmark = (topicId: string) => {
    const target = topics.find((t) => t.id === topicId);
    if (!target) return;
    const nextBookmarked = !target.isBookmarked;
    updateDiaryTopicItem(topicId, { isBookmarked: nextBookmarked });
    showToast(
      nextBookmarked 
        ? (state.lang === "bn" ? "বুকমার্কে যোগ করা হয়েছে" : "Diary bookmarked")
        : (state.lang === "bn" ? "বুকমার্ক সরানো হয়েছে" : "Bookmark removed"),
      "info"
    );
  };

  const handleDeleteTopic = (topicId: string) => {
    deleteDiaryTopicItem(topicId);
    if (activeTopicId === topicId) {
      setActiveTopicId(null);
    }
    showToast(t.diary?.delete || "Diary deleted", "info");
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
    <div className="w-full min-h-[calc(100vh-80px)] motion-page">
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
          onOpenTopic={handleOpenTopic}
          onCreateTopic={handleCreateTopic}
          onOpenSidebar={onOpenSidebar}
          onUpdateTopic={handleUpdateTopic}
          onDeleteTopic={handleDeleteTopic}
          onToggleBookmark={handleToggleBookmark}
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
