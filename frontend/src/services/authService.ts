import { supabase } from "../lib/supabaseClient";
import { User, AuthSession } from "../types";

function mapSupabaseUserToUser(supabaseUser: any, authMethod: 'email' | 'google' = 'email'): User {
  const meta = supabaseUser.user_metadata || {};
  const effectiveName = meta.full_name || meta.display_name || meta.name || supabaseUser.email?.split('@')[0] || 'User';

  return {
    id: supabaseUser.id,
    identifier: supabaseUser.email || '',
    email: supabaseUser.email || '',
    authMethod: supabaseUser.app_metadata?.provider === 'google' ? 'google' : authMethod,
    displayName: effectiveName,
    fullName: meta.full_name || meta.name || effectiveName,
    avatarUrl: meta.avatar_url,
    createdAt: supabaseUser.created_at,
  };
}

export const LIVE_SITE_URL = 'https://focus-forge-fahimhossain1617-7909s-projects.vercel.app';

/**
 * Returns a valid absolute redirect URL for Supabase Auth flows (OAuth, OTP, Password Reset).
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}${path}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    const formatted = envUrl.startsWith('http://') || envUrl.startsWith('https://')
      ? envUrl
      : `https://${envUrl}`;
    return `${formatted.replace(/\/$/, '')}${path}`;
  }

  return `${LIVE_SITE_URL}${path}`;
}

export const authService = {
  async getSession(): Promise<AuthSession> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) return { user: null, rememberMe: false };
      return {
        user: mapSupabaseUserToUser(session.user),
        rememberMe: true,
        token: session.access_token,
        expiresAt: new Date((session.expires_at || 0) * 1000).toISOString()
      };
    } catch {
      return { user: null, rememberMe: false };
    }
  },

  async clearSession(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[authService] SignOut warning:", err);
    }
  },

  async logoutUser(): Promise<void> {
    await this.clearSession();
  },

  // ==========================================
  // LOGIN FLOW (Email + Password)
  // ==========================================
  async validateCredentials(email: string, password: string, rememberMe: boolean = true): Promise<{
    success: boolean;
    user?: User;
    error?: string;
    isUnconfirmed?: boolean;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (res.error) {
      const msg = res.error.message.toLowerCase();
      const isUnconfirmed = msg.includes("email not confirmed") || msg.includes("confirm your email") || msg.includes("unverified");
      return {
        success: false,
        error: res.error.message,
        isUnconfirmed,
      };
    }

    if (res.data.user) {
      return { success: true, user: mapSupabaseUserToUser(res.data.user, 'email') };
    }

    return { success: false, error: "Login failed." };
  },

  // ==========================================
  // SIGNUP FLOW (Pre-Verification: Zero DB writes until OTP verified!)
  // ==========================================
  async signUp(fullName: string, email: string, password: string): Promise<{
    success: boolean;
    user?: User;
    session?: any;
    error?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    try {
      const resp = await fetch('/api/auth/pre-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: cleanName, email: cleanEmail, password }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to initiate signup verification.' };
      }

      return {
        success: true,
      };
    } catch (err: any) {
      console.error('[authService.signUp] API error, falling back to client signup:', err);
      // Fallback to direct client signup if API is unreachable
      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      const res = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            display_name: cleanName,
          },
          emailRedirectTo: redirectUrl,
        }
      });

      if (res.error) {
        return { success: false, error: res.error.message };
      }

      return {
        success: true,
        user: res.data.user ? mapSupabaseUserToUser(res.data.user, 'email') : undefined,
        session: res.data.session,
      };
    }
  },

  // ==========================================
  // OTP VERIFICATION (6-digit code)
  // ==========================================
  async verifyOtp(
    email: string,
    token: string,
    type: 'signup' | 'recovery' | 'email' = 'signup'
  ): Promise<{ success: boolean; error?: string; isExpired?: boolean; user?: User }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    // 1. If signup, verify via pre-verification endpoint first
    if (type === 'signup') {
      try {
        const resp = await fetch('/api/auth/verify-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, otp: cleanToken }),
        });
        const data = await resp.json();

        if (resp.ok && data.success) {
          // If credentials returned, auto sign-in
          if (data.credentials?.password) {
            const loginRes = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: data.credentials.password,
            });

            if (loginRes.data?.user) {
              return { success: true, user: mapSupabaseUserToUser(loginRes.data.user, 'email') };
            }
          }
          return { success: true };
        } else if (data.isExpired) {
          return { success: false, error: data.error || 'Verification code has expired.', isExpired: true };
        } else if (data.error && !data.error.includes('No pending registration')) {
          return { success: false, error: data.error };
        }
      } catch (e) {
        console.warn('[authService.verifyOtp] pre-verification verify fallback:', e);
      }
    }

    // 2. Primary verifyOtp call via Supabase
    let res = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: type as any,
    });

    // 3. Fallback: if 'signup' fails, try 'email' (magic link/OTP code)
    if (res.error && type === 'signup') {
      const fallbackRes = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });
      if (!fallbackRes.error) {
        res = fallbackRes;
      }
    }

    if (res.error) {
      const msg = res.error.message.toLowerCase();
      const isExpired = msg.includes("expired") || msg.includes("timeout");
      return {
        success: false,
        error: res.error.message,
        isExpired,
      };
    }

    if (res.data?.user) {
      return { success: true, user: mapSupabaseUserToUser(res.data.user, 'email') };
    }

    return { success: true };
  },

  // ==========================================
  // RESEND OTP EMAIL
  // ==========================================
  async resendOtp(email: string, type: 'signup' | 'email_change' = 'signup'): Promise<{
    success: boolean;
    error?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();

    if (type === 'signup') {
      try {
        const resp = await fetch('/api/auth/resend-signup-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
          return { success: true };
        } else if (data.error && !data.error.includes('No pending registration')) {
          return { success: false, error: data.error };
        }
      } catch (e) {
        console.warn('[authService.resendOtp] pre-verification resend fallback:', e);
      }
    }

    const redirectUrl = getAuthRedirectUrl('/auth/callback');

    const { error } = await supabase.auth.resend({
      type,
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      }
    });

    if (error) {
      let friendlyMsg = error.message;
      const lower = error.message.toLowerCase();
      if (lower.includes("rate limit") || lower.includes("over_email_send_rate_limit")) {
        friendlyMsg = "Email send limit reached for this hour. Please check your Spam folder or configure Custom SMTP in Supabase Dashboard.";
      }
      return { success: false, error: friendlyMsg };
    }

    return { success: true };
  },

  // ==========================================
  // PASSWORD RECOVERY / FORGOT PASSWORD
  // ==========================================
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`focusforge_reset_completed_${cleanEmail}`);
      } catch {}
    }
    const redirectUrl = getAuthRedirectUrl('/reset-password');

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  async requestPasswordResetOtp(email: string, newPassword?: string): Promise<{ success: boolean; error?: string; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`focusforge_reset_completed_${cleanEmail}`);
      } catch {}
    }
    try {
      const resp = await fetch('/api/auth/request-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to request password reset code.' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error requesting reset code.' };
    }
  },

  async resendPasswordResetOtp(email: string): Promise<{ success: boolean; error?: string; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const resp = await fetch('/api/auth/resend-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to resend reset code.' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error resending reset code.' };
    }
  },

  async verifyPasswordResetOtp(
    email: string,
    otp: string,
    newPassword?: string
  ): Promise<{ success: boolean; error?: string; isExpired?: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    try {
      const resp = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, newPassword }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to verify reset code.',
          isExpired: data.isExpired,
        };
      }

      // If user is currently in a Supabase session or if newPassword passed, also update client Supabase session
      if (newPassword) {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch {}
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error verifying reset code.' };
    }
  },

  async resetPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Compatibility alias for createAccount
  async createAccount(email: string, password: string, rememberMe: boolean = true): Promise<{ success: boolean; user?: User; session?: any; error?: string }> {
    return this.signUp(email.split('@')[0] || 'User', email, password);
  },

  // Compatibility alias for sendOtp
  async sendOtp(email: string, purpose: 'signup' | 'login' | 'forgot' = 'login'): Promise<{ success: boolean; message: string; error?: string }> {
    if (purpose === 'forgot') {
      const res = await this.sendPasswordResetEmail(email);
      return { success: res.success, message: res.success ? 'Reset email sent' : '', error: res.error };
    }
    const res = await this.resendOtp(email);
    return { success: res.success, message: res.success ? 'OTP sent' : '', error: res.error };
  },

  // Compatibility alias for changePassword
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string; code?: string }> {
    try {
      const { userService } = await import("./userService");
      return await userService.changePassword(currentPassword, newPassword);
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to update password", code: err.code };
    }
  },

  // ==========================================
  // GOOGLE OAUTH
  // ==========================================
  async loginWithGoogle(rememberMe: boolean = true): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const redirectUrl = getAuthRedirectUrl('/auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Google sign-in error" };
    }
  },

  async getUserProfile(userId: string): Promise<User | null> {
    const { userService } = await import("./userService");
    return await userService.fetchUserProfile(userId);
  },

  async updateUserProfile(userId: string, data: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    const { userService } = await import("./userService");
    return await userService.updateUserProfile(userId, data);
  }
};
