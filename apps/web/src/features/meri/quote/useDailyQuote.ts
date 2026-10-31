"use client";
import { useEffect, useState } from "react";
import {
  msUntilNextLocalMidnight,
  quoteForDate,
  type StoicQuote,
} from "./daily-quote";

/**
 * The reader's local civil date, kept current while mounted. The first render is deliberately
 * quote-free so server and client markup agree; the value arrives on mount. One timeout retargets
 * the next local midnight (so an open tab crosses midnight once per civil day), and a tab that
 * wakes from suspension or focus re-reads the date instead of waiting for the old timer.
 */
export function useDailyQuote(): StoicQuote | null {
  const [quote, setQuote] = useState<StoicQuote | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const now = new Date();
      setQuote(quoteForDate(now));
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(update, msUntilNextLocalMidnight(now));
    };
    const resume = () => {
      if (document.visibilityState === "visible") update();
    };
    update();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, []);
  return quote;
}
