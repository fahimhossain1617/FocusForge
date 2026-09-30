import { compressImageFile } from "./indexedDBStorage";
import { localDb } from "./localDbService";

export const storageService = {
  /**
   * Saves an attachment or image to local-first database (IndexedDB).
   * Does NOT upload user files or images to Supabase cloud storage.
   */
  async uploadAttachment(
    file: File,
    userId?: string
  ): Promise<{ url: string; fileName: string; fileSize: number; fileType: string; storagePath?: string }> {
    const isImage = file.type.startsWith("image/");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const cleanUserId = userId || "guest";
    const attachmentId = `att_${Date.now()}_${safeName}`;

    let dataUrl = "";
    if (isImage) {
      const compressed = await compressImageFile(file);
      if (compressed) {
        dataUrl = compressed;
      }
    }

    if (!dataUrl) {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Persist in local-first database
    try {
      await localDb.put("attachments", {
        id: attachmentId,
        userId: cleanUserId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        dataUrl,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[storageService] Failed to save to localDb attachments store:", err);
    }

    return {
      url: dataUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      storagePath: attachmentId,
    };
  },

  async getSignedUrl(filePath: string): Promise<string | null> {
    // Check local database for attachment
    try {
      const record = await localDb.get<any>("attachments", "guest", filePath);
      return record?.dataUrl || null;
    } catch {
      return null;
    }
  },

  /**
   * Uploads an avatar image (converts to compressed data URL locally or saves profile avatar).
   */
  async uploadAvatar(file: File, userId: string): Promise<string | null> {
    try {
      const compressed = await compressImageFile(file);
      if (compressed) return compressed;

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return dataUrl;
    } catch {
      return null;
    }
  },
};
