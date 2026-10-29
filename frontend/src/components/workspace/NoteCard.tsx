"use client";

import React from "react";
import type { Note } from "../../types";
import { useAppContext } from "../../context/AppContext";
import "./notecard.css";
import { CalendarDays, CheckCircle2, Circle } from "lucide-react";

interface NoteCardProps { 
  note: Note; 
  onEdit: (note: Note) => void; 
  onDelete: (id: number) => void;
  onToggleDashboard?: (note: Note) => void;
}

export default function NoteCard({ note, onEdit, onToggleDashboard }: NoteCardProps) {
  const { state } = useAppContext();
  const isBn = state?.lang === 'bn';
  const isPinnedToDashboard = Boolean(note.showOnDashboard);

  const getSafeDate = (d1: any, d2: any) => {
    const val = d1 || d2;
    if (!val) return new Date();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const formattedDate = new Intl.DateTimeFormat(isBn ? "bn-BD" : "en-US", { 
    day: "numeric",
    month: "short", 
    year: "numeric"
  }).format(getSafeDate(note.updatedAt, note.createdAt));

  // Dynamic counts based on actual note blocks & attachments
  const textBlocks = (note?.blocks || []).filter(
    (b) => b && b.type !== "image" && b.type !== "file" && b.type !== "link"
  );
  const mediaBlocks = (note?.blocks || []).filter(
    (b) => b && (b.type === "image" || b.type === "file" || b.type === "link")
  );
  const attachmentsCount = (note?.attachments?.length || 0) + (note?.links?.length || 0);
  const totalFiles = mediaBlocks.length + attachmentsCount;
  const totalNotes = Math.max(1, textBlocks.length);

  // Extract first plain-text snippet for preview
  const previewSnippet = React.useMemo(() => {
    if (!note?.blocks || !Array.isArray(note.blocks) || note.blocks.length === 0) return "";
    for (const block of note.blocks) {
      if (!block) continue;
      if (block.type === "image" || block.type === "file" || block.type === "link") continue;
      const raw = typeof block.content === "string" ? block.content.replace(/<[^>]*>/g, "").trim() : "";
      if (raw) return raw;
    }
    return "";
  }, [note?.blocks]);

  return (
    <article 
      className="folder-card-wrapper motion-grid-item"
      onClick={() => onEdit(note)}
    >
      {/* 3D Physical Folder Container */}
      <div className="folder-card__base">
        {/* Back Folder Dark Plate */}
        <div className="folder-card__back-plate">
          <div className="folder-card__back-tab" />
        </div>

        {/* Front Frosted Glass Flap */}
        <div className="folder-card__front-flap">
          {/* Top Folder Notch Tab */}
          <div className="folder-card__tab-notch" />
          {/* Right Edge Accent */}
          <div className="folder-card__accent-edge" />
          {/* Glass Specular Sheen */}
          <div className="folder-card__sheen" />

          {/* Card Content on Frosted Glass */}
          <div className="folder-card__content">
            {/* Title & Count details */}
            <div className="folder-card__details">
              <div className="flex items-start justify-between gap-2">
                <h3 className="folder-card__title flex-1 min-w-0" title={note.title || (isBn ? "শিরোনামহীন নোট" : "Untitled Note")}>
                  {note.title || (isBn ? "শিরোনামহীন নোট" : "Untitled Note")}
                </h3>
                {onToggleDashboard && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDashboard(note);
                    }}
                    title={
                      isPinnedToDashboard
                        ? (isBn ? "ড্যাশবোর্ড থেকে সরান" : "Remove from Dashboard")
                        : (isBn ? "ড্যাশবোর্ডে দেখান" : "Show on Dashboard")
                    }
                    aria-label={
                      isPinnedToDashboard
                        ? (isBn ? "ড্যাশবোর্ড থেকে সরান" : "Remove from Dashboard")
                        : (isBn ? "ড্যাশবোর্ডে দেখান" : "Show on Dashboard")
                    }
                    className={`shrink-0 p-0.5 -mr-0.5 -mt-0.5 rounded-full transition-colors cursor-pointer ${
                      isPinnedToDashboard
                        ? "text-blue-500 dark:text-blue-400"
                        : "text-slate-400/60 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    }`}
                  >
                    {isPinnedToDashboard ? (
                      <CheckCircle2 size={17} strokeWidth={2.3} />
                    ) : (
                      <Circle size={17} strokeWidth={1.8} />
                    )}
                  </button>
                )}
              </div>
              <p className="folder-card__subtitle">
                {isBn 
                  ? `${totalNotes} টি নোট • ${totalFiles} টি ফাইল` 
                  : `${totalNotes} ${totalNotes === 1 ? "note" : "notes"} • ${totalFiles} ${totalFiles === 1 ? "file" : "files"}`}
              </p>
              {previewSnippet && (
                <p className="folder-card__snippet" title={previewSnippet}>
                  {previewSnippet}
                </p>
              )}
            </div>

            {/* Bottom Row: Pure Clean Date */}
            <div className="folder-card__bottom-row">
              <div className="folder-card__date">
                <CalendarDays size={11} className="shrink-0 opacity-70" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
