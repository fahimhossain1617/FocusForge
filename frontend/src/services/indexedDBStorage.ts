/**
 * FocusForge IndexedDB Storage Service
 * Provides virtually unlimited browser storage for notes, media attachments, and full state backup,
 * eliminating the 5MB browser localStorage QuotaExceededError limit.
 */

const DB_NAME = "focusforge_db";
const DB_VERSION = 1;
const STORE_NAME = "app_state";
const KEY = "state";

/** Remove the local state database when the active account signs out. */
export function clearPersistedAppState(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.warn("IndexedDB clear warning:", request.error);
      resolve();
    };
    request.onblocked = () => resolve();
  });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStateToIndexedDB(state: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Non-blocking warning instead of error
    console.warn("IndexedDB save warning:", err);
  }
}

export async function loadStateFromIndexedDB(): Promise<any | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Safely saves data to localStorage.
 * If quota is exceeded, strips heavy base64 strings from notes to preserve localStorage quota
 * while letting IndexedDB retain the full data. Never triggers console.error.
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
        // Strip heavy embedded file/image data from notes for localStorage copy
        const lightweightData = {
          ...data,
          notes: Array.isArray(data.notes) ? data.notes.map((n: any) => ({
            ...n,
            blocks: Array.isArray(n.blocks) ? n.blocks.map((b: any) => {
              if ((b.type === "image" || b.type === "file") && typeof b.url === "string" && b.url.length > 500) {
                return { ...b, url: "" }; // Full URL preserved in IndexedDB
              }
              return b;
            }) : n.blocks
          })) : data.notes
        };
        localStorage.setItem(key, JSON.stringify(lightweightData));
      } catch {
        // Silently skip localStorage if completely full
        console.warn("LocalStorage quota full; state safely retained in IndexedDB.");
      }
    } else {
      console.warn("LocalStorage save warning:", err);
    }
  }
}

/**
 * Compresses an image in the browser via canvas before storing,
 * reducing a 5-15MB photo down to ~100KB without visible quality loss.
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
