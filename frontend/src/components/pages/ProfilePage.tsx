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
      setFormData({
        fullName: user.fullName || "",
        displayName: user.displayName || "",
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
      let savedGuest: any = null;
      try {
        const saved = localStorage.getItem("focusforge_guest_profile");
        if (saved) savedGuest = JSON.parse(saved);
      } catch {}

      setFormData({
        fullName: savedGuest?.fullName || "Guest Explorer",
        displayName: savedGuest?.displayName || "Guest",
        email: savedGuest?.email || "guest@focentia.app",
        phone: savedGuest?.phone || "",
        dob: savedGuest?.dob || "",
        gender: savedGuest?.gender || "",
        country: savedGuest?.country || "",
        city: savedGuest?.city || "",
        bio: savedGuest?.bio || "Exploring Focentia in guest mode.",
        avatarUrl: savedGuest?.avatarUrl || "",
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
            fullName: freshProfile.fullName !== undefined ? freshProfile.fullName : prev.fullName,
            displayName: freshProfile.displayName !== undefined ? freshProfile.displayName : prev.displayName,
            email: freshProfile.email || prev.email,
            phone: cleanPhone || prev.phone,
            dob: freshProfile.dob !== undefined ? freshProfile.dob : prev.dob,
            gender: freshProfile.gender !== undefined ? freshProfile.gender : prev.gender,
            country: freshProfile.country !== undefined ? freshProfile.country : prev.country,
            city: freshProfile.city !== undefined ? freshProfile.city : prev.city,
            bio: freshProfile.bio !== undefined ? freshProfile.bio : prev.bio,
            avatarUrl: freshProfile.avatarUrl !== undefined ? freshProfile.avatarUrl : prev.avatarUrl,
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
        try {
          const guestStr = localStorage.getItem("focusforge_guest_profile");
          const existing = guestStr ? JSON.parse(guestStr) : {};
          const updated = { ...existing, avatarUrl: base64 };
          localStorage.setItem("focusforge_guest_profile", JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent("focusforge:profile_updated", { detail: updated }));
        } catch (e) {
          console.error("Failed to save guest avatar", e);
        }
        showToast(state.lang === 'bn' ? "প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে।" : "Profile photo updated successfully.", "success");
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
      try {
        const guestStr = localStorage.getItem("focusforge_guest_profile");
        const existing = guestStr ? JSON.parse(guestStr) : {};
        const updated = { ...existing, avatarUrl: "" };
        localStorage.setItem("focusforge_guest_profile", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("focusforge:profile_updated", { detail: updated }));
      } catch (e) {
        console.error("Failed to clear guest avatar", e);
      }
      showToast(state.lang === 'bn' ? "প্রোফাইল ছবি মুছে ফেলা হয়েছে।" : "Profile photo removed.", "info");
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    if (isGuest || !user) {
      const finalFullName = formData.fullName.trim();
      const finalDisplayName = formData.displayName.trim() || finalFullName || "Guest";
      const guestData = {
        ...formData,
        fullName: finalFullName,
        displayName: finalDisplayName,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dob: formData.dob,
        gender: formData.gender,
        country: formData.country.trim(),
        city: formData.city.trim(),
        bio: formData.bio.trim(),
      };
      try {
        localStorage.setItem("focusforge_guest_profile", JSON.stringify(guestData));
        window.dispatchEvent(new CustomEvent("focusforge:profile_updated", { detail: guestData }));
      } catch (e) {
        console.error("Failed to save guest profile to localStorage", e);
      }
      setTimeout(() => {
        setIsSaving(false);
        setIsEditing(false);
        showToast(state.lang === 'bn' ? "প্রোফাইল সফলভাবে আপডেট হয়েছে।" : "Profile updated successfully.", "success");
      }, 200);
      return;
    }

    const finalFullName = formData.fullName.trim();
    const finalDisplayName = formData.displayName.trim();

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
      {/* SEAMLESS PERSONAL INFORMATION VIEW (Matching Reference)  */}
      {/* ======================================================== */}
      <div className="space-y-2">
        {/* 1. TOP HEADER SECTION (Avatar + Title/Subtitle + Edit Button) */}
        <div className="flex items-center justify-between gap-3 pb-5 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Circular Avatar */}
            <div className="relative group shrink-0">
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-[var(--color-border-subtle)] flex items-center justify-center cursor-pointer transition-all hover:border-blue-500 bg-blue-500/10 text-blue-500"
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
                  <div className="w-full h-full flex items-center justify-center bg-blue-500/10">
                    {formData.fullName && !isGuest && /^[A-Za-z\u0980-\u09FF]/.test(formData.fullName.trim()) ? (
                      <span className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] uppercase">
                        {formData.fullName.trim()[0]}
                      </span>
                    ) : (
                      <UserIcon size={22} strokeWidth={2.2} className="text-[var(--color-text-secondary)]" />
                    )}
                  </div>
                )}

                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera size={16} className="text-white" />
                </div>
              </div>

              {/* Quick Upload Icon on Avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-[var(--color-background)] transition-all cursor-pointer"
                title={isBn ? "ছবি পরিবর্তন করুন" : "Change Photo"}
                aria-label="Change Photo"
              >
                <Camera size={10} />
              </button>

              {/* Remove Photo Action if photo exists */}
              {formData.avatarUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRemovePhotoModal(true);
                  }}
                  className="absolute -top-0.5 -right-0.5 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white ring-2 ring-[var(--color-background)] transition-all cursor-pointer"
                  title={isBn ? "ছবি মুছুন" : "Remove Photo"}
                  aria-label="Remove Photo"
                >
                  <Trash2 size={9} />
                </button>
              )}
            </div>

            {/* Header Titles */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] tracking-tight whitespace-nowrap">
                {isBn ? "ব্যক্তিগত তথ্য" : "Personal Information"}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer active:scale-95"
                >
                  <X size={13} />
                  <span>{t.auth.cancel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProfile()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm shadow-blue-500/20"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{isSaving ? (isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (isBn ? "সংরক্ষণ করুন" : "Save")}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-blue-500 dark:text-blue-400 bg-transparent hover:bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/60 transition-all cursor-pointer active:scale-95"
              >
                <Pencil size={12} />
                <span>
                  {isBn ? "এডিট" : "Edit"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 2. LIST ROWS SECTION (Line by Line with Chevron)     */}
        {/* ---------------------------------------------------- */}
        <form onSubmit={handleSaveProfile} className="divide-y divide-[var(--color-border-subtle)]">
          
          {/* Row 1: Full Name */}
          <div 
            onClick={() => !isEditing && handleRowClick("fullName")}
            className={`flex items-center justify-between gap-4 py-3.5 sm:py-4 px-1 transition-colors ${
              !isEditing ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group rounded-xl" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                <UserIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-0.5">
                  {isBn ? "পূর্ণ নাম" : "Full Name"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.fullName}
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Alex Morgan"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] truncate">
                    {formData.fullName || (isBn ? "দেওয়া হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 2: Username */}
          <div 
            onClick={() => !isEditing && handleRowClick("displayName")}
            className={`flex items-center justify-between gap-4 py-3.5 sm:py-4 px-1 transition-colors ${
              !isEditing ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group rounded-xl" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                <Monitor size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-0.5">
                  {isBn ? "ইউজারনেম (ঐচ্ছিক)" : "Username (Optional)"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.displayName}
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g. alexmorgan"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] truncate">
                    {formData.displayName || (isBn ? "দেওয়া হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 3: Email Address */}
          <div 
            onClick={() => !isEditing && handleRowClick("email")}
            className={`flex items-center justify-between gap-4 py-3.5 sm:py-4 px-1 transition-colors ${
              !isEditing ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group rounded-xl" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                <Mail size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-0.5">
                  {isBn ? "ইমেল ঠিকানা" : "Email Address"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.email}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] truncate">
                    {formData.email || user?.identifier || (isBn ? "দেওয়া হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isEmailVerified && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>{isBn ? "যাচাইকৃত" : "Verified"}</span>
                </span>
              )}
              {!isEditing && (
                <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all" />
              )}
            </div>
          </div>

          {/* Row 4: Phone Number */}
          <div 
            onClick={() => !isEditing && handleRowClick("phone")}
            className={`flex items-center justify-between gap-4 py-3.5 sm:py-4 px-1 transition-colors ${
              !isEditing ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group rounded-xl" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                <Phone size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-0.5">
                  {isBn ? "ফোন নম্বর (ঐচ্ছিক)" : "Phone Number (Optional)"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.phone}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                    placeholder="+880 1712345678"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] truncate">
                    {sanitizePhone(formData.phone) || sanitizePhone(user?.phone) || (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isPhoneVerified && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>{isBn ? "যাচাইকৃত" : "Verified"}</span>
                </span>
              )}
              {!isEditing && (
                <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all" />
              )}
            </div>
          </div>

          {/* Row 5: Date of Birth */}
          <div 
            onClick={() => !isEditing && handleRowClick("dob")}
            className={`flex items-center justify-between gap-4 py-3.5 sm:py-4 px-1 transition-colors ${
              !isEditing ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group rounded-xl" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                <Calendar size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-0.5">
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
                  <p className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] truncate">
                    {formData.dob ? formatDate(formData.dob) : (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 6: Gender */}
          <div 
            onClick={() => !isEditing && handleRowClick("gender")}
            className={`flex items-center justify-between gap-4 py-3.5 sm:py-4 px-1 transition-colors ${
              !isEditing ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group rounded-xl" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                <GenderIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-0.5">
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
                  <p className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] truncate">
                    {formData.gender || (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 7: Country / Region */}
          <div 
            onClick={() => !isEditing && handleRowClick("country")}
            className={`flex items-center justify-between gap-4 py-3.5 sm:py-4 px-1 transition-colors ${
              !isEditing ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group rounded-xl" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                <MapPin size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-0.5">
                  {isBn ? "দেশ / অঞ্চল (ঐচ্ছিক)" : "Country / Region (Optional)"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.country}
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g. United States"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] truncate">
                    {formData.country || (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 8: City */}
          <div 
            onClick={() => !isEditing && handleRowClick("city")}
            className={`flex items-center justify-between gap-4 py-3.5 sm:py-4 px-1 transition-colors ${
              !isEditing ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group rounded-xl" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                <CityBarsIcon className="w-5 h-5 text-current" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-0.5">
                  {isBn ? "শহর (ঐচ্ছিক)" : "City (Optional)"}
                </p>
                {isEditing ? (
                  <input
                    ref={inputRefs.city}
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. New York"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] truncate">
                    {formData.city || (isBn ? "নির্দিষ্ট করা হয়নি" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>

          {/* Row 9: About Me / Short Bio */}
          <div 
            onClick={() => !isEditing && handleRowClick("bio")}
            className={`flex items-start justify-between gap-4 py-3.5 sm:py-4 px-1 transition-colors ${
              !isEditing ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group rounded-xl" : ""
            }`}
          >
            <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 mt-0.5">
                <UserPlus size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-0.5">
                  {isBn ? "আমার সম্পর্কে / সংক্ষিপ্ত বায়ো (ঐচ্ছিক)" : "About Me / Short Bio (Optional)"}
                </p>
                {isEditing ? (
                  <textarea
                    ref={inputRefs.bio}
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder={isBn ? "নিজের সম্পর্কে সংক্ষেপে কিছু লিখুন..." : "Tell us a little about yourself, your goals, or your focus interests..."}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  />
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] leading-relaxed break-words">
                    {formData.bio || (isBn ? "এখনো কোনো বায়ো যোগ করা হয়নি। নিজের সম্পর্কে লিখতে এডিটে ক্লিক করুন।" : "No bio added yet. Click Edit to share a short summary about yourself.")}
                  </p>
                )}
              </div>
            </div>
            {!isEditing && (
              <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            )}
          </div>

          {/* Bottom Save Action Bar when in Edit Mode */}
          {isEditing && (
            <div className="py-4 px-1 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] transition-all cursor-pointer active:scale-95"
              >
                {t.auth.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm shadow-blue-500/20"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isSaving ? (isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (isBn ? "পরিবর্তন সংরক্ষণ করুন" : "Save Changes")}</span>
              </button>
            </div>
          )}

          {/* Member Since presentation */}
          <div className="py-4 px-1 flex items-center justify-between text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border-subtle)] mt-2">
            <span>{isBn ? "যুক্ত হয়েছেন:" : "Member since:"}</span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {user?.createdAt ? formatDate(user.createdAt) : (isBn ? "১ অক্টোবর ২০২৬" : "1 October 2026")}
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
