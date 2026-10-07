/**
 * Focentia Sync Status Hook (hooks/useSync.ts)
 *
 * Subscribes to the synchronization engine and exposes current sync state:
 * - saved_locally | syncing | synced | offline | sync_failed | locked
 * - manual sync trigger
 */

import { useState, useEffect, useCallback } from "react";
import { syncEngine, type SyncStatus, type SyncEngineResult } from "../lib/sync";

export interface UseSyncReturn {
  syncStatus: SyncStatus;
  isSyncing: boolean;
  syncNote: string | null;
  syncNow: () => Promise<SyncEngineResult>;
}

export function useSync(userId?: string | null): UseSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => syncEngine.getStatus());
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const cleanUserId = userId?.trim() || null;

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status, note) => {
      setSyncStatus(status);
      if (note) setSyncNote(note);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(async (): Promise<SyncEngineResult> => {
    if (!cleanUserId || cleanUserId === "guest") {
      return { success: true, pushedCount: 0, pulledCount: 0, status: "saved_locally" };
    }
    return await syncEngine.syncNow(cleanUserId);
  }, [cleanUserId]);

  return {
    syncStatus,
    isSyncing: syncStatus === "syncing",
    syncNote,
    syncNow: triggerSync,
  };
}
