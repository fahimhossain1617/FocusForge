"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { 
  User as UserIcon, Mail, Phone, MapPin, Calendar, Camera, Trash2, 
  CheckCircle2, Save, X, ArrowLeft, Pencil, ChevronRight, Monitor, UserPlus, Loader2
} from "lucide-react";
import FocusForgeDatePicker from "../ui/FocusForgeDatePicker";
import FocusForgeSelect from "../ui/FocusForgeSelect";
import ConfirmDeleteModal from "../ui/ConfirmDeleteModal";
import { userService } from "../../services/userService";

// Custom SVG matching the Gender symbol (⚧ / Venus-Mars combination) from user mockup
function GenderIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="14" r="5" />
      <path d="M19 5l-5.4 5.4" />
      <path d="M19 5h-5" />
      <path d="M19 5v5" />
      <path d="M14 14l5 5" />
      <path d="M16.5 16.5l2.5 -2.5" />
    </svg>
  );
}

// Custom SVG matching the City skyline 3-bar icon from user mockup
function CityBarsIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      aria-hidden="true"
    >
      <rect x="4.5" y="13" width="4" height="8" rx="2" />
      <rect x="10" y="7" width="4" height="14" rx="2" />
      <rect x="15.5" y="11" width="4" height="10" rx="2" />
    </svg>
  );
}

