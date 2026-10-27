/**
 * Focentia Telemetry Sanitizer
 *
 * Strips sensitive query strings, authentication tokens, passwords,
 * email addresses, and personal text from URLs, messages, and stack traces.
 */

// Regex patterns for sensitive data
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const TOKEN_REGEX = /(?:bearer\s+[a-zA-Z0-9._\-]+|token=[a-zA-Z0-9._\-]+|key=[a-zA-Z0-9._\-]+|sb-[a-zA-Z0-9._\-]+|AIza[0-9A-Za-z\-_]{15,}|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|[a-zA-Z0-9_]*key_[a-zA-Z0-9._\-]+)/gi;
const URL_QUERY_REGEX = /\?[^#\s]*/g;
const FILE_PATH_USER_REGEX = /(?:Users|home)[/\\][^/\\]+[/\\]/gi;

/**
 * Sanitizes an error message or generic string
 */
export function sanitizeText(text: string | null | undefined, maxLength: number = 300): string {
  if (!text) return "";
  let clean = String(text);

  // Strip query parameters
  clean = clean.replace(URL_QUERY_REGEX, "?[redacted]");

  // Strip emails
  clean = clean.replace(EMAIL_REGEX, "[REDACTED_EMAIL]");

  // Strip bearer tokens / API keys
  clean = clean.replace(TOKEN_REGEX, "[REDACTED_SECRET]");

  // Strip local user directory paths (e.g., C:\Users\john\...)
  clean = clean.replace(FILE_PATH_USER_REGEX, "Users/[user]/");

  // Enforce max length
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength) + "...[truncated]";
  }

  return clean;
}

/**
 * Sanitizes a URL, stripping query parameters and hash fragments
 */
export function sanitizeUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "/";
  try {
    // If relative path
    if (rawUrl.startsWith("/")) {
      return rawUrl.split("?")[0].split("#")[0] || "/";
    }
    const parsed = new URL(rawUrl);
    return parsed.pathname;
  } catch {
    return rawUrl.split("?")[0].split("#")[0] || "/";
  }
}

/**
 * Sanitizes a stack trace to only retain relevant frame locations,
 * stripping full local file paths, query strings, and personal info.
 */
export function sanitizeStack(stack: string | null | undefined): string {
  if (!stack) return "";

  const lines = stack.split("\n").slice(0, 8); // Top 8 frames max
  const cleanedLines = lines.map((line) => {
    let clean = line.trim();
    clean = clean.replace(URL_QUERY_REGEX, "");
    clean = clean.replace(FILE_PATH_USER_REGEX, "");
    clean = clean.replace(EMAIL_REGEX, "[email]");
    clean = clean.replace(TOKEN_REGEX, "[token]");
    return clean;
  });

  return cleanedLines.join("\n").slice(0, 800);
}

/**
 * Sanitizes an Error object or error-like input
 */
export function sanitizeError(
  err: Error | { name?: string; message: string; stack?: string },
  componentStack?: string
): { name: string; message: string; stack?: string } {
  const name = sanitizeText(err.name || "Error", 60);
  let message = sanitizeText(err.message, 300);

  // Redact secrets/passwords/JWTs
  message = message.replace(/(?:password|secret|bearer\s+[a-zA-Z0-9._\-]+)/gi, "[REDACTED_SECRET]");
  message = message.replace(EMAIL_REGEX, "[REDACTED_EMAIL]");

  let combinedStack = err.stack || "";
  if (componentStack) {
    combinedStack += "\nComponentStack:\n" + componentStack;
  }
  const cleanStack = sanitizeStack(combinedStack);

  return {
    name,
    message,
    stack: cleanStack || undefined,
  };
}

/**
 * Sanitizes breadcrumb string
 */
export function sanitizeBreadcrumb(breadcrumb: string): string {
  let clean = sanitizeText(breadcrumb, 200);
  clean = clean.replace(EMAIL_REGEX, "[REDACTED_EMAIL]");
  return clean;
}

/**
 * Recursively sanitizes generic payload values
 */
export function sanitizeTelemetryPayload(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") {
      result[key] = sanitizeText(val, 200);
    } else if (typeof val === "number" || typeof val === "boolean") {
      result[key] = val;
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      result[key] = sanitizeTelemetryPayload(val);
    }
  }
  return result;
}

/**
 * Generates a non-deterministic random anonymous session ID for telemetry.
 * Does not fingerprint devices or persist beyond the browser session lifecycle.
 */
export function generateAnonymousSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "sess_" + Math.random().toString(36).slice(2, 11) + "_" + Date.now();
}
