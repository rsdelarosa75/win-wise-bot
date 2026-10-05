/**
 * Local calendar-date helpers. The ONE place the app derives a YYYY-MM-DD date.
 *
 * The pick's target date must be the LOCAL calendar day, never a UTC day. UTC
 * derivations (toISOString().split('T')[0], commence_time.split('T')[0], etc.) roll
 * forward a day for evening kickoffs (a 5:15pm PT game is 00:15 UTC the next day),
 * which shifted the target date +1. Everything that produces a date for the pick
 * flow must go through toLocalYmd / todayLocalYmd.
 */

/**
 * Local YYYY-MM-DD for a Date, epoch ms, or ISO string, built from LOCAL parts.
 * A bare "YYYY-MM-DD" string is returned verbatim — it is already a calendar date,
 * so we must NOT round-trip it through `new Date(...)` (which parses it as UTC
 * midnight and can shift it a day in negative-offset timezones).
 */
export function toLocalYmd(input: string | number | Date): string {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return typeof input === "string" ? input : "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's LOCAL calendar date as YYYY-MM-DD. */
export function todayLocalYmd(): string {
  return toLocalYmd(new Date());
}

/** Yesterday's LOCAL calendar date as YYYY-MM-DD. */
export function yesterdayLocalYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalYmd(d);
}
