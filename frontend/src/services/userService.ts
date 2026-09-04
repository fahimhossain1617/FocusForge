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
};
