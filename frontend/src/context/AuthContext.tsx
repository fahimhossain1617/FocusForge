"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, AuthModalView } from "../types";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { supabase } from "../lib/supabaseClient";
import { useAppContext } from "./AppContext";
import { useTranslation } from "../hooks/useTranslation";
import { clearGuestData } from "../services/indexedDBStorage";
import { onboardingStorage } from "../services/onboardingStorage";
import { accountManager, RememberedAccount } from "../services/accountManager";
import GuestTransitionModal from "../components/auth/GuestTransitionModal";
import AccountSwitcherModal from "../components/auth/AccountSwitcherModal";

export type AuthLifecycle =
  | "INITIALIZING"
  | "GUEST"
  | "GUEST_TRANSITION_PENDING"
  | "UNAUTHENTICATED"
  | "AUTHENTICATING"
  | "AUTHENTICATED"
  | "SWITCHING_ACCOUNT"
  | "SIGNING_OUT"
  | "RECOVERING_SESSION"
  | "ERROR";

interface AuthModalState {
  isOpen: boolean;
  view: AuthModalView;
  targetPage?: string;
  onAuthenticated?: () => void;
  initialIdentifier?: string;
}

interface AuthGuardModalState {
  isOpen: boolean;
  targetPage?: string;
  onAuthenticated?: () => void;
}

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  lifecycle: AuthLifecycle;
  isGuestModeDisabled: boolean;
  rememberedAccounts: RememberedAccount[];

  // Modals state
  authModal: AuthModalState;
  authGuardModal: AuthGuardModalState;
  logoutConfirmOpen: boolean;
  accountSwitcherOpen: boolean;
  guestTransitionWarningOpen: boolean;

  // Modal controls
  openAuth: (view?: AuthModalView, options?: { targetPage?: string; onAuthenticated?: () => void; initialIdentifier?: string }) => void;
  closeAuth: () => void;
  setAuthView: (view: AuthModalView) => void;
  openAuthGuard: (options?: { targetPage?: string; onAuthenticated?: () => void }) => void;
  closeAuthGuard: () => void;
  openAccountSwitcher: () => void;
  closeAccountSwitcher: () => void;

  // Account switching & management
  switchAccount: (targetAccount?: RememberedAccount) => Promise<void>;
  removeRememberedAccount: (accountId: string) => void;

  // Guard helper
  requireAuth: (action: () => void, targetPage?: string) => void;

  // Actions
  loginWithCredentials: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; user?: User; error?: string; isUnconfirmed?: boolean }>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  promptLogout: () => void;
  confirmLogout: () => Promise<void>;
  cancelLogout: () => void;
  updateUserProfile: (data: Partial<User>) => Promise<boolean>;
  onAuthSuccess: (user: User, isNewUser?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { showToast, navigateTo } = useAppContext();
  const { t } = useTranslation();

  const [lifecycle, setLifecycle] = useState<AuthLifecycle>("INITIALIZING");
  const [user, setUser] = useState<User | null>(null);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>([]);
  const [isGuestModeDisabled, setIsGuestModeDisabled] = useState(false);

  const [authModal, setAuthModal] = useState<AuthModalState>({
    isOpen: false,
    view: "initial",
  });
  const [authGuardModal, setAuthGuardModal] = useState<AuthGuardModalState>({
    isOpen: false,
  });
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [guestTransitionWarningOpen, setGuestTransitionWarningOpen] = useState(false);

  const pendingAuthActionRef = useRef<(() => void) | null>(null);

  // Load remembered accounts and guest mode status on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setRememberedAccounts(accountManager.getRememberedAccounts());
      setIsGuestModeDisabled(accountManager.isGuestModePermanentlyDisabled());
    }
  }, []);

  // Central Auth Session Initialization & Single Event Listener
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let isMounted = true;

    async function initAuth() {
      try {
        const sessionPromise = authService.getSession();
        const timeoutPromise = new Promise<{ user: null; rememberMe: false }>((resolve) =>
          setTimeout(() => resolve({ user: null, rememberMe: false }), 3000)
        );
        const session = await Promise.race([sessionPromise, timeoutPromise]);

        if (session && session.user && isMounted) {
          const isCurrentlyOnline = typeof navigator === "undefined" || navigator.onLine;
          let activeUser = session.user;

          if (isCurrentlyOnline) {
            try {
              const profile = await userService.fetchUserProfile(session.user.id);
              if (profile) activeUser = profile;

              unsubscribeProfile = userService.subscribeToProfile(activeUser.id, (updatedProfile) => {
                if (isMounted) setUser(updatedProfile);
              });
            } catch {}
          }

          if (isMounted) {
            setUser(activeUser);
            setLifecycle("AUTHENTICATED");
            accountManager.setGuestModePermanentlyDisabled();
            setIsGuestModeDisabled(true);
            accountManager.saveRememberedAccount({
              id: activeUser.id,
              email: activeUser.identifier || activeUser.email || "",
              displayName: activeUser.displayName || "User",
              fullName: activeUser.fullName,
              avatarUrl: activeUser.avatarUrl,
              authMethod: activeUser.authMethod || "email",
              lastUsedAt: new Date().toISOString(),
            });
            setRememberedAccounts(accountManager.getRememberedAccounts());
          }
        } else if (isMounted) {
          setUser(null);
          const guestDisabled = accountManager.isGuestModePermanentlyDisabled();
          setIsGuestModeDisabled(guestDisabled);
          setLifecycle(guestDisabled ? "UNAUTHENTICATED" : "GUEST");
        }
      } catch (err) {
        console.warn("[AuthContext] Session init error:", err);
        if (isMounted) {
          setUser(null);
          setLifecycle("UNAUTHENTICATED");
        }
      }
    }

    initAuth();

    // Listen to Supabase Auth changes (sign in, sign out, token refresh, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        if (session?.user) {
          let profile = await userService.fetchUserProfile(session.user.id);
          const authedUser = profile || {
            id: session.user.id,
            identifier: session.user.email || session.user.phone || "",
            email: session.user.email || "",
            authMethod: session.user.app_metadata?.provider === "google" ? "google" : "email",
            displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || "User",
            fullName: session.user.user_metadata?.full_name,
            avatarUrl: session.user.user_metadata?.avatar_url,
            createdAt: session.user.created_at,
          };

          setUser(authedUser);
          setLifecycle("AUTHENTICATED");
          accountManager.setGuestModePermanentlyDisabled();
          setIsGuestModeDisabled(true);

          accountManager.saveRememberedAccount({
            id: authedUser.id,
            email: authedUser.identifier || authedUser.email || "",
            displayName: authedUser.displayName || "User",
            fullName: authedUser.fullName,
            avatarUrl: authedUser.avatarUrl,
            authMethod: authedUser.authMethod || "email",
            lastUsedAt: new Date().toISOString(),
          });
          setRememberedAccounts(accountManager.getRememberedAccounts());

          // Clean up guest-only artifacts permanently
          await clearGuestData();

          setAuthModal((prev) => ({ ...prev, isOpen: false }));
          setAuthGuardModal({ isOpen: false });
          setAccountSwitcherOpen(false);
          setGuestTransitionWarningOpen(false);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        const guestDisabled = accountManager.isGuestModePermanentlyDisabled();
        setIsGuestModeDisabled(guestDisabled);
        setLifecycle(guestDisabled ? "UNAUTHENTICATED" : "GUEST");
      } else if (event === "USER_UPDATED" && session?.user) {
        const profile = await userService.fetchUserProfile(session.user.id);
        if (profile) setUser(profile);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const openAuth = useCallback(
    (
      view: AuthModalView = "login",
      options?: { targetPage?: string; onAuthenticated?: () => void; initialIdentifier?: string }
    ) => {
      setAuthGuardModal({ isOpen: false });

      // If in guest mode and haven't seen the permanent transition warning, show it first
      const isCurrentlyGuest = !user && !accountManager.isGuestModePermanentlyDisabled();
      if (isCurrentlyGuest && !accountManager.hasSeenGuestTransitionWarning()) {
        pendingAuthActionRef.current = () => {
          accountManager.setSeenGuestTransitionWarning();
          if ((view as string) === "signup") {
            router.push("/signup");
          } else if ((view as string) === "verify") {
            router.push("/verify");
          } else {
            router.push("/login");
          }
        };
        setGuestTransitionWarningOpen(true);
        return;
      }

      if ((view as string) === "signup") {
        router.push("/signup");
        return;
      }
      if ((view as string) === "verify") {
        router.push("/verify");
        return;
      }
      router.push("/login");
    },
    [user, router]
  );

  const closeAuth = useCallback(() => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setAuthView = useCallback((view: AuthModalView) => {
    setAuthModal((prev) => ({ ...prev, view }));
  }, []);

  const openAuthGuard = useCallback((options?: { targetPage?: string; onAuthenticated?: () => void }) => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
    setAuthGuardModal({
      isOpen: true,
      targetPage: options?.targetPage,
      onAuthenticated: options?.onAuthenticated,
    });
  }, []);

  const closeAuthGuard = useCallback(() => {
    setAuthGuardModal({ isOpen: false });
  }, []);

  const openAccountSwitcher = useCallback(() => {
    setRememberedAccounts(accountManager.getRememberedAccounts());
    setAccountSwitcherOpen(true);
  }, []);

  const closeAccountSwitcher = useCallback(() => {
    setAccountSwitcherOpen(false);
  }, []);

  const removeRememberedAccount = useCallback((accountId: string) => {
    accountManager.removeRememberedAccount(accountId);
    setRememberedAccounts(accountManager.getRememberedAccounts());
  }, []);

  // Guard helper: allows full access without blocking
  const requireAuth = useCallback((action: () => void, _targetPage?: string) => {
    action();
  }, []);

  // Unified post-auth completion handler
  const onAuthSuccess = useCallback(
    (authedUser: User, isNewUser: boolean = false) => {
      setUser(authedUser);
      setLifecycle("AUTHENTICATED");
      accountManager.setGuestModePermanentlyDisabled();
      setIsGuestModeDisabled(true);

      accountManager.saveRememberedAccount({
        id: authedUser.id,
        email: authedUser.identifier || authedUser.email || "",
        displayName: authedUser.displayName || "User",
        fullName: authedUser.fullName,
        avatarUrl: authedUser.avatarUrl,
        authMethod: authedUser.authMethod || "email",
        lastUsedAt: new Date().toISOString(),
      });
      setRememberedAccounts(accountManager.getRememberedAccounts());

      // Clean up guest data permanently (no migration to auth account)
      clearGuestData();

      const target = authModal.targetPage || authGuardModal.targetPage;
      const callback = authModal.onAuthenticated || authGuardModal.onAuthenticated;

      closeAuth();
      closeAuthGuard();

      if (isNewUser) {
        showToast(t.auth.welcomeToastNew, "success");
      } else {
        showToast(t.auth.welcomeToastReturning, "success");
      }

      // Safely preserve onboarding preferences if any
      const guestOnboarding = onboardingStorage.getLocalState();
      if (guestOnboarding?.onboardingCompleted) {
        userService.saveOnboardingState(authedUser.id, {
          onboardingCompleted: true,
          preferredLanguage: guestOnboarding.preferredLanguage,
          preferredTheme: guestOnboarding.preferredTheme,
          accountMode: "authenticated",
          productTourCompleted: guestOnboarding.productTourCompleted,
        });
      }

      if (callback) callback();
      if (target) navigateTo(target);
    },
    [authModal, authGuardModal, closeAuth, closeAuthGuard, showToast, navigateTo, t]
  );

  const loginWithCredentials = useCallback(
    async (email: string, password: string, rememberMe: boolean = true) => {
      setLifecycle("AUTHENTICATING");
      try {
        const res = await authService.validateCredentials(email, password, rememberMe);
        if (res.success && res.user) {
          onAuthSuccess(res.user, false);
          return { success: true, user: res.user };
        }
        setLifecycle("UNAUTHENTICATED");
        return { success: false, error: res.error, isUnconfirmed: res.isUnconfirmed };
      } catch (err: any) {
        setLifecycle("UNAUTHENTICATED");
        return { success: false, error: err?.message || "Login failed" };
      }
    },
    [onAuthSuccess]
  );

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    setLifecycle("AUTHENTICATING");
    try {
      const res = await authService.loginWithGoogle(true);
      if (!res.success) {
        setLifecycle("UNAUTHENTICATED");
        showToast(
          res.error || "Google login is not configured in Supabase. Please log in directly with Email and Password.",
          "error"
        );
        return false;
      }
      if (res.user) {
        onAuthSuccess(res.user, false);
      }
      return true;
    } catch (err: any) {
      setLifecycle("UNAUTHENTICATED");
      console.error(err);
      showToast(err?.message || "Google sign-in encountered an error.", "error");
      return false;
    }
  }, [onAuthSuccess, showToast]);

  const promptLogout = useCallback(() => {
    setLogoutConfirmOpen(true);
  }, []);

  const cancelLogout = useCallback(() => {
    setLogoutConfirmOpen(false);
  }, []);

  // Safe Logout Transaction
  const confirmLogout = useCallback(async () => {
    setLifecycle("SIGNING_OUT");
    setLogoutConfirmOpen(false);

    try {
      await authService.clearSession();
    } catch (err) {
      console.warn("[AuthContext] Logout clear session warning:", err);
    }

    setUser(null);
    const guestDisabled = accountManager.isGuestModePermanentlyDisabled();
    setIsGuestModeDisabled(guestDisabled);
    setLifecycle(guestDisabled ? "UNAUTHENTICATED" : "GUEST");

    showToast(t.auth.loggedOutToast, "info");
    router.push("/login");
  }, [showToast, t, router]);

  const logout = useCallback(() => {
    promptLogout();
  }, [promptLogout]);

  // Account Switching Flow: Sequential switch without full-page reload
  const switchAccount = useCallback(
    async (targetAccount?: RememberedAccount) => {
      setLifecycle("SWITCHING_ACCOUNT");
      setAccountSwitcherOpen(false);

      try {
        await authService.clearSession();
      } catch (err) {
        console.warn("[AuthContext] Switch account sign out warning:", err);
      }

      setUser(null);
      setLifecycle("UNAUTHENTICATED");

      if (targetAccount) {
        router.push(`/login?email=${encodeURIComponent(targetAccount.email)}`);
      } else {
        router.push("/login");
      }
    },
    [router]
  );

  const updateUserProfile = useCallback(
    async (data: Partial<User>): Promise<boolean> => {
      if (!user) return false;
      const res = await authService.updateUserProfile(user.id, data);
      if (res.success && res.user) {
        setUser(res.user);
        accountManager.saveRememberedAccount({
          id: res.user.id,
          email: res.user.identifier || res.user.email || "",
          displayName: res.user.displayName || "User",
          fullName: res.user.fullName,
          avatarUrl: res.user.avatarUrl,
          authMethod: res.user.authMethod || "email",
          lastUsedAt: new Date().toISOString(),
        });
        setRememberedAccounts(accountManager.getRememberedAccounts());
        return true;
      }
      return false;
    },
    [user]
  );

  const handleConfirmGuestTransition = () => {
    setGuestTransitionWarningOpen(false);
    if (pendingAuthActionRef.current) {
      pendingAuthActionRef.current();
      pendingAuthActionRef.current = null;
    }
  };

  const handleCancelGuestTransition = () => {
    setGuestTransitionWarningOpen(false);
    pendingAuthActionRef.current = null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest: !user && !isGuestModeDisabled,
        isLoading: lifecycle === "INITIALIZING",
        lifecycle,
        isGuestModeDisabled,
        rememberedAccounts,
        authModal,
        authGuardModal,
        logoutConfirmOpen,
        accountSwitcherOpen,
        guestTransitionWarningOpen,
        openAuth,
        closeAuth,
        setAuthView,
        openAuthGuard,
        closeAuthGuard,
        openAccountSwitcher,
        closeAccountSwitcher,
        switchAccount,
        removeRememberedAccount,
        requireAuth,
        loginWithCredentials,
        loginWithGoogle,
        logout,
        promptLogout,
        confirmLogout,
        cancelLogout,
        updateUserProfile,
        onAuthSuccess,
      }}
    >
      {children}

      {/* Permanent One-Way Guest Transition Confirmation Modal */}
      <GuestTransitionModal
        isOpen={guestTransitionWarningOpen}
        onContinue={handleConfirmGuestTransition}
        onCancel={handleCancelGuestTransition}
      />

      {/* Unlimited Multi-Account Switcher Modal */}
      <AccountSwitcherModal
        isOpen={accountSwitcherOpen}
        onClose={closeAccountSwitcher}
        currentUserId={user?.id}
        accounts={rememberedAccounts}
        onSelectAccount={(account) => switchAccount(account)}
        onAddNewAccount={() => switchAccount()}
        onRemoveAccount={removeRememberedAccount}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
