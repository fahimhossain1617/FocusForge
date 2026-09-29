"use client";

import React from "react";
import { SearchX, BookOpen, Plus } from "lucide-react";

interface DiaryEmptyStateProps {
  isSearch?: boolean;
  searchQuery?: string;
  onClearSearch?: () => void;
  onCreateNew?: () => void;
  lang?: "en" | "bn";
}

export default function DiaryEmptyState({
  isSearch = false,
  searchQuery = "",
  onClearSearch,
  onCreateNew,
  lang = "en",
}: DiaryEmptyStateProps) {
  if (isSearch) {
    return (
      <div className="w-full py-16 px-4 text-center rounded-2xl border border-dashed border-border/50 bg-black/[0.015] dark:bg-white/[0.015] my-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-500">
          <SearchX size={22} />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-foreground">
          {lang === "bn"
            ? `"${searchQuery}" এর জন্য কোনো ডায়েরি পাওয়া যায়নি`
            : `No diaries found matching "${searchQuery}"`}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed font-normal">
          {lang === "bn"
            ? "অন্য কোনো শিরোনাম বা বিষয়বস্তু দিয়ে অনুসন্ধান করে দেখুন।"
            : "Try searching with a different keyword, category or title."}
        </p>
        {onClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-foreground"
          >
            {lang === "bn" ? "অনুসন্ধান মুছে ফেলুন" : "Clear search"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full py-16 sm:py-20 px-6 text-center rounded-2xl border border-dashed border-border/50 bg-black/[0.015] dark:bg-white/[0.015] my-4 flex flex-col items-center justify-center">
      {/* Subtle, minimal diary/notebook icon */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 text-blue-500 shadow-none">
        <BookOpen size={26} strokeWidth={1.8} />
      </div>

      {/* Clear Heading */}
      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
        {lang === "bn" ? "এখনো কোনো ডায়েরি নেই" : "No diaries yet"}
      </h2>

      {/* Supporting Text */}
      <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed font-normal">
        {lang === "bn"
          ? "আপনার ব্যক্তিগত স্পেস প্রস্তুত। আপনার প্রথম ডায়েরি লেখা শুরু করুন এবং চিন্তাভাবনা সুরক্ষিত রাখুন।"
          : "Your private space is ready. Start writing your first diary and keep your thoughts safe here."}
      </p>

      {/* Prominent Primary Action Button */}
      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          className="btn-accent-solid mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-none transition-colors cursor-pointer"
          style={{ color: "#FFFFFF" }}
        >
          <Plus size={16} strokeWidth={2.4} style={{ color: "#FFFFFF" }} />
          <span>
            {lang === "bn" ? "+ আপনার প্রথম ডায়েরি তৈরি করুন" : "+ Create Your First Diary"}
          </span>
        </button>
      )}
    </div>
  );
}
