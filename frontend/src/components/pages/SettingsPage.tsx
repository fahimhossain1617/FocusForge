"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { 
  User, Lock, Bell, Sliders, HelpCircle, Shield,
  ChevronDown, ChevronRight, Check, ArrowLeft,
  Camera, Trash2, Eye, EyeOff, Upload,
  Mail, Phone, Calendar, Globe, MapPin, Edit3, X, AlertTriangle, Sparkles
} from "lucide-react";
import notificationService from "../../services/notificationService";
import { userService } from "../../services/userService";
import { authService } from "../../services/authService";
import { clearPersistedAppState } from "../../services/indexedDBStorage";
import { localDb } from "../../services/localDbService";
import { aiConsentService } from "../../services/aiConsentService";
import { aiMemoryService } from "../../services/aiMemoryService";
import FocusForgeDatePicker from "../ui/FocusForgeDatePicker";
import FocusForgeSelect from "../ui/FocusForgeSelect";
import { toggleThemeWithCircularTransition } from "../../utils/themeTransition";

import { 
  APP_NAME, 
  APP_VERSION, 
  SUPPORT_EMAIL, 
  PRIVACY_POLICY_LAST_UPDATED, 
  TERMS_OF_SERVICE_LAST_UPDATED, 
  COPYRIGHT_YEAR 
} from "../../config";

// Types for Navigation Hierarchy
export type SettingsGroup = "account" | "preferences" | "support" | "privacy";

export type SettingsSubItem = 
  // Account
  | "profile" 
  | "password" 
  | "notifications"
  // Preferences
  | "language" 
  | "theme" 
  | "about"
  // Support
  | "getting-started" 
  | "faq" 
  | "feature-guides" 
  | "report-problem" 
  | "contact-support" 
  | "feedback"
  // Privacy
  | "ai-privacy"
  | "privacy-policy" 
  | "terms-of-service" 
  | "delete-account";

