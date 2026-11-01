/**
 * One day-only date format for the whole client profile, so a date never reads
 * "9/3/2026" in one card and "Nov 1, 2026" in the next. Timestamps that carry a
 * time keep their own format because the time is the point.
 */
const dayOnly = /^\d{4}-\d{2}-\d{2}$/;
export function formatDay(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  // A day-only ISO date is a calendar day, not midnight UTC: format it in UTC
  // so "2026-11-01" never reads as Oct 31 in a zone west of Greenwich.
  const dateOnly = typeof value === "string" && dayOnly.test(value);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : {}),
  });
}
