"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  RefreshCw,
  ExternalLink,
  Zap,
  Moon,
  Bookmark
} from "lucide-react";
import confetti from "canvas-confetti";
import { AIRoadmapCard } from "@/components/ai-agent/AIRoadmapCard";
import { AIOrbFace } from "@/components/ai-agent/AIOrbFace";
import { roadmapService } from "@/services/roadmapService";
import type { LearningRoadmap } from "@/types/roadmap";
import { useAuth } from "@/context/AuthContext";
import { useAppContext } from "@/context/AppContext";

const SAMPLE_JAVA_ROADMAP: LearningRoadmap = {
  id: "demo-java-roadmap-2026",
  title: "Java Programming Roadmap",
  subject: "Java Programming",
  targetLevel: "intermediate",
  rationale: "A structured path from core programming fundamentals to object-oriented principles and backend architectures.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isSaved: true,
  stages: [
    {
      id: "stage-1",
      stageNumber: 1,
      title: "Java Basics & Syntax",
      description: "Understand basic programming constructs, variables, data types, and control flow in Java.",
      topics: [
        {
          id: "topic-1-1",
          title: "Primitive vs Non-primitive Data Types",
          description: "Master int, float, double, boolean, String, and memory allocation in Java.",
          priority: "high",
          status: "completed",
          subtasks: [
            { id: "sub-1-1-1", title: "Type casting & Wrapper classes", completed: true },
            { id: "sub-1-1-2", title: "Operators & Expressions", completed: true },
          ],
        },
        {
          id: "topic-1-2",
          title: "Control Flow & Loops",
          description: "Master if-else, switch expressions, for, while, and do-while loops.",
          priority: "high",
          prerequisites: ["Data Types"],
          status: "completed",
          subtasks: [
            { id: "sub-1-2-1", title: "Enhanced for loop & break/continue", completed: true },
          ],
        },
      ],
    },
    {
      id: "stage-2",
      stageNumber: 2,
      title: "Object-Oriented Programming (OOP)",
      description: "Core pillars of Java OOP: Inheritance, Polymorphism, Encapsulation, and Abstraction.",
      topics: [
        {
          id: "topic-2-1",
          title: "Classes, Objects & Constructors",
          description: "Constructors, 'this' keyword, static variables and static methods.",
          priority: "high",
          status: "pending",
          subtasks: [
            { id: "sub-2-1-1", title: "Constructor overloading", completed: false },
            { id: "sub-2-1-2", title: "Static blocks & memory", completed: false },
          ],
        },
        {
          id: "topic-2-2",
          title: "Inheritance & Polymorphism",
          description: "Method overriding, method overloading, and runtime dynamic dispatch.",
          priority: "high",
          prerequisites: ["Classes & Objects"],
          status: "pending",
          subtasks: [
            { id: "sub-2-2-1", title: "'super' keyword usage", completed: false },
            { id: "sub-2-2-2", title: "Runtime polymorphism with interfaces", completed: false },
          ],
        },
      ],
    },
    {
      id: "stage-3",
      stageNumber: 3,
      title: "Collections Framework & Exception Handling",
      description: "Learn how to manage data efficiently using lists, sets, maps, and handle runtime errors safely.",
      topics: [
        {
          id: "topic-3-1",
          title: "List, Set & Map Interfaces",
          description: "ArrayList, LinkedList, HashSet, and HashMap internal workings.",
          priority: "medium",
          status: "pending",
          subtasks: [
            { id: "sub-3-1-1", title: "Iterators and Streams API", completed: false },
          ],
        },
        {
          id: "topic-3-2",
          title: "Exception Handling & Custom Exceptions",
          description: "Try, catch, finally, throw, throws, and creating custom application exceptions.",
          priority: "medium",
          status: "pending",
          subtasks: [
            { id: "sub-3-2-1", title: "Checked vs Unchecked exceptions", completed: false },
          ],
        },
      ],
    },
  ],
};

