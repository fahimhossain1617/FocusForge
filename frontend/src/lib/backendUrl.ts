/**
 * Dynamically resolves the Backend URL for both local dev and 100% cloud Vercel production.
 * - If `NEXT_PUBLIC_BACKEND_URL` is explicitly set, uses that URL.
 * - In browser environment:
 *   - If accessing via local IP address (e.g. 192.168.x.x), connects to local backend `http://<IP>:5000`.
 *   - If accessing via Vercel domain (`*.vercel.app`) or custom web domain, returns `""` (relative URL `/api`),
 *     which automatically targets Next.js Serverless API routes running directly on Vercel.
 * - Defaults to `http://localhost:5000`.
 */
export function getBackendUrl(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If it's an IP address like 192.168.x.x, and not localhost
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) && hostname !== "127.0.0.1") {
      return `http://${hostname}:3000`;
    }
    return "";
  }

  if (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes("5000")) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "");
  }

  // Always use relative /api paths for Next.js routes
  return "";
}
