"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import VoiceInput from "./VoiceInput";

interface ThoughtDetailProps {
  thoughtId: string;
  navigate: (view: string) => void;
}

export default function ThoughtDetail({ thoughtId, navigate }: ThoughtDetailProps) {
  const { state, updateMindItem, deleteMindItem, addNote, showToast } = useAppContext();
  const { t } = useTranslation();
  
  const thought = state.mindItems.find(item => item.id === thoughtId);
  
  const [content, setContent] = useState(thought?.content || "");
  const [interim, setInterim] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!thought) {
      navigate('home');
      return;
    }
    setContent(thought.content);
  }, [thought, navigate]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, interim]);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setIsEditing(true);
      setContent((prev) => {
        const needsSpace = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
        return prev + (needsSpace ? " " : "") + text;
      });
      setInterim("");
    }
  }, []);

  const handleSave = () => {
    if (!content.trim()) return;
    updateMindItem(thoughtId, content.trim());
    setIsEditing(false);
    showToast(t.myMind.toastChangesSaved, "success");
  };

  const handleDelete = () => {
    if (confirm(t.myMind.confirmDeleteThought)) {
      deleteMindItem(thoughtId);
      navigate('review_all');
      showToast(t.myMind.toastThoughtDeleted, "success");
    }
  };

  const handleSendToWorkspace = () => {
    if (!thought) return;
    
    // Determine title based on content or source
    let title = t.myMind.myMindThought;
    if (content.startsWith("💡 Idea Capture") || content.startsWith("💡 ধারণা ক্যাপচার")) title = t.myMind.myMindIdea;
    if (content.startsWith("Problem Solver Reflection") || content.startsWith("সমস্যা সমাধানকারীর ভাবনা")) title = t.myMind.myMindProblemSolver;
    
    addNote({
      title,
      blocks: [{ id: 'b_' + Date.now(), type: 'paragraph', content }],
      category: "MyMind"
    });
    showToast(t.myMind.toastSentToWorkspace, "success");
  };

  if (!thought) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDate(thought.createdAt);
  const displayValue = content + (interim ? ((content && !content.endsWith(" ") && !content.endsWith("\n")) ? " " : "") + interim : "");

  return (
    <div className="fade-in max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('review_all')}
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t.myMind.backLeft}
        </button>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleDelete}
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--color-danger, #EF4444)" }}
          >
            {t.myMind.deleteText}
          </button>
          <button 
            onClick={handleSendToWorkspace}
            className="text-sm font-medium px-4 py-2 rounded-lg border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          >
            {t.myMind.sendToWorkspace}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between opacity-60">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          {date} {t.myMind.atStr} {time}
        </span>
        {thought.source && thought.source !== 'home' && (
          <span className="text-xs capitalize" style={{ color: "var(--color-text-muted)" }}>
            {t.myMind.capturedVia} {thought.source.replace('_', ' ')}
          </span>
        )}
      </div>

      <div
        className="rounded-2xl border transition-all duration-300 relative pb-16 overflow-hidden"
        style={{
          background: "var(--color-bg-card)",
          borderColor: (isFocused || isEditing) ? "var(--color-purple-primary)" : "var(--color-border-subtle)",
          boxShadow: (isFocused || isEditing) ? "0 0 12px rgba(59, 130, 246, 0.1)" : "none",
        }}
      >
        <textarea
          ref={textareaRef}
          value={displayValue}
          onChange={(e) => {
            setContent(e.target.value);
            setIsEditing(true);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={t.myMind.writeFreely}
          className="w-full px-8 py-8 text-lg border-0 resize-none no-focus-ring leading-relaxed bg-transparent my-mind-textarea"
          style={{ 
            background: "transparent", 
            border: "none",
            outline: "none", 
            minHeight: "300px",
            color: "var(--color-text-primary)" 
          }}
        />
        
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <VoiceInput onResult={handleResult} onInterimResult={setInterim} />
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setContent(thought.content);
                setIsEditing(false);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ 
                color: "var(--color-text-secondary)",
                opacity: (content !== thought.content) ? 1 : 0.5,
                pointerEvents: (content !== thought.content) ? 'auto' : 'none'
              }}
            >
              {t.myMind.cancelCancel}
            </button>
            <button
              onClick={handleSave}
              disabled={content === thought.content}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ 
                background: (content !== thought.content) ? "var(--color-purple-primary)" : "var(--color-bg-secondary)",
                color: (content !== thought.content) ? "white" : "var(--color-text-muted)",
                cursor: (content !== thought.content) ? "pointer" : "not-allowed"
              }}
            >
              {t.myMind.saveChanges}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
