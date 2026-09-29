"use client";

import React from "react";
import { Plus } from "lucide-react";

interface CreateDiaryCardProps {
  onClick: () => void;
  lang?: "en" | "bn";
}

export default function CreateDiaryCard({ onClick, lang = "en" }: CreateDiaryCardProps) {
  return (
    <div className="diary-card-wrapper select-none" onClick={onClick}>
      <div className="diary-create-card">
        {/* Plus button circle */}
        <div className="diary-create-plus-icon">
          <Plus size={18} strokeWidth={2.4} />
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">
          {lang === "bn" ? "নতুন ডায়েরি লিখুন" : "Create New Diary"}
        </h3>

        {/* Supporting description */}
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-[170px] mx-auto font-normal opacity-80">
          {lang === "bn"
            ? "আপনার চিন্তা লিখুন, দিন পরিকল্পনা করুন বা প্রয়োজনীয় নোট রাখুন।"
            : "Write your thoughts, plan your day, or save important notes."}
        </p>
      </div>
    </div>
  );
}
