"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, AuthModalView } from "../types";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { supabase } from "../lib/supabaseClient";
import { useAppContext } from "./AppContext";
import { useTranslation } from "../hooks/useTranslation";

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
  
  // Modals state
  authModal: AuthModalState;
  authGuardModal: AuthGuardModalState;
  logoutConfirmOpen: boolean;

  // Modal controls
  openAuth: (view?: AuthModalView, options?: { targetPage?: string; onAuthenticated?: () => void; initialIdentifier?: string }) => void;
  closeAuth: () => void;
  setAuthView: (view: AuthModalView) => void;
  openAuthGuard: (options?: { targetPage?: string; onAuthenticated?: () => void }) => void;
  closeAuthGuard: () => void;
  
  // Guard helper
  requireAuth: (action: () => void, targetPage?: string) => void;

  // Actions
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  promptLogout: () => void;
  confirmLogout: () => void;
  cancelLogout: () => void;
  updateUserProfile: (data: Partial<User>) => Promise<boolean>;
  onAuthSuccess: (user: User, isNewUser?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast, navigateTo } = useAppContext();
  const { t } = useTranslation();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [authModal, setAuthModal] = useState<AuthModalState>({
    isOpen: false,
    view: 'initial',
  });

  const [authGuardModal, setAuthGuardModal] = useState<AuthGuardModalState>({
    isOpen: false,
  });

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Restore session & fetch user data from Supabase PostgreSQL on mount
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    async function initAuth() {
      try {
        const session = await authService.getSession();
        if (session && session.user) {
          // Fetch complete profile from Supabase PostgreSQL profiles table
          const profile = await userService.fetchUserProfile(session.user.id);
          const activeUser = profile || session.user;
          setUser(activeUser);

          // Realtime subscription to profiles table
          unsubscribeProfile = userService.subscribeToProfile(activeUser.id, (updatedProfile) => {
            setUser(updatedProfile);
          });
        }
      } catch (err) {
        console.warn("[AuthContext] Session init error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth changes (sign in, sign out, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await userService.fetchUserProfile(session.user.id);
        setUser(profile || {
          id: session.user.id,
          identifier: session.user.email || session.user.phone || "",
          authMethod: session.user.app_metadata?.provider === "google" ? "google" : "email",
          displayName: session.user.user_metadata?.display_name || "User",
          createdAt: session.user.created_at,
        });
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);


  const openAuth = useCallback((
    view: AuthModalView = 'initial',
    options?: { targetPage?: string; onAuthenticated?: () => void; initialIdentifier?: string }
  ) => {
    setAuthGuardModal({ isOpen: false });
    setAuthModal({
      isOpen: true,
      view,
      targetPage: options?.targetPage,
      onAuthenticated: options?.onAuthenticated,
      initialIdentifier: options?.initialIdentifier,
    });
  }, []);

  const closeAuth = useCallback(() => {
    setAuthModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const setAuthView = useCallback((view: AuthModalView) => {
    setAuthModal(prev => ({ ...prev, view }));
  }, []);

  const openAuthGuard = useCallback((options?: { targetPage?: string; onAuthenticated?: () => void }) => {
    setAuthModal(prev => ({ ...prev, isOpen: false }));
    setAuthGuardModal({
      isOpen: true,
      targetPage: options?.targetPage,
      onAuthenticated: options?.onAuthenticated,
    });
  }, []);

  const closeAuthGuard = useCallback(() => {
    setAuthGuardModal({ isOpen: false });
  }, []);

  // Require Auth guard: if guest, opens guard modal; if logged in, executes action
  const requireAuth = useCallback((action: () => void, targetPage?: string) => {
    if (user) {
      action();
    } else {
      openAuthGuard({ targetPage, onAuthenticated: action });
    }
  }, [user, openAuthGuard]);

  // Unified post-auth completion handler
  const onAuthSuccess = useCallback((authedUser: User, isNewUser: boolean = false) => {
    setUser(authedUser);
    
    // Check pending callbacks or target redirect
    const target = authModal.targetPage || authGuardModal.targetPage;
    const callback = authModal.onAuthenticated || authGuardModal.onAuthenticated;

    closeAuth();
    closeAuthGuard();

    if (isNewUser) {
      showToast(t.auth.welcomeToastNew, "success");
    } else {
      showToast(t.auth.welcomeToastReturning, "success");
    }

    if (callback) {
      callback();
    }

    if (target) {
      navigateTo(target);
    }
  }, [authModal, authGuardModal, closeAuth, closeAuthGuard, showToast, navigateTo, t]);

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      const res = await authService.loginWithGoogle(true);
      if (res.success && res.user) {
        onAuthSuccess(res.user, false);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, [onAuthSuccess]);

  const promptLogout = useCallback(() => {
    setLogoutConfirmOpen(true);
  }, []);

  const cancelLogout = useCallback(() => {
    setLogoutConfirmOpen(false);
  }, []);

  const confirmLogout = useCallback(() => {
    authService.clearSession();
    setUser(null);
    setLogoutConfirmOpen(false);
    
    // Clear local app state to prevent cross-account data leaking
    if (typeof window !== 'undefined') {
        const indexedDBRequest = indexedDB.deleteDatabase("FocusForgeDB");
        localStorage.removeItem("focusforge_state");
        window.location.reload(); // Quickest way to clear AppContext cleanly
    } else {
        showToast(t.auth.loggedOutToast, "info");
    }
  }, [showToast, t]);

  const logout = useCallback(() => {
    promptLogout();
  }, [promptLogout]);

  const updateUserProfile = useCallback(async (data: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    const res = await authService.updateUserProfile(user.id, data);
    if (res.success && res.user) {
      setUser(res.user);
      return true;
    }
    return false;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest: !user,
        isLoading,
        authModal,
        authGuardModal,
        logoutConfirmOpen,
        openAuth,
        closeAuth,
        setAuthView,
        openAuthGuard,
        closeAuthGuard,
        requireAuth,
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
