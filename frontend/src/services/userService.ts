import { supabase } from "../lib/supabaseClient";
import { User } from "../types";

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
   * Fetches user profile directly from Supabase PostgreSQL `profiles` table.
   * Falls back to auth session metadata if profile row has not been populated yet.
   */
  async fetchUserProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("[userService] Error fetching profile from database:", error.message);
      }

      if (data) {
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

        // Self-heal: insert into profiles if missing
        try {
          await supabase.from("profiles").upsert({
            id: fallbackUser.id,
            identifier: fallbackUser.identifier,
            auth_method: fallbackUser.authMethod,
            display_name: fallbackUser.displayName,
            avatar_url: fallbackUser.avatarUrl || null,
            updated_at: new Date().toISOString(),
          });
        } catch (upsertErr) {
          console.warn("[userService] Could not auto-upsert profile:", upsertErr);
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
   * Updates user profile in Supabase PostgreSQL `profiles` table
   * and synchronizes user_metadata in Supabase Auth.
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<User>
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const dbUpdates: Partial<ProfileRow> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.displayName !== undefined) {
        dbUpdates.display_name = updates.displayName;
      }
      if (updates.avatarUrl !== undefined) {
        dbUpdates.avatar_url = updates.avatarUrl || null;
      }
      if (updates.identifier !== undefined) {
        dbUpdates.identifier = updates.identifier;
      }

      // 1. Update in Supabase PostgreSQL profiles table
      const { data, error: dbError } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("id", userId)
        .select()
        .maybeSingle();

      if (dbError) {
        console.error("[userService] Failed to update profiles in DB:", dbError.message);
        return { success: false, error: dbError.message };
      }

      // 2. Also update Supabase Auth user_metadata
      await supabase.auth.updateUser({
        data: {
          display_name: updates.displayName,
          avatar_url: updates.avatarUrl,
        },
      });

      const updatedUser = data
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
   * Fetches onboarding state for an authenticated user.
   */
  async fetchOnboardingState(userId: string): Promise<{
    onboardingCompleted: boolean;
    preferredLanguage: "en" | "bn";
    preferredTheme: "dark" | "light";
    accountMode: "guest" | "authenticated";
    productTourCompleted: boolean;
  } | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed, preferred_language, preferred_theme, account_mode, product_tour_completed")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("[userService] Error fetching onboarding state from DB:", error.message);
        return null;
      }

      if (data) {
        return {
          onboardingCompleted: Boolean(data.onboarding_completed),
          preferredLanguage: (data.preferred_language as "en" | "bn") || "en",
          preferredTheme: (data.preferred_theme as "dark" | "light") || "dark",
          accountMode: (data.account_mode as "guest" | "authenticated") || "authenticated",
          productTourCompleted: Boolean(data.product_tour_completed),
        };
      }
      return null;
    } catch (err) {
      console.warn("[userService] Unexpected error in fetchOnboardingState:", err);
      return null;
    }
  },

  /**
   * Persists onboarding state for an authenticated user to Supabase PostgreSQL.
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
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (state.onboardingCompleted !== undefined) {
        updates.onboarding_completed = state.onboardingCompleted;
        if (state.onboardingCompleted) {
          updates.onboarding_completed_at = new Date().toISOString();
        }
      }
      if (state.preferredLanguage !== undefined) updates.preferred_language = state.preferredLanguage;
      if (state.preferredTheme !== undefined) updates.preferred_theme = state.preferredTheme;
      if (state.accountMode !== undefined) updates.account_mode = state.accountMode;
      if (state.productTourCompleted !== undefined) updates.product_tour_completed = state.productTourCompleted;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) {
        console.warn("[userService] Failed to save onboarding state to DB:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[userService] Unexpected error in saveOnboardingState:", err);
      return false;
    }
  },
};
