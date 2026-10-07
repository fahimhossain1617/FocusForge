/**
 * Focentia Cryptography Engine (lib/crypto.ts)
 *
 * Implements a zero-knowledge envelope-key architecture using standard Web Crypto API primitives:
 * - Master Encryption Key (MEK): 256-bit cryptographically random key generated client-side.
 * - Key Encryption Key (KEK): Derived from user passphrase via PBKDF2-HMAC-SHA-256 (250,000 rounds).
 * - Envelope Key Wrapping: MEK wrapped with KEK via AES-256-GCM with a dedicated 96-bit IV.
 * - Record & File Encryption: AES-256-GCM with unique, non-reused 96-bit (12-byte) IVs per operation.
 * - Safe In-Memory Caching: MEK and KEK exist only in memory during an unlocked session and are purged on logout.
 */

// ============================================================================
// TYPED ERROR CLASSES
// ============================================================================

export class EncryptionError extends Error {
  constructor(message = "Encryption operation failed") {
    super(message);
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends Error {
  constructor(message = "Decryption operation failed. The data or key may be corrupted.") {
    super(message);
    this.name = "DecryptionError";
  }
}

export class InvalidPassphraseError extends Error {
  constructor(message = "Unable to unlock your encrypted data. Please check your passphrase.") {
    super(message);
    this.name = "InvalidPassphraseError";
  }
}

export class MigrationError extends Error {
  constructor(message = "Storage migration failed") {
    super(message);
    this.name = "MigrationError";
  }
}

export class SyncError extends Error {
  constructor(message = "Encrypted sync operation failed") {
    super(message);
    this.name = "SyncError";
  }
}

export class CorruptDataError extends Error {
  constructor(message = "The encrypted data envelope is corrupted or invalid") {
    super(message);
    this.name = "CorruptDataError";
  }
}

export class UnsupportedVersionError extends Error {
  constructor(version: number) {
    super(`Unsupported encryption envelope version: ${version}`);
    this.name = "UnsupportedVersionError";
  }
}

// ============================================================================
// ENVELOPE INTERFACES
// ============================================================================

export const CRYPTO_CURRENT_VERSION = 1;
export const DEFAULT_PBKDF2_ITERATIONS = 250000;
export const DEFAULT_HASH_ALGO = "SHA-256";

export interface KdfMetadata {
  algorithm: "PBKDF2-SHA256" | "Argon2id";
  salt: string; // Base64 encoded salt
  parameters: {
    iterations?: number;
    hash?: string;
    memoryCost?: number;
    timeCost?: number;
    parallelism?: number;
  };
}

export interface WrappedKeyEnvelope {
  version: number;
  algorithm: "AES-256-GCM";
  kdf: KdfMetadata;
  iv: string; // Base64 encoded 12-byte IV used to wrap MEK
  wrappedKeyCiphertext: string; // Base64 encoded wrapped MEK
  createdAt: string;
}

export interface EncryptedDataEnvelope {
  version: number;
  algorithm: "AES-256-GCM";
  iv: string; // Base64 encoded 12-byte IV
  ciphertext: string; // Base64 encoded ciphertext
  tagLength?: number; // Default 128
}

export interface EncryptedFileMetadata {
  version: number;
  algorithm: "AES-256-GCM";
  iv: string; // Base64 encoded 12-byte IV
  originalName: string;
  originalType: string;
  originalSize: number;
  encryptedSize: number;
}

export interface UserEncryptionKeyRecord {
  userId: string;
  keyVersion: number;
  algorithm: string;
  kdfAlgorithm: string;
  kdfSalt: string;
  kdfParams: Record<string, any>;
  wrappedMasterKey: string; // Base64 encoded wrapped MEK
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// IN-MEMORY SESSION KEY CACHE
// (Never written to persistent storage in plaintext)
// ============================================================================

interface ActiveKeySession {
  userId: string;
  masterKey: CryptoKey;
  kek: CryptoKey;
  kdfMetadata: KdfMetadata;
  unlockedAt: number;
}

let activeSession: ActiveKeySession | null = null;

// ============================================================================
// BINARY / BASE64 ENCODING UTILITIES
// ============================================================================

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new CorruptDataError("Failed to decode Base64 data");
  }
}

export function secureRandomBytes(length: number): Uint8Array {
  if (typeof window === "undefined" || !window.crypto) {
    throw new Error("Web Crypto API is not available in this environment");
  }
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

export function generateSalt(length = 16): string {
  return bufferToBase64(secureRandomBytes(length));
}

export function generateIV(length = 12): string {
  return bufferToBase64(secureRandomBytes(length));
}

// ============================================================================
// CORE CRYPTOGRAPHY FUNCTIONS
// ============================================================================

/**
 * Generates a cryptographically random 256-bit Master Encryption Key (MEK).
 * The key is generated with extractable=true only so it can be wrapped with the KEK.
 */
export async function generateMasterEncryptionKey(): Promise<CryptoKey> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available");
  }
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable for envelope wrapping
    ["encrypt", "decrypt"]
  );
}

