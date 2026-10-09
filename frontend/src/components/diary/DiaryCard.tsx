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

  // Extract preview snippet from topic entries or topic description
  const previewSnippet = React.useMemo(() => {
    if (topic.entries && topic.entries.length > 0) {
      for (const entry of topic.entries) {
        if (entry.content) {
          const clean = entry.content.replace(/<[^>]*>/g, "").trim();
          if (clean) return clean;
        }
      }
    }
    if (topic.description) {
      const clean = topic.description.replace(/<[^>]*>/g, "").trim();
      if (clean) return clean;
    }
    return "";
  }, [topic.entries, topic.description]);

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

          {/* Middle-Left Section: Topic Title & Preview Snippet */}
          <div className="relative z-10 flex flex-col items-start justify-center text-left w-full pl-2 sm:pl-2.5 pr-1 my-auto">
            {/* Title */}
            <h3 
              className="text-base sm:text-lg font-bold tracking-tight line-clamp-2 leading-snug text-left"
              style={{ 
                color: theme.isLightCover ? "#0F172A" : "#FFFFFF",
                textShadow: theme.isLightCover ? "none" : "0 1px 2px rgba(0, 0, 0, 0.5)"
              }}
              title={topic.title}
            >
              {topic.title}
            </h3>

            {/* Preview Snippet with distinct gap */}
            {previewSnippet && (
              <p 
                className="text-xs line-clamp-2 font-normal leading-relaxed mt-2.5 sm:mt-3 opacity-80 select-none text-left"
                style={{
                  color: theme.isLightCover ? "#475569" : "rgba(255, 255, 255, 0.8)",
                  textShadow: theme.isLightCover ? "none" : "0 1px 1px rgba(0, 0, 0, 0.3)"
                }}
                title={previewSnippet}
              >
                {previewSnippet}
              </p>
            )}
          </div>

          {/* Bottom Row: Compact Date at Bottom Left */}
          <div className="relative z-10 flex items-center justify-start w-full pl-2 sm:pl-2.5 pt-2 select-none">
            <div 
              className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium tracking-tight opacity-75"
              style={{
                color: theme.isLightCover ? "#475569" : "rgba(255, 255, 255, 0.8)",
              }}
            >
              <Calendar size={11} className="opacity-80 shrink-0" />
              <span>{dateStr}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
