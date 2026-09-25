import { supabase } from "../lib/supabaseClient";
import { User } from "../types";
import { fetchBackend } from "../lib/apiClient";

export interface ProfileRow {
  id: string;
  identifier: string;
  authMethod?: string;
  auth_method?: string;
  displayName?: string;
  display_name?: string;
  fullName?: string;
  full_name?: string;
  email?: string;
  emailVerified?: boolean;
  email_verified?: boolean;
  phone?: string;
  dateOfBirth?: string;
  date_of_birth?: string;
  dob?: string;
  gender?: string;
  country?: string;
  city?: string;
  bio?: string;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  preferredLanguage?: "en" | "bn";
  preferred_language?: "en" | "bn";
  preferredTheme?: "dark" | "light";
  preferred_theme?: "dark" | "light";
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

function mapProfileToUser(profile: ProfileRow): User {
  const dName = profile.displayName || profile.display_name || "";
  const fName = profile.fullName || profile.full_name || "";
  const effectiveDisplayName = dName.trim() || fName.trim() || "User";

  return {
    id: profile.id,
    identifier: profile.identifier || profile.email || "",
    email: profile.email || profile.identifier || "",
    authMethod: ((profile.authMethod || profile.auth_method) as "email" | "phone" | "google") || "email",
    displayName: effectiveDisplayName,
    fullName: fName,
    phone: profile.phone || "",
    dob: profile.dateOfBirth || profile.date_of_birth || profile.dob || "",
    gender: profile.gender || "",
    country: profile.country || "",
    city: profile.city || "",
    bio: profile.bio || "",
    avatarUrl: profile.avatarUrl || profile.avatar_url || undefined,
    createdAt: profile.createdAt || profile.created_at || new Date().toISOString(),
  };
}

export const userService = {
  /**
   * Fetches user profile via Backend API.
   */
  async fetchUserProfile(userId: string): Promise<User | null> {
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return null;
      }
      const data = await fetchBackend<ProfileRow>("/api/user/profile").catch(() => null);

      if (data && data.id) {
        return mapProfileToUser(data);
      }

      // Fallback: check Supabase Auth session user
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user && authData.user.id === userId) {
        const u = authData.user;
        const fallbackUser: User = {
          id: u.id,
          identifier: u.email || u.phone || "",
          email: u.email || "",
          authMethod: u.app_metadata?.provider === "google" ? "google" : u.email ? "email" : "phone",
          displayName: u.user_metadata?.display_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
          fullName: u.user_metadata?.full_name || "",
          avatarUrl: u.user_metadata?.avatar_url,
          createdAt: u.created_at,
        };

        return fallbackUser;
      }