/**
 * Derives a 256-bit Key Encryption Key (KEK) from the user's passphrase.
 * Uses PBKDF2-HMAC-SHA-256 with strong configurable iterations.
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  saltBase64: string,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  const cleanPassphrase = passphrase.normalize("NFKC");
  if (!cleanPassphrase || cleanPassphrase.length < 6) {
    throw new InvalidPassphraseError("Passphrase must be at least 6 characters long");
  }

  const saltBytes = base64ToBuffer(saltBase64);
  const encoder = new TextEncoder();
  const rawKeyMaterial = encoder.encode(cleanPassphrase);

  // Import raw passphrase material
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    rawKeyMaterial,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive 256-bit AES-GCM KEK
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as unknown as BufferSource,
      iterations,
      hash: DEFAULT_HASH_ALGO,
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // KEK itself is not extractable
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

/**
 * Wraps the Master Encryption Key (MEK) using the Key Encryption Key (KEK).
 * Produces a versioned envelope ready for secure storage in Supabase.
 */
export async function wrapMasterKey(
  masterKey: CryptoKey,
  kek: CryptoKey,
  kdfMetadata: KdfMetadata
): Promise<WrappedKeyEnvelope> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  const ivBytes = secureRandomBytes(12);

  // Wrap the MEK using AES-GCM with KEK
  const wrappedRaw = await window.crypto.subtle.wrapKey(
    "raw",
    masterKey,
    kek,
    {
      name: "AES-GCM",
      iv: ivBytes as unknown as BufferSource,
      tagLength: 128,
    }
  );

  return {
    version: CRYPTO_CURRENT_VERSION,
    algorithm: "AES-256-GCM",
    kdf: kdfMetadata,
    iv: bufferToBase64(ivBytes),
    wrappedKeyCiphertext: bufferToBase64(wrappedRaw),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Unwraps the Master Encryption Key (MEK) using the Key Encryption Key (KEK).
 * Validates integrity via AES-GCM authentication tag.
 */
export async function unwrapMasterKey(
  envelope: WrappedKeyEnvelope | { iv: string; wrappedKeyCiphertext: string; version?: number },
  kek: CryptoKey
): Promise<CryptoKey> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  if (envelope.version && envelope.version > CRYPTO_CURRENT_VERSION) {
    throw new UnsupportedVersionError(envelope.version);
  }

  try {
    const ivBytes = base64ToBuffer(envelope.iv);
    const wrappedBytes = base64ToBuffer(envelope.wrappedKeyCiphertext);

    return await window.crypto.subtle.unwrapKey(
      "raw",
      wrappedBytes as unknown as BufferSource,
      kek,
      {
        name: "AES-GCM",
        iv: ivBytes as unknown as BufferSource,
        tagLength: 128,
      },
      {
        name: "AES-GCM",
        length: 256,
      },
      true, // extractable so it can be re-wrapped if user changes passphrase
      ["encrypt", "decrypt"]
    );
  } catch (err: any) {
    throw new InvalidPassphraseError("Unable to decrypt master key. Invalid passphrase or corrupted key envelope.");
  }
}

