"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";
import type { Note, NoteBlock } from "../../types";
import EmptyState from "../ui/EmptyState";
import NoteCard from "../workspace/NoteCard";
import NoteEditorView from "./NoteEditorView";
import { Plus, Search, Filter, X } from "lucide-react";


export default function WorkspacePage() {
  const { state, addNote, updateNote, deleteNote } = useAppContext();
  const [mounted, setMounted] = useState(false);
  
  // View State: 'grid' or 'editor'
  const [view, setView] = useState<'grid' | 'editor'>('grid');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isBn = state.lang === 'bn';

  const openNewNote = () => {
    const draft = addNote({ 
      title: "", 
      blocks: [{ id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2), type: "paragraph", content: "" }],
      category: selectedCategory !== "All" ? selectedCategory : "Personal"
    });
    setEditingNote(draft);
    setView('editor');
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setView('editor');
  };

  const handleUpdateNote = (title: string, blocks: NoteBlock[], category?: string) => {
    if (!editingNote) return;
    const updates: Partial<Note> = { title, blocks };
    if (category !== undefined) updates.category = category;
    updateNote(editingNote.id, updates);
    setEditingNote((current) => current ? { ...current, ...updates } : current);
  };

  // Extract all categories in notes + default categories
  const categoriesList = useMemo(() => {
    const cats = new Set<string>(["All"]);
    (state.categories || ['Programming', 'Study', 'Personal', 'Project']).forEach(c => cats.add(c));
    state.notes.forEach(n => { if (n.category) cats.add(n.category); });
    return Array.from(cats);
  }, [state.categories, state.notes]);

  // Filter notes based on search & category
  const filteredNotes = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return state.notes.filter(note => {
      // Category filter
      if (selectedCategory !== "All" && (note.category || "Personal") !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (!query) return true;
      if (note.title.toLowerCase().includes(query)) return true;
      if (note.category?.toLowerCase().includes(query)) return true;
      return note.blocks.some(b => 
        (b.content && b.content.toLowerCase().includes(query)) ||
        (b.fileName && b.fileName.toLowerCase().includes(query)) ||
        (b.caption && b.caption.toLowerCase().includes(query)) ||
        (b.linkTitle && b.linkTitle.toLowerCase().includes(query))
      );
    });
  }, [state.notes, searchQuery, selectedCategory]);

  if (view === 'editor') {
    if (!mounted || typeof document === 'undefined') return null;
    return createPortal(
      <div 
        className="notes-workspace fixed inset-0 md:left-64 z-35 flex flex-col overflow-hidden h-screen bg-[var(--color-bg-base)]"
        style={{ height: "100vh", top: 0, bottom: 0, right: 0 }}
      >
        <NoteEditorView 
          key={editingNote?.id || 'new-note'}
          note={editingNote}
          initialTitle={editingNote?.title ?? ""}
          initialBlocks={editingNote?.blocks ?? []}
          initialCategory={editingNote?.category}
          initialCreatedAt={editingNote?.createdAt}
          initialUpdatedAt={editingNote?.updatedAt}
          onUpdate={handleUpdateNote}
          onDelete={() => { 
            if (editingNote) deleteNote(editingNote.id); 
            setView('grid'); 
          }}
          onBack={() => setView('grid')}
        />
      </div>,
      document.body
    );
  }

  return (
    <div className="motion-page w-full flex flex-col relative pb-16">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isBn ? "নোটস ও ফাইলস" : "Notes & Files"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {state.notes.length} {isBn ? "টি নোট" : (state.notes.length === 1 ? "note" : "notes")}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-normal">
            {isBn 
              ? "আপনার আইডিয়া, কোড, ডকুমেন্ট ও ফাইল এক জায়গায় সাজিয়ে রাখুন" 
              : "Capture ideas, code, documents, and rich notes in one focused space."}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60 md:w-64 flex items-center h-9 sm:h-10">
            <Search className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
            <input 
              type="text" 
              placeholder={isBn ? "নোট অথবা ফাইল খুঁজুন..." : "Search notes or files..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem', paddingRight: searchQuery ? '2rem' : '0.85rem' }}
              className="w-full h-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-black/5 dark:bg-white/5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-blue-500 transition-colors shadow-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center justify-center"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={openNewNote}
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-4.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-none transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.4} />
            <span>{isBn ? "নতুন নোট" : "New Note"}</span>
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-3 mb-6 -mx-1 px-1">
        {categoriesList.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#223A5E] text-white shadow-none"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-[#223A5E] dark:hover:text-zinc-200 border border-slate-200 dark:border-white/5"
              }`}
            >
              {cat === "All" ? (isBn ? "সবগুলো" : "All") : cat}
            </button>
          );
        })}
      </div>

      {/* Grid Content */}
      <div className="flex-1">
        {filteredNotes.length === 0 ? (
          <EmptyState
            title={isBn ? "কোনো নোট পাওয়া যায়নি" : "No notes found"}
            description={
              searchQuery 
                ? (isBn ? "অনুসন্ধান পরিবর্তন করে আবার চেষ্টা করুন।" : "Try adjusting your search query.")
                : (isBn ? "আপনি এখনও কোনো নোট তৈরি করেননি।" : "You haven't created any notes yet.")
            }
            action={{ 
              label: isBn ? "নতুন নোট তৈরি করুন" : "Create Note", 
              onClick: openNewNote 
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4.5 sm:gap-5 motion-stagger">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={openEditNote}
                onDelete={deleteNote}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
