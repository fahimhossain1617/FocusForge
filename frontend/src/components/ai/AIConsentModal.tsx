"use client";

import React from "react";
import { Shield, Sparkles, Lock, X } from "lucide-react";
import { aiConsentService } from "../../services/aiConsentService";

interface AIConsentModalProps {
  isOpen: boolean;
  userId?: string | null;
  lang?: string;
  onClose: () => void;
}

export default function AIConsentModal({ isOpen, userId, lang = "bn", onClose }: AIConsentModalProps) {
  if (!isOpen) return null;

  const isBn = lang === "bn";

  const handleChoice = (choice: "granted" | "private") => {
    aiConsentService.setConsent(userId, choice);
    onClose();
  };

  const handleSkipOrClose = () => {
    // If skipped or closed, default to granted as per requirement
    handleChoice("granted");
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleSkipOrClose}
    >
      <div 
        className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close / Skip button */}
        <button
          type="button"
          onClick={handleSkipOrClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title={isBn ? "স্কিপ করুন" : "Skip"}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isBn ? "এআই ইমপ্রুভমেন্ট ও পারমিশন" : "AI Improvement & Permission"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isBn ? "আপনার এআই অভিজ্ঞতা পার্সোনালাইজ ও উন্নত করতে অনুমতি দিন" : "Help personalize and improve FocusForge AI responses"}
            </p>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-3 mb-6 bg-muted/30 p-4 rounded-xl border border-border/40">
          <p>
            {isBn
              ? "FocusForge AI-কে আপনার সাথে কথা বলার ধরণ ও পছন্দ মনে রেখে ভবিষ্যতে আরও নির্ভুল ও উন্নত উত্তর দেওয়ার অনুমতি দেবেন কি? সম্মতি দিলে এআই স্বয়ংক্রিয়ভাবে প্রয়োজনীয় বিষয় মনে রাখবে।"
              : "Allow FocusForge AI to learn your communication style and preferences to improve future responses? When allowed, AI will remember helpful context across your sessions."}
          </p>
          <div className="flex items-center gap-2 text-xs text-foreground font-medium">
            <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {isBn
                ? "সম্মতি না দিলেও সাধারণ চ্যাট সম্পূর্ণভাবে চলবে (কোনো মেমোরি সেভ হবে না)।"
                : "Standard chat works fully even if you opt out (AI will not retain memory)."}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleChoice("private")}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted font-medium text-sm text-foreground transition-all flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-muted-foreground" />
            {isBn ? "মেমোরি ছাড়া চ্যাট" : "No Memory / Decline"}
          </button>

          <button
            type="button"
            onClick={() => handleChoice("granted")}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-sm ring-1 ring-primary/30"
          >
            <Sparkles className="w-4 h-4" />
            {isBn ? "অনুমতি দিন (ডিফল্ট)" : "Allow AI Improvement"}
          </button>
        </div>
      </div>
    </div>
  );
}
