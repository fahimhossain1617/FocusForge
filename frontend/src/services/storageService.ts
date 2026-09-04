import { supabase } from "../lib/supabaseClient";
import { compressImageFile } from "./indexedDBStorage";

export const storageService = {
  /**
   * Uploads an attachment or image to Supabase Storage.
   * If the upload fails or user is not logged in, falls back gracefully to a Base64 data URL.
   */
  async uploadAttachment(
    file: File,
    userId?: string
  ): Promise<{ url: string; fileName: string; fileSize: number; fileType: string }> {
    const isImage = file.type.startsWith("image/");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    if (userId) {
      try {
        const filePath = `${userId}/${Date.now()}_${safeName}`;
        const { data, error } = await supabase.storage
          .from("note-attachments")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from("note-attachments")
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            return {
              url: publicUrlData.publicUrl,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            };
          }
        } else {
          console.warn("[storageService] Supabase Storage upload skipped/failed:", error?.message);
        }
      } catch (err) {
        console.warn("[storageService] Unexpected error uploading to storage:", err);
      }
    }

    // Fallback: Local Base64 Data URL
    if (isImage) {
      const compressed = await compressImageFile(file);
      if (compressed) {
        return {
          url: compressed,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        };
      }
    }

    // Generic file fallback
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return {
      url: dataUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  },

  /**
   * Uploads a profile avatar to Supabase Storage.
   */
  async uploadAvatar(file: File, userId: string): Promise<string | null> {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/avatar_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("note-attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from("note-attachments")
          .getPublicUrl(filePath);

        return publicUrlData?.publicUrl || null;
      }
    } catch (err) {
      console.warn("[storageService] Failed to upload avatar:", err);
    }

    return await compressImageFile(file);
  },
};
