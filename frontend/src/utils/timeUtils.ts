/**
 * Centralized time formatting utility for FocusForge.
 * All time values stored internally as "HH:MM" (24-hour).
 * All time values displayed to the user as "h:MM AM/PM" (12-hour).
 */

/**
 * Converts a 24-hour "HH:MM" string to a 12-hour "h:MM AM/PM" string.
 * Returns an empty string if the input is falsy or invalid.
 *
 * @example
 *   formatTime12hr("14:30") → "2:30 PM"
 *   formatTime12hr("00:00") → "12:00 AM"
 *   formatTime12hr("12:00") → "12:00 PM"
 */
export function formatTime12hr(time24: string | undefined | null): string {
  if (!time24 || !time24.includes(":")) return "";
  const [hourStr, minStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const min = minStr || "00";
  if (isNaN(hour)) return "";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
}

/**
 * Formats a start + end time pair as "h:MM AM/PM – h:MM AM/PM".
 * If only start is available, returns just "h:MM AM/PM".
 */
export function formatTimeRange(start: string, end: string): string {
  const s = formatTime12hr(start);
  const e = formatTime12hr(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}
