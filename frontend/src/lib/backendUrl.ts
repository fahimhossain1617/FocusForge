/**
 * Dynamically resolves the Backend URL.
 * - If `NEXT_PUBLIC_BACKEND_URL` is set, uses that URL.
 * - If running in browser and accessed via local network IP (e.g. 192.168.x.x), connects to `http://<IP>:5000`.
 * - Defaults to `http://localhost:5000`.
 */
export function getBackendUrl(): string {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      if (isIp) {
        return `http://${hostname}:5000`;
      }
    }
  }

  return "http://localhost:5000";
}
