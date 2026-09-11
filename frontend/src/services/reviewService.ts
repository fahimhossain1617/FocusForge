import { fetchBackend } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";

export interface ReviewPromptState {
  status: "eligible" | "skipped" | "submitted" | "guest";
  meaningfulActions: number;
  skipCount: number;
  lastShownAt?: string | null;
  nextPromptAt?: string | null;
  submittedAt?: string | null;
}

export interface SubmitReviewPayload {
  rating?: number | null;
  comment?: string | null;
}

export const reviewService = {
  /**
   * Fetches current user's review prompt state.
   */
  async fetchReviewState(): Promise<ReviewPromptState | null> {
    try {
      const data = await fetchBackend<ReviewPromptState>("/api/reviews/state");
      return data;
    } catch (err) {
      // Fallback: check Supabase directly with current user session
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return null;

        const { data: dbState } = await supabase
          .from("review_prompt_state")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (dbState) {
          return {
            status: dbState.status || "eligible",
            meaningfulActions: dbState.meaningful_actions || 0,
            skipCount: dbState.skip_count || 0,
            lastShownAt: dbState.last_shown_at,
            nextPromptAt: dbState.next_prompt_at,
            submittedAt: dbState.submitted_at,
          };
        }

        // Check if review exists in reviews table
        const { data: existingReview } = await supabase
          .from("reviews")
          .select("created_at")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingReview) {
          return {
            status: "submitted",
            meaningfulActions: 0,
            skipCount: 0,
            nextPromptAt: null,
            submittedAt: existingReview.created_at,
          };
        }

        return {
          status: "eligible",
          meaningfulActions: 0,
          skipCount: 0,
          nextPromptAt: null,
          submittedAt: null,
        };
      } catch (fallbackErr) {
        console.warn("[reviewService] Fallback fetch failed:", fallbackErr);
        return null;
      }
    }
  },

  /**
   * Increments the user's meaningful action count.
   */
  async recordAction(): Promise<{ success: boolean; count?: number; status?: string }> {
    try {
      const result = await fetchBackend<{ success: boolean; count?: number; status?: string }>(
        "/api/reviews/action",
        { method: "POST" }
      );
      return result;
    } catch (err) {
      // Fallback: direct Supabase increment
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return { success: false };

        const { data: cur } = await supabase
          .from("review_prompt_state")
          .select("status, meaningful_actions")
          .eq("user_id", userId)
          .maybeSingle();

        if (cur?.status === "submitted") {
          return { success: true, status: "submitted" };
        }

        const newCount = (cur?.meaningful_actions || 0) + 1;
        await supabase.from("review_prompt_state").upsert({
          user_id: userId,
          status: cur?.status || "eligible",
          meaningful_actions: newCount,
          updated_at: new Date().toISOString(),
        });

        return { success: true, count: newCount };
      } catch {
        return { success: false };
      }
    }
  },

  /**
   * Records user skipping the review modal. Schedules progressive retry.
   */
  async skipReview(): Promise<{ success: boolean; nextPromptAt?: string }> {
    try {
      const result = await fetchBackend<{ success: boolean; nextPromptAt?: string }>(
        "/api/reviews/skip",
        { method: "POST" }
      );
      return result;
    } catch (err) {
      // Fallback: direct Supabase skip update
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return { success: false };

        const { data: cur } = await supabase
          .from("review_prompt_state")
          .select("skip_count, status")
          .eq("user_id", userId)
          .maybeSingle();

        if (cur?.status === "submitted") {
          return { success: true };
        }

        const newSkip = (cur?.skip_count || 0) + 1;
        let delayHours = 36;
        if (newSkip === 1) delayHours = 36;
        else if (newSkip === 2) delayHours = 84;
        else if (newSkip === 3) delayHours = 24 * 7;
        else if (newSkip === 4) delayHours = 24 * 14;
        else if (newSkip === 5) delayHours = 24 * 30;
        else delayHours = 24 * 45;

        const nextPrompt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();
        const nowIso = new Date().toISOString();

        await supabase.from("review_prompt_state").upsert({
          user_id: userId,
          status: "skipped",
          meaningful_actions: 0,
          skip_count: newSkip,
          last_shown_at: nowIso,
          next_prompt_at: nextPrompt,
          updated_at: nowIso,
        });

        return { success: true, nextPromptAt: nextPrompt };
      } catch {
        return { success: false };
      }
    }
  },

  /**
   * Submits user review directly to Supabase and marks state as submitted.
   */
  async submitReview(payload: SubmitReviewPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await fetchBackend<{ success: boolean; message?: string }>(
        "/api/reviews/submit",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      return { success: Boolean(result.success) };
    } catch (err: any) {
      // Fallback: direct Supabase insert
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) {
          return { success: false, error: "Please log in to submit feedback." };
        }

        const nowIso = new Date().toISOString();
        const { error: insertErr } = await supabase.from("reviews").insert({
          user_id: userId,
          rating: payload.rating || null,
          comment: payload.comment?.trim() || null,
          created_at: nowIso,
          updated_at: nowIso,
        });

        if (insertErr && !insertErr.message.includes("unique")) {
          return { success: false, error: insertErr.message };
        }

        await supabase.from("review_prompt_state").upsert({
          user_id: userId,
          status: "submitted",
          submitted_at: nowIso,
          updated_at: nowIso,
        });

        return { success: true };
      } catch (fallbackErr: any) {
        return { success: false, error: fallbackErr?.message || "Failed to submit review" };
      }
    }
  },
};
