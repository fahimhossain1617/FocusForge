/**
 * FocusForge Cross-Device Sync Service (syncService.ts)
 *
 * Coordinates client-side E2EE synchronization via syncEngine (lib/sync.ts).
 * Maintains full backward compatibility for all existing callers.
 */

import { syncEngine, type SyncStatus, type EncryptedSyncRecord } from "../lib/sync";

export type { SyncStatus, EncryptedSyncRecord };

export interface EncryptedSyncItem {
  id: string | number;
  collection: string;
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
  updatedAt: string;
  isDeleted: boolean;
  deviceId?: string;
}

export function getDeviceId(): string {
  return syncEngine.getDeviceId();
}

export const syncService = {
  get isSyncing(): boolean {
    return syncEngine.getStatus() === "syncing";
  },

  /**
   * Pushes dirty local records and pulls remote updates.
   */
  async syncNow(userId: string): Promise<{ success: boolean; pushedCount: number; pulledCount: number; status?: SyncStatus }> {
    const res = await syncEngine.syncNow(userId);
    return {
      success: res.success,
      pushedCount: res.pushedCount,
      pulledCount: res.pulledCount,
      status: res.status,
    };
  },

  /**
   * Schedules a debounced sync pass after a local change.
   */
  scheduleSync(userId: string, delayMs = 2500): void {
    syncEngine.scheduleSync(userId, delayMs);
  },

  /**
   * Subscribes to sync status changes.
   */
  subscribe(listener: (status: SyncStatus, note?: string) => void): () => void {
    return syncEngine.subscribe(listener);
  },
};
