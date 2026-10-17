/**
 * FocusForge End-to-End Encryption & Key Management Service (cryptoSyncService.ts)
 *
 * Delegates to the unified zero-knowledge envelope-key engine (lib/crypto.ts).
 * Maintains full backward compatibility for existing callers.
 */

import {
  cryptoSession,
  generateRecoveryPhrase,
  encryptPayload,
  decryptPayload,
  deriveKeyFromPassphrase,
  generateSalt,
  bufferToBase64,
  base64ToBuffer,
  type EncryptedDataEnvelope,
} from "../lib/crypto";
import { fetchBackend } from "../lib/apiClient";

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded ciphertext
  iv: string;         // Base64 encoded 12-byte IV
  salt: string;       // Base64 encoded salt
  version: number;    // Schema version
}

export interface SyncRecordPayload {
  id: string | number;
  collection: string;
  encryptedData: EncryptedPayload;
  updatedAt: string;
  isDeleted: boolean;
}

export const cryptoSyncService = {
  /**
   * Generates a secure 6-digit numeric recovery code on the user's device.
   */
  generateRecoveryKey(): string {
    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return ((arr[0] % 900000) + 100000).toString();
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Derives a 256-bit AES-GCM CryptoKey using PBKDF2 with SHA-256.
   */
  async deriveKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
    const saltBase64 = bufferToBase64(saltBytes);
    return await deriveKeyFromPassphrase(passphrase, saltBase64, 250000);
  },

  /**
   * Retrieves encryption key metadata including 30-day reset eligibility from the server.
   */
  async getKeyMetadata(userId: string): Promise<{
    exists: boolean;
    canReset: boolean;
    daysRemaining: number;
    lastResetAt: string | null;
  }> {
    const cleanUserId = userId?.trim();
    if (!cleanUserId || cleanUserId === "guest") {
      return { exists: false, canReset: true, daysRemaining: 0, lastResetAt: null };
    }
    try {
      const res = await fetchBackend<{
        exists: boolean;
        canReset?: boolean;
        daysRemaining?: number;
        lastResetAt?: string;
        envelope?: any;
      }>("/api/crypto/keys", { method: "GET" });

      if (!res || !res.exists) {
        return { exists: false, canReset: true, daysRemaining: 0, lastResetAt: null };
      }

      return {
        exists: true,
        canReset: res.canReset !== undefined ? res.canReset : true,
        daysRemaining: res.daysRemaining || 0,
        lastResetAt: res.lastResetAt || null,
      };
    } catch {
      return { exists: false, canReset: true, daysRemaining: 0, lastResetAt: null };
    }
  },

  /**
   * Initializes or unlocks the encryption key for the current session.
   */
  async unlockEncryption(userId: string, passphrase: string): Promise<boolean> {
    const cleanUserId = userId?.trim();
    if (!cleanUserId || cleanUserId === "guest") return false;

    try {
      // Check if remote vault exists
      const res = await fetchBackend<{ exists: boolean; envelope?: any }>("/api/crypto/keys", {
        method: "GET",
      }).catch(() => null);

      if (res && res.exists && res.envelope) {
        await cryptoSession.unlockVault(cleanUserId, res.envelope, passphrase);
      } else {
        // Vault doesn't exist yet on server; initialize new vault
        const { envelope } = await cryptoSession.createNewEncryptionVault(cleanUserId, passphrase);
        await fetchBackend("/api/crypto/keys", {
          method: "POST",
          body: JSON.stringify({ envelope }),
        }).catch(() => null);
      }

      // Store local recovery passphrase for auto-unlock on this device
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`focentia_recovery_key_${cleanUserId}`, passphrase);
          localStorage.setItem(`focusforge_recovery_key_${cleanUserId}`, passphrase);
        } catch {}
      }

      return true;
    } catch (err) {
      console.warn("[cryptoSyncService] Unlock notice:", err);
      return false;
    }
  },

  /**
   * Resets the user's 6-digit Device Sync Code following password verification.
   * Enforces 30-day cooldown and permanently updates the key envelope in Supabase.
   */
  async resetSyncCode(
    userId: string,
    new6DigitCode: string
  ): Promise<{ success: boolean; error?: string; daysRemaining?: number }> {
    const cleanUserId = userId?.trim();
    if (!cleanUserId || cleanUserId === "guest") {
      return { success: false, error: "Invalid user session." };
    }

    const cleanCode = new6DigitCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return { success: false, error: "Device sync code must be exactly 6 digits (numbers only)." };
    }

    try {
      let envelope: any;

      if (cryptoSession.isUnlocked(cleanUserId)) {
        const res = await cryptoSession.changePassphrase(cleanUserId, cleanCode);
        envelope = res.envelope;
      } else {
        const res = await cryptoSession.createNewEncryptionVault(cleanUserId, cleanCode);
        envelope = res.envelope;
      }

      // Save to server with isReset: true to record 30-day cooldown
      const res = await fetchBackend<{ success: boolean; error?: string; daysLeft?: number }>("/api/crypto/keys", {
        method: "POST",
        body: JSON.stringify({ envelope, isReset: true }),
      });

      if (!res || !res.success) {
        return {
          success: false,
          error: res?.error || "Failed to update device sync code on server.",
          daysRemaining: res?.daysLeft,
        };
      }

      // Store new code locally for persistent auto-unlock
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`focentia_recovery_key_${cleanUserId}`, cleanCode);
          localStorage.setItem(`focusforge_recovery_key_${cleanUserId}`, cleanCode);
          localStorage.removeItem(`focusforge_unlock_dismissed_${cleanUserId}`);
          sessionStorage.removeItem(`focusforge_unlock_dismissed_${cleanUserId}`);
        } catch {}
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to reset device sync code." };
    }
  },

  /**
   * Securely updates the user's sync passphrase without decrypting/re-encrypting the whole database.
   * Re-wraps the Master Encryption Key with the new passphrase and updates Supabase.
   */
  async updatePassphrase(userId: string, newPassphrase: string): Promise<boolean> {
    const cleanUserId = userId?.trim();
    if (!cleanUserId || cleanUserId === "guest" || !newPassphrase) return false;

    try {
      // Ensure vault is unlocked
      if (!cryptoSession.isUnlocked(cleanUserId)) {
        const currentKey = this.getRecoveryKey(cleanUserId);
        if (currentKey) {
          await this.unlockEncryption(cleanUserId, currentKey);
        }
      }

      const { envelope } = await cryptoSession.changePassphrase(cleanUserId, newPassphrase);

      // Save updated envelope to Supabase
      const res = await fetchBackend<{ success: boolean }>("/api/crypto/keys", {
        method: "POST",
        body: JSON.stringify({ envelope }),
      });

      if (!res || !res.success) {
        throw new Error("Failed to save updated key envelope on server");
      }

      // Store updated passphrase locally for seamless auto-unlock on this device
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`focentia_recovery_key_${cleanUserId}`, newPassphrase);
          localStorage.setItem(`focusforge_recovery_key_${cleanUserId}`, newPassphrase);
        } catch {}
      }

      return true;
    } catch (err) {
      console.warn("[cryptoSyncService] Update passphrase failed:", err);
      return false;
    }
  },

  /**
   * Gets the stored device recovery key if available.
   */
  getRecoveryKey(userId: string): string | null {
    if (typeof window === "undefined" || !userId || userId === "guest") return null;
    try {
      return (
        localStorage.getItem(`focentia_recovery_key_${userId.trim()}`) ||
        localStorage.getItem(`focusforge_recovery_key_${userId.trim()}`) ||
        null
      );
    } catch {
      return null;
    }
  },

  /**
   * Sets the recovery key for this device and derives the active encryption key.
   */
  async setRecoveryKey(userId: string, key: string): Promise<boolean> {
    if (typeof window === "undefined" || !userId || userId === "guest" || !key) return false;
    const cleanUserId = userId.trim();
    const cleanKey = key.trim();
    try {
      localStorage.setItem(`focentia_recovery_key_${cleanUserId}`, cleanKey);
      return await this.unlockEncryption(cleanUserId, cleanKey);
    } catch (err) {
      console.warn("[cryptoSyncService] Failed to set recovery key:", err);
      return false;
    }
  },

  /**
   * Ensures the encryption key is initialized for the active account.
   */
  async ensureKeyInitialized(userId: string): Promise<boolean> {
    if (!userId || userId === "guest") return false;
    if (this.isUnlocked(userId)) return true;

    const existingKey = this.getRecoveryKey(userId);
    if (existingKey) {
      return await this.unlockEncryption(userId, existingKey);
    }

    // Auto-create a secure recovery phrase for new account if none exists
    const newKey = this.generateRecoveryKey();
    return await this.setRecoveryKey(userId, newKey);
  },

  /**
   * Checks if encryption is currently unlocked in memory.
   */
  isUnlocked(userId: string): boolean {
    return cryptoSession.isUnlocked(userId);
  },

  /**
   * Locks and purges all decrypted keys from memory.
   */
  lockEncryption(): void {
    cryptoSession.lockVault();
  },

  /**
   * Encrypts arbitrary JSON-serializable data using AES-256-GCM.
   */
  async encrypt<T = any>(data: T, customKey?: CryptoKey): Promise<EncryptedPayload> {
    const key = customKey || cryptoSession.getMasterKey();
    const envelope = await encryptPayload(data, key);
    return {
      ciphertext: envelope.ciphertext,
      iv: envelope.iv,
      salt: "",
      version: envelope.version,
    };
  },

  /**
   * Decrypts AES-256-GCM encrypted payload back to original JavaScript object.
   */
  async decrypt<T = any>(payload: EncryptedPayload, customKey?: CryptoKey): Promise<T> {
    const key = customKey || cryptoSession.getMasterKey();
    return await decryptPayload<T>(
      {
        version: payload.version || 1,
        algorithm: "AES-256-GCM",
        iv: payload.iv,
        ciphertext: payload.ciphertext,
      },
      key
    );
  },
};
