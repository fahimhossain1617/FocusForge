/**
 * Focentia Encryption Management Hook (hooks/useEncryption.ts)
 *
 * Manages the user's encryption lifecycle:
 * - Detecting whether an encrypted vault exists on the server
 * - First-time passphrase setup & key generation
 * - Returning device unlock via passphrase
 * - Vault locking on sign-out
 * - Recovery key export
 */

import { useState, useEffect, useCallback } from "react";
import {
  cryptoSession,
  generateRecoveryPhrase,
  type WrappedKeyEnvelope,
  InvalidPassphraseError,
} from "../lib/crypto";
import { fetchBackend } from "../lib/apiClient";
import { syncEngine } from "../lib/sync";

export interface UseEncryptionReturn {
  isUnlocked: boolean;
  isLoading: boolean;
  hasRemoteVault: boolean | null;
  remoteEnvelope: WrappedKeyEnvelope | null;
  needsSetup: boolean;
  needsUnlock: boolean;
  setupVault: (passphrase: string) => Promise<{ success: boolean; recoveryKey: string; error?: string }>;
  unlockVault: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
  lockVault: () => void;
  exportRecoveryKey: () => string | null;
  checkVaultStatus: () => Promise<void>;
}

export function useEncryption(userId?: string | null): UseEncryptionReturn {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => cryptoSession.isUnlocked(userId));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasRemoteVault, setHasRemoteVault] = useState<boolean | null>(null);
  const [remoteEnvelope, setRemoteEnvelope] = useState<WrappedKeyEnvelope | null>(null);

  const cleanUserId = userId?.trim() || null;

  const checkVaultStatus = useCallback(async () => {
    if (!cleanUserId || cleanUserId === "guest") {
      setHasRemoteVault(false);
      setRemoteEnvelope(null);
      setIsUnlocked(false);
      return;
    }

    if (cryptoSession.isUnlocked(cleanUserId)) {
      setIsUnlocked(true);
      setHasRemoteVault(true);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchBackend<{ exists: boolean; envelope?: WrappedKeyEnvelope }>("/api/crypto/keys", {
        method: "GET",
      });

      if (res && res.exists && res.envelope) {
        setHasRemoteVault(true);
        setRemoteEnvelope(res.envelope);

        // Check if device already has a stored local recovery passphrase to auto-unlock
        const storedRecoveryKey = localStorage.getItem(`focentia_recovery_key_${cleanUserId}`);
        if (storedRecoveryKey) {
          try {
            await cryptoSession.unlockVault(cleanUserId, res.envelope, storedRecoveryKey);
            setIsUnlocked(true);
            syncEngine.syncNow(cleanUserId).catch(() => {});
          } catch {
            // Invalid stored recovery key, user must enter passphrase manually
            setIsUnlocked(false);
          }
        } else {
          setIsUnlocked(false);
        }
      } else {
        setHasRemoteVault(false);
        setRemoteEnvelope(null);
        setIsUnlocked(false);
      }
    } catch (err) {
      console.warn("[useEncryption] Vault status check notice:", err);
      setHasRemoteVault(false);
      setRemoteEnvelope(null);
    } finally {
      setIsLoading(false);
    }
  }, [cleanUserId]);

  useEffect(() => {
    checkVaultStatus();
  }, [checkVaultStatus]);

  /**
   * First-time setup: Generates MEK, derives KEK from passphrase, wraps MEK, saves to Supabase.
   */
  const setupVault = useCallback(
    async (passphrase: string): Promise<{ success: boolean; recoveryKey: string; error?: string }> => {
      if (!cleanUserId || cleanUserId === "guest") {
        return { success: false, recoveryKey: "", error: "Authentication required to setup encryption" };
      }

      setIsLoading(true);
      try {
        const { envelope } = await cryptoSession.createNewEncryptionVault(cleanUserId, passphrase);

        // Save wrapped key to Supabase
        const saveRes = await fetchBackend<{ success: boolean }>("/api/crypto/keys", {
          method: "POST",
          body: JSON.stringify({ envelope }),
        });

        if (!saveRes || !saveRes.success) {
          throw new Error("Failed to store encryption keys on server");
        }

        const recoveryKey = generateRecoveryPhrase();
        try {
          localStorage.setItem(`focentia_recovery_key_${cleanUserId}`, passphrase);
        } catch {}

        setIsUnlocked(true);
        setHasRemoteVault(true);
        setRemoteEnvelope(envelope);

        // Initial sync pass
        syncEngine.syncNow(cleanUserId).catch(() => {});

        return { success: true, recoveryKey };
      } catch (err: any) {
        return { success: false, recoveryKey: "", error: err?.message || "Encryption setup failed" };
      } finally {
        setIsLoading(false);
      }
    },
    [cleanUserId]
  );

  /**
   * Returning device unlock: Unwraps MEK using passphrase and remote envelope.
   */
  const unlockVault = useCallback(
    async (passphrase: string): Promise<{ success: boolean; error?: string }> => {
      if (!cleanUserId || cleanUserId === "guest") {
        return { success: false, error: "Authentication required" };
      }

      setIsLoading(true);
      try {
        let envelope = remoteEnvelope;
        if (!envelope) {
          const res = await fetchBackend<{ exists: boolean; envelope?: WrappedKeyEnvelope }>("/api/crypto/keys", {
            method: "GET",
          });
          if (res && res.exists && res.envelope) {
            envelope = res.envelope;
            setRemoteEnvelope(res.envelope);
            setHasRemoteVault(true);
          } else {
            throw new Error("No encryption vault found for this account. Please set up a new passphrase.");
          }
        }

        await cryptoSession.unlockVault(cleanUserId, envelope, passphrase);
        try {
          localStorage.setItem(`focentia_recovery_key_${cleanUserId}`, passphrase);
        } catch {}

        setIsUnlocked(true);

        // Trigger sync after successful unlock
        syncEngine.syncNow(cleanUserId).catch(() => {});

        return { success: true };
      } catch (err: any) {
        if (err instanceof InvalidPassphraseError) {
          return { success: false, error: "Unable to unlock your encrypted data. Please check your passphrase." };
        }
        return { success: false, error: err?.message || "Unlock failed" };
      } finally {
        setIsLoading(false);
      }
    },
    [cleanUserId, remoteEnvelope]
  );

  const lockVault = useCallback(() => {
    cryptoSession.lockVault();
    setIsUnlocked(false);
  }, []);

  const exportRecoveryKey = useCallback((): string | null => {
    if (!cleanUserId) return null;
    try {
      return localStorage.getItem(`focentia_recovery_key_${cleanUserId}`);
    } catch {
      return null;
    }
  }, [cleanUserId]);

  const needsSetup = !isLoading && hasRemoteVault === false && Boolean(cleanUserId) && cleanUserId !== "guest";
  const needsUnlock = !isLoading && hasRemoteVault === true && !isUnlocked && Boolean(cleanUserId) && cleanUserId !== "guest";

  return {
    isUnlocked,
    isLoading,
    hasRemoteVault,
    remoteEnvelope,
    needsSetup,
    needsUnlock,
    setupVault,
    unlockVault,
    lockVault,
    exportRecoveryKey,
    checkVaultStatus,
  };
}