/**
 * Encrypts arbitrary JavaScript data with AES-256-GCM using the Master Encryption Key.
 * Every invocation generates a unique, non-reused 96-bit (12-byte) IV.
 */
export async function encryptPayload<T = any>(
  payload: T,
  masterKey: CryptoKey
): Promise<EncryptedDataEnvelope> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  const ivBytes = secureRandomBytes(12);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(JSON.stringify(payload));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes as unknown as BufferSource,
      tagLength: 128,
    },
    masterKey,
    plaintextBytes
  );

  return {
    version: CRYPTO_CURRENT_VERSION,
    algorithm: "AES-256-GCM",
    iv: bufferToBase64(ivBytes),
    ciphertext: bufferToBase64(ciphertextBuffer),
    tagLength: 128,
  };
}

/**
 * Decrypts an EncryptedDataEnvelope back to the original JavaScript object using the MEK.
 */
export async function decryptPayload<T = any>(
  envelope: EncryptedDataEnvelope | { iv: string; ciphertext: string; version?: number },
  masterKey: CryptoKey
): Promise<T> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  if (envelope.version && envelope.version > CRYPTO_CURRENT_VERSION) {
    throw new UnsupportedVersionError(envelope.version);
  }

  try {
    const ivBytes = base64ToBuffer(envelope.iv);
    const ciphertextBytes = base64ToBuffer(envelope.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes as unknown as BufferSource,
        tagLength: 128,
      },
      masterKey,
      ciphertextBytes as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString) as T;
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      throw new CorruptDataError("Decrypted data is not valid JSON");
    }
    throw new DecryptionError("Failed to decrypt payload. Ciphertext or authentication tag is invalid.");
  }
}

/**
 * Encrypts a binary file or Blob with AES-256-GCM before uploading to Supabase Storage.
 * The server receives only opaque application/octet-stream ciphertext bytes.
 */
export async function encryptFile(
  file: File | Blob | ArrayBuffer,
  masterKey: CryptoKey,
  metadata?: { originalName?: string; originalType?: string }
): Promise<{
  encryptedBlob: Blob;
  metadata: EncryptedFileMetadata;
}> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  let arrayBuffer: ArrayBuffer;
  let originalName = metadata?.originalName || "attachment.bin";
  let originalType = metadata?.originalType || "application/octet-stream";
  let originalSize = 0;

  if (file instanceof File) {
    originalName = file.name;
    originalType = file.type || "application/octet-stream";
    originalSize = file.size;
    arrayBuffer = await file.arrayBuffer();
  } else if (file instanceof Blob) {
    originalType = file.type || "application/octet-stream";
    originalSize = file.size;
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
    originalSize = file.byteLength;
  }

  const ivBytes = secureRandomBytes(12);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes as unknown as BufferSource,
      tagLength: 128,
    },
    masterKey,
    arrayBuffer
  );

  const encryptedBlob = new Blob([ciphertextBuffer], { type: "application/octet-stream" });

  const fileMetadata: EncryptedFileMetadata = {
    version: CRYPTO_CURRENT_VERSION,
    algorithm: "AES-256-GCM",
    iv: bufferToBase64(ivBytes),
    originalName,
    originalType,
    originalSize,
    encryptedSize: ciphertextBuffer.byteLength,
  };

  return {
    encryptedBlob,
    metadata: fileMetadata,
  };
}

/**
 * Decrypts an encrypted binary Blob back to its original MIME type and content.
 */
export async function decryptFile(
  encryptedData: ArrayBuffer | Blob,
  ivBase64: string,
  masterKey: CryptoKey,
  mimeType = "application/octet-stream"
): Promise<Blob> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  const arrayBuffer =
    encryptedData instanceof Blob ? await encryptedData.arrayBuffer() : encryptedData;

  const ivBytes = base64ToBuffer(ivBase64);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes as unknown as BufferSource,
        tagLength: 128,
      },
      masterKey,
      arrayBuffer
    );

    return new Blob([decryptedBuffer], { type: mimeType });
  } catch {
    throw new DecryptionError("Failed to decrypt file. The key or ciphertext is invalid.");
  }
}

