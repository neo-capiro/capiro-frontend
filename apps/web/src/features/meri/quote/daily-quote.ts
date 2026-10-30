import catalog from "./stoic-quotes.json";

/** One verified quotation with its primary source, as supplied by the editorial catalog. */
export type StoicQuote = Readonly<{
  id: string;
  text: string;
  author: "Marcus Aurelius" | "Epictetus" | "Seneca";
  work: string;
  book?: number;
  section?: string;
  locator: string;
  translator: string;
  sourceURL: string;
  editionURL: string;
}>;

/** 120 short quotations; the editorial order already interleaves the three authors. */
export const stoicQuotes: readonly StoicQuote[] =
  catalog as readonly StoicQuote[];

const DAY_MS = 86_400_000;

/**
 * Whole local civil days since the Unix epoch. Built from the local year/month/day, so the same
 * calendar date always yields the same number (and therefore the same quote) regardless of the
 * time of day, the session, the tab or the selected client, and DST never shifts the date.
 */
export function civilDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
  );
}

/** The quote for a local civil date; a stable rotation through the catalog, one per day. */
export function quoteForDate(
  date: Date,
  quotes: readonly StoicQuote[] = stoicQuotes,
): StoicQuote {
  if (quotes.length === 0) throw Error("The daily quote catalog is empty");
  const index =
    ((civilDayNumber(date) % quotes.length) + quotes.length) % quotes.length;
  return quotes[index]!;
}

/**
 * The next local midnight. Constructed from local calendar parts, so a DST day is 23 or 25 hours
 * and the rotation still happens once, at the next civil day's start.
 */
export function nextLocalMidnight(now: Date): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
}

/** Milliseconds until the next local midnight, with a small margin past the boundary. */
export function msUntilNextLocalMidnight(now: Date): number {
  return Math.max(1_000, nextLocalMidnight(now).getTime() - now.getTime() + 50);
}
