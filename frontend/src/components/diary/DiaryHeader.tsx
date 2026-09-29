"use client";

import React from "react";
import { Search, Plus, X } from "lucide-react";

interface DiaryHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateModal: () => void;
  lang?: "en" | "bn";
}

export default function DiaryHeader({
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  lang = "en",
}: DiaryHeaderProps) {
  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {lang === "bn" ? "মাই ডায়েরি" : "My Diary"}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-normal">
          {lang === "bn"
            ? "আপনার চিন্তা, আপনার অনুভূতি, আপনার নিরাপদ আশ্রয়।"
            : "Your thoughts, your feelings, your safe space."}
        </p>
      </div>

      {/* Right: Search bar & + New Diary button */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-60 md:w-64 flex items-center h-9 sm:h-10">
          <Search 
            className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={lang === "bn" ? "ডায়েরি খুঁজুন..." : "Search your diaries..."}
            className="w-full h-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-black/5 dark:bg-white/5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-blue-500 transition-colors shadow-none"
            style={{
              paddingLeft: "2.25rem",
              paddingRight: searchQuery ? "2rem" : "0.85rem",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* + New Diary Button */}
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-4.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-none transition-all active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" strokeWidth={2.4} />
          <span>{lang === "bn" ? "নতুন ডায়েরি" : "New Diary"}</span>
        </button>
      </div>
    </div>
  );
}
