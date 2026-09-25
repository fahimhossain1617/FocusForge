/**
 * FocusForge IndexedDB & Storage Scoping Service
 * Provides user-scoped local persistence for notes, media attachments, and state backup.
 * Eliminates cross-account data leakage and isolates guest data from authenticated data.
 */

const DB_NAME = "focusforge_db";
const DB_VERSION = 2;
const STORE_NAME = "app_state";

export function getUserStorageKey(userId?: string | null): string {
  if (!userId || userId === 'guest') {
    return 'focusforge_data_guest';
  }
  return `focusforge_data_${userId}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves state to IndexedDB scoped by user ID or 'guest'.
 */
export async function saveStateToIndexedDB(state: any, userId?: string | null): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await openDB();
    const key = userId ? `state_${userId}` : 'state_guest';
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] save warning:", err);
  }
}

/**
 * Loads state from IndexedDB scoped by user ID or 'guest'.
 * Falls back to legacy 'state' key for backward compatibility if found.
 */
export async function loadStateFromIndexedDB(userId?: string | null): Promise<any | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  try {
    const db = await openDB();
    const key = userId ? `state_${userId}` : 'state_guest';
    const result = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (result) return result;

    // Backward compatibility fallback for pre-migration state
    if (!userId) {
      const legacyResult = await new Promise<any>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const req = store.get('state');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
      return legacyResult;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Clears explicitly identified guest-owned data across localStorage, sessionStorage, and IndexedDB.
 * Does NOT delete any authenticated user's records.
 */
export async function clearGuestData(): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Clear guest localStorage entries
  try {
    localStorage.removeItem("focusforge_data_guest");
    localStorage.removeItem("focusforge_data"); // legacy guest key
    localStorage.removeItem("focusforge_guest_sessions_list");
    localStorage.removeItem("focusforge_onboarding_guest_completed");

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("focusforge_guest_") || key.startsWith("focusforge_ai_msg_guest"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn("[clearGuestData] localStorage warning:", err);
  }

  // 2. Clear guest sessionStorage entries
  try {
    sessionStorage.removeItem("focusforge_guest_temp_data");
    sessionStorage.removeItem("focusforge_guest_sessions_list");
    const sessionKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("focusforge_guest_")) {
        sessionKeys.push(key);
      }
    }
    sessionKeys.forEach((k) => sessionStorage.removeItem(k));
  } catch (err) {
    console.warn("[clearGuestData] sessionStorage warning:", err);
  }

  // 3. Clear guest state from IndexedDB
  if (window.indexedDB) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete("state_guest");
        store.delete("state"); // legacy guest key
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (err) {
      console.warn("[clearGuestData] IndexedDB warning:", err);
    }
  }
}

/**
 * Safely removes a specific account's local cache or clears in-memory state.
 * Never deletes the database or wipes unrelated accounts' records.
 */
export async function clearPersistedAppState(userId?: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (userId) {
    try {
      localStorage.removeItem(`focusforge_data_${userId}`);
    } catch {}

    if (window.indexedDB) {
      try {
        const db = await openDB();
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.delete(`state_${userId}`);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      } catch {}
    }
  }
}

/**
 * Safely saves data to localStorage with quota protection.
 * If quota is exceeded, strips heavy base64 strings from notes to preserve localStorage quota
 * while letting IndexedDB retain the full data.
 */
export function safeSaveToLocalStorage(key: string, data: any): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err: any) {
    const isQuotaError = 
      err?.name === "QuotaExceededError" || 
      err?.name === "NS_ERROR_DOM_QUOTA_REACHED" || 
      err?.code === 22 || 
      err?.code === 1014;

    if (isQuotaError) {
      try {
        const lightweightData = {
          ...data,
          notes: Array.isArray(data.notes) ? data.notes.map((n: any) => ({
            ...n,
            blocks: Array.isArray(n.blocks) ? n.blocks.map((b: any) => {
              if ((b.type === "image" || b.type === "file") && typeof b.url === "string" && b.url.length > 500) {
                return { ...b, url: "" };
              }
              return b;
            }) : n.blocks
          })) : data.notes
        };
        localStorage.setItem(key, JSON.stringify(lightweightData));
      } catch {
        console.warn("LocalStorage quota full; state safely retained in IndexedDB.");
      }
    } else {
      console.warn("LocalStorage save warning:", err);
    }
  }
}

/**
 * Compresses an image in the browser via canvas before storing.
 */
export function compressImageFile(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || "";
      if (!dataUrl) return resolve("");

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webpData = canvas.toDataURL("image/webp", quality);
          if (webpData.startsWith("data:image/webp")) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback to jpeg
        }
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
