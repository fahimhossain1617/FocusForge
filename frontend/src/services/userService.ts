import { supabase } from "../lib/supabaseClient";
import { User } from "../types";
import { fetchBackend } from "../lib/apiClient";

export interface ProfileRow {
  id: string;
  identifier: string;
  auth_method: string;
  display_name: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

function mapProfileToUser(profile: ProfileRow): User {
  return {
    id: profile.id,
    identifier: profile.identifier,
    authMethod: (profile.auth_method as "email" | "phone" | "google") || "email",
    displayName: profile.display_name || "User",
    avatarUrl: profile.avatar_url || undefined,
    createdAt: profile.created_at || new Date().toISOString(),
  };
}

export const userService = {
  /**
   * Fetches user profile via Backend API.
   * Falls back to auth session metadata if profile row has not been populated yet.
   */
  async fetchUserProfile(userId: string): Promise<User | null> {
    try {
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
          authMethod: u.app_metadata?.provider === "google" ? "google" : u.email ? "email" : "phone",
          displayName: u.user_metadata?.display_name || u.email?.split("@")[0] || u.phone || "User",
          avatarUrl: u.user_metadata?.avatar_url,
          createdAt: u.created_at,
        };

        // Self-heal: insert into profiles if missing via backend API
        try {
          await fetchBackend("/api/user/profile", {
            method: "PATCH",
            body: JSON.stringify({
              displayName: fallbackUser.displayName,
              avatarUrl: fallbackUser.avatarUrl,
              identifier: fallbackUser.identifier,
            }),
          });
        } catch (upsertErr) {
          console.warn("[userService] Could not auto-upsert profile via backend:", upsertErr);
        }

        return fallbackUser;
      }

      return null;
    } catch (err) {
      console.error("[userService] Unexpected error in fetchUserProfile:", err);
      return null;
    }
  },

  /**
   * Updates user profile via Backend API
   * and synchronizes user_metadata in Supabase Auth.
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<User>
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // 1. Update via Backend API
      const data = await fetchBackend<ProfileRow>("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });

      // 2. Also update Supabase Auth user_metadata
      await supabase.auth.updateUser({
        data: {
          display_name: updates.displayName,
          avatar_url: updates.avatarUrl,
        },
      });

      const updatedUser = data && data.id
        ? mapProfileToUser(data)
        : await this.fetchUserProfile(userId);

      return {
        success: true,
        user: updatedUser || undefined,
      };
    } catch (err: any) {
      console.error("[userService] Unexpected error in updateUserProfile:", err);
      return { success: false, error: err.message || "Failed to update profile" };
    }
  },

  /**
   * Subscribes to real-time changes on the current user's profile row.
   */
  subscribeToProfile(userId: string, onUpdate: (user: User) => void): () => void {
    const channel = supabase
      .channel(`profile-${userId}`)
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
    preferredTheme: "dark" | "light";
    accountMode: "guest" | "authenticated";
    productTourCompleted: boolean;
  } | null> {
    try {
      const data = await fetchBackend<any>("/api/user/onboarding").catch(() => null);

      if (data && Object.keys(data).length > 0) {
        return {
          onboardingCompleted: Boolean(data.onboardingCompleted),
          preferredLanguage: (data.preferredLanguage as "en" | "bn") || "en",
          preferredTheme: (data.preferredTheme as "dark" | "light") || "dark",
          accountMode: (data.accountMode as "guest" | "authenticated") || "authenticated",
          productTourCompleted: Boolean(data.productTourCompleted),
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
      preferredTheme?: "dark" | "light";
      accountMode?: "guest" | "authenticated";
      productTourCompleted?: boolean;
    }
  ): Promise<boolean> {
    try {
      await fetchBackend("/api/user/onboarding", {
        method: "POST",
        body: JSON.stringify(state),
      });
      return true;
    } catch (err) {
      console.warn("[userService] Unexpected error in saveOnboardingState:", err);
      return false;
    }
  },
};
