"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import NotificationCenter from "./NotificationCenter";
import {
  Bell,
  MoreVertical,
  User as ProfileIcon,
  Settings as SettingsIcon,
  LogIn,
  LogOut,
  ChevronRight,
} from "lucide-react";

export default function MobileHeader() {
  const { state, navigateTo } = useAppContext();
  const { user, isGuest, openAuth, promptLogout } = useAuth();
  const { t } = useTranslation();
  const { hasUnread, unreadCount } = useNotificationCenter();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const isLight = state.theme?.mode === "light";
  const logoSrc = isLight ? "/logo-light.png" : "/icons/icon-192x192.png";
  const isBn = state.lang === "bn";
  const isGuestMode = !user || isGuest;
  const activePage = state.activePage || "today";

  // Display user name
  const rawUserName =
    user?.fullName ||
    user?.displayName?.replace(/^\+8800/, "+880").replace(/^8800/, "+880") ||
    (user?.identifier
      ? user.identifier.replace(/^\+8800/, "+880").replace(/^8800/, "+880")
      : isBn
      ? "গেস্ট"
      : "Guest");
  const userName = isGuestMode ? (isBn ? "গেস্ট ইউজার" : "Guest User") : rawUserName.trim();
  const userSubtitle = isGuestMode
    ? (isBn ? "লগইন করুন" : "Sign in")
    : (user?.identifier || (isBn ? "প্রো মেম্বার" : "Pro Member"));

  // Close 3-dots menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsNotifOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNav = (pageId: string) => {
    navigateTo(pageId);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* ============================================================ */}
      {/* COMPACT / MOBILE HEADER BAR                                  */}
      {/* ============================================================ */}
      <header
        className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-xl transition-colors shrink-0 select-none"
        style={{
          backgroundColor: isLight ? "rgba(243, 247, 252, 0.94)" : "rgba(10, 14, 26, 0.85)",
          borderColor: isLight ? "#DCE5F0" : "var(--color-border-subtle)",
        }}
      >
        {/* Unified Brand Unit: [ App Icon ] [ FocusForge ] */}
        <button
          type="button"
          onClick={() => navigateTo("today")}
          className="flex items-center gap-2.5 cursor-pointer rounded-xl p-1 -ml-1 transition-transform active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] border-none text-left"
          aria-label="FocusForge Home"
          title="FocusForge Home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="FocusForge Logo"
            className="w-7 h-7 rounded-lg object-contain shadow-xs shrink-0"
          />
          <span className="font-bold text-[17px] tracking-tight text-[#0F172A] dark:text-foreground whitespace-nowrap">
            FocusForge
          </span>
        </button>

        {/* Right Actions: Clean Unboxed Bell + 3-Dots Menu */}
        <div className="flex items-center gap-0.5">
          {/* 1. Normal Clean Bell Icon (No box/border around it) */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsNotifOpen((prev) => !prev)}
            }
            className={`relative p-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
              isNotifOpen
                ? isLight
                  ? "text-[#2563EB] bg-blue-50"
                  : "text-blue-400 bg-white/[0.08]"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
            }`}
            aria-label={
              hasUnread
                ? isBn
                  ? `নোটিফিকেশন (${unreadCount}টি নতুন)`
                  : `Notifications (${unreadCount} unread)`
                : isBn
                ? "নোটিফিকেশন"
                : "Notifications"
            }
            title={isBn ? "নোটিফিকেশন" : "Notifications"}
          >
            <Bell size={20} strokeWidth={2.1} className={hasUnread ? "text-[#2563EB] dark:text-blue-400" : ""} />

            {/* Subtle Minimal Unread Indicator Dot */}
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] dark:bg-blue-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB] dark:bg-blue-400 ring-1.5 ring-white dark:ring-[#0A0E1A]" />
              </span>
            )}
          </button>

          {/* 2. 3-Dots More Options Button */}
          <div className="relative">
            <button
              ref={menuBtnRef}
              type="button"
              onClick={() => {
                setIsNotifOpen(false);
                setIsMenuOpen((prev) => !prev);
              }}
              aria-expanded={isMenuOpen}
              aria-label={isBn ? "অতিরিক্ত অপশন" : "More options"}
              className={`p-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                isMenuOpen
                  ? isLight
                    ? "text-[#2563EB] bg-blue-50"
                    : "text-blue-400 bg-white/[0.08]"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <MoreVertical size={20} strokeWidth={2.1} />
            </button>

            {/* 3-Dots Contextual Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  {/* Backdrop (no blur, clean click catcher) */}
                  <div
                    className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
                    onClick={() => setIsMenuOpen(false)}
                    aria-hidden="true"
                  />

                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.92, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{ transformOrigin: "top right" }}
                    className={`absolute top-full right-0 mt-1.5 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-2xl p-2 border shadow-2xl flex flex-col gap-1.5 select-none ${
                      isLight
                        ? "bg-white border-[#DCE5F0] shadow-[0_20px_50px_rgba(34,58,94,0.18)] text-slate-800"
                        : "bg-[#0c1120] border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-foreground"
                    }`}
                    role="menu"
                    aria-label="User Options Menu"
                  >
                    {/* User Identity Card (Solid Opaque) */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                        isLight
                          ? "bg-slate-50 border-slate-200/80"
                          : "bg-[#141B2D] border-white/[0.08]"
                      }`}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        {user?.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={user.avatarUrl}
                            alt={userName}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-[#5B8DEF]/40"
                          />
                        ) : isGuestMode ? (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#E8F1FC] dark:bg-blue-950/60 border border-[#D0E1FD] dark:border-blue-900/40 text-[#0F172A] dark:text-blue-300">
                            <ProfileIcon size={16} strokeWidth={2.2} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#223A5E] text-white font-bold text-xs ring-1 ring-[#5B8DEF]/40 uppercase">
                            {userName ? userName[0].toUpperCase() : <ProfileIcon size={16} strokeWidth={2.2} />}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#2E9B73] ring-1.5 ring-white dark:ring-[#070a14]" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-xs font-bold truncate leading-tight">
                          {userName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-muted-foreground truncate leading-tight mt-0.5">
                          {userSubtitle}
                        </p>
                      </div>
                    </div>

                    {/* Menu Actions */}
                    <div className="flex flex-col gap-0.5">
                      {/* Profile Page */}
                      <button
                        type="button"
                        onClick={() => handleNav("profile")}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                          activePage === "profile"
                            ? isLight
                              ? "bg-blue-50 text-[#223A5E] font-bold"
                              : "bg-blue-950/40 text-blue-300 font-bold"
                            : isLight
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-white/[0.06] text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <ProfileIcon size={15} className="text-[#5B8DEF]" />
                          <span>{t.sidebar.myProfile || (isBn ? "আমার প্রোফাইল" : "Profile")}</span>
                        </div>
                        <ChevronRight size={13} className="opacity-40" />
                      </button>

                      {/* Settings Page */}
                      <button
                        type="button"
                        onClick={() => handleNav("settings")}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                          activePage === "settings"
                            ? isLight
                              ? "bg-blue-50 text-[#223A5E] font-bold"
                              : "bg-blue-950/40 text-blue-300 font-bold"
                            : isLight
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-white/[0.06] text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <SettingsIcon size={15} className="text-slate-400 dark:text-slate-400" />
                          <span>{t.sidebar.settings || (isBn ? "সেটিংস" : "Settings")}</span>
                        </div>
                        <ChevronRight size={13} className="opacity-40" />
                      </button>

                      {/* Contextual Log In / Log Out */}
                      {isGuestMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            openAuth("login");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#5B8DEF] transition-colors text-left cursor-pointer ${
                            isLight ? "hover:bg-blue-50" : "hover:bg-blue-500/10"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <LogIn size={15} className="text-[#5B8DEF]" />
                            <span>{t.auth.logIn || (isBn ? "লগইন করুন" : "Log In")}</span>
                          </div>
                          <ChevronRight size={13} className="opacity-40" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            promptLogout();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 transition-colors text-left cursor-pointer ${
                            isLight ? "hover:bg-rose-50" : "hover:bg-rose-500/10"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <LogOut size={15} className="text-rose-500" />
                            <span>{t.auth.logOut || (isBn ? "লগআউট" : "Log Out")}</span>
                          </div>
                          <ChevronRight size={13} className="opacity-40" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Integrated Notification Center Modal / Panel */}
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
}
