"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { 
  User as UserIcon, ChevronDown, LogOut, ShieldAlert
} from "lucide-react";

interface UserMenuProps {
  variant?: "header" | "sidebar";
}

export default function UserMenu({ variant = "sidebar" }: UserMenuProps) {
  const { 
    user, 
    isGuest, 
    openAuth, 
    promptLogout, 
    logoutConfirmOpen, 
    confirmLogout, 
    cancelLogout 
  } = useAuth();
  const { navigateTo } = useAppContext();
  const { t } = useTranslation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className={`relative ${variant === "sidebar" ? "w-full" : "inline-block text-left"}`} ref={menuRef}>
        {isGuest ? (
          /* GUEST STATE */
          variant === "sidebar" ? (
            /* Sidebar Full-Width Button */
            <button
              type="button"
              onClick={() => openAuth('initial')}
              className="user-menu-guest-btn w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-500/50 group"
            >
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-500/30 transition-colors">
                <UserIcon size={12} />
              </div>
              <span className="tracking-wide" style={{ color: "var(--color-text-primary)" }}>{t.auth.logIn}</span>
            </button>
          ) : (
            /* Header Pill */
            <button
              type="button"
              onClick={() => openAuth('initial')}
              className="user-menu-guest-btn flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.22)] hover:border-blue-500/50"
            >
              <div className="w-5 h-5 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-500">
                <UserIcon size={12} />
              </div>
              <span style={{ color: "var(--color-text-primary)" }}>{t.auth.logIn}</span>
            </button>
          )
        ) : (
          /* AUTHENTICATED STATE */
          variant === "sidebar" ? (
            /* Sidebar Profile Card */
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="user-menu-sidebar-btn w-full flex items-center gap-2.5 p-2 rounded-xl text-left border transition-all duration-200 cursor-pointer shadow-sm hover:border-blue-500/40"
            >
              {user?.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.displayName} 
                  className="w-8 h-8 rounded-full object-cover border border-blue-500/30 shrink-0" 
                />
              ) : (
                <div 
                  className="badge-accent-solid w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm shrink-0"
                  style={{ color: "#FFFFFF" }}
                >
                  {user?.displayName ? user.displayName[0] : "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p 
                  className="text-xs font-semibold truncate leading-tight transition-colors"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {user?.displayName || "FocusForge User"}
                </p>
                <p 
                  className="text-[10px] truncate mt-0.5 transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {user?.identifier}
                </p>
              </div>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-200 shrink-0 ${dropdownOpen ? "rotate-180 text-blue-500" : ""}`} 
                style={{ color: dropdownOpen ? undefined : "var(--color-text-secondary)" }}
              />
            </button>
          ) : (
            /* Header Compact Pill */
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="user-menu-sidebar-btn flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer shadow-sm hover:border-blue-500/40"
            >
              {user?.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.displayName} 
                  className="w-5 h-5 rounded-full object-cover border border-blue-500/30" 
                />
              ) : (
                <div 
                  className="badge-accent-solid w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm"
                  style={{ color: "#FFFFFF" }}
                >
                  {user?.displayName ? user.displayName[0] : "U"}
                </div>
              )}
              <span className="max-w-[110px] truncate font-medium" style={{ color: "var(--color-text-primary)" }}>
                {user?.displayName || user?.identifier}
              </span>
              <ChevronDown 
                size={13} 
                className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180 text-blue-500" : ""}`} 
                style={{ color: dropdownOpen ? undefined : "var(--color-text-secondary)" }}
              />
            </button>
          )
        )}

        {/* Dropdown Menu */}
        {dropdownOpen && !isGuest && (
          <div
            className={`user-menu-dropdown-box absolute rounded-2xl border p-1.5 z-50 animate-fade-in ${
              variant === "sidebar" 
                ? "bottom-full mb-2 left-0 right-0 w-full" 
                : "right-0 mt-2 w-56"
            }`}
          >
            {/* User Info Header */}
            <div className="p-3 border-b mb-1" style={{ borderBottomColor: "var(--color-border-subtle)" }}>
              <p className="text-xs font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {user?.displayName || "FocusForge User"}
              </p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                {user?.identifier}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  navigateTo("profile");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-blue-500/10 transition-colors text-left cursor-pointer"
                style={{ color: "var(--color-text-primary)" }}
              >
                <UserIcon size={14} className="text-blue-500" />
                <span>{t.sidebar.myProfile || t.auth.profile}</span>
              </button>
            </div>

            <div className="h-px my-1.5" style={{ background: "var(--color-border-subtle)" }} />

            {/* Log Out Action */}
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                promptLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
            >
              <LogOut size={14} className="text-red-500" />
              <span>{t.auth.logOut}</span>
            </button>
          </div>
        )}
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div 
            className="user-menu-dropdown-box relative w-full max-w-sm rounded-3xl border p-6 scale-in text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-500">
              <ShieldAlert size={24} />
            </div>

            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
              {t.auth.logOutConfirmTitle}
            </h3>
            <p className="text-xs leading-relaxed mb-6" style={{ color: "var(--color-text-secondary)" }}>
              {t.auth.logOutConfirmDesc}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelLogout}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 border transition-all cursor-pointer"
                style={{ 
                  color: "var(--color-text-primary)", 
                  borderColor: "var(--color-border-subtle)" 
                }}
              >
                {t.auth.cancel}
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="btn-accent-solid flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/25 transition-all cursor-pointer"
                style={{ color: "#FFFFFF" }}
              >
                {t.auth.logOut}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
