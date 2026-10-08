"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import VoiceInput from "./VoiceInput";
import VoiceReactiveGlow from "../voice/VoiceReactiveGlow";
import VoiceWaveform from "../voice/VoiceWaveform";
import { getMindSourceInfo, formatMindDate } from "../../utils/mindUtils";
import ConfirmDeleteModal from "../ui/ConfirmDeleteModal";

interface ThoughtDetailProps {
  thoughtId: string;
  navigate: (view: string) => void;
  previousView?: string;
}

export default function ThoughtDetail({ thoughtId, navigate, previousView }: ThoughtDetailProps) {
  const { state, updateMindItem, deleteMindItem, showToast } = useAppContext();
  const { t, lang } = useTranslation();
  
  const thought = state.mindItems.find(item => item.id === thoughtId);
  
  const [content, setContent] = useState(thought?.content || "");
  const [isFocused, setIsFocused] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  
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
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 220), 380);
      textareaRef.current.style.height = `${newHeight}px`;
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [content]);

  const handleSave = () => {
    if (!content.trim()) return;
    updateMindItem(thoughtId, content.trim());
    setIsEditing(false);
    showToast(t.myMind.toastChangesSaved, "success");
  };

  const handleConfirmDelete = () => {
    deleteMindItem(thoughtId);
    setShowDeleteModal(false);
    navigate('review_all');
    showToast(t.myMind.toastThoughtDeleted, "success");
  };

  if (!thought) return null;

  const sourceInfo = getMindSourceInfo(thought, t);

  return (
    <div className="motion-page max-w-6xl mx-auto w-full pb-14">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button 
          type="button"
          onClick={() => navigate(previousView === 'home' ? 'home' : 'review_all')}
          className="inline-flex items-center justify-center w-9 h-9 -ml-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-colors cursor-pointer shrink-0"
          aria-label={(t.myMind.backText || t.myMind.backLeft || "Back").replace(/^[←\s]+/, "")}
          title={(t.myMind.backText || t.myMind.backLeft || "Back").replace(/^[←\s]+/, "")}
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => setShowDeleteModal(true)}
            title={t.myMind.deleteText || "Delete Thought"}
            className="p-2 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {sourceInfo.label && (
          <span 
            className="px-2.5 py-0.5 text-xs font-semibold rounded-lg"
            style={{ 
              background: "rgba(99, 102, 241, 0.12)", 
              color: "var(--color-purple-primary)" 
            }}
          >
            {sourceInfo.label}
          </span>
        )}
        <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          {formatMindDate(thought.createdAt, lang)}
        </span>
      </div>

      <div
        className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] relative pb-16 flex flex-col shadow-none"
      >
        <VoiceReactiveGlow active={isVoiceListening} rounded="rounded-2xl" />
        {isVoiceListening && (
          <div className="w-full px-5 sm:px-7 pt-3 pb-1 flex items-center h-[26px] overflow-hidden pointer-events-none">
            <VoiceWaveform active={isVoiceListening} isBengali={lang === "bn"} />
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setIsEditing(true);
            const el = textareaRef.current;
            if (el) {
              el.style.height = "auto";
              const scrollH = el.scrollHeight;
              if (scrollH > 240) {
                el.style.height = "240px";
                el.style.overflowY = "auto";
              } else {
                el.style.height = `${Math.max(scrollH, 120)}px`;
                el.style.overflowY = "hidden";
              }
              el.scrollTop = el.scrollHeight;
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            isVoiceListening
              ? (lang === 'bn' ? "বলুন, কথা শোনা হচ্ছে..." : "Listening, speak freely...")
              : t.myMind.writeFreely
          }
          className="w-full px-5 sm:px-7 py-4 text-base sm:text-lg border-0 resize-none no-focus-ring leading-relaxed bg-transparent my-mind-textarea custom-mini-scrollbar"
          style={{ 
            background: "transparent", 
            border: "none", 
            outline: "none", 
            minHeight: "120px",
            maxHeight: "240px",
            height: "auto",
            overflowY: "hidden",
            color: "var(--color-text-primary)" 
          }}
        />
        
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-[calc(100%-160px)]">
            <VoiceInput 
              editorRef={textareaRef}
              currentValue={content}
              onValueChange={(val) => {
                setContent(val);
                setIsEditing(true);
              }}
              onListeningChange={setIsVoiceListening}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setContent(thought.content);
                setIsEditing(false);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
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

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={lang === "bn" ? "চিন্তাটি মুছে ফেলতে চান?" : "Delete this thought?"}
        message={
          lang === "bn"
            ? "আপনি কি নিশ্চিত যে এই চিন্তাটি মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।"
            : "Are you sure you want to delete this thought? This action cannot be undone."
        }
        confirmLabel={lang === "bn" ? "মুছুন" : "Delete"}
        cancelLabel={lang === "bn" ? "বাতিল" : "Cancel"}
      />
    </div>
  );
}