      return null;
    } catch (err) {
      console.error("[userService] Unexpected error in fetchUserProfile:", err);
      return null;
    }
  },

  /**
   * Updates user profile via Backend API and synchronizes user_metadata.
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<User & { dateOfBirth?: string; preferredLanguage?: string; preferredTheme?: string }>
  ): Promise<{ success: boolean; user?: User; error?: string; code?: string }> {
    try {
      const payload: any = { ...updates };
      if (updates.dob && !payload.dateOfBirth) {
        payload.dateOfBirth = updates.dob;
      }

      const data = await fetchBackend<ProfileRow>("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // Synchronize metadata in Supabase
      await supabase.auth.updateUser({
        data: {
          display_name: updates.displayName,
          full_name: updates.fullName,
          avatar_url: updates.avatarUrl,
        },
      }).catch(() => {});

      const updatedUser = data && data.id
        ? mapProfileToUser(data)
        : await this.fetchUserProfile(userId);

      return {
        success: true,
        user: updatedUser || undefined,
      };
    } catch (err: any) {
      console.error("[userService] Unexpected error in updateUserProfile:", err);
      return { success: false, error: err.message || "Failed to update profile", code: err.code };
    }
  },

  /**
   * Checks whether a display name / username is available.
   */
  async checkUsernameAvailable(username: string): Promise<{ available: boolean; valid?: boolean; message?: string; code?: string }> {
    try {
      const res = await fetchBackend<{ available: boolean; valid?: boolean; message?: string; code?: string }>(
        `/api/user/check-username?username=${encodeURIComponent(username)}`
      );
      return res;
    } catch (err: any) {
      return { available: false, valid: false, message: err.message, code: err.code };
    }
  },

  /**
   * Uploads avatar image.
   */
  async uploadAvatar(avatarBase64: string, mimeType: string = "image/png"): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
    try {
      const res = await fetchBackend<{ success: boolean; profile?: ProfileRow; error?: string }>("/api/user/avatar", {
        method: "POST",
        body: JSON.stringify({ avatarBase64, mimeType }),
      });
      return { success: Boolean(res?.success), avatarUrl: res?.profile?.avatar_url || undefined };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to upload avatar" };
    }
  },

  /**
   * Removes avatar image.
   */
  async removeAvatar(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetchBackend<{ success: boolean }>("/api/user/avatar", {
        method: "DELETE",
      });
      return { success: Boolean(res?.success) };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to remove avatar" };
    }
  },

  /**
   * Change password endpoint.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string; code?: string }> {
    try {
      const res = await fetchBackend<{ success: boolean; message?: string; error?: string; code?: string }>("/api/user/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return { success: Boolean(res?.success) };
    } catch (err: any) {
      return { success: false, error: err?.message || "Password change failed", code: err?.code };
    }
  },

  /**
   * Fetches notification settings.
   */
  async fetchNotificationSettings(): Promise<{
    pushEnabled: boolean;
    taskReminders: boolean;
    focusReminders: boolean;
    dailyProgressReminders: boolean;
    dailyReminderTime: string;
    timezone: string;
  }> {
    try {
      const res = await fetchBackend<any>("/api/notifications/settings");
      return {
        pushEnabled: res?.pushEnabled ?? true,
        taskReminders: res?.taskReminders ?? true,
        focusReminders: res?.focusReminders ?? true,
        dailyProgressReminders: res?.dailyProgressReminders ?? true,
        dailyReminderTime: res?.dailyReminderTime || "20:00",
        timezone: res?.timezone || "UTC",
      };
    } catch {
      return {
        pushEnabled: true,
        taskReminders: true,
        focusReminders: true,
        dailyProgressReminders: true,
        dailyReminderTime: "20:00",
        timezone: "UTC",
      };
    }
  },

  /**
   * Saves notification settings.
   */
  async saveNotificationSettings(settings: {
    pushEnabled?: boolean;
    taskReminders?: boolean;
    focusReminders?: boolean;
    dailyProgressReminders?: boolean;
    dailyReminderTime?: string;
    timezone?: string;
  }): Promise<boolean> {
    try {
      await fetchBackend("/api/notifications/settings", {
        method: "POST",
        body: JSON.stringify(settings),
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Subscribes to real-time changes on the current user's profile row.
   */
  subscribeToProfile(userId: string, onUpdate: (user: User) => void): () => void {
    const channelName = `profile-${userId}`;
    const existingChannels = supabase.getChannels();
    for (const ch of existingChannels) {
      if (ch.topic === `realtime:${channelName}` || ch.topic === channelName) {
        supabase.removeChannel(ch);
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(mapProfileToUser(payload.new as ProfileRow));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Fetches onboarding state for an authenticated user via Backend API.
   */
  async fetchOnboardingState(userId: string): Promise<{
    onboardingCompleted: boolean;
    preferredLanguage: "en" | "bn";
    preferredTheme: "dark" | "light" | "system";
    accountMode: "guest" | "authenticated";
    productTourCompleted: boolean;
  } | null> {
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return null;
      }
      const data = await fetchBackend<any>("/api/user/profile").catch(() => null);

      if (data && Object.keys(data).length > 0) {
        return {
          onboardingCompleted: Boolean(data.onboardingCompleted),
          preferredLanguage: (data.preferredLanguage as "en" | "bn") || "en",
          preferredTheme: (data.preferredTheme as "dark" | "light" | "system") || "dark",
          accountMode: "authenticated",
          productTourCompleted: Boolean(data.onboardingCompleted),
        };
      }
      return null;
    } catch (err) {
      console.warn("[userService] Unexpected error in fetchOnboardingState:", err);
      return null;
    }
  },

  /**
   * Persists onboarding state for an authenticated user via Backend API.
   */
  async saveOnboardingState(
    userId: string,
    state: {
      onboardingCompleted?: boolean;
      preferredLanguage?: "en" | "bn";
      preferredTheme?: "dark" | "light" | "system";
      accountMode?: "guest" | "authenticated";
      productTourCompleted?: boolean;
    }
  ): Promise<boolean> {
    try {
      await fetchBackend("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(state),
      });
      return true;
    } catch (err) {
      console.warn("[userService] Unexpected error in saveOnboardingState:", err);
      return false;
    }
  },

  /**
   * Permanently deletes user account and all data across PostgreSQL & Auth.
   */
  async deleteAccount(payload?: { confirmation?: string; password?: string }): Promise<{ success: boolean; error?: string; code?: string }> {
    try {
      const res = await fetchBackend<any>("/api/user/account", {
        method: "DELETE",
        body: JSON.stringify(payload || { confirmation: "DELETE" }),
      });
      if (res && res.success) {
        return { success: true };
      }
      return { success: false, error: res?.error || "Account deletion failed", code: res?.code };
    } catch (err: any) {
      console.error("[userService] deleteAccount error:", err);
      return { success: false, error: err?.message || "Failed to delete account", code: err?.code };
    }
  },

  /**
   * Submits a problem / bug report to the backend.
   */
  async submitProblemReport(data: {
    category: string;
    title: string;
    description: string;
    screenshot?: string;
    appVersion?: string;
    name?: string;
    email?: string;
  }): Promise<{ success: boolean; ticketNumber?: string; error?: string }> {
    try {
      const res = await fetchBackend<any>("/api/user/support/report", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return { success: Boolean(res?.success), ticketNumber: res?.ticketNumber };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to submit report" };
    }
  },

  /**
   * Sends a contact support message to the backend.
   */
  async sendSupportMessage(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    appVersion?: string;
  }): Promise<{ success: boolean; ticketNumber?: string; error?: string }> {
    try {
      const res = await fetchBackend<any>("/api/user/support/contact", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return { success: Boolean(res?.success), ticketNumber: res?.ticketNumber };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to send message" };
    }
  },

  /**
   * Submits feedback & feature suggestions to the backend.
   */
  async submitFeedback(data: {
    type: string;
    message: string;
    appVersion?: string;
    name?: string;
    email?: string;
  }): Promise<{ success: boolean; ticketNumber?: string; error?: string }> {
    try {
      const res = await fetchBackend<any>("/api/user/support/feedback", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return { success: Boolean(res?.success), ticketNumber: res?.ticketNumber };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to submit feedback" };
    }
  },

  /**
   * Migrates local guest data into database on account login / sign-up.
   */
  async migrateGuestData(data: { tasks: any[]; notes: any[]; mindItems: any[]; habits?: any[] }): Promise<{ success: boolean; migrated?: any }> {
    try {
      const res = await fetchBackend<any>("/api/user/migrate-guest-data", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return { success: Boolean(res?.success), migrated: res?.migrated };
    } catch (err: any) {
      return { success: false };
    }
  },
};
