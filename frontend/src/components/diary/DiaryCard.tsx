"use client";

import React from "react";
import { Calendar, Bookmark } from "lucide-react";
import { DiaryTopic } from "../../types";
import { 
  getDiaryTheme, 
  formatCardDateChip 
} from "./diaryThemes";

interface DiaryCardProps {
  topic: DiaryTopic;
  index: number;
  onOpen: (topicId: string) => void;
  onEdit: (topic: DiaryTopic) => void;
  onDelete: (topicId: string) => void;
  onToggleBookmark: (topicId: string) => void;
  lang?: "en" | "bn";
}

export default function DiaryCard({
  topic,
  index,
  onOpen,
  onToggleBookmark,
}: DiaryCardProps) {
  const theme = getDiaryTheme(topic, index);
  const dateStr = formatCardDateChip(topic.createdAt || topic.updatedAt);

  const handleCardClick = () => {
    onOpen(topic.id);
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark(topic.id);
  };

  return (
    <div 
      className="diary-card-wrapper select-none"
      onClick={handleCardClick}
    >
      {/* Physical Notebook Object */}
      <div 
        className="diary-notebook-body"
        style={{
          boxShadow: theme.coverShadow,
        }}
      >
        {/* Right-Side Page Stack Edge (Physical depth) */}
        <div 
          className="diary-page-stack-edge"
          style={{
            backgroundColor: theme.pageEdgeBg,
            borderColor: theme.pageEdgeBorder,
          }}
        />

        {/* Left Spiral Binding Rings (3 top, 3 bottom) */}
        <div className="diary-rings-stack">
          {/* Top 3 rings */}
          <div className="diary-ring-group diary-ring-group-top">
            <div 
              className="diary-single-ring" 
              style={{ backgroundColor: theme.ringColor }}
            />
            <div 
              className="diary-single-ring" 
              style={{ backgroundColor: theme.ringColor }}
            />
            <div 
              className="diary-single-ring" 
              style={{ backgroundColor: theme.ringColor }}
            />
          </div>

          {/* Bottom 3 rings */}
          <div className="diary-ring-group diary-ring-group-bottom">
            <div 
              className="diary-single-ring" 
              style={{ backgroundColor: theme.ringColor }}
            />
            <div 
              className="diary-single-ring" 
              style={{ backgroundColor: theme.ringColor }}
            />
            <div 
              className="diary-single-ring" 
              style={{ backgroundColor: theme.ringColor }}
            />
          </div>
        </div>

        {/* Main Cover Slab */}
        <div 
          className="diary-cover-surface flex flex-col justify-between p-3.5 sm:p-4 pl-4 sm:pl-5"
          style={{
            background: theme.coverBg,
            borderColor: theme.coverBorder,
          }}
        >
          {/* Diagonal Sheen Overlay */}
          <div 
            className="diary-cover-sheen"
            style={{
              background: theme.innerSheen,
            }}
          />

          {/* Top Section: Date & Bookmark */}
          <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
            {/* Plain Unboxed Date */}
            <div 
              className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-tight opacity-85"
              style={{
                color: theme.isLightCover ? "#475569" : "rgba(255, 255, 255, 0.85)",
              }}
            >
              <Calendar size={11} className="opacity-75" />
              <span>{dateStr}</span>
            </div>

            {/* Bookmark Icon Ribbon */}
            <button
              type="button"
              onClick={handleBookmarkClick}
              className="diary-bookmark-ribbon p-0.5 rounded transition-opacity cursor-pointer"
              title={topic.isBookmarked ? "Bookmarked" : "Add bookmark"}
              style={{
                color: topic.isBookmarked ? theme.bookmarkColor : "rgba(148, 163, 184, 0.5)",
              }}
            >
              <Bookmark 
                size={15} 
                className={topic.isBookmarked ? "fill-current" : "hover:text-white transition-colors"} 
              />
            </button>
          </div>

          {/* Content Area: Title (upper-middle positioned with natural spacing below date) */}
          <div className="relative z-10 flex flex-col flex-1 justify-start pt-3 min-h-0">
            {/* Title - 100% crystal clear white on dark covers, deep slate on light covers */}
            <h3 
              className="text-sm sm:text-base font-bold tracking-tight line-clamp-3 leading-snug"
              style={{ 
                color: theme.isLightCover ? "#0F172A" : "#FFFFFF",
                textShadow: theme.isLightCover ? "none" : "0 1px 2px rgba(0, 0, 0, 0.5)"
              }}
              title={topic.title}
            >
              {topic.title}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}
