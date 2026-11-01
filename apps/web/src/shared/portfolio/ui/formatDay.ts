/**
 * One day-only date format for the whole client profile, so a date never reads
 * "9/3/2026" in one card and "Nov 1, 2026" in the next. Timestamps that carry a
 * time keep their own format because the time is the point.
 */
export function formatDay(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
