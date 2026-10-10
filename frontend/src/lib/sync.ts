/**
 * Focentia Zero-Knowledge E2EE Sync Engine (lib/sync.ts)
 *
 * Coordinates privacy-preserving client-side synchronization:
 * 1. Collects dirty local records from Dexie `sync_queue`.
 * 2. Encrypts every record payload with AES-256-GCM via MEK before transmission.
 * 3. Pushes opaque ciphertext batches to `/api/sync/push`.
 * 4. Pulls encrypted updates from other authorized devices via `/api/sync/pull`.
 * 5. Decrypts incoming records locally and reconciles changes in Dexie object stores.
 *    - Resolves conflicts by `updatedAt` (Last-Write-Wins), never losing offline-created data.
 * 6. Flushes queue automatically on reconnect with retries and exponential backoff.
 * 7. Emits operational events for UI indicators.
 */

import { db, type DexieSyncQueueItem } from "./db";
import { encryptPayload, decryptPayload, cryptoSession, SyncError } from "./crypto";
import { fetchBackend } from "./apiClient";
import { connectivityService } from "../services/connectivityService";

export type SyncStatus =
  | "saved_locally"
  | "syncing"
  | "synced"
  | "offline"
  | "sync_failed"
  | "locked";

export interface EncryptedSyncRecord {
  id: string | number;
  collection: string;
  ciphertext: string;
  iv: string;
  salt?: string;
  version: number;
  updatedAt: string;
  isDeleted: boolean;
  deviceId?: string;
}

export interface SyncEngineResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  status: SyncStatus;
  errorMessage?: string;
}

type SyncStatusListener = (status: SyncStatus, note?: string) => void;