export default function ProfilePage() {
  const { user, isGuest, updateUserProfile, openAuth } = useAuth();
  const { showToast, navigateBack, state } = useAppContext();
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRemovePhotoModal, setShowRemovePhotoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field input refs to auto-focus when clicking a specific row in view mode
  const inputRefs = {
    fullName: useRef<HTMLInputElement>(null),
    displayName: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    dob: useRef<HTMLInputElement>(null),
    gender: useRef<HTMLButtonElement>(null),
    country: useRef<HTMLInputElement>(null),
    city: useRef<HTMLInputElement>(null),
    bio: useRef<HTMLTextAreaElement>(null),
  };

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    displayName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    country: "",
    city: "",
    bio: "",
    avatarUrl: "",
  });

  // Helper to prevent double zeros in country codes (e.g. +8800... -> +880...)
  const sanitizePhone = (val?: string) => {
    if (!val) return "";
    return val.replace(/^\+8800/, "+880").replace(/^8800/, "+880").replace(/^00/, "0");
  };

  // Sync state when user changes or guest mode
  useEffect(() => {
    if (user) {
      const cleanPhone = sanitizePhone(user.phone || (user.authMethod === 'phone' ? user.identifier : ""));
      const initialFullName = user.fullName || user.displayName || "";
      const initialDisplayName = user.displayName || user.fullName || "";
      setFormData({
        fullName: initialFullName,
        displayName: initialDisplayName,
        email: user.email || (user.authMethod === 'email' ? user.identifier : ""),
        phone: cleanPhone,
        dob: user.dob || "",
        gender: user.gender || "",
        country: user.country || "",
        city: user.city || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || "",
      });
    } else {
      setFormData({
        fullName: "Guest Explorer",
        displayName: "Guest",
        email: "guest@focentia.app",
        phone: "",
        dob: "",
        gender: "",
        country: "",
        city: "",
        bio: "Exploring Focentia in guest mode.",
        avatarUrl: "",
      });
    }
  }, [user]);

  // Fresh fetch from backend on mount so user always sees saved database profile
  useEffect(() => {
    if (user?.id) {
      userService.fetchUserProfile(user.id).then((freshProfile) => {
        if (freshProfile) {
          const cleanPhone = sanitizePhone(freshProfile.phone || (freshProfile.authMethod === 'phone' ? freshProfile.identifier : ""));
          setFormData(prev => ({
            ...prev,
            fullName: freshProfile.fullName || freshProfile.displayName || prev.fullName,
            displayName: freshProfile.displayName || freshProfile.fullName || prev.displayName,
            email: freshProfile.email || prev.email,
            phone: cleanPhone || prev.phone,
            dob: freshProfile.dob || prev.dob,
            gender: freshProfile.gender || prev.gender,
            country: freshProfile.country || prev.country,
            city: freshProfile.city || prev.city,
            bio: freshProfile.bio || prev.bio,
            avatarUrl: freshProfile.avatarUrl || prev.avatarUrl,
          }));
        }
      }).catch(() => {});
    }
  }, [user?.id]);

  // Handle Photo Upload via FileReader
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(state.lang === 'bn' ? "দয়া করে একটি ইমেজ ফাইল নির্বাচন করুন (PNG, JPG, WebP)।" : "Please upload an image file (PNG, JPG, WebP).", "error");
      return;
    }

    // Limit file size to 3MB
    if (file.size > 3 * 1024 * 1024) {
      showToast(state.lang === 'bn' ? "ছবির সাইজ ৩MB-এর কম হতে হবে।" : "Photo must be less than 3MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, avatarUrl: base64 }));
      if (user) {
        const res = await userService.uploadAvatar(base64, file.type);
        const effectiveAvatarUrl = (res.success && res.avatarUrl) ? res.avatarUrl : base64;
        const success = await updateUserProfile({ avatarUrl: effectiveAvatarUrl });
        if (success || res.success) {
          setFormData(prev => ({ ...prev, avatarUrl: effectiveAvatarUrl }));
          showToast(state.lang === 'bn' ? "প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে।" : "Profile photo updated successfully.", "success");
        } else {
          showToast(state.lang === 'bn' ? "প্রোফাইল ছবি আপলোড করতে ব্যর্থ হয়েছে।" : "Failed to upload profile photo.", "error");
        }
      } else {
        showToast(state.lang === 'bn' ? "প্রোফাইল ছবি প্রিভিউ আপডেট হয়েছে (গেস্ট মোড)।" : "Profile photo preview updated (guest mode).", "info");
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove Photo
  const handleRemovePhoto = async () => {
    setFormData(prev => ({ ...prev, avatarUrl: "" }));
    if (user) {
      await userService.removeAvatar().catch(() => {});
      const success = await updateUserProfile({ avatarUrl: "" });
      if (success) {
        showToast(state.lang === 'bn' ? "প্রোফাইল ছবি মুছে ফেলা হয়েছে।" : "Profile photo removed.", "info");
      }
    } else {
      showToast(state.lang === 'bn' ? "প্রোফাইল ছবি মুছে ফেলা হয়েছে।" : "Profile photo removed.", "info");
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    if (isGuest || !user) {
      setTimeout(() => {
        setIsSaving(false);
        setIsEditing(false);
        showToast(state.lang === 'bn' ? "প্রোফাইল প্রিভিউ সাময়িকভাবে আপডেট হয়েছে। সেভ করতে সাইন ইন করুন!" : "Profile preview updated (temporary). Sign in to save permanently!", "info");
      }, 300);
      return;
    }

    const finalFullName = formData.fullName.trim();
    const finalDisplayName = formData.displayName.trim() || finalFullName || user?.displayName || "User";

    const success = await updateUserProfile({
      fullName: finalFullName,
      displayName: finalDisplayName,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      dob: formData.dob,
      gender: formData.gender,
      country: formData.country.trim(),
      city: formData.city.trim(),
      bio: formData.bio.trim(),
      avatarUrl: formData.avatarUrl,
    });

    setIsSaving(false);

    if (success) {
      setIsEditing(false);
      showToast(state.lang === 'bn' ? "প্রোফাইল সফলভাবে আপডেট হয়েছে।" : "Profile updated successfully.", "success");
    } else {
      showToast(state.lang === 'bn' ? "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।" : "Failed to update profile. Please try again.", "error");
    }
  };

  // Format date helper: "1 September 2026"
  const formatDate = (isoString?: string) => {
    if (!isoString) return state.lang === 'bn' ? "আজ" : "Today";
    try {
      const d = new Date(isoString);
      const day = d.getDate();
      const year = d.getFullYear();
      const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthNamesBn = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
      const mName = state.lang === 'bn' ? monthNamesBn[d.getMonth()] : monthNamesEn[d.getMonth()];
      return `${day} ${mName} ${year}`;
    } catch {
      return isoString;
    }
  };

  // Helper to trigger edit mode and focus a specific field
  const handleRowClick = (fieldKey?: keyof typeof inputRefs) => {
    if (isGuest && !user) {
      openAuth('login');
      return;
    }
    setIsEditing(true);
    if (fieldKey && inputRefs[fieldKey]?.current) {
      setTimeout(() => {
        inputRefs[fieldKey].current?.focus();
      }, 50);
    }
  };

  const isBn = state.lang === 'bn';
  const isEmailVerified = user?.authMethod === 'email' || Boolean(user?.email && user.id && !isGuest);
  const isPhoneVerified = user?.authMethod === 'phone';

  return (
    <div className="motion-page max-w-4xl mx-auto space-y-4 pb-16">
      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={navigateBack}
          className="inline-flex items-center justify-center w-9 h-9 -ml-1 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-colors cursor-pointer"
          aria-label={isBn ? "ফিরে যান" : "Back"}
          title={isBn ? "ফিরে যান" : "Back"}
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      {/* ======================================================== */}
      {/* UNIFIED PERSONAL INFORMATION CARD (Matching Design)      */}
      {/* ======================================================== */}
      <div className="relative rounded-3xl border border-[#DCE5F0] dark:border-blue-500/20 bg-white dark:bg-[#0D1426] shadow-none overflow-hidden transition-all">
        
        {/* Curved ambient wave accent in top-right corner matching user reference */}
        <div className="absolute -top-10 -right-10 w-72 h-72 sm:w-88 sm:h-88 pointer-events-none overflow-hidden rounded-tr-3xl">
          <svg
            className="w-full h-full opacity-20 dark:opacity-40"
            viewBox="0 0 300 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="headerWaveGlow" cx="85%" cy="15%" r="75%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                <stop offset="45%" stopColor="#1D4ED8" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#0B132B" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="headerWaveLine" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.6" />
                <stop offset="70%" stopColor="#2563EB" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M300 0 C210 25, 175 110, 185 200 C192 245, 220 280, 300 300 Z"
              fill="url(#headerWaveGlow)"
            />
            <path
              d="M300 35 C225 60, 188 130, 202 215 C210 255, 238 285, 300 295"
              stroke="url(#headerWaveLine)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M300 75 C245 95, 218 155, 228 225"
              stroke="url(#headerWaveLine)"
              strokeWidth="1"
              strokeOpacity="0.4"
              fill="none"
            />
          </svg>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 1. TOP HEADER SECTION (Avatar + Title + Edit Button) */}
        {/* ---------------------------------------------------- */}
        <div className="relative z-10 flex items-center justify-between gap-4 p-5 sm:p-7 border-b border-[#E2E8F0] dark:border-white/[0.08]">
          <div className="flex items-center gap-4 min-w-0">
            {/* Circular Avatar */}
            <div className="relative group shrink-0">
              <div 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-[#D0E1FD] dark:border-blue-900/40 flex items-center justify-center cursor-pointer transition-all hover:border-[#5B8DEF] bg-[#E8F1FC] dark:bg-blue-950/60 shadow-none"
                onClick={() => fileInputRef.current?.click()}
                title={isBn ? "প্রোফাইল ছবি পরিবর্তন করুন" : "Change Profile Photo"}
              >
                {formData.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={formData.avatarUrl} 
                    alt={formData.displayName || user?.displayName || "User"} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#E8F1FC] dark:bg-blue-950/60">
                    {formData.fullName && !isGuest && /^[A-Za-z\u0980-\u09FF]/.test(formData.fullName.trim()) ? (
                      <span className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-blue-200 uppercase">
                        {formData.fullName.trim()[0]}
                      </span>
                    ) : (
                      <UserIcon size={26} strokeWidth={2.2} className="text-[#0F172A] dark:text-blue-300" />
                    )}
                  </div>
                )}

                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera size={18} className="text-white" />
                </div>
              </div>

              {/* Quick Upload Icon on Avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#223A5E] dark:bg-[#2563EB] text-white hover:bg-[#1A2E4C] dark:hover:bg-[#1D4ED8] ring-2 ring-white dark:ring-[#0D1426] transition-all cursor-pointer"
                title={isBn ? "ছবি পরিবর্তন করুন" : "Change Photo"}
                aria-label="Change Photo"
              >
                <Camera size={11} />
              </button>

              {/* Remove Photo Action if photo exists */}
              {formData.avatarUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRemovePhotoModal(true);
                  }}
                  className="absolute -top-1 -right-1 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white ring-2 ring-white dark:ring-[#0D1426] transition-all cursor-pointer"
                  title={isBn ? "ছবি মুছুন" : "Remove Photo"}
                  aria-label="Remove Photo"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>

            {/* Header Titles */}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight truncate">
                {isBn ? "ব্যক্তিগত তথ্য" : "Personal Information"}
              </h1>
              <p className="text-xs sm:text-sm text-[#52627A] dark:text-slate-400 mt-0.5 truncate">
                {isBn ? "আপনার ব্যক্তিগত বিবরণ পরিচালনা করুন।" : "Manage your personal details."}
              </p>
            </div>
          </div>

          {/* Header Action Button (Edit / Cancel & Save) */}
          <div className="shrink-0 flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold text-[#52627A] dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#E2E8F0] dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 transition-all cursor-pointer active:scale-95"
                >
                  <X size={14} />
                  <span>{t.auth.cancel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProfile()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold text-white hover:opacity-95 border border-transparent shadow-none transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{isSaving ? (isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (isBn ? "সংরক্ষণ করুন" : "Save")}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isGuest || !user) {
                    openAuth('login');
                  } else {
                    setIsEditing(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-300 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer active:scale-95"
              >
                <Pencil size={13} className="text-blue-500 dark:text-blue-400" />
                <span>
                  {isGuest || !user 
                    ? (isBn ? "লগইন করুন" : "Sign In") 
                    : (isBn ? "এডিট" : "Edit")}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 2. LIST ROWS SECTION (Line by Line with Chevron)     */}
        {/* ---------------------------------------------------- */}
        <form onSubmit={handleSaveProfile} className="relative z-10 divide-y divide-[#E2E8F0] dark:divide-white/[0.07]">
          
          {/* Row 1: Full Name */}
          <div 
            onClick={() => !isEditing && handleRowClick("fullName")}
            className={`flex items-center justify-between gap-4 p-4 sm:p-5 transition-colors ${
              !isEditing ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.02] cursor-pointer group" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#131D33] text-[#223A5E] dark:text-blue-300 border border-[#DCE5F0] dark:border-white/5">
                <UserIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-0.5">
                  {isBn ? "পূর্ণ নাম" : "Full Name"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.fullName}
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Md Fahim Hossain"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-white truncate">
                    {formData.fullName || (isBn ? "দেওয়া হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 2: Display Name / Username */}
          <div 
            onClick={() => !isEditing && handleRowClick("displayName")}
            className={`flex items-center justify-between gap-4 p-4 sm:p-5 transition-colors ${
              !isEditing ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.02] cursor-pointer group" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#131D33] text-[#223A5E] dark:text-blue-300 border border-[#DCE5F0] dark:border-white/5">
                <Monitor size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-0.5">
                  {isBn ? "ডিসপ্লে নেম / ইউজারনেম (ঐচ্ছিক)" : "Display Name / Username (Optional)"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.displayName}
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g. Md Fahim Hossain"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-white truncate">
                    {formData.displayName || formData.fullName || (isBn ? "দেওয়া হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 3: Email Address */}
          <div 
            onClick={() => !isEditing && handleRowClick("email")}
            className={`flex items-center justify-between gap-4 p-4 sm:p-5 transition-colors ${
              !isEditing ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.02] cursor-pointer group" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#131D33] text-[#223A5E] dark:text-blue-300 border border-[#DCE5F0] dark:border-white/5">
                <Mail size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-0.5">
                  {isBn ? "ইমেল ঠিকানা" : "Email Address"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.email}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-white truncate">
                    {formData.email || user?.identifier || (isBn ? "দেওয়া হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isEmailVerified && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>{isBn ? "যাচাইকৃত" : "Verified"}</span>
                </span>
              )}
              {!isEditing && (
                <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              )}
            </div>
          </div>

          {/* Row 4: Phone Number */}
          <div 
            onClick={() => !isEditing && handleRowClick("phone")}
            className={`flex items-center justify-between gap-4 p-4 sm:p-5 transition-colors ${
              !isEditing ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.02] cursor-pointer group" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#131D33] text-[#223A5E] dark:text-blue-300 border border-[#DCE5F0] dark:border-white/5">
                <Phone size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-0.5">
                  {isBn ? "ফোন নম্বর (ঐচ্ছিক)" : "Phone Number (Optional)"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.phone}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                    placeholder="+880 1712345678"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-white truncate">
                    {sanitizePhone(formData.phone) || sanitizePhone(user?.phone) || (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isPhoneVerified && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>{isBn ? "যাচাইকৃত" : "Verified"}</span>
                </span>
              )}
              {!isEditing && (
                <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              )}
            </div>
          </div>

          {/* Row 5: Date of Birth */}
          <div 
            onClick={() => !isEditing && handleRowClick("dob")}
            className={`flex items-center justify-between gap-4 p-4 sm:p-5 transition-colors ${
              !isEditing ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.02] cursor-pointer group" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#131D33] text-[#223A5E] dark:text-blue-300 border border-[#DCE5F0] dark:border-white/5">
                <Calendar size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-0.5">
                  {isBn ? "জন্ম তারিখ (ঐচ্ছিক)" : "Date of Birth (Optional)"}
                </p>
                {isEditing ? (
                  <div className="mt-1">
                    <FocusForgeDatePicker
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      maxDate={new Date().toISOString().split("T")[0]}
                      placeholder={isBn ? "জন্ম তারিখ নির্বাচন করুন" : "Select date of birth"}
                      ariaLabel="Date of Birth"
                    />
                  </div>
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-white truncate">
                    {formData.dob ? formatDate(formData.dob) : (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 6: Gender */}
          <div 
            onClick={() => !isEditing && handleRowClick("gender")}
            className={`flex items-center justify-between gap-4 p-4 sm:p-5 transition-colors ${
              !isEditing ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.02] cursor-pointer group" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#131D33] text-[#223A5E] dark:text-blue-300 border border-[#DCE5F0] dark:border-white/5">
                <GenderIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-0.5">
                  {isBn ? "লিঙ্গ (ঐচ্ছিক)" : "Gender (Optional)"}
                </p>
                {isEditing ? (
                  <div className="mt-1">
                    <FocusForgeSelect
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      options={[
                        { value: "", label: isBn ? "লিঙ্গ নির্বাচন করুন" : "Select gender" },
                        { value: "Male", label: isBn ? "পুরুষ (Male)" : "Male" },
                        { value: "Female", label: isBn ? "মহিলা (Female)" : "Female" },
                        { value: "Non-binary", label: isBn ? "নন-বাইনারি (Non-binary)" : "Non-binary" },
                        { value: "Prefer not to say", label: isBn ? "বলতে অনিচ্ছুক (Prefer not to say)" : "Prefer not to say" },
                      ]}
                      placeholder={isBn ? "লিঙ্গ নির্বাচন করুন" : "Select gender"}
                      ariaLabel="Gender"
                    />
                  </div>
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-white truncate">
                    {formData.gender || (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 7: Country / Region */}
          <div 
            onClick={() => !isEditing && handleRowClick("country")}
            className={`flex items-center justify-between gap-4 p-4 sm:p-5 transition-colors ${
              !isEditing ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.02] cursor-pointer group" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#131D33] text-[#223A5E] dark:text-blue-300 border border-[#DCE5F0] dark:border-white/5">
                <MapPin size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-0.5">
                  {isBn ? "দেশ / অঞ্চল (ঐচ্ছিক)" : "Country / Region (Optional)"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.country}
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g. Bangladesh"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-white truncate">
                    {formData.country || (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 8: City */}
          <div 
            onClick={() => !isEditing && handleRowClick("city")}
            className={`flex items-center justify-between gap-4 p-4 sm:p-5 transition-colors ${
              !isEditing ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.02] cursor-pointer group" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#131D33] text-[#223A5E] dark:text-blue-300 border border-[#DCE5F0] dark:border-white/5">
                <CityBarsIcon className="w-5 h-5 text-current" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-0.5">
                  {isBn ? "শহর (ঐচ্ছিক)" : "City (Optional)"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.city}
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Dhaka"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-white truncate">
                    {formData.city || (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 9: About Me / Short Bio */}
          <div 
            onClick={() => !isEditing && handleRowClick("bio")}
            className={`flex items-start justify-between gap-4 p-4 sm:p-5 transition-colors ${
              !isEditing ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.02] cursor-pointer group" : ""
            }`}
          >
            <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#131D33] text-[#223A5E] dark:text-blue-300 border border-[#DCE5F0] dark:border-white/5 mt-0.5">
                <UserPlus size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-0.5">
                  {isBn ? "আমার সম্পর্কে / সংক্ষিপ্ত বায়ো (ঐচ্ছিক)" : "About Me / Short Bio (Optional)"}
                </p>
                {isEditing ? (
                  <textarea
                    ref={inputRefs.bio}
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder={isBn ? "নিজের সম্পর্কে সংক্ষেপে কিছু লিখুন..." : "Tell us a little about yourself, your goals, or your focus interests..."}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl text-sm bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-white leading-relaxed break-words">
                    {formData.bio || (isBn ? "এখনো কোনো বায়ো যোগ করা হয়নি। নিজের সম্পর্কে লিখতে এডিটে ক্লিক করুন।" : "No bio added yet. Click Edit to share a short summary about yourself.")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            )}
          </div>

          {/* Bottom Save Action Bar when in Edit Mode */}
          {isEditing && (
            <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#52627A] dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#E2E8F0] dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 transition-all cursor-pointer active:scale-95"
              >
                {t.auth.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-white hover:opacity-95 border border-transparent shadow-none transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isSaving ? (isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (isBn ? "পরিবর্তন সংরক্ষণ করুন" : "Save Changes")}</span>
              </button>
            </div>
          )}

          {/* Member Since presentation */}
          <div className="p-4 sm:p-5 flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400">
            <span>{isBn ? "যুক্ত হয়েছেন:" : "Member since:"}</span>
            <span className="font-semibold text-[#0F172A] dark:text-zinc-200">
              {user?.createdAt ? formatDate(user.createdAt) : (isBn ? "১ সেপ্টেম্বর ২০২৬" : "1 September 2026")}
            </span>
          </div>

        </form>
      </div>

      {/* Delete/Remove Photo Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showRemovePhotoModal}
        onClose={() => setShowRemovePhotoModal(false)}
        onConfirm={() => {
          setShowRemovePhotoModal(false);
          handleRemovePhoto();
        }}
        title={isBn ? "প্রোফাইল ছবি মুছে ফেলতে চান?" : "Remove profile photo?"}
        message={
          isBn
            ? "আপনি কি নিশ্চিত যে আপনার বর্তমান প্রোফাইল ছবিটি সরিয়ে ফেলতে চান?"
            : "Are you sure you want to remove your profile photo?"
        }
        confirmLabel={isBn ? "মুছুন" : "Remove"}
        cancelLabel={isBn ? "বাতিল" : "Cancel"}
      />
    </div>
  );
}