export default function RoadmapDemoPage() {
  const { user } = useAuth();
  const { state, addLearningFolder, showToast } = useAppContext();
  const isBn = state?.lang === "bn";

  const [currentRoadmap, setCurrentRoadmap] = useState<LearningRoadmap>(SAMPLE_JAVA_ROADMAP);
  const [resetDone, setResetDone] = useState(false);

  // Sync sample to localStorage on mount so Time Log immediately recognizes it
  useEffect(() => {
    roadmapService.saveRoadmap(SAMPLE_JAVA_ROADMAP, user?.id);
  }, [user?.id]);

  const handleSeedToTimeLog = () => {
    // 1. Ensure folder exists in AppContext
    const exists = state.learningFolders.some(
      (f) => f.name.toLowerCase() === "java programming"
    );
    if (!exists) {
      addLearningFolder("Java Programming");
    }

    // 2. Save roadmap with link
    const saved = roadmapService.saveRoadmap(currentRoadmap, user?.id);
    setCurrentRoadmap(saved);

    showToast(
      isBn
        ? "'Java Programming' রোডম্যাপ টাইম লগে সেভ ও লিঙ্ক করা হয়েছে!"
        : "'Java Programming' roadmap synced & linked to Time Log!",
      "success"
    );
  };

  const handleMarkAllComplete = () => {
    const fullyCompletedRoadmap: LearningRoadmap = JSON.parse(JSON.stringify(currentRoadmap));
    for (const stage of fullyCompletedRoadmap.stages) {
      for (const topic of stage.topics) {
        topic.status = "completed";
        if (topic.subtasks) {
          topic.subtasks.forEach((s) => (s.completed = true));
        }
      }
    }
    const saved = roadmapService.saveRoadmap(fullyCompletedRoadmap, user?.id);
    setCurrentRoadmap(saved);

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#3B82F6", "#60A5FA", "#10B981", "#F59E0B", "#8B5CF6"]
      });
    } catch {}

    showToast(
      isBn ? "অভিনন্দন! সম্পূর্ণ রোডম্যাপ সম্পন্ন হয়েছে! 🎉" : "Congratulations! 100% completed! 🎉",
      "success"
    );
  };

  const handleResetTokenQuota = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("focusforge_guest_token_quota");
      localStorage.removeItem("focusforge_auth_token_quota");
      localStorage.removeItem("focusforge_guest_token_used");
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
      showToast(
        isBn ? "লোকাল টোকেন লিমিট রিসেট করা হয়েছে! এখন Glory AI তে চ্যাট করতে পারবে।" : "Local token quota reset! You can now chat in Glory AI.",
        "success"
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* TOP BAR */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? "ড্যাশবোর্ডে ফিরুন" : "Back to Dashboard"}</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/#learning"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-none transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isBn ? "টাইম লগ দেখুন" : "View Time Log"}</span>
            </Link>

            <Link
              href="/#ai-agent"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-none transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isBn ? "Glory AI খুলুন" : "Open Glory AI"}</span>
            </Link>
          </div>
        </div>

        {/* HERO TITLE */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Demo & Live Preview Mode</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isBn ? "AI লার্নিং রোডম্যাপ ও ফিচার ডেমো প্রিভিউ" : "AI Learning Roadmap & Features Preview"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            {isBn
              ? "টোকেন লিমিট শেষ থাকলেও এখানে তুমি সব ফিচার সরাসরি লাইভ দেখতে, ক্লিক করে টেস্ট করতে এবং টাইম লগের সাথে ইন্টিগ্রেশন চেক করতে পারবে।"
              : "Even if AI daily tokens are exhausted, you can test and inspect all newly built features, live checkbox progress, and Time Log links here."}
          </p>
        </div>

        {/* QUICK ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleSeedToTimeLog}
            className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <Bookmark className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Sync</span>
            </div>
            <div className="text-xs font-bold">{isBn ? "টাইম লগে সিঙ্ক করুন" : "Sync to Time Log"}</div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {isBn ? "Java Programming ফোল্ডার ও রোডম্যাপ যুক্ত হবে" : "Links to Java Programming folder"}
            </div>
          </button>

          <button
            type="button"
            onClick={handleMarkAllComplete}
            className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <Award className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Celebrate</span>
            </div>
            <div className="text-xs font-bold">{isBn ? "১০০% সম্পন্ন ও কনফেটি দেখুন" : "Mark 100% & See Confetti"}</div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {isBn ? "ওয়ার্ম অভিনন্দন বার্তা ও কনফেটি ট্রিগার হবে" : "Triggers celebration banner & confetti"}
            </div>
          </button>

          <button
            type="button"
            onClick={handleResetTokenQuota}
            className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400 text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider">{resetDone ? "Done!" : "Reset"}</span>
            </div>
            <div className="text-xs font-bold">{isBn ? "লোকাল টোকেন লিমিট রিসেট" : "Reset Local Token Limit"}</div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {isBn ? "Glory AI-তে আবার চ্যাট করার সুযোগ দিবে" : "Clears local limit lock for testing"}
            </div>
          </button>
        </div>

        {/* SECTION 1: LIVE INTERACTIVE ROADMAP CARD */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <span>{isBn ? "১. লাইভ ইন্টারেক্টিভ রোডম্যাপ কার্ড" : "1. Live Interactive Roadmap Card"}</span>
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {isBn ? "বক্সিং ছাড়া ক্লিন ডার্ক/লাইট স্টাইলিং" : "Clean light/dark styling without double-boxing"}
            </span>
          </div>

          <div className="p-1 sm:p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 flex justify-center">
            <AIRoadmapCard
              roadmap={currentRoadmap}
              isBn={isBn}
              onSave={(updated) => {
                setCurrentRoadmap(updated);
                roadmapService.saveRoadmap(updated, user?.id);
                showToast(isBn ? "রোডম্যাপ আপডেট সংরক্ষিত!" : "Roadmap progress saved!", "success");
              }}
              onNavigate={(route) => {
                window.location.href = `/#${route}`;
              }}
            />
          </div>
        </div>

        {/* SECTION 2: AI ORB IN SLEEP MODE & STICKY LIMIT BANNER PREVIEW */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-400" />
              <span>{isBn ? "২. লিমিট শেষ হলে AI Orb Sleep Mode ও স্টিকি ব্যানার" : "2. Sleeping AI Orb & Sticky Limit Banner"}</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isBn
                ? "টোকেন লিমিট শেষ হলে এআই ওআরবি ফেস চোখ বন্ধ করে ঘুমাবে এবং এই স্টিকি ব্যানারটি চ্যাট ইনপুটের উপরে ফিক্সড থাকবে।"
                : "When tokens are exhausted, AI Orb enters Sleep Mode with eyes closed and this sticky banner locks above the input."}
            </p>
          </div>

          {/* STICKY LIMIT BANNER DEMO */}
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-slate-800 dark:text-amber-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">
                {isBn ? "লিমিট রিচ (সীমা সমাপ্ত)" : "Limit Reached"}
              </span>
              <span className="text-xs opacity-85">
                • {isBn ? "রিস্টোর হবে: ১ ঘণ্টা ৪৫ মিনিট পর" : "Restores in: 1h 45m"}
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300">
              Sticky Above Composer
            </span>
          </div>

          {/* SLEEPING ORB PREVIEW */}
          <div className="py-8 px-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
            <div className="w-64 max-w-full">
              <AIOrbFace
                mood="sleepy"
                thoughtText={
                  isBn
                    ? "তোমার আজকের লিমিট শেষ হয়ে গেছে, তাই আমি একটু রেস্ট নিচ্ছি। লিমিট রিসেট হলে আবার জেগে তোমাকে সাহায্য করবো!"
                    : "Your daily limit has been reached, so I'm taking a little rest. Once it resets, I'll wake right up to help you!"
                }
                speechSide="top"
                language={isBn ? "bn" : "en"}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-4">
              AI Orb in "Sleepy" Mood (Eyes Closed Sleeping Animation)
            </span>
          </div>
        </div>

        {/* BOTTOM NAVIGATION TIP */}
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3">
          <span>
            {isBn
              ? "টাইম লগে দেখতে চাও? উপরের 'View Time Log' বাটনে ক্লিক করে সরাসরি টাইম লগ পেজে যাও।"
              : "Want to see it inside Time Log? Click 'View Time Log' above to see the header Roadmap button and topic card badge."}
          </span>
          <Link
            href="/#learning"
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs whitespace-nowrap"
          >
            {isBn ? "টাইম লগ পেজ" : "Time Log Page"}
          </Link>
        </div>
      </div>
    </div>
  );
}