class SyncEngine {
  private isSyncing = false;
  private currentStatus: SyncStatus = "saved_locally";
  private listeners: Set<SyncStatusListener> = new Set();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private activeUserId: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Auto-flush queue when connectivity returns
      connectivityService.subscribe((isOnline) => {
        if (isOnline) {
          if (this.currentStatus === "offline" || this.currentStatus === "sync_failed") {
            this.retryAttempt = 0;
            if (this.activeUserId) {
              this.scheduleSync(this.activeUserId, 500);
            }
          }
        } else {
          this.setStatus("offline");
        }
      });
    }
  }

  public getDeviceId(): string {
    if (typeof window === "undefined") return "server";
    let did = localStorage.getItem("focentia_device_id");
    if (!did) {
      did = "foc_" + Math.random().toString(36).substring(2, 12);
      localStorage.setItem("focentia_device_id", did);
    }
    return did;
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(status: SyncStatus, note?: string) {
    this.currentStatus = status;
    this.listeners.forEach((fn) => {
      try {
        fn(status, note);
      } catch {}
    });
  }

  /**
   * Schedules a debounced sync pass (e.g. after a local mutation).
   */
  public scheduleSync(userId: string, delayMs = 2500): void {
    if (!userId || userId === "guest") return;
    this.activeUserId = userId;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.syncNow(userId).catch(() => {});
    }, delayMs);
  }

  /**
   * Schedules an exponential backoff retry pass on network failure.
   */
  private scheduleRetry(userId: string): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (!connectivityService.isOnline()) {
      this.setStatus("offline");
      return;
    }

    this.retryAttempt += 1;
    if (this.retryAttempt > 5) {
      this.setStatus("sync_failed", "Max retries exceeded; waiting for reconnect");
      return;
    }

    // Exponential backoff: 1.5s, 3s, 6s, 12s, 24s
    const backoffMs = Math.min(24000, Math.pow(2, this.retryAttempt - 1) * 1500);
    this.retryTimer = setTimeout(() => {
      this.syncNow(userId).catch(() => {});
    }, backoffMs);
  }

  /**
   * Executes a full synchronization pass (Push dirty queue -> Pull remote changes).
   */
  public async syncNow(userId: string): Promise<SyncEngineResult> {
    const cleanUserId = userId?.trim();
    if (!cleanUserId || cleanUserId === "guest") {
      this.setStatus("saved_locally");
      return { success: true, pushedCount: 0, pulledCount: 0, status: "saved_locally" };
    }

    this.activeUserId = cleanUserId;

    // 1. Dual-layer connectivity check
    if (!connectivityService.isOnline()) {
      this.setStatus("offline");
      return { success: false, pushedCount: 0, pulledCount: 0, status: "offline" };
    }

    if (!cryptoSession.isUnlocked(cleanUserId)) {
      this.setStatus("locked", "Vault locked; sync paused");
      return { success: false, pushedCount: 0, pulledCount: 0, status: "locked" };
    }

    if (this.isSyncing) {
      return { success: true, pushedCount: 0, pulledCount: 0, status: this.currentStatus };
    }

    this.isSyncing = true;
    this.setStatus("syncing");

    let pushed = 0;
    let pulled = 0;

    try {
      const masterKey = cryptoSession.getMasterKey(cleanUserId);
      const deviceId = this.getDeviceId();

      // ======================================================================
      // 1. PUSH PHASE: Encrypt & Push Dirty Local Records
      // ======================================================================
      const dirtyQueue: DexieSyncQueueItem[] = await db.sync_queue
        .where("userId")
        .equals(cleanUserId)
        .toArray();

      if (dirtyQueue.length > 0) {
        const encryptedBatch: EncryptedSyncRecord[] = [];
        const syncedQueueKeys: string[] = [];

        for (const queueItem of dirtyQueue) {
          const { storeName, recordId, isDeleted, updatedAt } = queueItem;
          let record: any = null;

          if (isDeleted) {
            record = { id: recordId, isDeleted: true, updatedAt };
          } else {
            const table = (db as any)[storeName];
            if (table) {
              const localKey = db.makeLocalKey(cleanUserId, recordId);
              record = await table.get(localKey);
            }
          }

          if (record) {
            try {
              const envelope = await encryptPayload(record, masterKey);
              encryptedBatch.push({
                id: recordId,
                collection: storeName,
                ciphertext: envelope.ciphertext,
                iv: envelope.iv,
                salt: "",
                version: envelope.version,
                updatedAt: record.updatedAt || updatedAt || new Date().toISOString(),
                isDeleted: Boolean(record.isDeleted),
                deviceId,
              });
              syncedQueueKeys.push(queueItem.localKey);
            } catch (encErr) {
              console.warn("[SyncEngine] Encryption skip notice for item:", recordId, encErr);
            }
          } else {
            // Record no longer exists; clean from queue
            syncedQueueKeys.push(queueItem.localKey);
          }
        }

        if (encryptedBatch.length > 0) {
          try {
            const pushRes = await fetchBackend<{ success: boolean; count?: number }>("/api/sync/push", {
              method: "POST",
              body: JSON.stringify({
                items: encryptedBatch,
                deviceId,
              }),
            });

            if (pushRes && pushRes.success) {
              await db.sync_queue.bulkDelete(syncedQueueKeys);
              pushed = encryptedBatch.length;
            } else {
              throw new Error("Push returned unsuccessful response");
            }
          } catch (pushErr: any) {
            console.warn("[SyncEngine] Push phase failed:", pushErr?.message);
            connectivityService.reportRequestFailure();
            this.setStatus("sync_failed", pushErr?.message);
            this.scheduleRetry(cleanUserId);
            return {
              success: false,
              pushedCount: 0,
              pulledCount: 0,
              status: "sync_failed",
              errorMessage: pushErr?.message,
            };
          }
        } else if (syncedQueueKeys.length > 0) {
          await db.sync_queue.bulkDelete(syncedQueueKeys);
        }
      }

      // ======================================================================
      // 2. PULL PHASE: Pull & Decrypt Remote Records
      // ======================================================================
      const lastSyncKey = `focentia_last_sync_${cleanUserId}`;
      const lastSyncTime = typeof window !== "undefined" ? localStorage.getItem(lastSyncKey) || "" : "";

      let pullRes: { items: EncryptedSyncRecord[]; serverTime: string } | null = null;
      try {
        pullRes = await fetchBackend<{ items: EncryptedSyncRecord[]; serverTime: string }>("/api/sync/pull", {
          method: "POST",
          body: JSON.stringify({
            since: lastSyncTime,
            deviceId,
          }),
        });
      } catch (pullErr: any) {
        console.warn("[SyncEngine] Pull phase failed:", pullErr?.message);
        connectivityService.reportRequestFailure();
        this.setStatus("sync_failed", pullErr?.message);
        this.scheduleRetry(cleanUserId);
        return {
          success: false,
          pushedCount: pushed,
          pulledCount: 0,
          status: "sync_failed",
          errorMessage: pullErr?.message,
        };
      }

      if (pullRes && Array.isArray(pullRes.items) && pullRes.items.length > 0) {
        for (const item of pullRes.items) {
          // Skip records that originated from this exact device to avoid redundant cycles
          if (item.deviceId && item.deviceId === deviceId) {
            continue;
          }

          try {
            const decryptedRecord = await decryptPayload(
              {
                version: item.version || 1,
                algorithm: "AES-256-GCM",
                iv: item.iv,
                ciphertext: item.ciphertext,
              },
              masterKey
            );

            if (decryptedRecord) {
              const table = (db as any)[item.collection];
              if (table) {
                const localKey = db.makeLocalKey(cleanUserId, item.id);
                const existing = await table.get(localKey);

                // Conflict Resolution: Last-Write-Wins by updatedAt
                // If local modification is newer than remote item, do NOT overwrite it!
                if (existing && existing.updatedAt && item.updatedAt) {
                  const localTimestamp = new Date(existing.updatedAt).getTime();
                  const remoteTimestamp = new Date(item.updatedAt).getTime();
                  if (localTimestamp > remoteTimestamp) {
                    // Local record is newer; preserve local changes and continue
                    continue;
                  }
                }

                if (item.isDeleted || decryptedRecord.isDeleted) {
                  await table.put({
                    ...(existing || { id: item.id }),
                    localKey,
                    userId: cleanUserId,
                    isDeleted: true,
                    updatedAt: item.updatedAt,
                  });
                } else {
                  await table.put({
                    ...decryptedRecord,
                    id: item.id,
                    localKey,
                    userId: cleanUserId,
                    updatedAt: item.updatedAt,
                    isDeleted: false,
                  });
                }
                pulled++;
              }
            }
          } catch (decErr) {
            console.warn("[SyncEngine] Decrypt skip notice for remote record:", item.id, decErr);
          }
        }

        if (pullRes.serverTime && typeof window !== "undefined") {
          localStorage.setItem(lastSyncKey, pullRes.serverTime);
        }
      }

      // Success: Reset retry attempts and mark synced
      this.retryAttempt = 0;
      this.setStatus("synced");
      return { success: true, pushedCount: pushed, pulledCount: pulled, status: "synced" };
    } catch (err: any) {
      console.warn("[SyncEngine] Sync cycle notice:", err?.message);
      this.setStatus("sync_failed", err?.message);
      this.scheduleRetry(cleanUserId);
      return {
        success: false,
        pushedCount: pushed,
        pulledCount: pulled,
        status: "sync_failed",
        errorMessage: err?.message,
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
