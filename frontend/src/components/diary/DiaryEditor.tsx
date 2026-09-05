"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { DiaryEntry, DiaryImage } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import DiaryVoiceInput from "./DiaryVoiceInput";
import { Check, Loader2, Sparkles, Eraser, ImagePlus, Trash2 } from "lucide-react";
import { storageService } from "../../services/storageService";
import { supabase } from "../../lib/supabaseClient";

interface DiaryEditorProps {
  entry: DiaryEntry;
  onSave: (title: string, content: string, images?: DiaryImage[]) => void;
  lang: "en" | "bn";
}

export type WritingStyle = "clean" | "classic" | "handwritten";

export default function DiaryEditor({ entry, onSave, lang }: DiaryEditorProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(entry.title || "");
  const [content, setContent] = useState(entry.content || "");
  const [images, setImages] = useState<DiaryImage[]>(entry.images || []);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("clean");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when entry changes
  useEffect(() => {
    setTitle(entry.title || "");
    setContent(entry.content || "");
    setImages(entry.images || []);
    setSaveStatus("saved");
  }, [entry.id]);

  // Check if user accidentally created 3+ consecutive trailing empty lines
  const hasExcessiveBlankLines = /\n{3,}$/.test(content);

  // Debounced Autosave Trigger
  const triggerAutoSave = useCallback(
    (newTitle: string, newContent: string, newImages?: DiaryImage[]) => {
      setSaveStatus("saving");
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onSave(newTitle, newContent, newImages !== undefined ? newImages : images);
        setSaveStatus("saved");
      }, 500);
    },
    [onSave, images]
  );

  // Instant trim helper to remove accidental trailing Enters
  const handleTrimExcessiveLines = () => {
    const trimmed = content.replace(/\n{2,}$/, "\n");
    setContent(trimmed);
    triggerAutoSave(title, trimmed);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = trimmed.length;
        textareaRef.current.selectionEnd = trimmed.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(val, content, images);
  };

  // Track cursor position reliably across renders
  const lastCursorPosRef = useRef<number | null>(null);

  // Update cursor position tracking whenever user interacts with textarea
  const updateCursorPosition = () => {
    if (textareaRef.current) {
      lastCursorPosRef.current = textareaRef.current.selectionStart;
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerAutoSave(title, val, images);
    updateCursorPosition();
  };

  // Voice speech insertion using functional update (100% immune to stale closures, never overwrites!)
  const handleSpeechInsert = useCallback((speechText: string) => {
    if (!speechText || !speechText.trim()) return;

    setContent((currentContent) => {
      // Determine insertion point
      let insertPos = lastCursorPosRef.current;
      // If no valid cursor position stored, default to the very end of current content
      if (insertPos === null || insertPos < 0 || insertPos > currentContent.length) {
        insertPos = currentContent.length;
      }

      const before = currentContent.substring(0, insertPos);
      const after = currentContent.substring(insertPos);

      const spaceBefore = before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n") ? " " : "";
      const spaceAfter = after.length > 0 && !after.startsWith(" ") && !after.startsWith("\n") ? " " : "";

      const insertedChunk = spaceBefore + speechText.trim();
      const updated = before + insertedChunk + spaceAfter + after;

      // Advance cursor position immediately so consecutive speech chunks chain continuously without overwriting
      const newPos = before.length + insertedChunk.length;
      lastCursorPosRef.current = newPos;

      // Trigger autosave
      triggerAutoSave(title, updated, images);

      // Reposition cursor in textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
          textareaRef.current.focus();
        }
      }, 0);

      return updated;
    });
  }, [title, images, triggerAutoSave]);
  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await storageService.uploadAttachment(file, session?.user?.id);

      const newImage: DiaryImage = {
        id: "img_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        url: res.url,
        size: "medium", // default size
        fileName: res.fileName,
        storagePath: res.storagePath,
      };

      const nextImages = [...images, newImage];
      setImages(nextImages);
      triggerAutoSave(title, content, nextImages);
    } catch (err) {
      console.error("[DiaryEditor] Image upload error:", err);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpdateImageSize = (id: string, size: DiaryImage["size"]) => {
    const nextImages = images.map((img) => (img.id === id ? { ...img, size } : img));
    setImages(nextImages);
    triggerAutoSave(title, content, nextImages);
  };

  const handleDeleteImage = async (id: string) => {
    const imgToDelete = images.find((img) => img.id === id);
    const nextImages = images.filter((img) => img.id !== id);
    setImages(nextImages);
    triggerAutoSave(title, content, nextImages);

    if (imgToDelete?.storagePath) {
      try {
        await supabase.storage.from("note-attachments").remove([imgToDelete.storagePath]);
      } catch (err) {
        console.warn("[DiaryEditor] Error deleting image from storage:", err);
      }
    }
  };

  // Word and character count calculation
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const fontClass =
    writingStyle === "classic"
      ? "diary-font-classic"
      : writingStyle === "handwritten"
      ? "diary-font-handwritten"
      : "diary-font-clean";

  return (
    <div className="w-full flex flex-col">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.015]">
        {/* Left: Voice Input, Image Upload & Style Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <DiaryVoiceInput onInsertText={handleSpeechInsert} />

          {/* Add Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="flex items-center justify-center w-8 h-8 rounded-xl border transition-all text-zinc-400 hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/5 cursor-pointer disabled:opacity-50 shadow-xs"
            style={{
              borderColor: "var(--color-border-subtle)",
              background: "var(--color-bg-card)",
            }}
            title={t.diary?.addImage || "Add Image"}
            aria-label="Add Image"
          >
            {isUploadingImage ? (
              <Loader2 size={16} className="animate-spin text-blue-500" />
            ) : (
              <ImagePlus size={16} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Typography Style Pills */}
          <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs">
            <button
              type="button"
              onClick={() => setWritingStyle("clean")}
              className={`px-2 py-1 rounded-lg transition-all ${
                writingStyle === "clean"
                  ? "bg-white dark:bg-zinc-800 text-blue-500 font-semibold shadow-xs"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {t.diary?.styleClean || "Clean"}
            </button>
            <button
              type="button"
              onClick={() => setWritingStyle("classic")}
              className={`px-2 py-1 rounded-lg transition-all ${
                writingStyle === "classic"
                  ? "bg-white dark:bg-zinc-800 text-blue-500 font-semibold shadow-xs font-serif"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {t.diary?.styleClassic || "Classic"}
            </button>
            <button
              type="button"
              onClick={() => setWritingStyle("handwritten")}
              className={`px-2 py-1 rounded-lg transition-all ${
                writingStyle === "handwritten"
                  ? "bg-white dark:bg-zinc-800 text-blue-500 font-semibold shadow-xs"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <span className="italic">{t.diary?.styleHandwritten || "Handwritten"}</span>
            </button>
          </div>
        </div>

        {/* Right: Autosave Status & Word Counter */}
        <div className="flex items-center gap-3 text-xs">
          {/* Smart Trim Button if user accidentally pressed Enter many times */}
          {hasExcessiveBlankLines && (
            <button
              type="button"
              onClick={handleTrimExcessiveLines}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer shadow-xs"
              title={t.diary?.trimExtraLines || "Trim empty lines"}
            >
              <Eraser size={13} />
              <span>{t.diary?.trimExtraLines || "Trim empty lines"}</span>
            </button>
          )}

          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 font-medium transition-colors select-none">
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                <Loader2 size={12} className="animate-spin" />
                <span>{t.diary?.saving || "Saving..."}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                <Check size={12} />
                <span>{t.diary?.saved || "Saved"}</span>
              </span>
            )}
          </div>

          <div className="h-3 w-px bg-black/10 dark:bg-white/10" />

          {/* Counts */}
          <div className="text-zinc-400 dark:text-zinc-500 text-[11px] font-mono hidden xs:inline">
            <span>
              {wordCount} {t.diary?.words || "words"}
            </span>
            <span className="mx-1">•</span>
            <span>
              {charCount} {t.diary?.characters || "chars"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Ruled Writing Page */}
      <div className="relative px-5 sm:px-14 pt-6 pb-10">
        {/* Decorative spine binding on the left edge */}
        <div className="diary-spine-binding" />

        {/* Page Title Input */}
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder={t.diary?.entryTitlePlaceholder || "Page Title (optional)"}
            className={`w-full bg-transparent border-b border-black/5 dark:border-white/5 pb-2 text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors ${
              writingStyle === "classic"
                ? "font-serif"
                : writingStyle === "handwritten"
                ? "italic tracking-wide"
                : ""
            }`}
          />
        </div>

        {/* Attached Images with Size Controls */}
        {images && images.length > 0 && (
          <div className="diary-image-container">
            {images.map((img) => {
              const sizeClass =
                img.size === "small"
                  ? "diary-img-size-small"
                  : img.size === "large"
                  ? "diary-img-size-large"
                  : img.size === "full"
                  ? "diary-img-size-full"
                  : "diary-img-size-medium";

              return (
                <div key={img.id} className={`group relative diary-image-wrapper ${sizeClass}`}>
                  <img
                    src={img.url}
                    alt={img.fileName || "Diary image"}
                    className="w-full h-auto block rounded-xl object-contain max-h-[500px]"
                  />

                  {/* Floating Size Selector & Remove Button Overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 p-1 bg-black/80 backdrop-blur-md rounded-lg shadow-lg opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 border border-white/10">
                    <span className="text-[10px] text-zinc-400 font-mono px-1 select-none hidden xs:inline">
                      {t.diary?.imageSize || "Size"}:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateImageSize(img.id, "small")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        img.size === "small"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-zinc-300 hover:text-white hover:bg-white/10"
                      }`}
                      title={t.diary?.small || "Small (25%)"}
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateImageSize(img.id, "medium")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        img.size === "medium" || !img.size
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-zinc-300 hover:text-white hover:bg-white/10"
                      }`}
                      title={t.diary?.medium || "Medium (50%)"}
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateImageSize(img.id, "large")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        img.size === "large"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-zinc-300 hover:text-white hover:bg-white/10"
                      }`}
                      title={t.diary?.large || "Large (75%)"}
                    >
                      75%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateImageSize(img.id, "full")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        img.size === "full"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-zinc-300 hover:text-white hover:bg-white/10"
                      }`}
                      title={t.diary?.full || "Full (100%)"}
                    >
                      100%
                    </button>
                    <div className="w-px h-3 bg-white/20 mx-0.5" />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                      title={t.diary?.removeImage || "Delete image"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CSS Grid Auto-Sizing Notebook Surface (Zero jumping, instantaneous smooth grow/shrink) */}
        <div className="grid w-full relative">
          {/* Invisible shadow element matching exact font and line-breaks to control grid height */}
          <div
            className={`invisible col-start-1 row-start-1 w-full min-h-[260px] pb-4 whitespace-pre-wrap break-words pointer-events-none select-none diary-lined-textarea ${fontClass}`}
            aria-hidden="true"
          >
            {content + "\n"}
          </div>

          {/* Real Textarea fitting grid row with 100% stability */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onClick={updateCursorPosition}
            onKeyUp={updateCursorPosition}
            onSelect={updateCursorPosition}
            onFocus={updateCursorPosition}
            placeholder={t.diary?.writeDiaryPlaceholder || "Dear Diary, today I was thinking about..."}
            className={`col-start-1 row-start-1 w-full h-full resize-none overflow-hidden bg-transparent diary-lined-textarea ${fontClass}`}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
