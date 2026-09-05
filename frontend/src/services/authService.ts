import { supabase } from "../lib/supabaseClient";
import { User, AuthSession } from "../types";

function mapSupabaseUserToUser(supabaseUser: any, authMethod: 'email' | 'google' = 'email'): User {
  return {
    id: supabaseUser.id,
    identifier: supabaseUser.email || '',
    authMethod: supabaseUser.app_metadata?.provider === 'google' ? 'google' : authMethod,
    displayName: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
    avatarUrl: supabaseUser.user_metadata?.avatar_url,
    createdAt: supabaseUser.created_at,
  };
}

export const authService = {
  async getSession(): Promise<AuthSession> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return { user: null, rememberMe: false };
    return {
      user: mapSupabaseUserToUser(session.user),
      rememberMe: true,
      token: session.access_token,
      expiresAt: new Date((session.expires_at || 0) * 1000).toISOString()
    };
  },

  async clearSession(): Promise<void> {
    await supabase.auth.signOut();
  },

  async logoutUser(): Promise<void> {
    await this.clearSession();
  },

  // ==========================================
  // LOGIN FLOW (Email + Password)
  // ==========================================
  async validateCredentials(email: string, password: string, rememberMe: boolean = true): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (res.error) {
      return { success: false, error: res.error.message };
    }

    if (res.data.user) {
      return { success: true, user: mapSupabaseUserToUser(res.data.user, 'email') };
    }
    
    return { success: false, error: "Login failed." };
  },

  // ==========================================
  // SIGNUP & FORGOT PASSWORD (Email Only)
  // ==========================================
  async sendOtp(email: string, purpose: 'signup' | 'login' | 'forgot' = 'login'): Promise<{ success: boolean; message: string; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (purpose === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      if (error) return { success: false, error: error.message, message: '' };
    } else {
      // Try resending confirmation email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        }
      });
      if (error) {
        // Fallback to signInWithOtp
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          }
        });
        if (otpError) return { success: false, error: otpError.message, message: '' };
      }
    }
    return { success: true, message: "Verification message sent successfully" };
  },

  async verifyOtp(
    email: string, 
    code: string, 
    type: 'signup' | 'recovery' | 'email' = 'signup'
  ): Promise<{ success: boolean; error?: string; isExpired?: boolean; user?: User }> {
    const cleanEmail = email.trim().toLowerCase();
    
    // Try primary OTP type ('signup', 'recovery', or 'email')
    let res = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: code,
      type: type as any,
    });

    // Fallback: If signup failed, try 'email' (magic link OTP code)
    if (res.error && type === 'signup') {
      const fallbackRes = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: code,
        type: 'email',
      });
      if (!fallbackRes.error) {
        res = fallbackRes;
      }
    }

    if (res.error) {
      return { success: false, error: res.error.message, isExpired: res.error.message.includes('expired') };
    }
    
    if (res.data?.user) {
      return { success: true, user: mapSupabaseUserToUser(res.data.user, 'email') };
    }
    
    return { success: true };
  },

  async createAccount(email: string, password: string, rememberMe: boolean = true): Promise<{ success: boolean; user?: User; session?: any; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    
    const res = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      }
    });

    if (res.error) {
      return { success: false, error: res.error.message };
    }

    if (res.data.user) {
      return { 
        success: true, 
        user: mapSupabaseUserToUser(res.data.user, 'email'),
        session: res.data.session 
      };
    }

    return { success: false, error: "Signup failed." };
  },

  // Password reset flow
  async resetPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async loginWithGoogle(rememberMe: boolean = true): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
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