// Reusable Accessible Toggle Switch
function Toggle({
  checked,
  onChange,
  disabled = false,
  ariaLabel
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`toggle-switch shrink-0 ${checked ? "is-active" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export default function SettingsPage() {
  const { state, updateState, showToast, navigateTo, navigateBack } = useAppContext();
  const { user, isGuest, updateUserProfile, logout, openAuth } = useAuth();
  const { t } = useTranslation();

  // Navigation State
  const [expandedGroup, setExpandedGroup] = useState<SettingsGroup>("account");
  const [activeSubItem, setActiveSubItem] = useState<SettingsSubItem>("profile");

  // Mobile View State: On mobile, 'menu' shows navigation, 'detail' shows the active sub-item page full screen
  const [mobileView, setMobileView] = useState<"menu" | "detail">("menu");

  // =========================================================================
  // URL / ROUTING SYNC
  // =========================================================================
  // Parse route from hash or URL if available
  const parseRoute = useCallback(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#\/?/, "");
    const pathname = window.location.pathname;

    let targetPath = "";
    if (hash.startsWith("settings/")) {
      targetPath = hash.replace(/^settings\//, "");
    } else if (pathname.includes("/settings/")) {
      targetPath = pathname.split("/settings/")[1] || "";
    }

    if (targetPath) {
      const parts = targetPath.split("/");
      const group = parts[0] as SettingsGroup;
      const sub = parts[1] as SettingsSubItem;

      if (["account", "preferences", "support", "privacy"].includes(group)) {
        setExpandedGroup(group);
        if (sub) {
          setActiveSubItem(sub);
          setMobileView("detail");
        }
      }
    } else if (hash === "settings" || hash === "") {
      setMobileView("menu");
    }
  }, []);

  useEffect(() => {
    parseRoute();
    const handlePopState = () => parseRoute();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [parseRoute]);

  const selectSubItem = (group: SettingsGroup, subItem: SettingsSubItem) => {
    setExpandedGroup(group);
    setActiveSubItem(subItem);
    setMobileView("detail");

    if (typeof window !== "undefined") {
      const newHash = `#settings/${group}/${subItem}`;
      window.history.replaceState({ group, subItem }, "", newHash);
    }
  };

  const handleBack = () => {
    // On mobile, if viewing a specific sub-page (e.g. Contact Support, About, etc.),
    // going back returns to the Settings main menu list.
    if (mobileView === "detail") {
      setMobileView("menu");
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "#settings");
      }
      return;
    }

    // If already on Settings menu or on Desktop/Laptop, exit Settings to previous app screen
    navigateBack();
  };

  const toggleGroup = (group: SettingsGroup) => {
    setExpandedGroup(prev => (prev === group ? ("" as any) : group));
  };

  // =========================================================================
  // ACCOUNT > PROFILE STATE & HANDLERS (Logged-in)
  // =========================================================================
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({
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

  const [profileErrors, setProfileErrors] = useState<{
    fullName?: string;
    displayName?: string;
    phone?: string;
    dob?: string;
    bio?: string;
  }>({});

  const sanitizePhone = (val?: string) => {
    if (!val) return "";
    return val.replace(/^\+8800/, "+880").replace(/^8800/, "+880").replace(/^00/, "0");
  };

  useEffect(() => {
    if (user) {
      const cleanPhone = sanitizePhone(user.phone || (user.authMethod === "phone" ? user.identifier : ""));
      const cleanName = user.fullName || user.displayName || "";
      setProfileForm({
        fullName: cleanName,
        displayName: user.displayName || "",
        email: user.email || (user.authMethod === "email" ? user.identifier : ""),
        phone: cleanPhone,
        dob: user.dob || "",
        gender: user.gender || "",
        country: user.country || "",
        city: user.city || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(t.settings.profile.photoTypeError, "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast(t.settings.profile.photoSizeError, "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setProfileForm(prev => ({ ...prev, avatarUrl: base64 }));
      if (user) {
        const success = await updateUserProfile({ avatarUrl: base64 });
        if (success) {
          showToast(t.settings.profile.profileUpdated, "success");
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = async () => {
    setProfileForm(prev => ({ ...prev, avatarUrl: "" }));
    if (user) {
      const success = await updateUserProfile({ avatarUrl: "" });
      if (success) {
        showToast(t.settings.profile.profileUpdated, "success");
      }
    }
  };

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof profileErrors = {};

    const trimmedFullName = profileForm.fullName.trim();
    if (!trimmedFullName || trimmedFullName.length < 2 || trimmedFullName.length > 50) {
      errors.fullName = t.settings.profile.nameLengthError;
    }

    const trimmedDisplayName = profileForm.displayName.trim();
    if (trimmedDisplayName) {
      if (trimmedDisplayName.length < 3 || trimmedDisplayName.length > 30) {
        errors.displayName = "Display name must be between 3 and 30 characters.";
      } else if (!/^[A-Za-z0-9_.]+$/.test(trimmedDisplayName)) {
        errors.displayName = "Letters, numbers, dots and underscores only.";
      }
    }

    if (profileForm.dob) {
      const today = new Date().toISOString().split("T")[0];
      if (profileForm.dob > today) {
        errors.dob = "Date of birth cannot be in the future.";
      }
    }

    if (profileForm.bio && profileForm.bio.length > 200) {
      errors.bio = "Bio cannot exceed 200 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    setIsSavingProfile(true);

    if (user) {
      const success = await updateUserProfile({
        fullName: trimmedFullName,
        displayName: trimmedDisplayName || trimmedFullName,
        phone: profileForm.phone.trim(),
        dob: profileForm.dob,
        gender: profileForm.gender,
        country: profileForm.country.trim(),
        city: profileForm.city.trim(),
        bio: profileForm.bio.trim(),
        avatarUrl: profileForm.avatarUrl,
      });

      setIsSavingProfile(false);
      if (success) {
        setIsEditingProfile(false);
        showToast(t.settings.profile.profileUpdated, "success");
      } else {
        showToast(t.settings.profile.profileUpdateError, "error");
      }
    } else {
      setIsSavingProfile(false);
      setIsEditingProfile(false);
      showToast(t.settings.profile.profileUpdated, "success");
    }
  };

  // =========================================================================
  // ACCOUNT > PASSWORD & SECURITY STATE & HANDLERS
  // =========================================================================
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { current?: string; new?: string; confirm?: string } = {};

    if (!currentPassword) {
      errors.current = t.settings.passwordSecurity.currentRequired;
    }

    if (!newPassword || newPassword.length < 8) {
      errors.new = t.settings.passwordSecurity.minLength;
    } else if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      errors.new = "Password must include an uppercase letter, a number, and a special character.";
    } else if (newPassword === currentPassword) {
      errors.new = t.settings.passwordSecurity.mustDiffer;
    }

    if (newPassword !== confirmPassword) {
      errors.confirm = t.settings.passwordSecurity.confirmMatch;
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    setIsChangingPassword(true);

    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      if (res.success) {
        showToast(t.settings.passwordSecurity.successToast, "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordErrors({ current: res.error || t.settings.passwordSecurity.errorToast });
        showToast(res.error || t.settings.passwordSecurity.errorToast, "error");
      }
    } catch {
      setPasswordErrors({ current: t.settings.passwordSecurity.errorToast });
      showToast(t.settings.passwordSecurity.errorToast, "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // =========================================================================
  // ACCOUNT > NOTIFICATIONS STATE & HANDLERS
  // =========================================================================
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const notifMasterEnabled = state.notifPreferences?.enabled ?? true;
  const soundEnabled = state.notifPreferences?.soundEnabled ?? true;
  const taskReminders = state.notifPreferences?.taskReminders ?? true;
  const focusSessionReminders = state.notifPreferences?.focusSessionReminder ?? true;
  const dailyMorningPlan = state.notifPreferences?.dailyMorningPlan ?? true;
  const dailyProgressReminders = state.notifPreferences?.dailyProgressReminders ?? true;
  const skillReminders = state.notifPreferences?.skillReminders ?? true;
  const inactivityReminders = state.notifPreferences?.inactivityReminders ?? true;
  const motivationalNotifications = state.notifPreferences?.motivationalNotifications ?? true;
  const quietHoursEnabled = state.notifPreferences?.quietHoursEnabled ?? true;
  const orbReactionsMode = state.notifPreferences?.orbReactionsMode || "on";

  const handleMasterToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await notificationService.requestPermission();
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
      if (!granted) {
        showToast(t.settings.notifications.toastDenied, "error");
        updateState({
          notifPreferences: {
            ...state.notifPreferences,
            enabled: false,
          }
        });
        return;
      }
      updateState({
        notifPreferences: {
          ...state.notifPreferences,
          enabled: true,
        }
      });
      showToast(t.settings.notifications.toastEnabled, "success");
    } else {
      updateState({
        notifPreferences: {
          ...state.notifPreferences,
          enabled: false,
        }
      });
      showToast(t.settings.notifications.toastDisabled, "info");
    }
  };

  const handleSubNotificationToggle = (key: string, val: boolean | string) => {
    updateState({
      notifPreferences: {
        ...state.notifPreferences,
        [key]: val,
      }
    });
    showToast(state.lang === "bn" ? "সেভ করা হয়েছে" : "Saved", "info");
  };

  // =========================================================================
  // PREFERENCES > LANGUAGE & THEME HANDLERS
  // =========================================================================
  const handleLanguageChange = (lang: "en" | "bn") => {
    if (state.lang === lang) return;
    updateState({ lang });
    showToast(t.settings.preferences.toastLanguage, "success");
  };

  const handleThemeChange = (mode: "light" | "dark" | "system", e?: React.MouseEvent) => {
    if (state.theme.mode === mode) return;
    toggleThemeWithCircularTransition(e, () => {
      updateState({
        theme: {
          ...state.theme,
          mode,
        },
      });
    });
    if (mode === "light") {
      showToast(t.settings.preferences.toastThemeLight, "info");
    } else if (mode === "dark") {
      showToast(t.settings.preferences.toastThemeDark, "info");
    } else {
      showToast(t.settings.preferences.toastThemeSystem, "info");
    }
  };

  // =========================================================================
  // SUPPORT STATE & HANDLERS
  // =========================================================================
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<"planner" | "focus" | "diary" | "notes" | "capture" | "skillBuilder" | "aiAgent">("planner");

  // Report Form
  const [reportCategory, setReportCategory] = useState("Bug");
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportScreenshot, setReportScreenshot] = useState<string | null>(null);
  const [reportErrors, setReportErrors] = useState<{ title?: string; desc?: string }>({});
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const reportFileInputRef = useRef<HTMLInputElement>(null);

  const handleReportScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast(t.settings.profile.photoTypeError, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 1280;
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setReportScreenshot(canvas.toDataURL("image/jpeg", 0.82));
        } else {
          setReportScreenshot(dataUrl);
        }
      };
      img.onerror = () => setReportScreenshot(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { title?: string; desc?: string } = {};
    if (!reportTitle.trim()) errors.title = "Title is required.";
    if (!reportDesc.trim()) errors.desc = "Description is required.";

    if (Object.keys(errors).length > 0) {
      setReportErrors(errors);
      return;
    }

    setReportErrors({});
    
    const payload = {
      category: reportCategory,
      title: reportTitle.trim(),
      description: reportDesc.trim(),
      screenshot: reportScreenshot || undefined,
      name: user?.displayName || user?.fullName || "User",
      email: user?.email || (user?.authMethod === "email" ? user?.identifier : "") || "",
    };

    // Instant optimistic response (< 0.1s)
    showToast(t.settings.support.reportSuccess, "success");
    setReportTitle("");
    setReportDesc("");
    setReportScreenshot(null);

    // Background dispatch
    userService.submitProblemReport(payload).catch((err) => {
      console.warn("[Report submission background error]:", err);
    });
  };

  // Contact Support Form
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactErrors, setContactErrors] = useState<{ email?: string; subject?: string; message?: string }>({});
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  useEffect(() => {
    if (user) {
      setContactName(user.displayName || user.fullName || "");
      setContactEmail(user.email || (user.authMethod === "email" ? user.identifier : ""));
    }
  }, [user]);

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; subject?: string; message?: string } = {};

    if (!contactEmail.trim() || !contactEmail.includes("@")) {
      errors.email = "Valid email is required.";
    }
    if (!contactSubject.trim()) {
      errors.subject = "Subject is required.";
    }
    if (!contactMessage.trim()) {
      errors.message = "Message is required.";
    }

    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }

    setContactErrors({});

    const payload = {
      name: contactName.trim() || "User",
      email: contactEmail.trim(),
      subject: contactSubject.trim(),
      message: contactMessage.trim(),
    };

    // Instant optimistic response (< 0.1s)
    showToast(t.settings.support.contactSuccess, "success");
    setContactSubject("");
    setContactMessage("");

    // Background dispatch
    userService.sendSupportMessage(payload).catch((err) => {
      console.warn("[Contact submission background error]:", err);
    });
  };

  // Feedback Form
  const [feedbackType, setFeedbackType] = useState("Feature suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackError("Message is required.");
      return;
    }

    setFeedbackError("");

    const payload = {
      type: feedbackType,
      message: feedbackMessage.trim(),
      name: user?.displayName || user?.fullName || "User",
      email: user?.email || (user?.authMethod === "email" ? user?.identifier : "") || "",
    };

    // Instant optimistic response (< 0.1s)
    showToast(t.settings.support.feedbackSuccess, "success");
    setFeedbackMessage("");

    // Background dispatch
    userService.submitFeedback(payload).catch((err) => {
      console.warn("[Feedback submission background error]:", err);
    });
  };

  // =========================================================================
  // PRIVACY > DELETE ACCOUNT STATE & HANDLERS
  // =========================================================================
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteScope, setDeleteScope] = useState<"keep_local" | "full_wipe">("full_wipe");

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE") {
      setDeleteError(t.settings.privacy.deleteAccount.typeMismatch);
      return;
    }

    const isGoogle = user?.authMethod === "google";
    if (!isGoogle && !deletePassword) {
      setDeleteError(t.settings.passwordSecurity.currentRequired);
      return;
    }

    setDeleteError("");
    setIsDeletingAccount(true);

    try {
      const res = await userService.deleteAccount({
        confirmation: "DELETE",
        password: isGoogle ? undefined : deletePassword,
      });

      if (res.success) {
        if (deleteScope === "full_wipe") {
          if (user?.id) {
            await localDb.clearAllUserData(user.id);
          }
          await clearPersistedAppState();
        }
        logout();
        showToast(
          deleteScope === "keep_local"
            ? (state?.lang === "bn" ? "ক্লাউড অ্যাকাউন্ট ও সিঙ্ক ডেটা মোছা হয়েছে। ডিভাইসে লোকাল ডেটা সংরক্ষিত আছে।" : "Cloud account deleted. Local data preserved on this device.")
            : t.settings.privacy.deleteAccount.successToast,
          "info"
        );
        navigateTo("today");
      } else {
        setDeleteError(res.error || t.settings.privacy.deleteAccount.errorToast);
      }
    } catch {
      setDeleteError(t.settings.privacy.deleteAccount.errorToast);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Derived user display details
  const displayName = user?.displayName || (isGuest ? t.settings.profileCard.guestName : "User");
  const displayEmail = user?.identifier || (isGuest ? t.settings.profileCard.guestEmail : "");
  const avatarUrl = user?.avatarUrl;
  const initials = useMemo(() => {
    const parts = (displayName || "").trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (displayName || "U").substring(0, 2).toUpperCase();
  }, [displayName]);

  const isGoogleUser = user?.authMethod === "google";

  // Navigation Structure Definition
  // Rule: Icons appear ONLY before Account, Profile, Password & Security, Notifications, Preferences, Support, Privacy.
  const navigationGroups: {
    id: SettingsGroup;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    subItems: {
      id: SettingsSubItem;
      label: string;
      icon?: React.ComponentType<{ size?: number; className?: string }>;
    }[];
  }[] = [
    {
      id: "account",
      label: t.settings.sections.account,
      icon: User,
      subItems: [
        { id: "profile", label: t.settings.profile.title, icon: User },
        { id: "password", label: t.settings.passwordSecurity.title, icon: Lock },
        { id: "notifications", label: t.settings.notifications.title, icon: Bell },
      ]
    },
    {
      id: "preferences",
      label: t.settings.sections.preferences,
      icon: Sliders,
      subItems: [
        { id: "language", label: t.settings.preferences.languageTitle },
        { id: "theme", label: t.settings.preferences.themeTitle },
        { id: "about", label: t.settings.about.title },
      ]
    },
    {
      id: "support",
      label: t.settings.sections.support,
      icon: HelpCircle,
      subItems: [
        { id: "getting-started", label: t.settings.support.gettingStartedTitle },
        { id: "faq", label: t.settings.support.faqTitle },
        { id: "feature-guides", label: t.settings.support.featureGuidesTitle },
        { id: "report-problem", label: t.settings.support.reportProblemTitle },
        { id: "contact-support", label: t.settings.support.contactSupportTitle },
        { id: "feedback", label: t.settings.support.feedbackTitle },
      ]
    },
    {
      id: "privacy",
      label: t.settings.sections.privacy,
      icon: Shield,
      subItems: [
        { id: "ai-privacy", label: state?.lang === "bn" ? "এআই প্রাইভেসি ও ইমপ্রুভমেন্ট" : "AI Privacy & Improvement", icon: Sparkles },
        { id: "privacy-policy", label: t.settings.privacy.privacyPolicyTitle },
        { id: "terms-of-service", label: t.settings.privacy.termsOfServiceTitle },
        { id: "delete-account", label: t.settings.privacy.deleteAccount.title },
      ]
    },
  ];

  // Helper: Guest Auth Prompt Component
  const GuestPromptCard = ({ heading, text }: { heading: string; text: string }) => (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-8 sm:p-12 text-center max-w-lg mx-auto shadow-none">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
        <User size={26} />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 tracking-tight">
        {heading}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
        {text}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => openAuth("login")}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer min-h-[44px]"
        >
          {t.auth.logIn}
        </button>
        <button
          type="button"
          onClick={() => openAuth("signup")}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer min-h-[44px]"
        >
          {t.auth.signUp}
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-PAGES RENDERER
  // =========================================================================
  const renderActiveSubPage = () => {
    switch (activeSubItem) {
      // ---------------------------------------------------------------------
      // ACCOUNT > PROFILE
      // ---------------------------------------------------------------------
      case "profile": {
        if (isGuest || !user) {
          return (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                  {t.settings.profile.title}
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {t.settings.profile.desc}
                </p>
              </div>
              <GuestPromptCard
                heading="You are using FocusForge as a guest"
                text="Log in or create an account to set up your profile and keep your data in sync."
              />
            </div>
          );
        }

        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.profile.title}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.profile.desc}
              </p>
            </div>

            {/* Hidden Photo Upload Input */}
            <input
              type="file"
              ref={profileFileInputRef}
              onChange={handleAvatarUpload}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />

            {/* Profile Header Card */}
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-7 shadow-none">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Circular Avatar with Camera Button */}
                <div className="relative shrink-0">
                  <div
                    onClick={() => profileFileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full overflow-hidden border border-[var(--color-border-subtle)] flex items-center justify-center cursor-pointer bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    title="Change Profile Photo"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold">{initials}</span>
                    )}
                  </div>

                  {/* Camera overlay button */}
                  <button
                    type="button"
                    onClick={() => profileFileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-[var(--color-surface-elevated)] shadow-none transition-colors cursor-pointer"
                    title="Change Photo"
                    aria-label="Change Photo"
                  >
                    <Camera size={14} />
                  </button>

                  {/* Remove photo button */}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute top-0 right-0 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white ring-2 ring-[var(--color-surface-elevated)] shadow-none transition-colors cursor-pointer"
                      title="Remove Photo"
                      aria-label="Remove Photo"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Name, Email, and Edit Profile Button */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] tracking-tight truncate">
                        {displayName}
                      </h2>
                      <p className="text-sm text-[var(--color-text-secondary)] truncate mt-0.5">
                        {displayEmail}
                      </p>
                    </div>

                    {!isEditingProfile && (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer min-h-[44px] shrink-0"
                      >
                        <Edit3 size={14} />
                        <span>{t.settings.profile.editProfile}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information Card */}
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-7 shadow-none">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle)] mb-6">
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)] tracking-tight">
                    Personal Information
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Manage your personal details.
                  </p>
                </div>
                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSavePersonalInfo} className="space-y-5">
                {/* 1. Full Name & 2. Display Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      Full Name <span className="text-blue-500">*</span>
                    </label>
                    {isEditingProfile ? (
                      <div>
                        <input
                          type="text"
                          required
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                          placeholder="e.g. Fahim Hossain"
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                        />
                        {profileErrors.fullName && (
                          <p className="text-xs text-red-500 mt-1">{profileErrors.fullName}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-primary)] px-3.5 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                        {profileForm.fullName || "Not specified"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      Display Name / Username <span className="text-[var(--color-text-muted)] font-normal">(Optional)</span>
                    </label>
                    {isEditingProfile ? (
                      <div>
                        <input
                          type="text"
                          value={profileForm.displayName}
                          onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                          placeholder="e.g. fahim"
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                        />
                        {profileErrors.displayName && (
                          <p className="text-xs text-red-500 mt-1">{profileErrors.displayName}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-primary)] px-3.5 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                        {profileForm.displayName || "Not specified"}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Email Address & 4. Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-[var(--color-text-primary)]">
                        Email Address
                      </label>
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Verified
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                        <Mail size={14} />
                      </div>
                      <input
                        type="email"
                        readOnly
                        value={profileForm.email || user?.identifier || ""}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] opacity-80 cursor-not-allowed min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      Phone Number <span className="text-[var(--color-text-muted)] font-normal">(Optional)</span>
                    </label>
                    {isEditingProfile ? (
                      <div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                            <Phone size={14} />
                          </div>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: sanitizePhone(e.target.value) })}
                            placeholder="+880 1712345678"
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                          />
                        </div>
                        {profileErrors.phone && (
                          <p className="text-xs text-red-500 mt-1">{profileErrors.phone}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-primary)] px-3.5 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center gap-2">
                        <Phone size={14} className="text-[var(--color-text-muted)] shrink-0" />
                        <span>{sanitizePhone(profileForm.phone) || "Not specified"}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 5. Date of Birth & 6. Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      Date of Birth <span className="text-[var(--color-text-muted)] font-normal">(Optional)</span>
                    </label>
                    {isEditingProfile ? (
                      <div>
                        <FocusForgeDatePicker
                          value={profileForm.dob}
                          onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                          maxDate={new Date().toISOString().split("T")[0]}
                          placeholder="Select date of birth"
                          ariaLabel="Date of Birth"
                        />
                        {profileErrors.dob && (
                          <p className="text-xs text-red-500 mt-1">{profileErrors.dob}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-primary)] px-3.5 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center gap-2">
                        <Calendar size={14} className="text-[var(--color-text-muted)] shrink-0" />
                        <span>{profileForm.dob || "Not specified"}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      Gender <span className="text-[var(--color-text-muted)] font-normal">(Optional)</span>
                    </label>
                    {isEditingProfile ? (
                      <FocusForgeSelect
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                        options={[
                          { value: "", label: "Select gender" },
                          { value: "Male", label: "Male" },
                          { value: "Female", label: "Female" },
                          { value: "Non-binary", label: "Non-binary" },
                          { value: "Prefer not to say", label: "Prefer not to say" },
                        ]}
                        placeholder="Select gender"
                        ariaLabel="Gender"
                      />
                    ) : (
                      <p className="text-sm text-[var(--color-text-primary)] px-3.5 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                        {profileForm.gender || "Not specified"}
                      </p>
                    )}
                  </div>
                </div>

                {/* 7. Country / Region & 8. City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      Country / Region <span className="text-[var(--color-text-muted)] font-normal">(Optional)</span>
                    </label>
                    {isEditingProfile ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                          <Globe size={14} />
                        </div>
                        <input
                          type="text"
                          value={profileForm.country}
                          onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                          placeholder="e.g. Bangladesh"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-primary)] px-3.5 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center gap-2">
                        <Globe size={14} className="text-[var(--color-text-muted)] shrink-0" />
                        <span>{profileForm.country || "Not specified"}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      City <span className="text-[var(--color-text-muted)] font-normal">(Optional)</span>
                    </label>
                    {isEditingProfile ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                          <MapPin size={14} />
                        </div>
                        <input
                          type="text"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                          placeholder="e.g. Dhaka"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-primary)] px-3.5 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center gap-2">
                        <MapPin size={14} className="text-[var(--color-text-muted)] shrink-0" />
                        <span>{profileForm.city || "Not specified"}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 9. About Me / Short Bio */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[var(--color-text-primary)]">
                      About Me / Short Bio <span className="text-[var(--color-text-muted)] font-normal">(Optional)</span>
                    </label>
                    {isEditingProfile && (
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {profileForm.bio.length}/200
                      </span>
                    )}
                  </div>
                  {isEditingProfile ? (
                    <div>
                      <textarea
                        rows={3}
                        maxLength={200}
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        placeholder="Tell us a short summary about yourself..."
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      />
                      {profileErrors.bio && (
                        <p className="text-xs text-red-500 mt-1">{profileErrors.bio}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-primary)] px-3.5 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] whitespace-pre-wrap leading-relaxed">
                      {profileForm.bio || "No bio added yet. Click Edit to share a short summary about yourself."}
                    </p>
                  )}
                </div>

                {/* Form Buttons in Edit Mode */}
                {isEditingProfile && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer min-h-[44px]"
                    >
                      {t.settings.profile.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                      {isSavingProfile ? t.settings.profile.saving : t.settings.profile.save}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // ACCOUNT > PASSWORD & SECURITY
      // ---------------------------------------------------------------------
      case "password": {
        if (isGuest || !user) {
          return (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                  {t.settings.passwordSecurity.title}
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {t.settings.passwordSecurity.desc}
                </p>
              </div>
              <GuestPromptCard
                heading="You are using FocusForge as a guest"
                text="Log in to manage your password and account security."
              />
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.passwordSecurity.title}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.passwordSecurity.desc}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-7 shadow-none">
              {isGoogleUser ? (
                <div className="text-sm text-[var(--color-text-secondary)] py-2 leading-relaxed">
                  {t.settings.passwordSecurity.googleNotice}
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      {t.settings.passwordSecurity.currentPassword}
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                        aria-label={showCurrentPassword ? t.settings.passwordSecurity.hide : t.settings.passwordSecurity.show}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.current && (
                      <p className="text-xs text-red-500 mt-1">{passwordErrors.current}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      {t.settings.passwordSecurity.newPassword}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                        aria-label={showNewPassword ? t.settings.passwordSecurity.hide : t.settings.passwordSecurity.show}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.new && (
                      <p className="text-xs text-red-500 mt-1">{passwordErrors.new}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      {t.settings.passwordSecurity.confirmNewPassword}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                        aria-label={showConfirmPassword ? t.settings.passwordSecurity.hide : t.settings.passwordSecurity.show}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.confirm && (
                      <p className="text-xs text-red-500 mt-1">{passwordErrors.confirm}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                      {isChangingPassword ? t.settings.passwordSecurity.changing : t.settings.passwordSecurity.changePassword}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // ACCOUNT > NOTIFICATIONS
      // ---------------------------------------------------------------------
      case "notifications": {
        const isBlocked = notificationPermission === "denied";

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.notifications.title}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.notifications.desc}
              </p>
            </div>

            {/* Permission Blocked Banner if denied */}
            {isBlocked && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <span className="font-semibold">{t.settings.notifications.permissionBlockedTitle}: </span>
                {t.settings.notifications.permissionBlockedDesc}
              </div>
            )}

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] divide-y divide-[var(--color-border-subtle)] shadow-none">
              {/* Master Push Toggle */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.pushMaster}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.pushMasterDesc}
                  </p>
                </div>
                <Toggle
                  checked={notifMasterEnabled}
                  onChange={handleMasterToggle}
                  ariaLabel={t.settings.notifications.pushMaster}
                />
              </div>

              {/* Notification Sound Toggle (User requirement: On/Off sound control) */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <span>{t.settings.notifications.sound || (state.lang === "bn" ? "নোটিফিকেশন সাউন্ড" : "Notification Sound")}</span>
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.soundDesc || (state.lang === "bn" ? "রিমাইন্ডার বা অ্যালার্ট আসলে মিষ্টি সুর বা শব্দ বাজান।" : "Play an audio chime when a reminder or alert arrives.")}
                  </p>
                </div>
                <Toggle
                  checked={soundEnabled}
                  disabled={!notifMasterEnabled}
                  onChange={(val) => handleSubNotificationToggle("soundEnabled", val)}
                  ariaLabel={t.settings.notifications.sound || "Notification Sound"}
                />
              </div>

              {/* Task Reminders */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.taskReminders}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.taskRemindersDesc}
                  </p>
                </div>
                <Toggle
                  checked={taskReminders}
                  disabled={!notifMasterEnabled}
                  onChange={(val) => handleSubNotificationToggle("taskReminders", val)}
                  ariaLabel={t.settings.notifications.taskReminders}
                />
              </div>

              {/* Focus Session Reminders */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.focusSessionReminders}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.focusSessionRemindersDesc}
                  </p>
                </div>
                <Toggle
                  checked={focusSessionReminders}
                  disabled={!notifMasterEnabled}
                  onChange={(val) => handleSubNotificationToggle("focusSessionReminder", val)}
                  ariaLabel={t.settings.notifications.focusSessionReminders}
                />
              </div>

              {/* Daily Morning Plan */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.dailyMorningPlan || (state.lang === "bn" ? "আজকের সকালের প্ল্যান" : "Daily Morning Plan")}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.dailyMorningPlanDesc || (state.lang === "bn" ? "প্রতিদিন সকালে দিনের লক্ষ্য ও প্ল্যান সাজানোর রিমাইন্ডার পান।" : "Receive a morning reminder to plan and structure your daily goals.")}
                  </p>
                </div>
                <Toggle
                  checked={dailyMorningPlan}
                  disabled={!notifMasterEnabled}
                  onChange={(val) => handleSubNotificationToggle("dailyMorningPlan", val)}
                  ariaLabel={t.settings.notifications.dailyMorningPlan || "Daily Morning Plan"}
                />
              </div>

              {/* Time Log / Skill Reminders */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.skillReminders || (state.lang === "bn" ? "টাইম লগ ও স্কিল চর্চা" : "Time Log & Skill Practice")}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.skillRemindersDesc || (state.lang === "bn" ? "প্রতিদিনের বিষয়ভিত্তিক পড়ার ও স্কিল চর্চার রিমাইন্ডার।" : "Timely check-ins for your subject learning and skill tracking.")}
                  </p>
                </div>
                <Toggle
                  checked={skillReminders}
                  disabled={!notifMasterEnabled}
                  onChange={(val) => handleSubNotificationToggle("skillReminders", val)}
                  ariaLabel={t.settings.notifications.skillReminders || "Time Log & Skill Practice"}
                />
              </div>

              {/* Inactivity Companion */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.inactivityReminders || (state.lang === "bn" ? "নিষ্ক্রিয়তার সঙ্গী তাগিদ" : "Inactivity Companion")}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.inactivityRemindersDesc || (state.lang === "bn" ? "অনেকক্ষণ বিরতি থাকলে কাজে ফিরে আসার বন্ধুত্বপূর্ণ তাগিদ।" : "Friendly nudge to return to your goals after extended idle time.")}
                  </p>
                </div>
                <Toggle
                  checked={inactivityReminders}
                  disabled={!notifMasterEnabled}
                  onChange={(val) => handleSubNotificationToggle("inactivityReminders", val)}
                  ariaLabel={t.settings.notifications.inactivityReminders || "Inactivity Companion"}
                />
              </div>

              {/* Streaks & Achievements */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.motivationalNotifications || (state.lang === "bn" ? "ধারাবাহিকতা ও অর্জন" : "Streaks & Achievements")}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.motivationalNotificationsDesc || (state.lang === "bn" ? "স্ট্রিক ও নতুন অর্জনের মোটিভেশনাল নোটিফিকেশন।" : "Motivational celebrations for habit streaks and completed milestones.")}
                  </p>
                </div>
                <Toggle
                  checked={motivationalNotifications}
                  disabled={!notifMasterEnabled}
                  onChange={(val) => handleSubNotificationToggle("motivationalNotifications", val)}
                  ariaLabel={t.settings.notifications.motivationalNotifications || "Streaks & Achievements"}
                />
              </div>

              {/* Daily Progress Reminders */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.dailyProgressReminders}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.dailyProgressRemindersDesc}
                  </p>
                </div>
                <Toggle
                  checked={dailyProgressReminders}
                  disabled={!notifMasterEnabled}
                  onChange={(val) => handleSubNotificationToggle("dailyProgressReminders", val)}
                  ariaLabel={t.settings.notifications.dailyProgressReminders}
                />
              </div>

              {/* Quiet Hours */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.quietHours || (state.lang === "bn" ? "কোয়াইট আওয়ারস (১০:০০ PM - ৭:০০ AM)" : "Quiet Hours (10:00 PM – 7:00 AM)")}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.quietHoursDesc || (state.lang === "bn" ? "এই সময়ে অর্ব ঘুমাবে, শুধু জরুরি অ্যালার্ট ছাড়া অন্য রিমাইন্ডার বন্ধ থাকবে।" : "Orb sleeps during this window, silencing non-urgent alerts.")}
                  </p>
                </div>
                <Toggle
                  checked={quietHoursEnabled}
                  disabled={!notifMasterEnabled}
                  onChange={(val) => handleSubNotificationToggle("quietHoursEnabled", val)}
                  ariaLabel={t.settings.notifications.quietHours || "Quiet Hours"}
                />
              </div>

              {/* Orb Reactions Mode */}
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className={notifMasterEnabled ? "" : "opacity-40"}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.notifications.orbReactions || (state.lang === "bn" ? "অর্ব রিঅ্যাকশন মোড" : "Orb Reactions Mode")}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t.settings.notifications.orbReactionsDesc || (state.lang === "bn" ? "নোটিফিকেশনে ৩ডি অর্বের অভিব্যক্তি ও অ্যানিমেশন নিয়ন্ত্রণ করুন।" : "Choose interactive 3D orb expression animations in notifications.")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] shrink-0">
                  {(["on", "reduced_motion", "off"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={!notifMasterEnabled}
                      onClick={() => handleSubNotificationToggle("orbReactionsMode", mode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        orbReactionsMode === mode
                          ? "bg-blue-600 text-white shadow-none"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                      }`}
                    >
                      {mode === "on"
                        ? (state.lang === "bn" ? "চালু" : "On")
                        : mode === "reduced_motion"
                        ? (state.lang === "bn" ? "সীমিত গতি" : "Reduced")
                        : (state.lang === "bn" ? "বন্ধ" : "Off")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // PREFERENCES > LANGUAGE
      // ---------------------------------------------------------------------
      case "language": {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.preferences.languageTitle}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.preferences.languageDesc}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-5 sm:p-6 shadow-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* English */}
                <button
                  type="button"
                  onClick={() => handleLanguageChange("en")}
                  className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer min-h-[56px] ${
                    state.lang === "en"
                      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <span className="text-sm">{t.settings.preferences.langEn}</span>
                  {state.lang === "en" && <Check size={16} className="shrink-0" />}
                </button>

                {/* Bangla */}
                <button
                  type="button"
                  onClick={() => handleLanguageChange("bn")}
                  className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer min-h-[56px] ${
                    state.lang === "bn"
                      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <span className="text-sm">{t.settings.preferences.langBn}</span>
                  {state.lang === "bn" && <Check size={16} className="shrink-0" />}
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // PREFERENCES > THEME
      // ---------------------------------------------------------------------
      case "theme": {
        const currentMode = state.theme.mode;
        const isDark = currentMode === "dark";
        const isLight = currentMode === "light";
        const isSystem = currentMode === "system";

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.preferences.themeTitle}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.preferences.themeDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Dark Theme Card */}
              <button
                type="button"
                onClick={(e) => handleThemeChange("dark", e)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  isDark
                    ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.preferences.dark}
                  </span>
                  {isDark && (
                    <span className="p-1 rounded-full bg-blue-600 text-white">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <div className="h-16 rounded-lg bg-[#0D1426] border border-blue-900/40 p-2.5 flex flex-col justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-8 h-2 rounded bg-blue-500/30" />
                    <div className="w-12 h-2 rounded bg-white/10" />
                  </div>
                  <div className="w-20 h-2 rounded bg-white/5" />
                </div>
              </button>

              {/* Light Theme Card */}
              <button
                type="button"
                onClick={(e) => handleThemeChange("light", e)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  isLight
                    ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.preferences.light}
                  </span>
                  {isLight && (
                    <span className="p-1 rounded-full bg-blue-600 text-white">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <div className="h-16 rounded-lg bg-white border border-[#E2E8F0] p-2.5 flex flex-col justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-8 h-2 rounded bg-blue-500/30" />
                    <div className="w-12 h-2 rounded bg-black/10" />
                  </div>
                  <div className="w-20 h-2 rounded bg-black/5" />
                </div>
              </button>

              {/* System Theme Card */}
              <button
                type="button"
                onClick={(e) => handleThemeChange("system", e)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  isSystem
                    ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.settings.preferences.system}
                  </span>
                  {isSystem && (
                    <span className="p-1 rounded-full bg-blue-600 text-white">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <div className="h-16 rounded-lg overflow-hidden border border-[var(--color-border-subtle)] flex">
                  <div className="w-1/2 h-full bg-[#0D1426] p-2 flex flex-col justify-between border-r border-white/10">
                    <div className="w-6 h-1.5 rounded bg-blue-500/40" />
                    <div className="w-10 h-1.5 rounded bg-white/10" />
                  </div>
                  <div className="w-1/2 h-full bg-white p-2 flex flex-col justify-between">
                    <div className="w-6 h-1.5 rounded bg-blue-500/40" />
                    <div className="w-10 h-1.5 rounded bg-black/10" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // PREFERENCES > ABOUT FOCUSFORGE
      // ---------------------------------------------------------------------
      case "about": {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.about.title}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.about.tagline}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-8 space-y-6 shadow-none">
              {/* What is FocusForge */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {t.settings.about.whatIsTitle}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {t.settings.about.whatIsContent}
                </p>
              </div>

              {/* Our Purpose */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {t.settings.about.purposeTitle}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {t.settings.about.purposeContent}
                </p>
              </div>

              {/* Core Features */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                  {t.settings.about.coreFeaturesTitle}
                </h3>
                <ul className="space-y-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  <li>• {t.settings.about.features.dashboard}</li>
                  <li>• {t.settings.about.features.planner}</li>
                  <li>• {t.settings.about.features.focus}</li>
                  <li>• {t.settings.about.features.notes}</li>
                  <li>• {t.settings.about.features.capture}</li>
                  <li>• {t.settings.about.features.diary}</li>
                  <li>• {t.settings.about.features.skillBuilder}</li>
                  <li>• {t.settings.about.features.aiAgent}</li>
                </ul>
              </div>

              {/* Version Information */}
              <div className="pt-4 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>{APP_NAME} {t.settings.about.version} {APP_VERSION}</span>
                <span>(c) {COPYRIGHT_YEAR} {APP_NAME}. {t.settings.about.copyright}</span>
              </div>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // SUPPORT > GETTING STARTED
      // ---------------------------------------------------------------------
      case "getting-started": {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.support.gettingStartedTitle}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.support.desc}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-none leading-relaxed text-sm text-[var(--color-text-primary)]">
              <p>{t.settings.support.gettingStartedContent}</p>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // SUPPORT > FREQUENTLY ASKED QUESTIONS
      // ---------------------------------------------------------------------
      case "faq": {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.support.faqTitle}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.support.desc}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] divide-y divide-[var(--color-border-subtle)] shadow-none">
              {t.settings.support.faqs.map((faq, idx) => {
                const isExpanded = expandedFaqIndex === idx;
                return (
                  <div key={idx} className="p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between text-left gap-4 cursor-pointer"
                      aria-expanded={isExpanded}
                    >
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {faq.q}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-[var(--color-text-muted)] shrink-0 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-3 leading-relaxed">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // SUPPORT > FEATURE GUIDES
      // ---------------------------------------------------------------------
      case "feature-guides": {
        const guides = [
          { key: "planner" as const, title: t.settings.support.guides.planner.title, desc: t.settings.support.guides.planner.desc },
          { key: "focus" as const, title: t.settings.support.guides.focus.title, desc: t.settings.support.guides.focus.desc },
          { key: "diary" as const, title: t.settings.support.guides.diary.title, desc: t.settings.support.guides.diary.desc },
          { key: "notes" as const, title: t.settings.support.guides.notes.title, desc: t.settings.support.guides.notes.desc },
          { key: "capture" as const, title: t.settings.support.guides.capture.title, desc: t.settings.support.guides.capture.desc },
          { key: "skillBuilder" as const, title: t.settings.support.guides.skillBuilder.title, desc: t.settings.support.guides.skillBuilder.desc },
          { key: "aiAgent" as const, title: t.settings.support.guides.aiAgent.title, desc: t.settings.support.guides.aiAgent.desc },
        ];

        const selectedGuide = guides.find(g => g.key === activeGuideTab) || guides[0];

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.support.featureGuidesTitle}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.support.desc}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Guides Selector Tabs */}
              <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-2 divide-y divide-[var(--color-border-subtle)] md:divide-y-0 space-y-1 shadow-none">
                {guides.map((g) => {
                  const isActive = activeGuideTab === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setActiveGuideTab(g.key)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer min-h-[44px] flex items-center justify-between ${
                        isActive
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                          : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                      }`}
                    >
                      <span>{g.title}</span>
                      {isActive && <Check size={14} />}
                    </button>
                  );
                })}
              </div>

              {/* Guide Content Display */}
              <div className="md:col-span-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-7 shadow-none">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">
                  {selectedGuide.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {selectedGuide.desc}
                </p>
              </div>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // SUPPORT > REPORT A PROBLEM
      // ---------------------------------------------------------------------
      case "report-problem": {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.support.reportProblemTitle}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.support.reportDesc}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-7 shadow-none">
              <form onSubmit={handleSubmitReport} className="space-y-4 max-w-xl">
                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                    {t.settings.support.reportCategory}
                  </label>
                  <FocusForgeSelect
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    options={[
                      { value: "Bug", label: t.settings.support.categories.bug },
                      { value: "Performance", label: t.settings.support.categories.performance },
                      { value: "Display issue", label: t.settings.support.categories.display },
                      { value: "Other", label: t.settings.support.categories.other },
                    ]}
                    ariaLabel={t.settings.support.reportCategory}
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                    {t.settings.support.reportTitle} <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder={t.settings.support.reportTitlePlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                  />
                  {reportErrors.title && (
                    <p className="text-xs text-red-500 mt-1">{reportErrors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                    {t.settings.support.reportDetails} <span className="text-blue-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder={t.settings.support.reportDetailsPlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                  {reportErrors.desc && (
                    <p className="text-xs text-red-500 mt-1">{reportErrors.desc}</p>
                  )}
                </div>

                {/* Screenshot Upload (Optional) */}
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                    {t.settings.support.screenshotOptional}
                  </label>
                  <input
                    type="file"
                    ref={reportFileInputRef}
                    onChange={handleReportScreenshot}
                    accept="image/*"
                    className="hidden"
                  />
                  {reportScreenshot ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {t.settings.support.screenshotAttached}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReportScreenshot(null)}
                        className="text-xs text-red-500 hover:underline cursor-pointer"
                      >
                        {t.settings.support.removeScreenshot}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => reportFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--color-text-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer min-h-[44px]"
                    >
                      <Upload size={14} />
                      <span>{t.settings.support.uploadScreenshot}</span>
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {isSubmittingReport ? t.settings.support.submitting : t.settings.support.submitReport}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // SUPPORT > CONTACT SUPPORT
      // ---------------------------------------------------------------------
      case "contact-support": {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.support.contactSupportTitle}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.support.contactDesc}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-7 shadow-none space-y-6 max-w-xl">
              <div className="text-xs text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text-primary)]">{t.settings.support.supportEmailText} </span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{SUPPORT_EMAIL}</span>
              </div>

              <form onSubmit={handleSubmitContact} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      {t.settings.support.contactName}
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      {t.settings.support.contactEmail} <span className="text-blue-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                    />
                    {contactErrors.email && (
                      <p className="text-xs text-red-500 mt-1">{contactErrors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                    {t.settings.support.contactSubject} <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder={t.settings.support.contactSubjectPlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                  />
                  {contactErrors.subject && (
                    <p className="text-xs text-red-500 mt-1">{contactErrors.subject}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                    {t.settings.support.contactMessage} <span className="text-blue-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder={t.settings.support.contactMessagePlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                  {contactErrors.message && (
                    <p className="text-xs text-red-500 mt-1">{contactErrors.message}</p>
                  )}
                </div>

                <p className="text-xs text-[var(--color-text-muted)]">
                  {t.settings.support.contactNotice}
                </p>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {isSubmittingContact ? t.settings.support.sending : t.settings.support.sendMessage}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // SUPPORT > FEEDBACK & SUGGESTIONS
      // ---------------------------------------------------------------------
      case "feedback": {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.support.feedbackTitle}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.support.feedbackDesc}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-7 shadow-none">
              <form onSubmit={handleSubmitFeedback} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                    {t.settings.support.feedbackType}
                  </label>
                  <FocusForgeSelect
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    options={[
                      { value: "Feature suggestion", label: t.settings.support.feedbackTypes.feature },
                      { value: "Improvement", label: t.settings.support.feedbackTypes.improvement },
                      { value: "General feedback", label: t.settings.support.feedbackTypes.general },
                    ]}
                    ariaLabel={t.settings.support.feedbackType}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                    {t.settings.support.feedbackMessage} <span className="text-blue-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder={t.settings.support.feedbackMessagePlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                  {feedbackError && (
                    <p className="text-xs text-red-500 mt-1">{feedbackError}</p>
                  )}
                </div>

                <p className="text-xs text-[var(--color-text-muted)]">
                  {t.settings.support.feedbackNotice}
                </p>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {isSubmittingFeedback ? t.settings.support.submitting : t.settings.support.submitFeedback}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // PRIVACY > AI PRIVACY & IMPROVEMENT
      // ---------------------------------------------------------------------
      case "ai-privacy": {
        const isBn = state?.lang === "bn";
        const currentConsent = aiConsentService.getConsent(user?.id);
        const isImprovementAllowed = currentConsent === "granted";

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {isBn ? "এআই প্রাইভেসি ও ইমপ্রুভমেন্ট" : "AI Privacy & Improvement"}
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {isBn 
                  ? "FocusForge AI কীভাবে আপনার ডেটা পরিচালনা করে এবং আপনার গোপনীয়তা রক্ষা করে তা নিয়ন্ত্রণ করুন" 
                  : "Control how FocusForge AI handles your data and personalizes interactions"}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 space-y-6 shadow-none max-w-2xl">
              {/* Allow AI Improvement Toggle Card */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-[var(--color-border-subtle)]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {isBn ? "এআই ইমপ্রুভমেন্ট ও লোকাল মেমোরি" : "Allow AI Improvement & Local Personalization"}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {isBn
                      ? "চালু থাকলে AI আপনার কথা বলার পছন্দ ও কাজের ধরন শুধুমাত্র আপনার এই ডিভাইসে লোকালি মনে রাখে, যাতে পরবর্তীতে আরও উপযোগী উত্তর দিতে পারে। এটি চালু রাখা ডিফল্ট ও সুপারিশকৃত।"
                      : "When enabled, the AI securely learns non-sensitive preferences and workflow habits locally on this device to provide smarter, tailored assistance."}
                  </p>
                </div>
                <Toggle
                  checked={isImprovementAllowed}
                  onChange={(val) => {
                    const newConsent = val ? "granted" : "private";
                    aiConsentService.setConsent(user?.id, newConsent);
                    showToast(
                      isBn 
                        ? (val ? "এআই ইমপ্রুভমেন্ট সক্রিয় করা হয়েছে।" : "চ্যাট প্রাইভেট মোডে সেট করা হয়েছে।")
                        : (val ? "AI Improvement enabled." : "Chats set to private mode."),
                      "info"
                    );
                    updateState({});
                  }}
                  ariaLabel="Toggle AI Improvement"
                />
              </div>

              {/* Private Mode Notice */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-[var(--color-text-secondary)]">
                <Lock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {isBn ? "পূর্ণ নিয়ন্ত্রণ ও কোনো বাধ্যতামূলক বাধা নেই" : "Full Control & Zero Feature Penalties"}
                  </p>
                  <p>
                    {isBn
                      ? "চ্যাট প্রাইভেট রাখলেও আপনি FocusForge-এর সব এআই ফিচার ও অ্যাসিস্ট্যান্ট সুবিধা সম্পূর্ণভাবে ব্যবহার করতে পারবেন।"
                      : "Even if you choose to keep chats private, you retain 100% full access to all FocusForge features and tools."}
                  </p>
                </div>
              </div>

              {/* Disappearing Messages Guide */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs text-[var(--color-text-secondary)]">
                <EyeOff className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {isBn ? "ডিজঅ্যাপিয়ারিং বার্তা (Disappearing Messages)" : "Disappearing Message Mode"}
                  </p>
                  <p>
                    {isBn
                      ? "চ্যাটের উপরের চোখের আইকনে ট্যাপ করে যেকোনো সময় সাময়িক চ্যাট করতে পারেন—যা কোনো হিস্ট্রি, মেমোরি বা ক্লাউড স্টোরেজে সেভ হয় না।"
                      : "Tap the eye icon inside the AI chat interface to toggle temporary, zero-persistence messaging anytime."}
                  </p>
                </div>
              </div>

              {/* Clear Memory Button */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {isBn ? "লোকাল এআই মেমোরি মুছুন" : "Clear AI Local Memory"}
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {isBn ? "ডিভাইসে সংরক্ষিত সকল ব্যক্তিগত এআই পছন্দ মুছে ফেলুন" : "Erase all learned preferences and corrections on this device"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await aiMemoryService.clearAllMemories(user?.id);
                    showToast(isBn ? "সকল লোকাল এআই মেমোরি সফলভাবে মুছে ফেলা হয়েছে!" : "Local AI memory cleared!", "success");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-red-500 hover:text-white hover:bg-red-500/90 border border-red-500/30 transition-colors cursor-pointer flex items-center"
                >
                  <Trash2 size={13} className="mr-1.5" />
                  {isBn ? "মেমোরি মুছুন" : "Clear Memories"}
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // PRIVACY > PRIVACY POLICY
      // ---------------------------------------------------------------------
      case "privacy-policy": {
        const policy = t.settings.privacy.policyText;

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.privacy.privacyPolicyTitle}
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {t.settings.privacy.lastUpdated} {PRIVACY_POLICY_LAST_UPDATED}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-8 space-y-6 shadow-none text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
              <p>{policy.intro}</p>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {policy.sec1Title}
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {policy.sec1List.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {policy.sec2Title}
                </h3>
                <p>{policy.sec2Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {policy.sec3Title}
                </h3>
                <p>{policy.sec3Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {policy.sec4Title}
                </h3>
                <p>{policy.sec4Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {policy.sec5Title}
                </h3>
                <p>{policy.sec5Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {policy.sec6Title}
                </h3>
                <p>{policy.sec6Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {policy.sec7Title}
                </h3>
                <p>{policy.sec7Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {policy.sec8Title}
                </h3>
                <p>{policy.sec8Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {policy.sec9Title}
                </h3>
                <p>{policy.sec9Text}</p>
              </div>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // PRIVACY > TERMS OF SERVICE
      // ---------------------------------------------------------------------
      case "terms-of-service": {
        const terms = t.settings.privacy.termsText;

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {t.settings.privacy.termsOfServiceTitle}
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {t.settings.privacy.lastUpdated} {TERMS_OF_SERVICE_LAST_UPDATED}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-8 space-y-6 shadow-none text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
              <p>{terms.intro}</p>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec1Title}
                </h3>
                <p>{terms.sec1Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec2Title}
                </h3>
                <p>{terms.sec2Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec3Title}
                </h3>
                <p>{terms.sec3Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec4Title}
                </h3>
                <p>{terms.sec4Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec5Title}
                </h3>
                <p>{terms.sec5Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec6Title}
                </h3>
                <p>{terms.sec6Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec7Title}
                </h3>
                <p>{terms.sec7Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec8Title}
                </h3>
                <p>{terms.sec8Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec9Title}
                </h3>
                <p>{terms.sec9Text}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  {terms.sec10Title}
                </h3>
                <p>{terms.sec10Text}</p>
              </div>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // PRIVACY > DELETE ACCOUNT
      // ---------------------------------------------------------------------
      case "delete-account": {
        if (isGuest || !user) {
          return (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                  {t.settings.privacy.deleteAccount.title}
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {t.settings.privacy.deleteAccount.desc}
                </p>
              </div>
              <GuestPromptCard
                heading="You are using FocusForge as a guest"
                text="There is no account to delete. Log in to manage your account."
              />
            </div>
          );
        }

        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 tracking-tight flex items-center gap-2.5">
                <AlertTriangle className="text-red-500 shrink-0" size={24} />
                {t.settings.privacy.deleteAccount.modalTitle}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {t.settings.privacy.deleteAccount.desc}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 sm:p-7 space-y-6 shadow-none">
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {t.settings.privacy.deleteAccount.modalWarning}
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {t.settings.privacy.deleteAccount.itemsList.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Option A vs Option B Deletion Scope Choice */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
                  {state?.lang === "bn" ? "ডিলিট অপশন সিলেক্ট করুন:" : "Select Deletion Scope:"}
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeleteScope("full_wipe")}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      deleteScope === "full_wipe"
                        ? "border-red-500 bg-red-500/10 text-[var(--color-text-primary)]"
                        : "border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] opacity-80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteScope"
                      checked={deleteScope === "full_wipe"}
                      onChange={() => setDeleteScope("full_wipe")}
                      className="mt-0.5 accent-red-600 cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {state?.lang === "bn" ? "অপশন বি: সম্পূর্ণ ডেটা মুছে ফেলুন (Full Wipe Everywhere)" : "Option B: Full Wipe (Cloud & Local Device)"}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {state?.lang === "bn"
                          ? "সার্ভার ও সিঙ্ক রেকর্ড থেকে অ্যাকাউন্ট মোছার পাশাপাশি এই ডিভাইসের সমস্ত লোকাল ডেটা স্থায়ীভাবে মুছে দেওয়া হবে।"
                          : "Permanently deletes your cloud account, remote sync records, and completely wipes all local data from this device."}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteScope("keep_local")}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      deleteScope === "keep_local"
                        ? "border-amber-500 bg-amber-500/10 text-[var(--color-text-primary)]"
                        : "border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] opacity-80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteScope"
                      checked={deleteScope === "keep_local"}
                      onChange={() => setDeleteScope("keep_local")}
                      className="mt-0.5 accent-amber-600 cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {state?.lang === "bn" ? "অপশন এ: শুধু ক্লাউড মুছুন, লোকাল ডেটা রাখুন (Keep Local Data)" : "Option A: Delete Cloud Account Only (Keep Local Data)"}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {state?.lang === "bn"
                          ? "সার্ভার ও সিঙ্ক রেকর্ড থেকে অ্যাকাউন্ট পুরোপুরি মুছে যাবে, কিন্তু এই ডিভাইসে আপনার বর্তমান নোট ও টাস্ক সুরক্ষিত থাকবে।"
                          : "Deletes your account and sync data from the cloud, but preserves your current notes, tasks, and history locally on this device."}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="border-t border-red-500/20 pt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                    {t.settings.privacy.deleteAccount.typePrompt}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => {
                      setDeleteConfirmText(e.target.value);
                      if (deleteError) setDeleteError("");
                    }}
                    placeholder="DELETE"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] font-mono uppercase focus:outline-none focus:border-red-500 transition-colors min-h-[44px]"
                  />
                </div>

                {!isGoogleUser ? (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                      {t.settings.privacy.deleteAccount.passwordPrompt}
                    </label>
                    <div className="relative">
                      <input
                        type={showDeletePassword ? "text" : "password"}
                        value={deletePassword}
                        onChange={(e) => {
                          setDeletePassword(e.target.value);
                          if (deleteError) setDeleteError("");
                        }}
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-red-500 transition-colors min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t.settings.privacy.deleteAccount.googlePrompt}
                  </p>
                )}

                {deleteError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-medium">
                    {deleteError}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={deleteConfirmText.trim() !== "DELETE" || isDeletingAccount || (!isGoogleUser && !deletePassword)}
                    onClick={handleDeleteAccount}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-none cursor-pointer disabled:opacity-40 min-h-[44px] flex items-center justify-center"
                  >
                    {isDeletingAccount ? t.settings.privacy.deleteAccount.deleting : t.settings.privacy.deleteAccount.confirmButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmText("");
                      setDeletePassword("");
                      setDeleteError("");
                      handleBack();
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer min-h-[44px]"
                  >
                    {t.settings.privacy.deleteAccount.cancelButton}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="motion-page max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center justify-center w-9 h-9 -ml-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-colors cursor-pointer"
          aria-label={state.lang === 'bn' ? "ফিরে যান" : "Back"}
          title={state.lang === 'bn' ? "ফিরে যান" : "Back"}
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      {/* Main Container: Desktop Two-Panel Layout vs Mobile Accordion & Subpage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================================================================= */}
        {/* LEFT PANEL: 2-Level Expandable Navigation Menu (Desktop & Mobile) */}
        {/* ================================================================= */}
        <aside
          className={`lg:col-span-4 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-4 sm:p-5 shadow-none ${
            mobileView === "detail" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Top Profile Card in Left Panel */}
          <div className="p-3 mb-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-[var(--color-border-subtle)] bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                  {displayEmail}
                </p>
              </div>
            </div>

            {isGuest ? (
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer shrink-0"
              >
                {t.auth.logIn}
              </button>
            ) : null}
          </div>

          {/* 2-Level Navigation Tree */}
          <nav className="space-y-1.5" aria-label="Settings Navigation">
            {navigationGroups.map((group) => {
              const isExpanded = expandedGroup === group.id;
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="rounded-xl overflow-hidden">
                  {/* Group Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Chevron Arrow at front (Points right when collapsed, down when expanded) */}
                      <span className="text-[var(--color-text-muted)] shrink-0 transition-transform duration-180 inline-flex items-center justify-center">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>

                      {/* Icon for Group */}
                      <GroupIcon size={16} className="text-[var(--color-text-secondary)] shrink-0" />

                      {/* Label */}
                      <span className="truncate">{group.label}</span>
                    </div>
                  </button>

                  {/* Sub-items list with vertical guideline */}
                  {isExpanded && (
                    <div className="mt-1 mb-2 ml-4 pl-3 border-l border-[var(--color-border-subtle)] space-y-1 transition-all duration-180">
                      {group.subItems.map((sub) => {
                        const isSubActive = activeSubItem === sub.id;
                        const SubIcon = sub.icon;

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => selectSubItem(group.id, sub.id)}
                            aria-current={isSubActive ? "page" : undefined}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer min-h-[38px] text-left ${
                              isSubActive
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] font-normal"
                            }`}
                          >
                            {SubIcon && <SubIcon size={14} className="shrink-0" />}
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ================================================================= */}
        {/* RIGHT PANEL: Active Sub-Item Content Panel                        */}
        {/* ================================================================= */}
        <main
          className={`lg:col-span-8 min-w-0 ${
            mobileView === "menu" ? "hidden lg:block" : "block"
          }`}
        >


          {/* Active Sub-item Content */}
          <div className="motion-page">
            {renderActiveSubPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