// ============================================================================
// RECOVERY PHRASE GENERATOR
// ============================================================================

/**
 * Generates an easy-to-record 16-character alphanumeric recovery key.
 * Format: FF-XXXX-XXXX-XXXX-XXXX
 */
export function generateRecoveryPhrase(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomBytes = secureRandomBytes(16);
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += charset[randomBytes[i] % charset.length];
    if ((i + 1) % 4 === 0 && i !== 15) {
      code += "-";
    }
  }
  return `FF-${code}`;
}

// ============================================================================
// SESSION KEY LIFECYCLE MANAGEMENT
// ============================================================================

export const cryptoSession = {
  /**
   * Initializes a brand-new Master Encryption Key and wraps it with the user's passphrase.
   * Returns the WrappedKeyEnvelope ready to be persisted to Supabase `user_encryption_keys`.
   */
  async createNewEncryptionVault(
    userId: string,
    passphrase: string
  ): Promise<{ envelope: WrappedKeyEnvelope; masterKey: CryptoKey; kek: CryptoKey }> {
    const cleanUserId = userId.trim();
    const salt = generateSalt(16);
    const kdfMetadata: KdfMetadata = {
      algorithm: "PBKDF2-SHA256",
      salt,
      parameters: {
        iterations: DEFAULT_PBKDF2_ITERATIONS,
        hash: DEFAULT_HASH_ALGO,
      },
    };

    const kek = await deriveKeyFromPassphrase(passphrase, salt, DEFAULT_PBKDF2_ITERATIONS);
    const masterKey = await generateMasterEncryptionKey();
    const envelope = await wrapMasterKey(masterKey, kek, kdfMetadata);

    activeSession = {
      userId: cleanUserId,
      masterKey,
      kek,
      kdfMetadata,
      unlockedAt: Date.now(),
    };

    return { envelope, masterKey, kek };
  },

  /**
   * Unlocks an existing encryption vault given the remote WrappedKeyEnvelope and the user's passphrase.
   */
  async unlockVault(
    userId: string,
    envelope: WrappedKeyEnvelope,
    passphrase: string
  ): Promise<CryptoKey> {
    const cleanUserId = userId.trim();
    const kdf = envelope.kdf;
    if (!kdf || !kdf.salt) {
      throw new CorruptDataError("Missing KDF metadata in key envelope");
    }

    const iterations = kdf.parameters?.iterations || DEFAULT_PBKDF2_ITERATIONS;
    const kek = await deriveKeyFromPassphrase(passphrase, kdf.salt, iterations);
    const masterKey = await unwrapMasterKey(envelope, kek);

    activeSession = {
      userId: cleanUserId,
      masterKey,
      kek,
      kdfMetadata: kdf,
      unlockedAt: Date.now(),
    };

    return masterKey;
  },

  /**
   * Checks if the encryption key is currently unlocked in memory for this user.
   */
  isUnlocked(userId?: string | null): boolean {
    if (!userId || !activeSession) return false;
    return activeSession.userId === userId.trim();
  },

  /**
   * Gets the active Master Encryption Key for the current session.
   */
  getMasterKey(userId?: string | null): CryptoKey {
    if (!activeSession) {
      throw new DecryptionError("Encryption vault is locked. Please enter your passphrase to unlock.");
    }
    if (userId && activeSession.userId !== userId.trim()) {
      throw new DecryptionError("Active encryption key belongs to a different account session.");
    }
    return activeSession.masterKey;
  },

  /**
   * Gets the active KEK for the current session (used if re-wrapping or exporting).
   */
  getKEK(userId?: string | null): CryptoKey {
    if (!activeSession) {
      throw new DecryptionError("Encryption vault is locked.");
    }
    if (userId && activeSession.userId !== userId.trim()) {
      throw new DecryptionError("Active key belongs to another user.");
    }
    return activeSession.kek;
  },

  /**
   * Purges all active cryptographic keys from memory on logout, account switch, or manual lock.
   */
  lockVault(): void {
    activeSession = null;
  },
};
