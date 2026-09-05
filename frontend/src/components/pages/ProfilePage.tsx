"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { 
  User as UserIcon, Mail, Phone, MapPin, Calendar, Camera, Trash2, 
  CheckCircle2, ShieldCheck, Edit3, Save, X, Globe, UserCheck, ArrowLeft
} from "lucide-react";

export default function ProfilePage() {
  const { user, isGuest, updateUserProfile, openAuth } = useAuth();
  const { showToast, navigateTo, state } = useAppContext();
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const cleanName = sanitizePhone(user.fullName || user.displayName || "");
      setFormData({
        fullName: cleanName,
        displayName: cleanName,
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
        email: "guest@focusforge.app",
        phone: "",
        dob: "",
        gender: "",
        country: "",
        city: "",
        bio: "Exploring FocusForge in guest mode.",
        avatarUrl: "",
      });
    }
  }, [user]);

  // Handle Photo Upload via FileReader
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (PNG, JPG, WebP).", "error");
      return;
    }

    // Limit file size to 3MB
    if (file.size > 3 * 1024 * 1024) {
      showToast("Photo must be less than 3MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, avatarUrl: base64 }));
      if (user) {
        const success = await updateUserProfile({ avatarUrl: base64 });
        if (success) {
          showToast("Profile photo updated successfully.", "success");
        }
      } else {
        showToast("Profile photo preview updated (guest mode).", "info");
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove Photo
  const handleRemovePhoto = async () => {
    setFormData(prev => ({ ...prev, avatarUrl: "" }));
    if (user) {
      const success = await updateUserProfile({ avatarUrl: "" });
      if (success) {
        showToast("Profile photo removed.", "info");
      }
    } else {
      showToast("Profile photo removed.", "info");
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (isGuest || !user) {
      setTimeout(() => {
        setIsSaving(false);
        setIsEditing(false);
        showToast("Profile preview updated (temporary). Sign in to save permanently!", "info");
      }, 300);
      return;
    }

    const success = await updateUserProfile({
      fullName: formData.fullName.trim(),
      displayName: formData.displayName.trim() || formData.fullName.trim() || user?.displayName || "User",
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
      showToast("Profile updated successfully.", "success");
    } else {
      showToast("Failed to update profile. Please try again.", "error");
    }
  };

  // Calculate Profile Completion Percentage
  const calculateCompletion = () => {
    const checks = [
      { key: "avatar", label: "Profile Picture", complete: Boolean(formData.avatarUrl) },
      { key: "fullName", label: "Full Name", complete: Boolean(formData.fullName.trim()) },
      { key: "phone", label: "Phone Number", complete: Boolean(formData.phone.trim()) },
      { key: "location", label: "Location", complete: Boolean(formData.city.trim() || formData.country.trim()) },
      { key: "bio", label: "About Me", complete: Boolean(formData.bio.trim()) },
    ];

    const completedCount = checks.filter(c => c.complete).length;
    const percentage = Math.round((completedCount / checks.length) * 100);
    return { percentage, checks };
  };

  const { percentage: completionPercent, checks: completionChecks } = calculateCompletion();

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fade-in max-w-5xl mx-auto space-y-8 pb-16">
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
          onClick={() => navigateTo("today")}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-xs"
          style={{
            borderColor: "var(--color-border-subtle)",
            color: "var(--color-text-primary)",
          }}
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={16} />
          <span>{state.lang === 'bn' ? "ড্যাশবোর্ডে ফিরে যান" : "Back to Dashboard"}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. PROFILE HEADER SECTION                                 */}
      {/* ======================================================== */}
      <div 
        className="relative rounded-3xl border shadow-xl p-6 sm:p-8 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(13, 20, 38, 0.9), rgba(10, 14, 26, 0.95))",
          borderColor: "rgba(59, 130, 246, 0.22)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.08)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 w-96 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Container */}
          <div className="relative group shrink-0">
            <div 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-blue-500/30 flex items-center justify-center cursor-pointer transition-colors hover:border-blue-400"
              style={{ background: "linear-gradient(135deg, #090e1a, #131d36)" }}
              onClick={() => fileInputRef.current?.click()}
              title="Change Profile Photo"
            >
              {formData.avatarUrl ? (
                <img 
                  src={formData.avatarUrl} 
                  alt={formData.displayName || user?.displayName || "User"} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #090e1a, #131d36)" }}>
                  {formData.fullName && /^[A-Za-z\u0980-\u09FF]/.test(formData.fullName.trim()) ? (
                    <span className="text-3xl font-bold text-blue-300/90 uppercase">
                      {formData.fullName.trim()[0]}
                    </span>
                  ) : (
                    <UserIcon size={38} className="text-blue-400/70" />
                  )}
                </div>
              )}

              {/* Hover Overlay Icon */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera size={22} className="text-white" />
              </div>
            </div>

            {/* Quick Upload Action Icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0.5 right-0.5 p-2 rounded-full border border-blue-500/30 text-blue-300 hover:text-white transition-all cursor-pointer"
              style={{ background: "#131d36" }}
              title="Change Photo"
              aria-label="Change Photo"
            >
              <Camera size={13} />
            </button>
          </div>

          {/* User Details & Status */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {formData.fullName || sanitizePhone(user?.displayName) || "Guest User"}
                  </h1>
                </div>

                <p className="text-xs sm:text-sm text-zinc-400">
                  {sanitizePhone(user?.identifier || formData.email || "Guest Mode")}
                </p>

                {(formData.city || formData.country) && (
                  <p className="text-xs text-zinc-500 flex items-center justify-center sm:justify-start gap-1.5 mt-2">
                    <MapPin size={13} className="text-blue-400" />
                    <span>{[formData.city, formData.country].filter(Boolean).join(", ")}</span>
                  </p>
                )}
              </div>

              {/* Edit / Cancel Toggle Button */}
              <div>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                  >
                    <X size={14} />
                    <span>{t.auth.cancel}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:opacity-95 border border-blue-500/30 transition-all cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
                  >
                    <Edit3 size={14} />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. GRID: PERSONAL INFO & SIDE CARDS                      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: Personal Information Form / View */}
        <div className="lg:col-span-2 space-y-6">
          <div 
            className="rounded-3xl border shadow-xl p-6 sm:p-7"
            style={{
              background: "rgba(13, 20, 38, 0.8)",
              borderColor: "rgba(59, 130, 246, 0.2)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Personal Information</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Manage your personal details and public profile info.</p>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Full Name <span className="text-blue-400">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Fahim Hossain"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      {formData.fullName || "Not provided"}
                    </p>
                  )}
                </div>

                {/* Display Name / Username */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Display Name / Username <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="e.g. Fahim"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      {formData.displayName || formData.fullName || "Not provided"}
                    </p>
                  )}
                </div>
              </div>

              {/* Email and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Email Address
                    </label>
                    {user?.authMethod === 'email' && (
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 size={11} /> Verified
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2">
                      <Mail size={14} className="text-zinc-400" />
                      <span>{formData.email || user?.identifier || "Not provided"}</span>
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Phone Number
                    </label>
                    {user?.authMethod === 'phone' && (
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 size={11} /> Verified
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                      placeholder="+880 1712345678"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2">
                      <Phone size={14} className="text-zinc-400" />
                      <span>{sanitizePhone(formData.phone) || sanitizePhone(user?.phone) || sanitizePhone(user?.identifier) || "Not provided"}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Date of Birth and Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Date of Birth <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-sm bg-[#0F172A] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2">
                      <Calendar size={14} className="text-zinc-400" />
                      <span>{formData.dob || "Not specified"}</span>
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Gender <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0F172A] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-white px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      {formData.gender || "Not specified"}
                    </p>
                  )}
                </div>
              </div>

              {/* Location: Country and City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Country / Region <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="e.g. Bangladesh"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2">
                      <Globe size={14} className="text-zinc-400" />
                      <span>{formData.country || "Not specified"}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    City <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Dhaka"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2">
                      <MapPin size={14} className="text-zinc-400" />
                      <span>{formData.city || "Not specified"}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* About Me / Bio */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  About Me / Short Bio <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us a little about yourself, your goals, or your focus interests..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  />
                ) : (
                  <p className="text-sm text-zinc-300 px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/5 whitespace-pre-wrap leading-relaxed">
                    {formData.bio || "No bio added yet. Click Edit to share a short summary about yourself."}
                  </p>
                )}
              </div>

              {/* Form Action Buttons (Save / Cancel) */}
              {isEditing && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                  >
                    {t.auth.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg shadow-blue-500/25 hover:opacity-95 border border-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
                  >
                    <Save size={14} />
                    <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Profile Completion & Account Overview */}
        <div className="space-y-6">
          {/* Profile Completion Card */}
          <div 
            className="rounded-3xl border shadow-xl p-6"
            style={{
              background: "rgba(13, 20, 38, 0.8)",
              borderColor: "rgba(59, 130, 246, 0.2)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Profile Completion</h3>
              <span className="text-xs font-bold text-blue-400">{completionPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${completionPercent}%`,
                  background: "linear-gradient(90deg, #2563EB, #38BDF8)",
                  boxShadow: "0 0 10px rgba(56, 189, 248, 0.5)"
                }}
              />
            </div>

            {/* Checklist */}
            <div className="space-y-2.5 text-xs">
              {completionChecks.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.complete ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-zinc-600" />
                    )}
                    <span className={item.complete ? "text-zinc-200" : "text-zinc-500"}>
                      {item.label}
                    </span>
                  </div>
                  <span className={`text-[10px] ${item.complete ? "text-emerald-400 font-semibold" : "text-zinc-500"}`}>
                    {item.complete ? "Complete" : "Optional"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Account Overview Card (Read-only) */}
          <div 
            className="rounded-3xl border shadow-xl p-6"
            style={{
              background: "rgba(13, 20, 38, 0.8)",
              borderColor: "rgba(59, 130, 246, 0.2)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
              <ShieldCheck size={16} className="text-blue-400" />
              <h3 className="text-sm font-bold text-white">Account Information</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="block text-zinc-500 text-[11px] mb-0.5">Account Status</span>
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active</span>
                </div>
              </div>

              <div>
                <span className="block text-zinc-500 text-[11px] mb-0.5">Authentication Method</span>
                <span className="font-semibold text-zinc-200 capitalize">
                  {user?.authMethod === 'google' ? "Google Account" : user?.authMethod ? `${user.authMethod} Authentication` : "Guest Session (Preview)"}
                </span>
              </div>

              <div>
                <span className="block text-zinc-500 text-[11px] mb-0.5">Member Since</span>
                <span className="font-semibold text-zinc-200">
                  {user?.createdAt ? formatDate(user.createdAt) : "Today (Guest Mode)"}
                </span>
              </div>

              <div>
                <span className="block text-zinc-500 text-[11px] mb-0.5">Verification Status</span>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <UserCheck size={14} />
                  <span>{user ? "Verified Account" : "Guest Mode (Unregistered)"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
