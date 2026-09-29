"use client";

import { useId } from "react";
import { Brain, Lightbulb, PenLine, Calendar } from "lucide-react";
import { MindItem } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { getThoughtDisplayData } from "../../utils/mindUtils";

interface ThoughtPaperCardProps {
  item: MindItem;
  index: number;
  onOpenDetail: () => void;
  onDelete?: (id: string) => void;
}

export default function ThoughtPaperCard({
  item,
  index,
  onOpenDetail,
}: ThoughtPaperCardProps) {
  const { t, lang } = useTranslation();
  const rawId = useId();
  const filterId = `fold_${rawId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const displayData = getThoughtDisplayData(item, t, lang);
  const { accent } = displayData;

  // Subtle paper variation based on index
  const isAltPaper = index % 2 === 1;
  const hasTab = index % 2 === 1;
  const hasBottomCurl = index % 4 === 2;

  // Icon selection
  const CategoryIcon =
    displayData.categoryType === "problem_solver"
      ? Brain
      : displayData.categoryType === "idea_capture"
      ? Lightbulb
      : PenLine;

  return (
    <article
      onClick={onOpenDetail}
      className={`relative flex flex-col justify-start rounded-2xl border cursor-pointer select-none text-left overflow-hidden h-[240px] sm:h-[250px] ${
        isAltPaper
          ? "bg-[#F8FAFE] dark:bg-[#0D1522] border-[#DCE5F0] dark:border-slate-800/80"
          : "bg-white dark:bg-[#121A2B] border-[#DCE5F0] dark:border-slate-800/80"
      }`}
      style={{
        boxShadow: "none",
      }}
    >
      {/* ── Top-Right Folded Page Corner (Pure Vector SVG) ── */}
      <svg
        className="absolute top-0 right-0 w-8 h-8 pointer-events-none z-10"
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="-1.5" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.45" />
          </filter>
        </defs>
        {/* Notch cutout that blends into page background */}
        <polygon points="0,0 32,0 32,32" fill="var(--color-background, #0A0E1A)" />
        {/* Folded paper flap */}
        <polygon
          points="0,0 0,32 32,32"
          fill={accent.foldFill}
          filter={`url(#${filterId})`}
          opacity="0.95"
        />
        {/* Crease line */}
        <line x1="0" y1="0" x2="32" y2="32" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
      </svg>

      {/* ── Notebook Right-Edge Bookmark Tab (Subtle Accent Variety) ── */}
      {hasTab && (
        <div
          className={`absolute right-0 top-12 w-1.5 h-6 rounded-l-xs ${accent.tabClass} pointer-events-none z-0`}
          aria-hidden="true"
        />
      )}

      {/* ── Bottom-Left Subtle Paper Curl (Subtle Accent Variety) ── */}
      {hasBottomCurl && (
        <div
          className="absolute bottom-0 left-0 w-3.5 h-3.5 pointer-events-none opacity-20 z-0"
          style={{
            clipPath: "polygon(0 0, 0 100%, 100% 100%)",
            backgroundColor: accent.dotColor,
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Card Content Container ── */}
      <div className="flex flex-col h-full p-4 sm:p-5 relative z-0">
        {/* Category Icon and Label (with right padding to clear fold) */}
        <div className="flex items-center gap-1.5 pr-7">
          <div className={`flex items-center gap-1.5 text-xs font-semibold tracking-wide ${accent.labelClass}`}>
            <CategoryIcon size={14} className="shrink-0" />
            <span className="truncate">{displayData.categoryLabel}</span>
          </div>
        </div>

        {/* Creation Date (compact date only) */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
          <Calendar size={12} className="shrink-0 opacity-80" />
          <span className="truncate">{displayData.formattedDate}</span>
        </div>

        {/* Prominent Thought Title */}
        <h3 className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug line-clamp-2 mt-3 mb-1.5">
          {displayData.title}
        </h3>

        {/* Readable Truncated Content Preview */}
        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300/90 leading-relaxed line-clamp-4 font-normal">
          {displayData.preview || displayData.title}
        </p>
      </div>
    </article>
  );
}
