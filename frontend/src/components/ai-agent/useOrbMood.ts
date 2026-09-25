"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AppState } from "@/types";

export type OrbMood =
  | "idle"
  | "attentive"
  | "thinking"
  | "processing"
  | "typing"
  | "happy"
  | "excited"
  | "concerned"
  | "proud"
  | "sulky"
  | "angry"
  | "sad"
  | "sleepy"
  | "caring"
  | "curious"
  | "focused"
  | "playful"
  | "celebrating"
  | "supportive"
  | "offline"
  | "usage_limit"
  | "error";

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
  messagesCount?: number;
  isOnline?: boolean;
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
  messagesCount = 0,
  isOnline = true,
}: UseOrbMoodOptions) {
  const isBn = language === "bn" || (language === "auto" && appState?.lang === "bn") || appState?.lang === "bn";
  const [mood, setMood] = useState<OrbMood>(() => {
    if (!isOnline) return "offline";
    if (isLimitExhausted || isGuestLimit) return "usage_limit";
    return "idle";
  });
  const [isGiggling, setIsGiggling] = useState(false);
  const [isEnjoying, setIsEnjoying] = useState(false);
  const [customThought, setCustomThought] = useState<string | null>(null);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moodTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const giggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedUserMsgRef = useRef<string>("");
  const lastIdleMsgTimeRef = useRef<number>(0);

  // 1. OFFLINE HANDLING: Reliable network connectivity check
  useEffect(() => {
    if (!isOnline) {
      setMood("offline");
      setCustomThought(
        isBn
          ? "মনে হচ্ছে তুমি অফলাইনে আছো। আমি একটু বিশ্রাম নিই, অনলাইন হলে ডেকে দিও!"
          : "Looks like you're offline. I'll rest for a bit. Call me when you're back online!"
      );
    } else if (mood === "offline") {
      setMood("idle");
      setCustomThought(null);
    }
  }, [isOnline, isBn, mood]);

  // 2. USAGE LIMIT HANDLING: Grounded purely in existing token / guest limit state
  useEffect(() => {
    if (isGuestLimit || isLimitExhausted) {
      setMood("usage_limit");
      setCustomThought(
        isBn
          ? "আজকের জন্য AI লিমিট শেষ। আমি একটু বিশ্রাম নিই, পরে আবার কথা হবে!"
          : "Looks like we've reached the AI limit for now. I'll take a little nap. Come back when you're ready!"
      );
    } else if (mood === "usage_limit") {
      setMood("idle");
      setCustomThought(null);
    }
  }, [isGuestLimit, isLimitExhausted, isBn, mood]);

  // 3. THINKING & TYPING LIFECYCLE: One single authoritative communication state
  useEffect(() => {
    if (isGiggling) return;

    if (isThinking) {
      setMood("thinking");
      // During thinking, thoughtText is unified: "AI is thinking..."
      setCustomThought(isBn ? "AI ভাবছে..." : "AI is thinking...");
    } else if (isTyping) {
      setMood("typing");
      // Typing stream renders only in the chat transcript, not duplicating in ORB bubble
      setCustomThought(null);
    } else if (mood === "thinking" || mood === "typing") {
      setMood("idle");
      setCustomThought(null);
    }
  }, [isThinking, isTyping, isGiggling, isBn, mood]);

  // 4. TRIGGER GIGGLE / TAP INTERACTION
  const triggerGiggle = useCallback((source: "touch" | "mouse" = "touch") => {
    if (!isOnline) {
      setMood("offline");
      setCustomThought(
        isBn
          ? "বর্তমানে কোনো ইন্টারনেট সংযোগ নেই। অনলাইন হলে আবার কথা বলব!"
          : "No internet connection right now. Let's chat once you're back online!"
      );
      return;
    }

    if (isGuestLimit) {
      setMood("usage_limit");
      setCustomThought(
        isBn
          ? "তোমার গেস্ট লিমিট শেষ। একটু লগইন করলে আমি জেগে তোমাকে প্রাণখুলে সাহায্য করব!"
          : "Guest limit reached. Log in and I'll wake right up to help you!"
      );
      if (giggleTimeoutRef.current) clearTimeout(giggleTimeoutRef.current);
      giggleTimeoutRef.current = setTimeout(() => setCustomThought(null), 4500);
      return;
    }

    if (isLimitExhausted) {
      setMood("usage_limit");
      setCustomThought(
        isBn
          ? "আজকের লিমিট শেষ। লিমিট রিসেট হলে আমি আবার জেগে তোমাকে সাহায্য করব!"
          : "Today's limit has ended. Once reset, I'll wake right up to help you!"
      );
      if (giggleTimeoutRef.current) clearTimeout(giggleTimeoutRef.current);
      giggleTimeoutRef.current = setTimeout(() => setCustomThought(null), 4500);
      return;
    }

    // Wake up from sleep
    if (mood === "sleepy") {
      setMood("happy");
      setIsEnjoying(true);
      setCustomThought(
        isBn
          ? "আহহ... ঘুম ভেঙে গেলো! বলো বন্ধু, কি সাহায্য করতে পারি?"
          : "Ah... I'm awake now! How can I help you today?"
      );
      if (giggleTimeoutRef.current) clearTimeout(giggleTimeoutRef.current);
      giggleTimeoutRef.current = setTimeout(() => {
        setIsEnjoying(false);
        setMood("idle");
        setCustomThought(null);
      }, 3500);
      return;
    }

    if (source === "touch") {
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

      if (giggleTimeoutRef.current) clearTimeout(giggleTimeoutRef.current);
      giggleTimeoutRef.current = setTimeout(() => {
        setIsGiggling(false);
        setCustomThought(null);
        setMood("idle");
      }, 2600);
    } else {
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

      if (giggleTimeoutRef.current) clearTimeout(giggleTimeoutRef.current);
      giggleTimeoutRef.current = setTimeout(() => {
        setIsEnjoying(false);
        setCustomThought(null);
        setMood("idle");
      }, 2800);
    }
  }, [isBn, isGuestLimit, isLimitExhausted, isOnline, mood]);

  // 5. MANUAL MOOD SELECTION
  const setManualMood = useCallback((newMood: OrbMood | null, durationMs = 5000) => {
    if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);

    if (newMood === null) {
      setMood("idle");
      setCustomThought(null);
      return;
    }

    setMood(newMood);

    if (newMood === "sleepy") {
      setCustomThought(
        isBn
          ? "হুউম... একটু ঘুমিয়ে নিচ্ছি। ট্যাপ করলে বা নতুন কাজ দিলে ডেকে দিও।"
          : "Huum... taking a nap. Wake me up with your next task or a tap."
      );
      return;
    }

    if (newMood === "playful") {
      setCustomThought(isBn ? "হেহে! চোখ টিপে দিলাম! চলো দারুণ কিছু করি!" : "Hehe! Wink wink! Let's do something fun!");
    } else if (newMood === "caring" || newMood === "supportive") {
      setCustomThought(isBn ? "আমি সবসময় তোমার পাশে আছি। যেকোনো প্রয়োজনে আমাকে বলো।" : "I'm always here for you. Tell me whenever you need help.");
    } else if (newMood === "proud" || newMood === "celebrating") {
      setCustomThought(isBn ? "ওয়াও! তোমার অগ্রগতি সত্যিই দারুণ! গর্ব হচ্ছে।" : "Wow! Your progress is amazing! Super proud of you.");
    } else if (newMood === "focused") {
      setCustomThought(isBn ? "চলো সম্পূর্ণ ফোকাস দিয়ে কাজ শুরু করি!" : "Laser focused on your goals!");
    } else {
      setCustomThought(null);
    }

    moodTimeoutRef.current = setTimeout(() => {
      setMood("idle");
      setCustomThought(null);
    }, durationMs);
  }, [isBn]);

  // 6. INACTIVITY & NATURAL SLEEP BEHAVIOR
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    inactivityTimerRef.current = setTimeout(() => {
      // 120 seconds of total inactivity -> gentle sleep
      setMood((current) => {
        if (current === "idle" || current === "attentive") {
          setCustomThought(
            isBn
              ? "একটু বিশ্রাম নিচ্ছো মনে হয়। আমিও একটু ঘুমিয়ে নিই। ডাকলেই চলে আসব!"
              : "Looks like you're taking a break. I'll get some rest too. Wake me up whenever you need me!"
          );
          return "sleepy";
        }
        return current;
      });
    }, 120000);
  }, [isBn]);

  // User typing resets inactivity and wakes up from sleep
  useEffect(() => {
    if (userInput) {
      if (isGuestLimit || isLimitExhausted || !isOnline) return;
      setMood((current) => {
        if (current === "sleepy") {
          setCustomThought(null);
          return "attentive";
        }
        return current;
      });
      resetInactivityTimer();
    }
  }, [userInput, isGuestLimit, isLimitExhausted, isOnline, resetInactivityTimer]);

  // 7. OCCASIONAL IDLE BEHAVIOR (Sensible cooldown, deduplicated, only when quiet)
  useEffect(() => {
    if (messagesCount > 0 || isThinking || isTyping || !isOnline || isLimitExhausted || isGuestLimit) {
      return;
    }

    const idleTimer = setTimeout(() => {
      const now = Date.now();
      // Only show idle ping after 45s and at least 3 minutes between idle messages
      if (now - lastIdleMsgTimeRef.current > 180000 && mood === "idle" && !customThought) {
        lastIdleMsgTimeRef.current = now;
        const idlePromptsBn = [
          "কাজের ফাঁকে একটু বিশ্রাম নিচ্ছো? আমি এখানেই আছি কিন্তু!",
          "তোমার সাথে যেকোনো পরিকল্পনা করতে আমি প্রস্তুত।"
        ];
        const idlePromptsEn = [
          "Taking a little break? I'll be right here when you're ready.",
          "I'm right here if you need to organize or brainstorm anything."
        ];
        const prompt = isBn
          ? idlePromptsBn[Math.floor(Math.random() * idlePromptsBn.length)]
          : idlePromptsEn[Math.floor(Math.random() * idlePromptsEn.length)];
        
        setCustomThought(prompt);
        if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
        moodTimeoutRef.current = setTimeout(() => {
          setCustomThought(null);
        }, 6000);
      }
    }, 45000);

    return () => clearTimeout(idleTimer);
  }, [messagesCount, isThinking, isTyping, isOnline, isLimitExhausted, isGuestLimit, mood, customThought, isBn]);

  // 8. ERROR REACTION
  useEffect(() => {
    if (hasFailedMessage || error) {
      setMood("error");
      setCustomThought(
        isBn ? "বার্তা পাঠানো সম্ভব হয়নি। পুনরায় চেষ্টা করো।" : "Failed to send, please try again."
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 7000);
    }
  }, [hasFailedMessage, error, isBn]);

  // 9. CONTEXTUAL REACTION TO USER MESSAGE (Priority 3)
  useEffect(() => {
    if (!lastUserMessage || isThinking || isTyping || isGiggling) return;
    if (lastUserMessage === lastProcessedUserMsgRef.current) return;
    lastProcessedUserMsgRef.current = lastUserMessage;

    const lower = lastUserMessage.toLowerCase();

    // A. Problem / Stressed / Bad day
    const problemRegex = /(সমস্যা|পারছি না|কঠিন|মন খারাপ|হতাশ|ব্যর্থ|কান্না|পারব না|উদ্বেগ|স্ট্রেস|খারাপ দিন|মুড অফ|problem|hard|stuck|cannot|can't|sad|unhappy|depressed|struggling|stress|stressed|bad day|difficult|tough)/i;
    // B. Idea / Discovery
    const ideaRegex = /(আইডিয়া|idea|ভাবনা|চিন্তা|concept|brainstorm|নতুন কিছু|বের করেছি|figured out|guess what|new thought)/i;
    // C. Task / Planner / Routine Help
    const taskRegex = /(টাস্ক|প্ল্যানার|রুটিন|শিডিউল|গুছিয়ে|লিস্ট|organize|task|planner|schedule|routine|plan|help me|explain|checklist)/i;
    // D. Focus Session / Motivation
    const focusRegex = /(ফোকাস|focus|deep work|মনোযোগ|পড়ব|স্টাডি)/i;
    // E. Success / Achievement
    const successRegex = /(শেষ করেছি|হয়ে গেছে|জিতলাম|সফল|অর্জন|finished|done|completed|won|achievement|did it|finished my task)/i;
    // F. Frustrated / Annoyed
    const frustratedRegex = /(বিরক্ত|রাগ|হচ্ছে না|ধুর|frustrated|annoyed|disappointed|angry)/i;

    if (problemRegex.test(lower)) {
      setMood("concerned");
      setCustomThought(
        isBn
          ? "মন খারাপ করো না, আমি পাশে আছি। কী হয়েছে আমাকে বলো।"
          : "Oh no, what happened? I'm here with you. Tell me what's going on."
      );
    } else if (ideaRegex.test(lower)) {
      setMood("excited");
      setCustomThought(
        isBn ? "বাহ, দারুণ আইডিয়া! বলো তো, আমি শুনছি!" : "Ooh, tell me! I'm listening!"
      );
    } else if (taskRegex.test(lower)) {
      setMood("attentive");
      setCustomThought(
        isBn ? "ঠিক আছে, চলো শুরু করি!" : "Okay, let's do it!"
      );
    } else if (focusRegex.test(lower)) {
      setMood("focused");
      setCustomThought(
        isBn ? "চলো শুরু করি! আমি তোমার পাশে আছি।" : "Let's do this! I'll be cheering you on."
      );
    } else if (successRegex.test(lower)) {
      setMood("celebrating");
      setCustomThought(
        isBn ? "অসাধারণ! তুমি পেরেছ!" : "That's awesome! You did it!"
      );
    } else if (frustratedRegex.test(lower)) {
      setMood("supportive");
      setCustomThought(
        isBn ? "চিন্তা করো না, একটু শান্ত হও। একসাথে সমাধান বের করব।" : "I understand, take your time. We'll work through it together."
      );
    }

    if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
    moodTimeoutRef.current = setTimeout(() => {
      setMood("idle");
      setCustomThought(null);
    }, 6000);
  }, [lastUserMessage, isThinking, isTyping, isGiggling, isBn]);

  // 10. REACTION TO AI ACTION / PAYLOAD CONFIRMATION
  useEffect(() => {
    if (!lastAiMessage || isThinking || isTyping) return;
    const lower = lastAiMessage.toLowerCase();
    const isAccomplished =
      lower.includes("যুক্ত হয়েছে") ||
      lower.includes("সংরক্ষণ করা হয়েছে") ||
      lower.includes("প্রস্তুত করা হয়েছে") ||
      lower.includes("has been added") ||
      lower.includes("has been saved") ||
      lower.includes("ready");

    if (isAccomplished) {
      setMood("proud");
      setCustomThought(
        isBn
          ? "সব প্রস্তুত করে দিয়েছি! বাটনে চাপ দিয়ে দেখে নাও।"
          : "All set for you! Check the proposal below."
      );
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = setTimeout(() => {
        setMood("idle");
        setCustomThought(null);
      }, 5500);
    }
  }, [lastAiMessage, isThinking, isTyping, isBn]);

  // 11. UNIFIED SINGLE THOUGHT TEXT COMPUTATION
  // STRICT RULE: During active conversation (messagesCount > 0), suppress unsolicited greetings!
  const thoughtText = customThought || (
    messagesCount === 0 && !userInput && !isThinking && !isTyping && isOnline && !isLimitExhausted && !isGuestLimit
      ? (mood === "idle" ? greetingText : null)
      : null
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

export default useOrbMood;
