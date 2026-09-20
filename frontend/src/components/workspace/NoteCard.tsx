"use client";

import { useState, useEffect } from "react";
import type { Note, NoteBlock } from "../../types";
import { CalendarDays, Code2, Edit3, Sigma, Trash2, Image as ImageIcon, FileText, Link2 } from "lucide-react";

interface NoteCardProps { 
  note: Note; 
  onEdit: (note: Note) => void; 
  onDelete: (id: number) => void; 
}

const getPreview = (blocks: NoteBlock[]) => 
  blocks
    .filter((block) => block.type !== "code" && block.type !== "math" && block.type !== "image" && block.type !== "file" && block.type !== "link")
    .map((block) => block.content)
    .filter(Boolean)
    .join(" ") || "A fresh canvas for your next great idea.";

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const [showSavedChip, setShowSavedChip] = useState(() => {
    const timeDiff = Date.now() - new Date(note.updatedAt || note.createdAt).getTime();
    return timeDiff >= 0 && timeDiff < 3000;
  });

  useEffect(() => {
    const timeDiff = Date.now() - new Date(note.updatedAt || note.createdAt).getTime();
    if (timeDiff >= 0 && timeDiff < 3000) {
      setShowSavedChip(true);
      const timer = setTimeout(() => {
        setShowSavedChip(false);
      }, 3000 - timeDiff);
      return () => clearTimeout(timer);
    } else {
      setShowSavedChip(false);
    }
  }, [note.updatedAt, note.createdAt]);

  const previewText = getPreview(note.blocks);
  const formattedDate = new Intl.DateTimeFormat(undefined, { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  }).format(new Date(note.updatedAt || note.createdAt));

  const hasCode = note.blocks.some((block) => block.type === "code");
  const hasMath = note.blocks.some((block) => block.type === "math");
  const hasImages = note.blocks.some((block) => block.type === "image");
  const hasFiles = note.blocks.some((block) => block.type === "file");
  const hasLinks = note.blocks.some((block) => block.type === "link");
  const hasMedia = hasCode || hasMath || hasImages || hasFiles || hasLinks;

  return (
    <article 
      className={`note-card motion-grid-item card-interactive relative transition-all duration-200 ${
        showSavedChip ? "note-card--saved" : ""
      }`} 
      onClick={() => onEdit(note)}
    >
      {/* Top Header: Category Tag & Quick Action Buttons */}
      <div className="note-card__top">
        <span className="note-card__badge" title={note.category || "General"}>
          {note.category || "General"}
        </span>

        <div className="note-card__actions" onClick={(event) => event.stopPropagation()}>
          {showSavedChip && (
            <span className="note-card__saved-pill">
              <span className="note-card__saved-dot" />
              Saved
            </span>
          )}
          <button 
            type="button" 
            onClick={() => onEdit(note)} 
            aria-label="Edit note"
            title="Edit note"
          >
            <Edit3 size={13.5} />
          </button>
          <button 
            type="button" 
            onClick={() => onDelete(note.id)} 
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 size={13.5} />
          </button>
        </div>
      </div>
      
      {/* Note Title */}
      <h3 title={note.title || "Untitled note"}>
        {note.title || "Untitled note"}
      </h3>

      {/* Date metadata */}
      <div className="note-card__date">
        <CalendarDays size={12} className="shrink-0" />
        <span>Edited {formattedDate}</span>
      </div>
      
      {/* Description / Content Preview */}
      <p>{previewText}</p>
      
      {/* Footer: Content Type Indicators & Blocks Count */}
      <div className="note-card__footer">
        <div className="note-card__tags">
          {hasCode && <span><Code2 size={11.5} /> Code</span>}
          {hasMath && <span><Sigma size={11.5} /> Math</span>}
          {hasImages && <span><ImageIcon size={11.5} /> Image</span>}
          {hasFiles && <span><FileText size={11.5} /> Doc</span>}
          {hasLinks && <span><Link2 size={11.5} /> Link</span>}
          {!hasMedia && <span><FileText size={11.5} /> Text</span>}
        </div>
        <span className="note-card__block-count">
          {note.blocks.length} {note.blocks.length === 1 ? "block" : "blocks"}
        </span>
      </div>
    </article>
  );
}
