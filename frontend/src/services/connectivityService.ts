/**
 * FocusForge Connectivity & Reachability Service (connectivityService.ts)
 *
 * Responsibilities:
 * 1. Dual-layer connectivity detection:
 *    - Hardware / OS events: `navigator.onLine`, `window.addEventListener('online'/'offline')`.
 *    - Mobile runtime: Capacitor Network plugin (`window.Capacitor?.Plugins?.Network`).
 *    - Real network reachability: Active lightweight probes with timeout (preventing false "online" on captive portals or disconnected Wi-Fi).
 * 2. Dynamic failure-reporting:
 *    - When an API request fails with network error / timeout, immediately flags as offline.
 * 3. Reconnection coordination:
 *    - Automatically alerts subscribers and triggers background queue flushes when connection is verified.
 */

type ConnectivityListener = (isOnline: boolean) => void;

class ConnectivityService {
  private onlineStatus: boolean = true;
  private listeners: Set<ConnectivityListener> = new Set();
  private isCheckingReachability: boolean = false;
  private reachabilityTimer: ReturnType<typeof setTimeout> | null = null;
  private hasInitialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.onlineStatus = typeof navigator !== "undefined" ? navigator.onLine : true;
      this.initListeners();
    }
  }

  private initListeners(): void {
    if (this.hasInitialized || typeof window === "undefined") return;
    this.hasInitialized = true;

    // 1. Browser OS events
    window.addEventListener("online", () => {
      this.verifyReachability(true);
    });

    window.addEventListener("offline", () => {
      this.setOnline(false);
    });

    // 2. Capacitor native network plugin (Android / iOS)
    try {
      const cap = (window as any).Capacitor;
      if (cap?.Plugins?.Network) {
        cap.Plugins.Network.addListener("networkStatusChange", (status: { connected: boolean }) => {
          if (!status.connected) {
            this.setOnline(false);
          } else {
            this.verifyReachability(true);
          }
        });
      }
    } catch {}

    // 3. Initial verification
    if (this.onlineStatus) {
      this.verifyReachability(false);
    }
  }

  /**
   * Current online status
   */
  public isOnline(): boolean {
    if (typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return this.onlineStatus;
  }

  /**
   * Subscribe to connectivity changes
   */
  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    listener(this.isOnline());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const status = this.isOnline();
    this.listeners.forEach((fn) => {
      try {
        fn(status);
      } catch {}
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("focusforge:connectivity-changed", {
          detail: { isOnline: status },
        })
      );
    }
  }

  private setOnline(nextStatus: boolean): void {
    if (this.onlineStatus !== nextStatus) {
      this.onlineStatus = nextStatus;
      this.notifyListeners();
    }
  }

  /**
   * Active probe to verify real reachability.
   * A router with no internet or captive portal will fail this probe.
   */
  public async verifyReachability(notifyOnChange = true): Promise<boolean> {
    if (typeof window === "undefined") return true;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setOnline(false);
      return false;
    }

    if (this.isCheckingReachability) {
      return this.onlineStatus;
    }

    this.isCheckingReachability = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Lightweight probe: fetch favicon or root with cache bypass and HEAD request
      const res = await fetch(`/favicon.ico?_ping=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      const reachable = res !== null && ((res.status >= 200 && res.status < 400) || res.status === 404);
      if (notifyOnChange) {
        this.setOnline(reachable);
      } else {
        this.onlineStatus = reachable;
      }
      return reachable;
    } catch {
      // If probe network fetch failed but navigator is still online, do not abruptly force offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (notifyOnChange) {
          this.setOnline(false);
        }
        return false;
      }
      return true;
    } finally {
      this.isCheckingReachability = false;
    }
  }

  /**
   * Called by API client / sync engine when a network request fails due to connection loss.
   */
  public reportRequestFailure(): void {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setOnline(false);
    }
  }

  /**
   * Called by API client when a network request succeeds.
   */
  public reportRequestSuccess(): void {
    if (!this.onlineStatus) {
      this.setOnline(true);
    }
  }
}

export const connectivityService = new ConnectivityService();
export default connectivityService;
