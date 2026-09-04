"use client";

import React, { useState } from "react";
import { 
  Paperclip, Image as ImageIcon, FileText, Link2, ExternalLink, 
  Trash2, Download, Eye, ChevronDown, ChevronUp 
} from "lucide-react";
import type { NoteBlock } from "../../types";

interface NoteAttachmentsSectionProps {
  blocks: NoteBlock[];
  onRemoveBlock: (blockId: string) => void;
  onPreviewImage?: (url: string) => void;
}

export const formatBytes = (bytes?: number) => {
  if (!bytes || bytes === 0) return "Unknown size";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export default function NoteAttachmentsSection({
  blocks,
  onRemoveBlock,
  onPreviewImage,
}: NoteAttachmentsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter media blocks
  const mediaBlocks = blocks.filter(
    (b) => b.type === "image" || b.type === "file" || b.type === "link"
  );

  if (mediaBlocks.length === 0) return null;

  return (
    <div 
      className="mt-12 pt-6 border-t rounded-2xl p-5 backdrop-blur-sm transition-all"
      style={{
        borderColor: "var(--color-border-subtle, rgba(255, 255, 255, 0.08))",
        background: "var(--color-bg-elevated, rgba(13, 20, 36, 0.5))"
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-bold text-white hover:text-blue-400 transition-colors cursor-pointer"
        >
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Paperclip size={16} />
          </div>
          <span>Attachments & Resources</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-zinc-300">
            {mediaBlocks.length}
          </span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
          {mediaBlocks.map((block) => {
            if (block.type === "image") {
              return (
                <div 
                  key={block.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 hover:border-white/20 transition-all group"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black/40 border border-white/5 relative">
                    {block.url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={block.url} 
                        alt={block.caption || "Attachment"} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <ImageIcon size={18} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {block.caption || "Attached Image"}
                    </p>
                    <p className="text-[10px] text-zinc-400">Image file</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    {block.url && (
                      <button
                        type="button"
                        onClick={() => onPreviewImage?.(block.url!)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="View image"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveBlock(block.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            }

            if (block.type === "file") {
              const isPdf = (block.fileName || "").toLowerCase().endsWith(".pdf") || block.fileType?.includes("pdf");
              return (
                <div 
                  key={block.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 hover:border-white/20 transition-all group"
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${isPdf ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate" title={block.fileName}>
                      {block.fileName || "Attached Document"}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {formatBytes(block.fileSize)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    {block.url && (
                      <a
                        href={block.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={block.fileName || "attachment"}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Download / Open file"
                      >
                        <Download size={14} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveBlock(block.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            }

            if (block.type === "link") {
              return (
                <div 
                  key={block.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 hover:border-white/20 transition-all group"
                >
                  <div className="p-2.5 rounded-xl shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Link2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate" title={block.linkTitle}>
                      {block.linkTitle || block.linkDomain || "External Link"}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {block.linkDomain || block.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    {block.url && (
                      <a
                        href={block.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                        title="Open link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveBlock(block.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
