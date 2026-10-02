"use client";

import React, { useState } from "react";
import { Link2, ExternalLink, X } from "lucide-react";
import { useAnimateExit } from "../../hooks/useAnimateExit";


interface LinkInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLink: (url: string, title?: string, domain?: string) => void;
}

export const getLinkMetadata = (rawUrl: string) => {
  let url = rawUrl.trim();
  if (!url) return { url: "", domain: "", service: "web" as const, title: "" };
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  let domain = "";
  let service: "drive" | "youtube" | "docs" | "github" | "camscanner" | "web" = "web";
  let defaultTitle = "";

  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace(/^www\./, "");
    
    if (domain.includes("drive.google.com")) {
      service = "drive";
      defaultTitle = "Google Drive Resource";
    } else if (domain.includes("docs.google.com")) {
      service = "docs";
      defaultTitle = "Google Document";
    } else if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
      service = "youtube";
      defaultTitle = "YouTube Video";
    } else if (domain.includes("github.com")) {
      service = "github";
      defaultTitle = "GitHub Repository";
    } else if (domain.includes("camscanner.com")) {
      service = "camscanner";
      defaultTitle = "CamScanner Document";
    } else {
      defaultTitle = domain;
    }
  } catch {
    domain = url.split("/")[0] || "link";
    defaultTitle = domain;
  }

  return { url, domain, service, title: defaultTitle };
};

export default function LinkInsertModal({ isOpen, onClose, onAddLink }: LinkInsertModalProps) {
  const { shouldRender, isExiting } = useAnimateExit(isOpen, 200);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  if (!shouldRender) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    const meta = getLinkMetadata(url);
    const finalTitle = title.trim() || meta.title || meta.domain;
    onAddLink(meta.url, finalTitle, meta.domain);
    setUrl("");
    setTitle("");
    setError("");
    onClose();
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${
        isExiting ? "motion-exit-fade" : "motion-overlay"
      }`}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-md rounded-2xl border p-6 shadow-none relative ${
          isExiting ? "motion-exit-reveal" : "motion-dialog"
        }`}
        style={{ 
          background: "var(--color-bg-elevated)", 
          borderColor: "var(--color-border-subtle)" 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-foreground leading-snug">Add External Link</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Embed Google Drive, YouTube, Docs, or web resources</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer -mt-0.5"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
              URL or Web Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              placeholder="https://drive.google.com/... or youtube.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-black/5 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
              Title / Resource Name <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Physics Chapter 3 Slides"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-black/5 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-none"
            >
              <ExternalLink size={13} />
              Add Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
