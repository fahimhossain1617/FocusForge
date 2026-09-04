import { supabase } from "../lib/supabaseClient";
import { User, AuthSession } from "../types";

function mapSupabaseUserToUser(supabaseUser: any, authMethod: 'email' | 'phone' | 'google' = 'email'): User {
  return {
    id: supabaseUser.id,
    identifier: supabaseUser.email || supabaseUser.phone || '',
    authMethod,
    displayName: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0] || supabaseUser.phone || 'User',
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
  async validateCredentials(identifier: string, password: string, rememberMe: boolean = true): Promise<{ success: boolean; user?: User; error?: string }> {
    const isEmail = identifier.includes('@');
    let res;
    
    if (isEmail) {
      res = await supabase.auth.signInWithPassword({ email: identifier, password });
    } else {
      res = await supabase.auth.signInWithPassword({ phone: identifier, password });
    }

    if (res.error) {
      return { success: false, error: res.error.message };
    }

    if (res.data.user) {
      return { success: true, user: mapSupabaseUserToUser(res.data.user, isEmail ? 'email' : 'phone') };
    }
    
    return { success: false, error: "Login failed." };
  },

  // ==========================================
  // SIGNUP & FORGOT PASSWORD OTP WORKFLOW
  // ==========================================
  async sendOtp(identifier: string): Promise<{ success: boolean; message: string; error?: string }> {
    const isEmail = identifier.includes('@');
    if (isEmail) {
      // For email, we use the signInWithOtp method to trigger an OTP code email
      // Note: Requires Supabase Email templates to be configured with {{ .Token }}
      const { error } = await supabase.auth.signInWithOtp({ email: identifier });
      if (error) return { success: false, error: error.message, message: '' };
    } else {
      const { error } = await supabase.auth.signInWithOtp({ phone: identifier });
      if (error) return { success: false, error: error.message, message: '' };
    }
    return { success: true, message: "Verification code sent successfully" };
  },

  async verifyOtp(identifier: string, code: string): Promise<{ success: boolean; error?: string; isExpired?: boolean; user?: User }> {
    const isEmail = identifier.includes('@');
    const { data, error } = isEmail
      ? await supabase.auth.verifyOtp({
          email: identifier,
          token: code,
          type: 'email',
        })
      : await supabase.auth.verifyOtp({
          phone: identifier,
          token: code,
          type: 'sms',
        });


    if (error) {
      return { success: false, error: error.message, isExpired: error.message.includes('expired') };
    }
    
    if (data.user) {
      return { success: true, user: mapSupabaseUserToUser(data.user, isEmail ? 'email' : 'phone') };
    }
    
    return { success: true };
  },

  async createAccount(identifier: string, password: string, rememberMe: boolean): Promise<{ success: boolean; user?: User; error?: string }> {
    const isEmail = identifier.includes('@');
    
    let res;
    if (isEmail) {
      res = await supabase.auth.signUp({ email: identifier, password });
    } else {
      res = await supabase.auth.signUp({ phone: identifier, password });
    }

    if (res.error) {
      return { success: false, error: res.error.message };
    }

    if (res.data.user) {
      return { success: true, user: mapSupabaseUserToUser(res.data.user, isEmail ? 'email' : 'phone') };
    }

    return { success: false, error: "Signup failed." };
  },

  // Password reset flow
  async resetPassword(identifier: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async loginWithGoogle(rememberMe: boolean = true): Promise<{ success: boolean; user?: User }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    // This will redirect, so we won't hit this immediately
    if (error) return { success: false };
    return { success: true };
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

