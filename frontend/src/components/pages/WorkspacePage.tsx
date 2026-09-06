import React, { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import type { Note, NoteBlock } from "../../types";
import EmptyState from "../ui/EmptyState";
import NoteCard from "../workspace/NoteCard";
import NoteEditorView from "./NoteEditorView";
import { Plus, Search } from "lucide-react";

export default function WorkspacePage() {
  const { state, addNote, updateNote, deleteNote } = useAppContext();
  
  // View State: 'grid' or 'editor'
  const [view, setView] = useState<'grid' | 'editor'>('grid');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const openNewNote = () => {
    const draft = addNote({ title: "", blocks: [{ id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2), type: "paragraph", content: "" }] });
    setEditingNote(draft);
    setView('editor');
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setView('editor');
  };

  const handleUpdateNote = (title: string, blocks: NoteBlock[]) => {
    if (!editingNote) return;
    updateNote(editingNote.id, { title, blocks });
    setEditingNote((current) => current ? { ...current, title, blocks } : current);
  };

  // Filter notes based on search
  const filteredNotes = state.notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'editor') {
    return (
      <div className="notes-workspace fixed inset-y-0 left-0 right-0 md:left-60 z-30">
        <NoteEditorView 
          note={editingNote}
          initialTitle={editingNote?.title ?? ""}
          initialBlocks={editingNote?.blocks ?? []}
          initialCreatedAt={editingNote?.createdAt}
          initialUpdatedAt={editingNote?.updatedAt}
          onUpdate={handleUpdateNote}
          onDelete={() => { if (editingNote) deleteNote(editingNote.id); setView('grid'); }}
          onBack={() => setView('grid')}
        />
      </div>
    );
  }

  return (
    <div className="notes-workspace motion-page h-full flex flex-col p-8 relative">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-white tracking-tight">Notes</h1>
          <p className="text-zinc-400 font-medium">Capture ideas, code, and rich notes in one focused space.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              className="notes-search w-full pr-4 py-2.5 text-sm transition-colors"
            />
          </div>
          <button
            onClick={openNewNote}
            className="btn-primary notes-new-note px-5 py-2.5 font-semibold flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-4 px-4 pt-4 pb-12">
        {filteredNotes.length === 0 ? (
          <EmptyState
            title="No notes found"
            description={searchQuery ? "Try adjusting your search query." : "You haven't created any notes yet."}
            action={{ label: "Create Note", onClick: openNewNote }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 motion-stagger">
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
