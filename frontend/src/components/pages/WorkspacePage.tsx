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
        className="notes-workspace fixed inset-0 md:left-60 z-35 flex flex-col overflow-hidden h-screen bg-[var(--bg-card)]"
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
    <div className="notes-workspace motion-page w-full flex flex-col relative pb-16">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isBn ? "নোটস ও ফাইলস" : "Notes & Files"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {state.notes.length} {isBn ? "টি নোট" : (state.notes.length === 1 ? "note" : "notes")}
            </span>
          </div>
          <p className="text-zinc-400 text-sm font-medium">
            {isBn 
              ? "আপনার আইডিয়া, কোড, ডকুমেন্ট ও ফাইল এক জায়গায় সাজিয়ে রাখুন" 
              : "Capture ideas, code, documents, and rich notes in one focused space."}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder={isBn ? "নোট অথবা ফাইল খুঁজুন..." : "Search notes or files..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', paddingRight: searchQuery ? '2.5rem' : '1rem' }}
              className="notes-search w-full py-2.5 text-sm rounded-xl border border-white/10 bg-black/20 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={openNewNote}
            className="btn-primary notes-new-note px-5 py-2.5 font-semibold flex items-center gap-2 whitespace-nowrap shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 border border-white/5"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 motion-stagger">
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
