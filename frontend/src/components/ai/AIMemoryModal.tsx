"use client";

import React, { useState, useEffect } from "react";
import { Brain, Trash2, Plus, X, Edit2, Check, Shield } from "lucide-react";
import { aiMemoryService, AIMemoryItem } from "../../services/aiMemoryService";

interface AIMemoryModalProps {
  isOpen: boolean;
  userId: string | null;
  lang?: string;
  onClose: () => void;
}

export default function AIMemoryModal({ isOpen, userId, lang = "bn", onClose }: AIMemoryModalProps) {
  const [memories, setMemories] = useState<AIMemoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<AIMemoryItem["category"]>("fact");
  const [loading, setLoading] = useState(false);

  const isBn = lang === "bn";

  const loadMemories = async () => {
    if (!userId) return;
    setLoading(true);
    const data = await aiMemoryService.getMemories(userId);
    setMemories(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadMemories();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newContent.trim()) return;
    await aiMemoryService.saveMemory(userId, newContent, newCategory);
    setNewContent("");
    loadMemories();
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    await aiMemoryService.deleteMemory(userId, id);
    loadMemories();
  };

  const handleStartEdit = (m: AIMemoryItem) => {
    setEditingId(m.id);
    setEditText(m.content);
  };

  const handleSaveEdit = async (m: AIMemoryItem) => {
    if (!userId || !editText.trim()) return;
    await aiMemoryService.saveMemory(userId, editText, m.category, m.id);
    setEditingId(null);
    loadMemories();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isBn ? "এআই মেমোরি ম্যানেজার" : "AI Memory Manager"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isBn ? "আপনার ডিভাইসে সংরক্ষিত ব্যক্তিগত এআই তথ্য" : "User-owned long-term memories on your device"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Memory Form */}
        <form onSubmit={handleAdd} className="pt-4 flex gap-2">
          <input
            type="text"
            placeholder={isBn ? "নতুন মেমোরি বা ফ্যাক্ট লিখুন..." : "Add a fact or memory for AI to remember..."}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as any)}
            className="px-2 py-2 text-xs rounded-xl border border-border bg-background text-foreground"
          >
            <option value="fact">{isBn ? "ফ্যাক্ট" : "Fact"}</option>
            <option value="goal">{isBn ? "লক্ষ্য" : "Goal"}</option>
            <option value="habit">{isBn ? "অভ্যাস" : "Habit"}</option>
            <option value="preference">{isBn ? "পছন্দ" : "Preference"}</option>
            <option value="work">{isBn ? "কাজ" : "Work"}</option>
          </select>
          <button
            type="submit"
            disabled={!newContent.trim()}
            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 text-xs font-medium flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            {isBn ? "যোগ করুন" : "Add"}
          </button>
        </form>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {isBn ? "লোড হচ্ছে..." : "Loading memories..."}
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground space-y-2">
              <Shield className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm">
                {isBn ? "এখনও কোনো এআই মেমোরি নেই।" : "No memories stored yet."}
              </p>
              <p className="text-xs">
                {isBn
                  ? "কথোপকথনের মাধ্যমে বা নিজে লিখে এআই-কে প্রয়োজনীয় বিষয় মনে রাখতে সাহায্য করুন।"
                  : "Add facts above or chat with AI to build your private personal context."}
              </p>
            </div>
          ) : (
            memories.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 flex items-start justify-between gap-3 text-sm"
              >
                {editingId === m.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-sm rounded-lg border border-primary bg-background text-foreground"
                    />
                    <button
                      onClick={() => handleSaveEdit(m)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {m.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-foreground">{m.content}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => handleStartEdit(m)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                        title={isBn ? "এডিট করুন" : "Edit"}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title={isBn ? "মুছে ফেলুন" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
