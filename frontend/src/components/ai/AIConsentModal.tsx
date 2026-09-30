"use client";

import React from "react";
import { Shield, Sparkles, CheckCircle2, Lock } from "lucide-react";
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isBn ? "এআই প্রাইভেসি ও ইমপ্রুভমেন্ট সেটিংস" : "AI Privacy & Improvement Choice"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isBn ? "আপনার ব্যক্তিগত তথ্যের পূর্ণ নিয়ন্ত্রণ আপনার কাছে" : "Full control over your personal conversation data"}
            </p>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-3 mb-6 bg-muted/30 p-4 rounded-xl border border-border/40">
          <p>
            {isBn
              ? "FocusForge একটি প্রাইভেসি-ফার্স্ট সিস্টেম। আপনার কথোপকথন আপনার ডিভাইসে সংরক্ষিত থাকে। আপনি কি FocusForge-এর এআই মানোন্নয়ন ও মূল্যায়নের জন্য আপনার কথোপকথন ডাটা ব্যবহারের অনুমতি দিতে চান?"
              : "FocusForge is built with local-first privacy. Your chats remain on your device. Would you like to allow anonymous conversation evaluation to help improve FocusForge AI?"}
          </p>
          <div className="flex items-center gap-2 text-xs text-foreground font-medium">
            <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {isBn
                ? "প্রাইভেট রাখলেও আপনি সব এআই ফিচার সম্পূর্ণভাবে ব্যবহার করতে পারবেন।"
                : "All AI features remain 100% accessible even if you choose to keep chats private."}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleChoice("private")}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted font-medium text-sm text-foreground transition-all flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-primary" />
            {isBn ? "চ্যাট প্রাইভেট রাখুন (সুপারিশকৃত)" : "Keep My Chats Private (Default)"}
          </button>

          <button
            type="button"
            onClick={() => handleChoice("granted")}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isBn ? "উন্নয়নে সম্মতি দিন" : "Allow AI Improvement"}
          </button>
        </div>
      </div>
    </div>
  );
}
