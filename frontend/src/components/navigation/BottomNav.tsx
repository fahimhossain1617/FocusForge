"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import {
  Home as HomeIcon,
  Target as FocusIcon,
  Plus,
  Bot as BotIcon,
  CalendarDays as PlannerIcon,
  Files,
  PencilLine,
  GraduationCap,
} from "lucide-react";

export default function BottomNav() {
  const { state, navigateTo } = useAppContext();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [justSelectedTab, setJustSelectedTab] = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const activePage = state.activePage || "today";
  const isLight = state.theme?.mode === "light";
  const isBn = state.lang === "bn";

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        isActionsOpen &&
        actionsRef.current &&
        !actionsRef.current.contains(target) &&
        navRef.current &&
        !navRef.current.contains(target)
      ) {
        setIsActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isActionsOpen]);

  // Close menus on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isActionsOpen) setIsActionsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActionsOpen]);

  const handleNav = (pageId: string) => {
    if (pageId !== activePage) {
      setJustSelectedTab(pageId);
    }
    navigateTo(pageId);
    setIsActionsOpen(false);
  };

  const toggleActions = () => {
    setIsActionsOpen((prev) => !prev);
  };

  // Secondary features in (+) Action popup (AI Agent moved to bottom bar)
  const secondaryFeatures = [
    {
      id: "tasks",
      label: isBn ? "নোটস ও ফাইল" : "Notes & files",
      icon: Files,
    },
    {
      id: "mind",
      label: isBn ? "ক্যাপচার" : "Capture",
      icon: PencilLine,
    },
    {
      id: "learning",
      label: isBn ? "স্কিল বিল্ডার" : "Skill builder",
      icon: GraduationCap,
    },
  ];

  return (
    <>
      {/* ============================================================ */}
      {/* BACKDROP OVERLAY WHEN EXPANDED MENU IS OPEN                  */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isActionsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setIsActionsOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* SECONDARY FEATURES EXPANDED ACTION MENU                      */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isActionsOpen && (
          <motion.div
            ref={actionsRef}
            initial={{ opacity: 0, scale: 0.3, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.3, y: 12 }}
            transition={{
              duration: isActionsOpen ? 0.22 : 0.18,
              ease: isActionsOpen ? [0.16, 1, 0.3, 1] : [0.4, 0, 1, 1],
            }}
            style={{ transformOrigin: "bottom center" }}
            className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-[300px] rounded-3xl p-3 border shadow-2xl md:hidden ${
              isLight
                ? "bg-white border-[#DCE5F0] shadow-[0_20px_45px_rgba(34,58,94,0.18)]"
                : "bg-[#0B101E] border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
            }`}
            role="dialog"
            aria-label="Secondary Features Navigation"
          >
            {/* 3-Column Grid of Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              {secondaryFeatures.map((feature) => {
                const Icon = feature.icon;
                const isItemActive = activePage === feature.id;

                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => handleNav(feature.id)}
                    className="flex flex-col items-center justify-center p-1.5 rounded-2xl transition-transform active:scale-92 cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={feature.label}
                  >
                    {/* Monochromatic Normal Icon Container */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-xs group-hover:scale-105 group-active:scale-95 ${
                        isItemActive
                          ? isLight
                            ? "bg-[#5B8DEF]/15 border border-[#5B8DEF]/30 text-[#223A5E] shadow-sm"
                            : "bg-blue-600/20 border border-blue-500/40 text-blue-300 shadow-sm"
                          : isLight
                          ? "bg-[#EDF2F9] border border-[#DCE5F0] text-slate-600 group-hover:bg-[#E2EAF5] group-hover:text-slate-900"
                          : "bg-[#131B2E] border border-white/[0.08] text-slate-300 group-hover:bg-[#1A253E] group-hover:text-white"
                      }`}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </div>

                    {/* Single-line Name text below icon */}
                    <span
                      className={`text-[10.5px] font-medium leading-tight text-center truncate w-full mt-1.5 tracking-tight ${
                        isItemActive
                          ? isLight
                            ? "text-[#223A5E] font-bold"
                            : "text-blue-300 font-bold"
                          : isLight
                          ? "text-slate-600 group-hover:text-slate-900"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      {feature.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* FULL EDGE-TO-EDGE MOBILE ANIMATED BOTTOM NAVIGATION BAR       */}
      {/* ============================================================ */}
      <nav
        ref={navRef}
        aria-label="Mobile Bottom Navigation"
        className={`fixed bottom-0 left-0 w-full z-50 border-t backdrop-blur-xl select-none md:hidden transition-colors ${
          isLight
            ? "bg-white/95 border-[#DCE5F0] text-slate-700 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
            : "bg-[#0A0E1A]/95 border-white/[0.08] text-slate-200 shadow-[0_-8px_24px_rgba(0,0,0,0.45)]"
        }`}
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <LayoutGroup id="bottom-nav-sliding-group">
          <div className="relative flex items-center justify-around h-16 max-w-lg mx-auto px-2">
            {/* 1. HOME TAB */}
            <NavTabButton
              id="today"
              label={isBn ? "হোম" : "Home"}
              icon={HomeIcon}
              isActive={activePage === "today"}
              isJustSelected={justSelectedTab === "today"}
              onAnimationDone={() => setJustSelectedTab(null)}
              isLight={isLight}
              onClick={() => handleNav("today")}
            />

            {/* 2. FOCUS TAB */}
            <NavTabButton
              id="focus"
              label={isBn ? "ফোকাস" : "Focus"}
              icon={FocusIcon}
              isActive={activePage === "focus"}
              isJustSelected={justSelectedTab === "focus"}
              onAnimationDone={() => setJustSelectedTab(null)}
              isLight={isLight}
              onClick={() => handleNav("focus")}
            />

            {/* 3. CENTER ACTION (+) BUTTON - In-line with other icons & sleek dark tone */}
            <div className="relative flex items-center justify-center flex-1 h-full">
              <button
                type="button"
                onClick={toggleActions}
                aria-expanded={isActionsOpen}
                aria-label={isActionsOpen ? "Close extra navigation features" : "Open extra navigation features"}
                className={`relative flex items-center justify-center w-11 h-11 rounded-full cursor-pointer shadow-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border active:scale-92 transition-all ${
                  isActionsOpen
                    ? isLight
                      ? "bg-[#1E293B] text-white border-[#334155] shadow-sm"
                      : "bg-[#1A253E] text-white border-white/20 shadow-sm"
                    : isLight
                    ? "bg-[#0F172A] text-white border-[#1E293B] hover:bg-[#1E293B]"
                    : "bg-[#131B2E] text-white border-white/10 hover:bg-[#1A253E]"
                }`}
              >
                <motion.div
                  animate={{ rotate: isActionsOpen ? 45 : 0 }}
                  transition={{ duration: 0.12, ease: "easeInOut" }}
                  className="flex items-center justify-center"
                >
                  <Plus size={22} strokeWidth={2.4} />
                </motion.div>
              </button>
            </div>

            {/* 4. AI AGENT TAB (Moved to where Planner was) */}
            <NavTabButton
              id="ai-agent"
              label={isBn ? "AI এজেন্ট" : "AI Agent"}
              icon={BotIcon}
              isActive={activePage === "ai-agent"}
              isJustSelected={justSelectedTab === "ai-agent"}
              onAnimationDone={() => setJustSelectedTab(null)}
              isLight={isLight}
              onClick={() => handleNav("ai-agent")}
            />

            {/* 5. PLANNER TAB (Moved to where Profile was) */}
            <NavTabButton
              id="planner"
              label={isBn ? "প্ল্যানার" : "Planner"}
              icon={PlannerIcon}
              isActive={activePage === "planner"}
              isJustSelected={justSelectedTab === "planner"}
              onAnimationDone={() => setJustSelectedTab(null)}
              isLight={isLight}
              onClick={() => handleNav("planner")}
            />
          </div>
        </LayoutGroup>
      </nav>
    </>
  );
}

interface NavTabButtonProps {
  id: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  isJustSelected: boolean;
  isLight: boolean;
  onAnimationDone: () => void;
  onClick: () => void;
}

function NavTabButton({
  id,
  label,
  icon: Icon,
  isActive,
  isJustSelected,
  isLight,
  onAnimationDone,
  onClick,
}: NavTabButtonProps) {
  return (
    <div className="relative flex-1 flex items-center justify-center h-full">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex flex-col items-center justify-center w-full h-12 py-1 rounded-2xl cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors duration-200 ${
          isActive
            ? isLight
              ? "text-[#223A5E]"
              : "text-blue-400"
            : isLight
            ? "text-slate-500 hover:text-slate-800"
            : "text-slate-400 hover:text-white"
        }`}
      >
        {/* Sliding Pill Indicator (Selection Highlight) */}
        {isActive && (
          <motion.div
            layoutId="mobile-nav-sliding-pill"
            className={`absolute inset-1 rounded-2xl ${
              isLight
                ? "bg-[#5B8DEF]/12 border border-[#5B8DEF]/20"
                : "bg-[#3B82F6]/15 border border-[#3B82F6]/25"
            }`}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 32,
            }}
          />
        )}

        {/* Icon with Selection Tilt/Wiggle Animation */}
        <motion.div
          animate={
            isJustSelected
              ? { rotate: [0, -14, 7, 0] }
              : { rotate: 0 }
          }
          transition={{ duration: 0.32, ease: "easeInOut" }}
          onAnimationComplete={() => {
            if (isJustSelected) onAnimationDone();
          }}
          className={`relative z-10 flex items-center justify-center transition-colors duration-250 ${
            isActive
              ? isLight
                ? "text-[#223A5E]"
                : "text-blue-400"
              : isLight
              ? "text-slate-500"
              : "text-slate-400"
          }`}
        >
          <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
        </motion.div>

        {/* Tab Label */}
        <span
          className={`relative z-10 text-[10px] font-medium mt-0.5 transition-colors duration-250 leading-none ${
            isActive
              ? isLight
                ? "text-[#223A5E] font-bold"
                : "text-blue-300 font-bold"
              : isLight
              ? "text-slate-500"
              : "text-slate-400"
          }`}
        >
          {label}
        </span>
      </button>
    </div>
  );
}
