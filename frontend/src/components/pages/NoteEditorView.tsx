"use client";

import React, { useEffect, useRef, useState } from "react";
import { 
  ArrowLeft, Check, CloudUpload, Download, MoreHorizontal, 
  Share2, Trash2, Image as ImageIcon, 
  FileUp, X, Sparkles
} from "lucide-react";
import BlockEditor from "../workspace/BlockEditor";
import LinkInsertModal from "../workspace/LinkInsertModal";
import NoteAttachmentsSection from "../workspace/NoteAttachmentsSection";
import type { NoteBlock, Note } from "../../types";
import { useAppContext } from "../../context/AppContext";
import { compressImageFile } from "../../services/indexedDBStorage";

interface NoteEditorViewProps { 
  note?: Note | null;
  initialTitle: string; 
  initialBlocks: NoteBlock[]; 
  initialCreatedAt?: string;
  initialUpdatedAt?: string;
  onUpdate: (title: string, blocks: NoteBlock[]) => void; 
  onDelete: () => void; 
  onBack: () => void; 
}

const newId = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

export default function NoteEditorView({ 
  note,
  initialTitle, 
  initialBlocks, 
  initialCreatedAt,
  initialUpdatedAt,
  onUpdate, 
  onDelete, 
  onBack 
}: NoteEditorViewProps) {
  const { showToast } = useAppContext();
  const [title, setTitle] = useState(initialTitle); 
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => {
    if (!initialBlocks || initialBlocks.length <= 1) return initialBlocks || [];
    return initialBlocks.filter((b) => !(b.type === "paragraph" && b.content.trim() === "#"));
  }); 
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved"); 
  const [moreOpen, setMoreOpen] = useState(false); 
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Modals & Popups
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [replacingBlockId, setReplacingBlockId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const targetBlockIdRef = useRef<string | null>(null);

  // Hidden File Inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const queueSave = (nextTitle: string, nextBlocks: NoteBlock[]) => { 
    setSaveState("saving"); 
    if (saveTimer.current) clearTimeout(saveTimer.current); 
    saveTimer.current = setTimeout(() => { 
      onUpdate(nextTitle, nextBlocks); 
      setSaveState("saved"); 
    }, 450); 
  };

  const goBack = () => { 
    if (saveTimer.current) clearTimeout(saveTimer.current); 
    onUpdate(title, blocks); 
    onBack(); 
  };

  const share = async () => { 
    const text = blocks
      .map((block) => {
        if (block.type === "image") return `[Image: ${block.caption || "Image"}]`;
        if (block.type === "file") return `[File: ${block.fileName || "Attachment"}]`;
        if (block.type === "link") return `[Link: ${block.linkTitle || block.url}](${block.url})`;
        return block.content.replace(/<[^>]*>/g, "");
      })
      .join("\n"); 

    try { 
      if (navigator.share) {
        await navigator.share({ title: title || "Untitled note", text }); 
      } else { 
        await navigator.clipboard.writeText(`${title}\n\n${text}`); 
        showToast("Note copied to clipboard"); 
      } 
    } catch { 
      /* User cancelled sharing. */ 
    } 
    setMoreOpen(false); 
  };

  // ── Image Handling ──
  const handleImageUploadTrigger = (targetBlockId?: string) => {
    setReplacingBlockId(null);
    targetBlockIdRef.current = targetBlockId || null;
    imageInputRef.current?.click();
  };

  const handleReplaceImage = (blockId: string) => {
    setReplacingBlockId(blockId);
    imageInputRef.current?.click();
  };

  const insertMediaBlock = (prev: NoteBlock[], newMediaBlock: NoteBlock, targetId: string | null): NoteBlock[] => {
    let replaced = false;
    let next = prev.map((b) => {
      if (targetId && b.id === targetId) {
        replaced = true;
        return newMediaBlock;
      }
      return b;
    });

    // If targetId was not matched, find a paragraph that is empty or contains '#'
    if (!replaced) {
      const candidateIdx = next.findIndex(
        (b) => b.type === "paragraph" && (!b.content.trim() || /^#(file|pdf|doc|image|link)?$/i.test(b.content.trim()))
      );
      if (candidateIdx >= 0) {
        next[candidateIdx] = newMediaBlock;
        replaced = true;
      } else {
        next.push(newMediaBlock);
      }
    }

    // Clean up any remaining stray blocks that contain only "#" or command triggers
    next = next.filter((b) => {
      if (b.id === newMediaBlock.id) return true;
      if (b.type === "paragraph") {
        const trimmed = b.content.trim();
        if (trimmed === "#" || /^#(file|pdf|doc|image|link|p|h1|h2|h3|todo|code|math)$/i.test(trimmed)) {
          return false;
        }
      }
      return true;
    });

    // If the note starts with an empty paragraph immediately before our new media block, remove that empty paragraph
    if (next.length >= 2 && next[0].type === "paragraph" && !next[0].content.trim() && next[1].id === newMediaBlock.id) {
      next = next.slice(1);
    }

    // Ensure there is always a clean paragraph block after the media block if it's the last block, so the user can easily continue writing below it
    const mediaIdx = next.findIndex((b) => b.id === newMediaBlock.id);
    if (mediaIdx === next.length - 1) {
      next.push({ id: newId(), type: "paragraph", content: "" });
    }

    // Remove redundant consecutive empty paragraphs
    next = next.filter((b, i) => {
      if (b.id === newMediaBlock.id) return true;
      if (b.type === "paragraph" && !b.content.trim()) {
        if (i > 0 && next[i - 1]?.type === "paragraph" && !next[i - 1]?.content.trim()) {
          return false;
        }
      }
      return true;
    });

    return next;
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const dataUrl = await compressImageFile(file);
      if (!dataUrl) continue;

      if (replacingBlockId) {
        setBlocks((prev) => {
          const next = prev.map((b) => 
            b.id === replacingBlockId ? { ...b, url: dataUrl, fileName: file.name, fileSize: file.size } : b
          );
          queueSave(title, next);
          return next;
        });
        setReplacingBlockId(null);
      } else {
        const imgBlock: NoteBlock = {
          id: newId(),
          type: "image",
          content: "",
          url: dataUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          caption: "",
          imageSize: "medium",
        };
        setBlocks((prev) => {
          const next = insertMediaBlock(prev, imgBlock, targetBlockIdRef.current);
          queueSave(title, next);
          return next;
        });
        targetBlockIdRef.current = null;
      }
    }

    if (e.target) e.target.value = "";
  };

  // ── File / PDF Handling ──
  const handleFileUploadTrigger = (targetBlockId?: string) => {
    targetBlockIdRef.current = targetBlockId || null;
    fileInputRef.current?.click();
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const fileBlock: NoteBlock = {
          id: newId(),
          type: "file",
          content: "",
          url: dataUrl || "",
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/pdf",
        };
        setBlocks((prev) => {
          const next = insertMediaBlock(prev, fileBlock, targetBlockIdRef.current);
          queueSave(title, next);
          return next;
        });
        targetBlockIdRef.current = null;
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = "";
  };

  // ── External Link Handling ──
  const handleAddLink = (url: string, linkTitle?: string, linkDomain?: string) => {
    const linkBlock: NoteBlock = {
      id: newId(),
      type: "link",
      content: "",
      url,
      linkTitle: linkTitle || linkDomain || url,
      linkDomain: linkDomain || "",
    };
    setBlocks((prev) => {
      const next = insertMediaBlock(prev, linkBlock, targetBlockIdRef.current);
      queueSave(title, next);
      return next;
    });
    targetBlockIdRef.current = null;
  };

  // ── Drag and Drop Support ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");

      if (isImage) {
        const dataUrl = await compressImageFile(file);
        if (!dataUrl) continue;
        const newImgBlock: NoteBlock = {
          id: newId(),
          type: "image",
          content: "",
          url: dataUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          caption: "",
          imageSize: "medium",
        };
        setBlocks((prev) => {
          const next = insertMediaBlock(prev, newImgBlock, null);
          queueSave(title, next);
          return next;
        });
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type.includes("pdf");
          const newDocBlock: NoteBlock = {
            id: newId(),
            type: "file",
            content: "",
            url: dataUrl || "",
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || (isPdf ? "application/pdf" : "application/octet-stream"),
          };
          setBlocks((prev) => {
            const next = insertMediaBlock(prev, newDocBlock, null);
            queueSave(title, next);
            return next;
          });
        };
        reader.readAsDataURL(file);
      }
    }

    showToast("Files added to note");
  };

  const removeBlockById = (blockId: string) => {
    const nextBlocks = blocks.filter((b) => b.id !== blockId);
    setBlocks(nextBlocks);
    queueSave(title, nextBlocks);
  };

  return (
    <div 
      className="note-editor-screen relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={imageInputRef} 
        onChange={handleImageFileChange} 
        accept="image/jpeg,image/png,image/webp,image/gif,image/*" 
        multiple
        className="hidden" 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleDocFileChange} 
        accept=".pdf,.doc,.docx,.txt,.csv,.zip,application/pdf,application/*" 
        multiple
        className="hidden" 
      />

      {/* Header */}
      <header className="note-editor-screen__header">
        <button type="button" onClick={goBack} className="note-editor-back cursor-pointer">
          <ArrowLeft size={18} />
          <span>Back to notes</span>
        </button>

        <div className="note-editor-actions">
          <button 
            type="button" 
            className="note-header-icon note-header-icon--danger cursor-pointer" 
            onClick={() => setConfirmDelete(true)} 
            aria-label="Delete note"
          >
            <Trash2 size={16} />
          </button>

          <span className={saveState === "saving" ? "note-save-state is-saving" : "note-save-state"}>
            {saveState === "saving" ? <CloudUpload size={14} className="animate-pulse text-blue-400" /> : <Check size={14} className="text-emerald-400" />}
            {saveState === "saving" ? "Auto-saving..." : "All changes saved"}
          </span>

          <div className="relative">
            <button 
              type="button" 
              className="note-header-icon cursor-pointer" 
              onClick={() => setMoreOpen((open) => !open)} 
              aria-label="More options"
            >
              <MoreHorizontal size={19} />
            </button>
            {moreOpen && (
              <div className="note-more-menu">
                <button type="button" onClick={share}>
                  <Share2 size={15} /> Share Note
                </button>
                <button type="button" onClick={() => { window.print(); setMoreOpen(false); }}>
                  <Download size={15} /> Download as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Editor Main Canvas */}
      <main className="note-editor-screen__scroll custom-scrollbar">
        <div className="note-editor-canvas relative">
          
          {/* Drag and Drop Zone Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-40 bg-blue-950/80 backdrop-blur-md rounded-3xl border-2 border-dashed border-blue-400 flex flex-col items-center justify-center gap-3 p-8 pointer-events-none animate-fade-in">
              <div className="p-4 rounded-2xl bg-blue-500/20 text-blue-300">
                <FileUp size={36} />
              </div>
              <h3 className="text-lg font-bold text-white">Drop files here</h3>
              <p className="text-xs text-blue-300">Images, PDFs, or documents will be added directly into your note</p>
            </div>
          )}

          {/* Note Title Input */}
          <input 
            value={title} 
            onChange={(event) => { 
              setTitle(event.target.value); 
              queueSave(event.target.value, blocks); 
            }} 
            onKeyDown={(event) => { 
              if (event.key === "Enter") { 
                event.preventDefault(); 
                document.getElementById(`block-${blocks[0]?.id}`)?.focus(); 
              } 
            }} 
            placeholder="Untitled note" 
            className="note-editor-title w-full text-3xl sm:text-4xl font-black tracking-tight mb-6 bg-transparent outline-none text-white placeholder-zinc-600" 
            autoFocus 
          />

          {/* Block Editor */}
          <BlockEditor 
            blocks={blocks} 
            onChange={(nextBlocks) => { 
              setBlocks(nextBlocks); 
              queueSave(title, nextBlocks); 
            }} 
            onDirty={() => setSaveState("saving")}
            onTriggerImageUpload={handleImageUploadTrigger}
            onTriggerFileUpload={handleFileUploadTrigger}
            onTriggerLinkModal={(targetBlockId) => {
              targetBlockIdRef.current = targetBlockId || null;
              setLinkModalOpen(true);
            }}
            onReplaceImage={handleReplaceImage}
            onPreviewImage={(url) => setPreviewImageUrl(url)}
          />

          {/* Dedicated Attachments & Resources Section */}
          <NoteAttachmentsSection 
            blocks={blocks} 
            onRemoveBlock={removeBlockById}
            onPreviewImage={(url) => setPreviewImageUrl(url)}
          />
        </div>
      </main>

      {/* Link Insert Modal */}
      <LinkInsertModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onAddLink={handleAddLink}
      />

      {/* Image Lightbox Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={previewImageUrl} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl" 
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="note-delete-confirm">
          <div>
            <h2>Delete this note?</h2>
            <p>This action cannot be undone.</p>
            <section>
              <button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button type="button" className="is-delete" onClick={onDelete}>Delete</button>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
