import { compressImageFile } from "./indexedDBStorage";
import { fileRepository } from "../lib/repositories/fileRepository";
import { localDb } from "./localDbService";

export const storageService = {
  /**
   * Saves an attachment or image to client-side encrypted database (Dexie IndexedDB).
   * Encrypts client-side using AES-256-GCM before persistent storage.
   * Does NOT upload unencrypted files to Supabase cloud storage.
   */
  async uploadAttachment(
    file: File,
    userId?: string
  ): Promise<{ url: string; fileName: string; fileSize: number; fileType: string; storagePath?: string }> {
    const isImage = file.type.startsWith("image/");
    const cleanUserId = userId || "guest";

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

    // Persist via encrypted fileRepository in Dexie
    const saved = await fileRepository.saveAttachment(
      cleanUserId,
      file,
      file.name,
      file.type,
      dataUrl
    );

    return {
      url: dataUrl,
      fileName: saved.fileName,
      fileSize: saved.fileSize,
      fileType: saved.fileType,
      storagePath: saved.id,
    };
  },

  async getSignedUrl(filePath: string, userId = "guest"): Promise<string | null> {
    try {
      const record = await fileRepository.getById(userId, filePath);
      return record?.dataUrl || null;
    } catch {
      return null;
    }
  },

  /**
   * Uploads an avatar image (converts to compressed data URL locally).
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
