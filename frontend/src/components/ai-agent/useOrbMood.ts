"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AppState } from "@/types";

export type OrbMood =
  | "idle"
  | "thinking"
  | "processing"
  | "typing"
  | "happy"
  | "proud"
  | "sulky"
  | "angry"
  | "sad"
  | "sleepy"
  | "caring"
  | "curious"
  | "focused"
  | "playful";

interface UseOrbMoodOptions {
  isThinking: boolean;
  isTyping?: boolean;
  userInput?: string;
  lastUserMessage?: string;
  lastAiMessage?: string;
  hasFailedMessage?: boolean;
  error?: string | null;
  appState?: AppState;
  language?: "bn" | "en" | "auto";
  greetingText: string;
  isLimitExhausted?: boolean;
  isGuestLimit?: boolean;
}

export function useOrbMood({
  isThinking,
  isTyping = false,
  userInput = "",
  lastUserMessage = "",
  lastAiMessage = "",
  hasFailedMessage = false,
  error = null,
  appState,
  language = "bn",
  greetingText,
  isLimitExhausted = false,
  isGuestLimit = false,
}: UseOrbMoodOptions) {
  const isBn = language === "bn" || (language === "auto" && appState?.lang === "bn") || appState?.lang === "bn";
  const [mood, setMood] = useState<OrbMood>(isLimitExhausted || isGuestLimit ? "sleepy" : "idle");
  const [isGiggling, setIsGiggling] = useState(false);
  const [isEnjoying, setIsEnjoying] = useState(false);
  const [customThought, setCustomThought] = useState<string | null>(null);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moodTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gigleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  // React to limit exhaustion by putting Orb into peaceful sleep
  useEffect(() => {
    if (isGuestLimit || isLimitExhausted) {
      setMood("sleepy");
    }
  }, [isGuestLimit, isLimitExhausted]);

  // Trigger playful giggle bounce (mobile tickle) or joyful laugh (mouse click enjoy)
  const triggerGiggle = useCallback((source: "touch" | "mouse" = "touch") => {
    // If limit is reached or guest needs login, gentle sleepy response
    if (isGuestLimit) {
      setMood("sleepy");
      setCustomThought(
        isBn
          ? "তোমার তো এখনও লগইন করা হয়নি... তাই আমি ঘুমাচ্ছি! একটু লগইন করলে আমি জেগে তোমাকে প্রাণখুলে সাহায্য করব!"
          : "You haven't logged in yet... so I'm sleeping! Log in and I'll wake right up to help you!"
      );
      if (gigleTimeoutRef.current) clearTimeout(gigleTimeoutRef.current);
      gigleTimeoutRef.current = setTimeout(() => {
        setCustomThought(null);
      }, 4500);
      return;
    }

    if (isLimitExhausted) {
      setMood("sleepy");
      setCustomThought(
        isBn
          ? "আজকের তো লিমিট শেষ... তাই আমি ঘুমাচ্ছি! লিমিট রিসেট হলে আমি আবার জেগে তোমাকে সাহায্য করব!"
          : "Today's limit has ended... so I'm sleeping! Once reset, I'll wake right up to help you!"
      );
      if (gigleTimeoutRef.current) clearTimeout(gigleTimeoutRef.current);
      gigleTimeoutRef.current = setTimeout(() => {
        setCustomThought(null);
      }, 4500);
      return;
    }

    // If currently sleeping due to inactivity, wake up gently with a cute greeting
    if (mood === "sleepy") {
      setMood("happy");
      setIsEnjoying(true);
      setCustomThought(
        isBn
          ? "আহহ... ঘুম ভেঙে গেলো! বলো বন্ধু, কি সাহায্য করতে পারি?"
          : "Ah... I'm awake now! How can I help you today?"
      );
      if (gigleTimeoutRef.current) clearTimeout(gigleTimeoutRef.current);
      gigleTimeoutRef.current = setTimeout(() => {
        setIsEnjoying(false);
        setMood("idle");
        setCustomThought(null);
      }, 3500);
      return;
    }

    if (source === "touch") {
      // 1. Phone Touch: Tickle / কাতুকুতু reaction with funny laughter & wobbles
      setIsGiggling(true);
      setIsEnjoying(false);
      setMood("playful");

      const tickleThoughtsBn = [
        "হেহেহে! কাতুকুতু লাগছে তো!",
        "সুড়সুড়ি দিচ্ছ কেন? হেহেহে!",
        "আরেহ কাতুকুতু লাগছে! হেহেহে!",
        "হেহেহে! থামো থামো, কাতুকুতু লাগে তো!"
      ];
      const tickleThoughtsEn = [
        "Hehehe! That tickles!",
        "Stop tickling me, hehe!",
        "Hehe, so ticklish!",
        "Hehehe! Tickle attack!"
      ];
      const randomBn = tickleThoughtsBn[Math.floor(Math.random() * tickleThoughtsBn.length)];
      const randomEn = tickleThoughtsEn[Math.floor(Math.random() * tickleThoughtsEn.length)];
      setCustomThought(isBn ? randomBn : randomEn);

      if (gigleTimeoutRef.current) clearTimeout(gigleTimeoutRef.current);
      gigleTimeoutRef.current = setTimeout(() => {
        setIsGiggling(false);
        setCustomThought(null);
        setMood("idle");
      }, 2800);
    } else {
      // 2. Mouse Cursor Click: Enjoying / Happy laughing reaction
      setIsEnjoying(true);
      setIsGiggling(false);
      setMood("happy");

      const happyThoughtsBn = [
        "আরেহ! তুমি ক্লিক করলে? আমার খুব আনন্দ হচ্ছে!",
        "হেহে! তোমার সাথে সময় কাটাতে আমার খুব ভালো লাগছে!",
        "দারুণ! বলো বন্ধু, আজ আমরা কী নিয়ে কাজ করব?",
        "তোমার সাথে কথা বলতে সবসময় আমার ভালো লাগে!"
      ];
      const happyThoughtsEn = [
        "Yay! You clicked me! So happy to be here!",
        "Hehe! I love spending time with you!",
        "Awesome! What exciting thing shall we do today?",
        "Always delightful having you around!"
      ];
      const randomBn = happyThoughtsBn[Math.floor(Math.random() * happyThoughtsBn.length)];
      const randomEn = happyThoughtsEn[Math.floor(Math.random() * happyThoughtsEn.length)];
      setCustomThought(isBn ? randomBn : randomEn);

      if (gigleTimeoutRef.current) clearTimeout(gigleTimeoutRef.current);
      gigleTimeoutRef.current = setTimeout(() => {
        setIsEnjoying(false);
        setCustomThought(null);
        setMood("idle");
      }, 3000);
    }
  }, [isBn, isGuestLimit, isLimitExhausted, mood]);

  // Set manual mood (e.g. from preview selector)
  const setManualMood = useCallback((newMood: OrbMood, durationMs = 5000) => {
    setMood(newMood);
    if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);

    // If the mood is "sleepy", stay asleep until user interacts, types, or taps
    if (newMood === "sleepy") {
      setCustomThought(
        isBn
          ? "হুউম... একটু ঘুমিয়ে নিচ্ছি। ট্যাপ করলে বা নতুন কাজ দিলে ডেকে দিও।"
          : "Huum... taking a nap. Wake me up with your next task or a tap."
      );
      return;
    }

    if (newMood === "playful") {
      setCustomThought(
        isBn
          ? "হেহে! চোখ টিপে দিলাম! চলো দারুণ কিছু করি!"
          : "Hehe! Wink wink! Let's do something fun!"
      );
    } else if (newMood === "caring") {
      setCustomThought(
        isBn
          ? "আমি সবসময় তোমার পাশে আছি। যেকোনো প্রয়োজনে আমাকে বলো।"
          : "I'm always here for you. Tell me whenever you need help."
      );
    } else if (newMood === "proud") {
      setCustomThought(
        isBn
          ? "ওয়াও! তোমার অগ্রগতি সত্যিই দারুণ! গর্ব হচ্ছে।"
          : "Wow! Your progress is amazing! Super proud of you."
      );
    } else if (newMood === "sad") {
      setCustomThought(
        isBn
          ? "Failed to send, please try again."
          : "Failed to send, please try again."
      );
    } else {
      setCustomThought(null);
    }

    moodTimeoutRef.current = setTimeout(() => {
      setMood("idle");
      setCustomThought(null);
    }, durationMs);
  }, [isBn]);

  // Reset inactivity timer when user types or interacts
  const resetInactivityTimer = useCallback(() => {
    lastInteractionRef.current = Date.now();
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      // 50 seconds of inactivity -> Orb gets sleepy
      setMood((current) => {
        if (current === "idle") {
          return "sleepy";
        }
        return current;
      });
    }, 50000);
  }, []);

  useEffect(() => {
    if (userInput) {
      if (isGuestLimit || isLimitExhausted) {
        return;
      }
      setMood((current) => {
        if (current === "sleepy") {
          setCustomThought(null);
          return "idle";
        }
        return current;
      });
      resetInactivityTimer();
    }
  }, [userInput, isGuestLimit, isLimitExhausted, resetInactivityTimer]);

  // Initial check: if user returned after more than 2 days away -> "sulky" (অভিমানী)
  useEffect(() => {
    try {
      const lastVisitKey = "focusforge_last_orb_visit";
      const now = Date.now();
      const lastVisitRaw = localStorage.getItem(lastVisitKey);
      if (lastVisitRaw) {
        const lastVisit = parseInt(lastVisitRaw, 10);
        const daysDiff = (now - lastVisit) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 2.5) {
          setMood("sulky");
          setCustomThought(
            isBn
              ? "অনেকদিন পর আসলে! ভেবেছিলাম ভুলে গেছো..."
              : "You've been gone so long! Thought you forgot me..."
          );
          if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
          moodTimeoutRef.current = setTimeout(() => {
            setMood("idle");
            setCustomThought(null);
          }, 8000);
        }
      }
      localStorage.setItem(lastVisitKey, String(now));
    } catch {}
  }, [isBn]);

  // Analyze AppState events: recent completed tasks, streaks, postponed tasks
  useEffect(() => {
    if (!appState) return;

    // Check if user has an active streak >= 2 or high productivity score
    const hasCompletedTasks = appState.tasks?.some((t) => t.status === "completed");

    // Check if user has overdue tasks repeatedly delayed
    const today = new Date().toISOString().split("T")[0];
    const overdueDelayedCount = appState.tasks?.filter(
      (t) => t.status !== "completed" && t.targetDate && t.targetDate < today
    ).length || 0;

    if (overdueDelayedCount >= 4 && mood === "idle") {
      setMood("angry");
      setCustomThought(
        isBn
          ? "আবার কাজ জমিয়ে রাখছো? এবার শেষ করতেই হবে কিন্তু!"
          : "Delaying tasks again? Time to get them done!"
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 7000);
    }
  }, [appState, isBn, mood]);

  // Handle AI Thinking & Typing lifecycle
  useEffect(() => {
    if (isGiggling) return;

    if (isThinking) {
      setMood("thinking");
      setCustomThought(null);
    } else if (isTyping) {
      setMood("typing");
      setCustomThought(null);
    } else if (mood === "thinking" || mood === "typing") {
      setMood("idle");
      setCustomThought(null);
    }
  }, [isThinking, isTyping, isGiggling, mood]);

  // React to User Messages and AI Messages sentiment and keywords
  useEffect(() => {
    if (isThinking || isGiggling) return;

    // Check recent AI Message for question inquiry mode or accomplishment
    if (lastAiMessage && !isTyping) {
      const aiLower = lastAiMessage.toLowerCase();
      const isAccomplished = aiLower.includes("যুক্ত হয়েছে") || aiLower.includes("সংরক্ষণ করা হয়েছে") || aiLower.includes("প্রস্তুত করা হয়েছে") || aiLower.includes("has been added") || aiLower.includes("has been saved") || aiLower.includes("configured");
      const isDiagnosticQuestions = (lastAiMessage.includes("১.") || lastAiMessage.includes("1.")) && (lastAiMessage.includes("?") || lastAiMessage.includes("জানান") || lastAiMessage.includes("বলুন") || lastAiMessage.includes("let me know"));

      if (isAccomplished) {
        setMood("proud");
        setCustomThought(
          isBn
            ? "সব প্রস্তুত করে দিয়েছি! বাটনে চাপ দিয়ে দেখে নাও।"
            : "All ready for you! Click the button to explore."
        );
        if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
        moodTimeoutRef.current = setTimeout(() => {
          setMood("idle");
          setCustomThought(null);
        }, 7000);
        return;
      } else if (isDiagnosticQuestions) {
        setMood("curious");
        setCustomThought(
          isBn
            ? "মনোযোগ দিয়ে শুনছি, উত্তরগুলো বলো!"
            : "Listening closely, let me know your answers!"
        );
        if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
        moodTimeoutRef.current = setTimeout(() => {
          setMood("idle");
          setCustomThought(null);
        }, 8000);
        return;
      }
    }

    if (!lastUserMessage) return;

    const lower = lastUserMessage.toLowerCase();

    // 1. Caring: Problem, sad, struggling, can't do it, diary
    const problemRegex = /(সমস্যা|পারছি না|কঠিন|মন খারাপ|হতাশ|ব্যর্থ|কান্না|পারব না|সহায়তা|সাহায্য|উদ্বেগ|ডায়েরি|অনুভূতি|problem|hard|stuck|cannot|can't|sad|unhappy|depressed|struggling|help me|tough|diary|feelings)/i;
    // 2. Focused / Study / Skill: Focus, deep work, routine, skills
    const focusRegex = /(ফোকাস|পড়াশোনা|কাজ|টার্গেট|প্ল্যান|শিডিউল|পড়ব|স্কিল|শিখব|পাইথন|কোডিং|focus|study|routine|plan|schedule|goal|work|deep work|skill|learn|python|coding)/i;
    // 3. Proud: Streak, achievement, won, completed
    const proudRegex = /(streak|স্ট্রিক|জিতলাম|সফল|অর্জন|won|achievement|passed|record|বড় অর্জন)/i;
    // 4. Creative / Idea: Idea, concept, new thought
    const ideaRegex = /(আইডিয়া|idea|ভাবনা|চিন্তা|concept|brainstorm|app|প্রজেক্ট)/i;
    // 5. Curious: Questions ending with ? or question words
    const curiousRegex = /(\?|কেন|কীভাবে|কী|কি|কার|কখন|কোথায়|what|why|how|where|when|who)/i;

    if (problemRegex.test(lower)) {
      setMood("caring");
      setCustomThought(
        isBn
          ? "মন খারাপ করো না, আমি পাশে আছি। একসাথে সমাধান করব।"
          : "Don't worry, I'm right here with you. We'll solve this together."
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 7000);
    } else if (proudRegex.test(lower)) {
      setMood("proud");
      setCustomThought(
        isBn
          ? "অসাধারণ অর্জন! তোমার জন্য সত্যিই গর্বিত।"
          : "Super proud of your achievement!"
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 6000);
    } else if (ideaRegex.test(lower)) {
      setMood("playful");
      setCustomThought(
        isBn
          ? "দারুণ আইডিয়া! চলো এটা নিয়ে ভাবি।"
          : "Fascinating idea! Let's build on it."
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 6000);
    } else if (focusRegex.test(lower)) {
      setMood("happy");
      setCustomThought(
        isBn
          ? "চমৎকার! চলো সম্পূর্ণ ফোকাস দিয়ে কাজ শুরু করি।"
          : "Awesome! Let's get into the productive zone."
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 5000);
    } else if (curiousRegex.test(lower)) {
      setMood("curious");
      setCustomThought(
        isBn
          ? "চমৎকার প্রশ্ন! চলো জেনে নেই।"
          : "Good question! Let's break it down."
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 5000);
    }
  }, [lastUserMessage, lastAiMessage, isThinking, isTyping, isGiggling, isBn]);

  // React to failed message / errors -> sad mood
  useEffect(() => {
    if (hasFailedMessage || error) {
      setMood("sad");
      setCustomThought(
        isBn ? "Failed to send, please try again." : "Failed to send, please try again."
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 10000);
      return;
    }

    if (!lastAiMessage || isThinking || isTyping) return;
    const lower = lastAiMessage.toLowerCase();
    const isFailed = lower.includes("failed to send") || lower.includes("ফেইল্ড টু সেন্ড") || lower.includes("ব্যস্ত ছিল");
    if (isFailed) {
      setMood("sad");
      setCustomThought(
        isBn ? "Failed to send, please try again." : "Failed to send, please try again."
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 10000);
    }
  }, [hasFailedMessage, error, lastAiMessage, isThinking, isTyping, isBn]);

  // Thought text to display in the head floating cloud
  const thoughtText = customThought || (
    mood === "idle"
      ? greetingText
      : mood === "thinking"
      ? (isBn ? "একটু ভেবে দেখি..." : "Let me think...")
      : mood === "processing"
      ? (isBn ? "কাজ গুছিয়ে নিচ্ছি..." : "Processing your plan...")
      : mood === "typing"
      ? (isBn ? "তোমার জন্য উত্তর প্রস্তুত করছি..." : "Almost done writing...")
      : mood === "sad"
      ? (isBn ? "Failed to send, please try again." : "Failed to send, please try again.")
      : mood === "happy"
      ? (isBn ? "দারুণ ব্যাপার! এভাবে এগিয়ে যাও।" : "That's awesome! Keep going.")
      : mood === "proud"
      ? (isBn ? "অসাধারণ অর্জন! তোমার জন্য সত্যিই গর্বিত।" : "Super proud of you.")
      : mood === "sulky"
      ? (isBn ? "অনেকদিন পর আসলে! ভেবেছিলাম ভুলে গেছো।" : "You've been gone so long...")
      : mood === "angry"
      ? (isBn ? "আবার পেছাচ্ছো? এবার শেষ করতেই হবে কিন্তু!" : "No more delaying! Let's finish it!")
      : mood === "sleepy"
      ? (isGuestLimit
          ? (isBn ? "আমি তোমাকে সাহায্য করতে চাই! কিন্তু তোমার গেস্ট লিমিট শেষ। একটু লগইন করে নাও, ততক্ষণ আমি একটু ঘুমিয়ে নিই..." : "I'd love to help, but your guest limit ended. Please log in, until then I'll nap...")
          : isLimitExhausted
          ? (isBn ? "আজকের জন্য তোমার লিমিট শেষ! লিমিট রিসেট হলে আমি আবার জেগে উঠব। ততক্ষণ আমি একটু ঘুমিয়ে নিই..." : "Today's limit has ended! I'll wake up once reset. Until then I'll nap...")
          : (isBn ? "হুউম... আমি কিন্তু জেগে আছি! কিছু জিজ্ঞাসা করবে?" : "Still here... just sleepy! Ask me anything."))
      : mood === "caring"
      ? (isBn ? "মন খারাপ করো না, আমি পাশে আছি। একসাথে সমাধান করব।" : "I'm right here with you. We'll solve this.")
      : mood === "curious"
      ? (isBn ? "চমৎকার প্রশ্ন!" : "Good question!")
      : mood === "playful"
      ? (isBn ? "হেহে, সুড়সুড়ি লাগছে!" : "Hehe, that tickles!")
      : (isBn ? "সম্পূর্ণ ফোকাস লক্ষ্যের দিকে!" : "Laser focused on your goal!")
  );

  return {
    mood,
    thoughtText,
    isGiggling,
    isEnjoying,
    triggerGiggle,
    triggerInteract: triggerGiggle,
    setManualMood,
    resetInactivityTimer
  };
}
