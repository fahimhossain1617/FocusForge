"use client";

import React from "react";
import type { Note } from "../../types";
import { useAppContext } from "../../context/AppContext";
import "./notecard.css";
import { CalendarDays } from "lucide-react";

interface NoteCardProps { 
  note: Note; 
  onEdit: (note: Note) => void; 
  onDelete: (id: number) => void; 
}

export default function NoteCard({ note, onEdit }: NoteCardProps) {
  const { state } = useAppContext();
  const isBn = state?.lang === 'bn';

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
  const textBlocks = (note.blocks || []).filter(
    (b) => b.type !== "image" && b.type !== "file" && b.type !== "link"
  );
  const mediaBlocks = (note.blocks || []).filter(
    (b) => b.type === "image" || b.type === "file" || b.type === "link"
  );
  const attachmentsCount = (note.attachments?.length || 0) + (note.links?.length || 0);
  const totalFiles = mediaBlocks.length + attachmentsCount;
  const totalNotes = Math.max(1, textBlocks.length);

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

        {/* Realistic Layered Papers Sticking Out */}
        <div className="folder-card__papers">
          {/* Back Right Paper (tilted + higher) */}
          <div className="folder-paper-sheet folder-paper-sheet--back">
            <div className="sheet-line sheet-line--header" />
            <div className="sheet-line sheet-line--full" />
            <div className="sheet-line sheet-line--medium" />
            <div className="sheet-line sheet-line--short" />
          </div>

          {/* Front Left Paper (tilted left) */}
          <div className="folder-paper-sheet folder-paper-sheet--front">
            <div className="sheet-line sheet-line--header" />
            <div className="sheet-line sheet-line--full" />
            <div className="sheet-line sheet-line--medium" />
            <div className="sheet-line sheet-line--short" />
          </div>
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
              <h3 className="folder-card__title" title={note.title || (isBn ? "শিরোনামহীন নোট" : "Untitled Note")}>
                {note.title || (isBn ? "শিরোনামহীন নোট" : "Untitled Note")}
              </h3>
              <p className="folder-card__subtitle">
                {isBn 
                  ? `${totalNotes} টি নোট • ${totalFiles} টি ফাইল` 
                  : `${totalNotes} ${totalNotes === 1 ? "note" : "notes"} • ${totalFiles} ${totalFiles === 1 ? "file" : "files"}`}
              </p>
            </div>

            {/* Bottom Row: Pure Clean Date */}
            <div className="folder-card__bottom-row">
              <div className="folder-card__date">
                <CalendarDays size={13} className="shrink-0 opacity-70" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}




