"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Heading1, Heading2, Heading3, Bold, Italic, Underline, 
  List, ListOrdered, CheckSquare2, Quote, Braces, Plus, 
  Image as ImageIcon, FileText, Link2, Paperclip, Type, 
  ChevronDown, Sparkles
} from "lucide-react";
import type { BlockType } from "../../types";

interface RichFormattingToolbarProps {
  onAddBlock: (type: BlockType) => void;
  onFormatInline?: (syntax: "**" | "*" | "<u>") => void;
  onTriggerImageUpload: () => void;
  onTriggerFileUpload: () => void;
  onTriggerLinkModal: () => void;
}

export default function RichFormattingToolbar({
  onAddBlock,
  onFormatInline,
  onTriggerImageUpload,
  onTriggerFileUpload,
  onTriggerLinkModal,
}: RichFormattingToolbarProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    if (addMenuOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [addMenuOpen]);

  const menuItems = [
    { type: "paragraph" as BlockType, label: "Text Block", icon: Type, desc: "Standard text or paragraph" },
    { type: "image" as BlockType, label: "Image", icon: ImageIcon, desc: "Upload PNG, JPG, or WEBP", action: onTriggerImageUpload },
    { type: "file" as BlockType, label: "PDF / Document", icon: FileText, desc: "Attach PDF, Word, or resources", action: onTriggerFileUpload },
    { type: "link" as BlockType, label: "External Link", icon: Link2, desc: "Google Drive, YouTube, Docs, etc.", action: onTriggerLinkModal },
    { type: "todo" as BlockType, label: "Checklist", icon: CheckSquare2, desc: "To-do task with checkbox" },
    { type: "bullet" as BlockType, label: "Bullet List", icon: List, desc: "Bulleted points" },
    { type: "numbered" as BlockType, label: "Numbered List", icon: ListOrdered, desc: "Numbered steps" },
    { type: "quote" as BlockType, label: "Quote Block", icon: Quote, desc: "Callout or important quote" },
    { type: "code" as BlockType, label: "Code Block", icon: Braces, desc: "Syntax-highlighted code editor" },
    { type: "file" as BlockType, label: "Attachment", icon: Paperclip, desc: "Upload file resource", action: onTriggerFileUpload },
  ];

  return (
    <div className="sticky top-0 z-20 w-full mb-6">
      <div 
        className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-2xl border backdrop-blur-xl shadow-lg transition-all"
        style={{
          background: "var(--color-bg-elevated, rgba(13, 20, 36, 0.85))",
          borderColor: "var(--color-border-subtle, rgba(255, 255, 255, 0.08))"
        }}
      >
        {/* Quick formatting group */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5 px-1 max-w-full">
          {/* Quick Insert Menu Button */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span className="hidden sm:inline">Add Content</span>
              <ChevronDown size={12} className={`transition-transform ${addMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {addMenuOpen && (
              <div 
                className="absolute left-0 top-full mt-2 w-64 sm:w-72 rounded-2xl border p-2 shadow-2xl z-50 animate-scale-up"
                style={{
                  background: "var(--color-bg-card, #0B1120)",
                  borderColor: "var(--color-border-subtle, rgba(255,255,255,0.12))"
                }}
              >
                <div className="px-2.5 py-1.5 mb-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Insert Block or Resource
                </div>
                <div className="space-y-0.5">
                  {menuItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAddMenuOpen(false);
                          if (item.action) {
                            item.action();
                          } else {
                            onAddBlock(item.type);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-blue-500/20 text-zinc-400 group-hover:text-blue-400 transition-colors">
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-white/10 mx-1 shrink-0" />

          {/* Heading Quick Buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onAddBlock("h1")}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Heading 1"
            >
              <Heading1 size={15} />
            </button>
            <button
              type="button"
              onClick={() => onAddBlock("h2")}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Heading 2"
            >
              <Heading2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => onAddBlock("h3")}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Heading 3"
            >
              <Heading3 size={15} />
            </button>
          </div>

          <div className="h-5 w-px bg-white/10 mx-1 shrink-0" />

          {/* List & Structure Buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onAddBlock("bullet")}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Bullet List"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => onAddBlock("numbered")}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered size={15} />
            </button>
            <button
              type="button"
              onClick={() => onAddBlock("todo")}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Checklist"
            >
              <CheckSquare2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => onAddBlock("quote")}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Quote Block"
            >
              <Quote size={15} />
            </button>
            <button
              type="button"
              onClick={() => onAddBlock("code")}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Code Block"
            >
              <Braces size={15} />
            </button>
          </div>

          <div className="h-5 w-px bg-white/10 mx-1 shrink-0 hidden sm:block" />

          {/* Inline formatting */}
          {onFormatInline && (
            <div className="hidden sm:flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onFormatInline("**")}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Bold (Ctrl+B)"
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                onClick={() => onFormatInline("*")}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Italic (Ctrl+I)"
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                onClick={() => onFormatInline("<u>")}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Underline (Ctrl+U)"
              >
                <Underline size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Direct Media Quick Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onTriggerImageUpload}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
            title="Upload Image"
          >
            <ImageIcon size={15} />
          </button>
          <button
            type="button"
            onClick={onTriggerFileUpload}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Attach PDF or Document"
          >
            <FileText size={15} />
          </button>
          <button
            type="button"
            onClick={onTriggerLinkModal}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            title="Add External Link"
          >
            <Link2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
