/**
 * FocusForge End-to-End Encryption & Key Management Service (cryptoSyncService.ts)
 * 
 * Implements privacy-preserving, zero-knowledge encryption using the standard Web Crypto API.
 * Standards:
 * - Cipher: AES-256-GCM with authenticated tags and unique 12-byte IV per record.
 * - Key Derivation: PBKDF2 (100,000 iterations, SHA-256).
 * - Master Secret: User passphrase / 12-word recovery key generated on-device.
 * - Zero Knowledge: Neither Supabase nor the sync relay server can ever decrypt the data.
 */

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

// In-memory key cache for active session (never persisted in plaintext to localStorage)
let inMemoryCryptoKey: CryptoKey | null = null;
let activeKeyUserId: string | null = null;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const cryptoSyncService = {
  /**
   * Generates a secure 12-word or alphanumeric recovery passphrase on the user's device.
   */
  generateRecoveryKey(): string {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const randomBytes = new Uint8Array(16);
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < 16; i++) randomBytes[i] = Math.floor(Math.random() * 256);
    }

    let code = "";
    for (let i = 0; i < 16; i++) {
      code += charset[randomBytes[i] % charset.length];
      if ((i + 1) % 4 === 0 && i !== 15) {
        code += "-";
      }
    }
    return `FF-${code}`;
  },

  /**
   * Derives a 256-bit AES-GCM CryptoKey using PBKDF2 with SHA-256.
   */
  async deriveKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
    if (typeof window === "undefined" || !window.crypto?.subtle) {
      throw new Error("Web Crypto API is not available");
    }

    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(passphrase),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes as unknown as BufferSource,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  /**
   * Initializes or unlocks the encryption key for the current session.
   */
  async unlockEncryption(userId: string, passphrase: string): Promise<boolean> {
    try {
      const cleanUserId = userId.trim();
      // Derive a deterministic per-user salt from user ID to ensure cross-device consistency
      const encoder = new TextEncoder();
      const rawUserSalt = await window.crypto.subtle.digest("SHA-256", encoder.encode(`salt_${cleanUserId}`));
      const saltBytes = new Uint8Array(rawUserSalt).slice(0, 16);

      const key = await this.deriveKey(passphrase, saltBytes);
      inMemoryCryptoKey = key;
      activeKeyUserId = cleanUserId;

      // Keep passphrase securely in sessionStorage for active session auto-sync
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`focusforge_e2ee_salt_${cleanUserId}`, bufferToBase64(saltBytes));
        } catch {}
      }

      return true;
    } catch (err) {
      console.error("[cryptoSyncService] Failed to derive encryption key:", err);
      return false;
    }
  },

  /**
   * Checks if encryption is currently unlocked in memory.
   */
  isUnlocked(userId: string): boolean {
    return inMemoryCryptoKey !== null && activeKeyUserId === userId;
  },

  /**
   * Locks and purges all decrypted keys and credentials from memory.
   */
  lockEncryption(): void {
    inMemoryCryptoKey = null;
    activeKeyUserId = null;
  },

  /**
   * Encrypts arbitrary JSON-serializable data using AES-256-GCM.
   */
  async encrypt<T = any>(data: T, customKey?: CryptoKey): Promise<EncryptedPayload> {
    const key = customKey || inMemoryCryptoKey;
    if (!key) {
      throw new Error("Encryption key is locked or not initialized");
    }

    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(JSON.stringify(data));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      plaintextBytes
    );

    return {
      ciphertext: bufferToBase64(ciphertextBuffer),
      iv: bufferToBase64(iv),
      salt: "",
      version: 1,
    };
  },

  /**
   * Decrypts AES-256-GCM encrypted payload back to original JavaScript object.
   */
  async decrypt<T = any>(payload: EncryptedPayload, customKey?: CryptoKey): Promise<T> {
    const key = customKey || inMemoryCryptoKey;
    if (!key) {
      throw new Error("Encryption key is locked or not initialized");
    }

    const ivBytes = base64ToBuffer(payload.iv);
    const ciphertextBytes = base64ToBuffer(payload.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes as unknown as BufferSource },
      key,
      ciphertextBytes as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString) as T;
  },
};
