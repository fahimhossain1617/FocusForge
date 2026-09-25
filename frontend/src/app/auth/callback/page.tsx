"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { useAppContext } from "../../../context/AppContext";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { onAuthSuccess } = useAuth();
  const { showToast } = useAppContext();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleAuthRedirect() {
      try {
        const code = searchParams.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          if (isMounted) setErrorMsg(error.message);
          return;
        }

        if (data?.session?.user) {
          const user = data.session.user;
          const meta = user.user_metadata || {};
          const displayName = meta.full_name || meta.display_name || meta.name || user.email?.split("@")[0] || "User";

          onAuthSuccess(
            {
              id: user.id,
              identifier: user.email || "",
              email: user.email || "",
              authMethod: user.app_metadata?.provider === "google" ? "google" : "email",
              displayName,
              fullName: meta.full_name || meta.name || displayName,
              avatarUrl: meta.avatar_url,
              createdAt: user.created_at,
            },
            false
          );

          showToast("Successfully signed in!", "success");
          router.replace("/");
        } else {
          // If no session is found immediately, wait or redirect to login
          const timer = setTimeout(() => {
            if (isMounted) router.replace("/login");
          }, 1500);
          return () => clearTimeout(timer);
        }
      } catch (err: any) {
        if (isMounted) setErrorMsg(err?.message || "Failed to process authentication redirect.");
      }
    }

    handleAuthRedirect();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams, onAuthSuccess, showToast]);

  return (
    <div className="auth-frame flex flex-col items-center justify-center min-h-screen p-4 text-center">
      {errorMsg ? (
        <div className="auth-card max-w-md p-6">
          <div className="auth-error-banner mb-4">{errorMsg}</div>
          <button onClick={() => router.push("/login")} className="auth-cta">
            Return to Log In
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-['Sora'] text-lg font-semibold text-white">
            Completing sign in...
          </p>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="auth-frame flex items-center justify-center text-white">Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
