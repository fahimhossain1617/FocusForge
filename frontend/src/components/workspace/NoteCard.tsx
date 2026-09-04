"use client";

import type { Note, NoteBlock } from "../../types";
import { CalendarDays, Code2, Edit3, MoreHorizontal, Sigma, Trash2, Image as ImageIcon, FileText, Link2 } from "lucide-react";

interface NoteCardProps { note: Note; onEdit: (note: Note) => void; onDelete: (id: number) => void; }

const getPreview = (blocks: NoteBlock[]) => blocks.filter((block) => block.type !== "code" && block.type !== "math" && block.type !== "image" && block.type !== "file" && block.type !== "link").map((block) => block.content).filter(Boolean).join(" ") || "A fresh canvas for your next great idea.";

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const text = getPreview(note.blocks).slice(0, 155);
  const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(note.updatedAt || note.createdAt));
  const hasCode = note.blocks.some((block) => block.type === "code");
  const hasMath = note.blocks.some((block) => block.type === "math");
  const hasImages = note.blocks.some((block) => block.type === "image");
  const hasFiles = note.blocks.some((block) => block.type === "file");
  const hasLinks = note.blocks.some((block) => block.type === "link");

  return <article className="note-card" onClick={() => onEdit(note)}>
    <div className="note-card__orb" />
    <div className="note-card__top"><span className="note-card__badge">{note.category || "FEATURED"}</span><div className="note-card__actions" onClick={(event) => event.stopPropagation()}><MoreHorizontal size={18} /><button type="button" onClick={() => onEdit(note)} aria-label="Edit note"><Edit3 size={15} /></button><button type="button" onClick={() => onDelete(note.id)} aria-label="Delete note"><Trash2 size={15} /></button></div></div>
    <h3>{note.title || "Untitled note"}</h3>
    <div className="note-card__date"><CalendarDays size={13} /> Edited {date}</div>
    <p>{text}{text.length >= 155 ? "…" : ""}</p>
    <div className="note-card__footer"><div className="flex items-center gap-2 flex-wrap">{hasCode && <span><Code2 size={13} /> Code</span>}{hasMath && <span><Sigma size={13} /> Math</span>}{hasImages && <span><ImageIcon size={13} /> Image</span>}{hasFiles && <span><FileText size={13} /> Doc</span>}{hasLinks && <span><Link2 size={13} /> Link</span>}</div><span>{note.blocks.length} blocks</span></div>
  </article>;
}
