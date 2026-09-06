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
    // If it's an IP address like 192.168.x.x, use that IP with port 5000 for mobile testing
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) && hostname !== "127.0.0.1") {
      return `http://${hostname}:5000`;
    }
  }

  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "");
  }

  // Always use relative /api paths for Next.js Serverless Routes
  return "";
}
