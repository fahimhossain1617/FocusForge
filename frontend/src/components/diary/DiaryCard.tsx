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
          className="diary-cover-surface relative flex flex-col justify-between p-3.5 sm:p-4 text-left"
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

          {/* Bookmark Icon Ribbon (Top Right) */}
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20">
            <button
              type="button"
              onClick={handleBookmarkClick}
              className="diary-bookmark-ribbon p-1 rounded transition-opacity cursor-pointer"
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

          {/* Top Engraved / Debossed Branding Stamp (Shifted slightly left) */}
          <div className="relative z-10 w-full flex items-center justify-center pt-1 pr-3 sm:pr-4 select-none opacity-60 -translate-x-2 sm:-translate-x-3">
            <span 
              className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em]"
              style={{
                color: theme.isLightCover ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.75)",
                textShadow: theme.isLightCover 
                  ? "0 1px 0 rgba(255, 255, 255, 0.9), 0 -1px 0 rgba(0, 0, 0, 0.2)"
                  : "0 1px 1px rgba(255, 255, 255, 0.2), 0 -1px 1px rgba(0, 0, 0, 0.7)",
              }}
            >
              Focentia Diary
            </span>
          </div>

          {/* Middle-Left Section: Date & Topic Title (Shifted slightly upward) */}
          <div className="relative z-10 flex flex-col items-start justify-center text-left w-full pl-2 sm:pl-2.5 pr-1 my-auto -translate-y-3 sm:-translate-y-4">
            {/* Plain Unboxed Date */}
            <div 
              className="inline-flex items-center gap-1.5 text-[11.5px] sm:text-xs font-medium tracking-tight opacity-90 mb-3.5 sm:mb-4"
              style={{
                color: theme.isLightCover ? "#475569" : "rgba(255, 255, 255, 0.9)",
              }}
            >
              <Calendar size={13} className="opacity-80" />
              <span>{dateStr}</span>
            </div>

            {/* Title */}
            <h3 
              className="text-base sm:text-lg font-bold tracking-tight line-clamp-3 leading-snug text-left"
              style={{ 
                color: theme.isLightCover ? "#0F172A" : "#FFFFFF",
                textShadow: theme.isLightCover ? "none" : "0 1px 2px rgba(0, 0, 0, 0.5)"
              }}
              title={topic.title}
            >
              {topic.title}
            </h3>
          </div>

          {/* Bottom Invisible Balance Spacer */}
          <div className="h-2 select-none pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
