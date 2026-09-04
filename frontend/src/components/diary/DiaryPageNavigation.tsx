"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

interface DiaryPageNavigationProps {
  currentPageIndex: number;
  totalPages: number;
  onPageChange: (index: number) => void;
  onNewPage: () => void;
  onDeletePage: () => void;
}

export default function DiaryPageNavigation({
  currentPageIndex,
  totalPages,
  onPageChange,
  onNewPage,
  onDeletePage,
}: DiaryPageNavigationProps) {
  const { t } = useTranslation();

  const hasPrev = currentPageIndex > 0;
  const hasNext = currentPageIndex < totalPages - 1;

  return (
    <div className="flex items-center justify-between gap-2 py-3 px-4 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] rounded-b-2xl select-none">
      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPageIndex - 1)}
          disabled={!hasPrev}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            hasPrev
              ? "border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shadow-sm"
              : "border-transparent text-zinc-400 dark:text-zinc-600 opacity-40 cursor-not-allowed"
          }`}
          title={t.diary?.previousPage || "Previous Page"}
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">{t.diary?.previousPage || "Previous Page"}</span>
        </button>

        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 tracking-wide font-mono">
          {t.diary?.page || "Page"} {currentPageIndex + 1} {t.diary?.of || "of"} {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPageIndex + 1)}
          disabled={!hasNext}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            hasNext
              ? "border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shadow-sm"
              : "border-transparent text-zinc-400 dark:text-zinc-600 opacity-40 cursor-not-allowed"
          }`}
          title={t.diary?.nextPage || "Next Page"}
        >
          <span className="hidden sm:inline">{t.diary?.nextPage || "Next Page"}</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Page Action Controls */}
      <div className="flex items-center gap-2">
        {/* Delete Page Button */}
        <button
          type="button"
          onClick={onDeletePage}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          title={t.diary?.delete || "Delete Page"}
        >
          <Trash2 size={14} />
        </button>

        {/* Add New Page Button */}
        <button
          type="button"
          onClick={onNewPage}
          className="btn-accent-solid flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-600/25 transition-all cursor-pointer"
          style={{ color: "#FFFFFF" }}
          title={t.diary?.newPage || "+ New Page"}
        >
          <Plus size={14} style={{ color: "#FFFFFF" }} />
          <span>{t.diary?.newPage || "New Page"}</span>
        </button>
      </div>
    </div>
  );
}
