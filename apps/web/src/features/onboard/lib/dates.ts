// ── Formatting ──────────────────────────────────────────────────────────────

/** 'MMMM d, yyyy' (e.g. "July 6, 2026") via plain Intl. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** The dynamic day-31 trial charge date (prototype hardcoded 'August 1, 2026'). */
export function trialChargeDateLabel(now: Date = new Date()): string {
  const day31 = new Date(now);
  day31.setDate(day31.getDate() + 31);
  return formatLongDate(day31);
}
