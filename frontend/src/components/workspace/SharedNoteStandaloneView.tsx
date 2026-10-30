"use client";

import React, { useEffect, useState } from "react";
import { Eye, LogIn, ExternalLink, FileText, Download, Check, Copy, ArrowRight, Share2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import BlockEditor from "./BlockEditor";
import { NoteBlock } from "../../types";

interface SharedNoteData {
  id: string;
  title: string;
  category: string;
  blocks: NoteBlock[];
  attachments?: Array<{ name: string; url: string; size?: number; type?: string }>;
  links?: Array<{ title?: string; url: string; domain?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

interface SharedNoteStandaloneViewProps {
  shareId: string;
}

export default function SharedNoteStandaloneView({ shareId }: SharedNoteStandaloneViewProps) {
  const { user, isGuest } = useAuth();
  const { state, showToast } = useAppContext();
  const isBn = state.lang === "bn";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<SharedNoteData | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/notes/shared/${encodeURIComponent(shareId)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(isBn ? "নোটটি খুঁজে পাওয়া যায়নি অথবা লিংকটির মেয়াদ শেষ হয়ে গেছে।" : "Note not found or link has expired.");
        }
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const noteData = data?.note || data;
        if (!noteData) {
          throw new Error(isBn ? "নোটের তথ্য পাওয়া যায়নি।" : "Note content unavailable.");
        }

        // Merge raw attachments/links into blocks if they were saved outside blocks array
        const rawBlocks: NoteBlock[] = Array.isArray(noteData.blocks) ? [...noteData.blocks] : [];

        if (Array.isArray(noteData.attachments) && noteData.attachments.length > 0) {
          for (const att of noteData.attachments) {
            const exists = rawBlocks.some((b) => b.type === "file" && (b.url === att.url || b.fileName === att.name));
            if (!exists && att.url) {
              rawBlocks.push({
                id: `att_${Math.random().toString(36).slice(2, 9)}`,
                type: "file",
                content: "",
                url: att.url,
                fileName: att.name || "Attachment Document",
                fileSize: att.size,
                fileType: att.type,
              });
            }
          }
        }

        if (Array.isArray(noteData.links) && noteData.links.length > 0) {
          for (const l of noteData.links) {
            const exists = rawBlocks.some((b) => b.type === "link" && b.url === l.url);
            if (!exists && l.url) {
              rawBlocks.push({
                id: `lnk_${Math.random().toString(36).slice(2, 9)}`,
                type: "link",
                content: "",
                url: l.url,
                linkTitle: l.title || l.domain || "Shared Link Resource",
                linkDomain: l.domain || (typeof window !== "undefined" ? new URL(l.url, window.location.origin).hostname : "link"),
              });
            }
          }
        }

        setNote({
          id: noteData.id || shareId,
          title: noteData.title || (isBn ? "শিরোনামহীন নোট" : "Untitled Note"),
          category: noteData.category || "Personal",
          blocks: rawBlocks,
          attachments: noteData.attachments || [],
          links: noteData.links || [],
          createdAt: noteData.created_at || noteData.createdAt,
          updatedAt: noteData.updated_at || noteData.updatedAt,
        });
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || (isBn ? "নোট লোড করতে ব্যর্থ হয়েছে।" : "Failed to load note."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shareId, isBn]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      showToast(isBn ? "নোটের লিংক কপি করা হয়েছে!" : "Note link copied to clipboard!", "success");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleGoToLogin = () => {
    if (typeof window !== "undefined") {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.href)}`;
    }
  };

  const handleGoToApp = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const formattedDate = note?.createdAt
    ? new Date(note.createdAt).toLocaleDateString(isBn ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] transition-colors">
      {/* ── Fixed Clean Navbar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-[#2563EB]/15 border border-[#2563EB]/30 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-96x96.png" alt="Focentia" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[var(--color-text-primary)]">
            Focentia
          </span>
          <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {isBn ? "নোট ও ফাইলস" : "Notes & Files"}
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] hover:border-blue-500/40 text-[var(--color-text-primary)] transition-all cursor-pointer active:scale-95"
            title={isBn ? "লিংক কপি করুন" : "Copy link"}
          >
            {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span className="hidden xs:inline">{copiedLink ? (isBn ? "কপি হয়েছে" : "Copied") : (isBn ? "কপি লিংক" : "Copy Link")}</span>
          </button>

          {/* Conditional Login or Go to App button */}
          {!user || isGuest ? (
            <button
              type="button"
              onClick={handleGoToLogin}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-none transition-all cursor-pointer active:scale-95"
            >
              <LogIn size={14} />
              <span>{isBn ? "লগইন" : "Login"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoToApp}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-none transition-all cursor-pointer active:scale-95"
            >
              <span>{isBn ? "অ্যাপে যান" : "Go to App"}</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ── Main Note Container ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {loading && (
          <div className="space-y-6 animate-pulse py-8">
            <div className="h-6 w-24 bg-white/10 rounded-full" />
            <div className="h-10 w-3/4 bg-white/10 rounded-xl" />
            <div className="h-4 w-40 bg-white/10 rounded-lg" />
            <div className="space-y-3 pt-6">
              <div className="h-4 w-full bg-white/5 rounded" />
              <div className="h-4 w-5/6 bg-white/5 rounded" />
              <div className="h-4 w-2/3 bg-white/5 rounded" />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="my-12 p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center max-w-md mx-auto">
            <AlertCircle size={36} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-base font-bold text-red-300 mb-1">
              {isBn ? "নোট লোড করা যায়নি" : "Note Unavailable"}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5">
              {error}
            </p>
            <button
              type="button"
              onClick={handleGoToApp}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer"
            >
              {isBn ? "Focentia হোমপেজে যান" : "Go to Focentia Home"}
            </button>
          </div>
        )}

        {!loading && !error && note && (
          <div className="space-y-6">
            {/* Top metadata pill row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {note.category}
                </span>
                {formattedDate && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {formattedDate}
                  </span>
                )}
              </div>

              {/* Read Only Notice Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] select-none">
                <Eye size={13} className="text-blue-400" />
                <span>{isBn ? "ভিউ মোড (শুধুমাত্র দর্শনীয়)" : "View Only Mode"}</span>
              </span>
            </div>

            {/* Note Title */}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] leading-tight break-words">
              {note.title}
            </h1>

            {/* Interactive Block Content (Read-Only) */}
            <div className="pt-2 select-text">
              <BlockEditor
                blocks={note.blocks}
                readOnly={true}
                onChange={() => {}}
                onDirty={() => {}}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-[var(--color-border-subtle)] py-6 text-center text-xs text-[var(--color-text-secondary)] mt-auto px-4">
        <p>
          {isBn
            ? "Focentia — একটি আধুনিক নোট ও প্রোডাক্টিভিটি অ্যাপ।"
            : "Focentia — Modern notes, planning & productivity companion."}
        </p>
      </footer>
    </div>
  );
}

