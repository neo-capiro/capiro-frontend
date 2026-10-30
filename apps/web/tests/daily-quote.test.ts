import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  civilDayNumber,
  msUntilNextLocalMidnight,
  nextLocalMidnight,
  quoteForDate,
  stoicQuotes,
} from "../src/features/meri/quote/daily-quote";
import { DailyQuote, QuoteBlock } from "../src/features/meri/quote/DailyQuote";

const at = (year: number, month: number, day: number, hours = 0, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes, 0, 0);

it("ships the verified catalog: 120 distinct short quotations with full attribution", () => {
  expect(stoicQuotes).toHaveLength(120);
  expect(new Set(stoicQuotes.map((quote) => quote.text)).size).toBe(120);
  expect(
    Math.max(...stoicQuotes.map((quote) => quote.text.length)),
  ).toBeLessThanOrEqual(163);
  for (const quote of stoicQuotes) {
    expect(quote.author).toMatch(/^(Marcus Aurelius|Epictetus|Seneca)$/);
    expect(quote.work.length).toBeGreaterThan(0);
    expect(quote.locator.length).toBeGreaterThan(0);
    expect(quote.translator.length).toBeGreaterThan(0);
    expect(quote.sourceURL).toMatch(/^https:\/\/www\.gutenberg\.org\//);
    expect(quote.editionURL).toMatch(
      /^https:\/\/www\.gutenberg\.org\/ebooks\//,
    );
  }
  // The editorial order interleaves authors rather than grouping them in blocks.
  const changes = stoicQuotes.filter(
    (quote, index) =>
      index > 0 && quote.author !== stoicQuotes[index - 1]!.author,
  );
  expect(changes.length).toBeGreaterThan(80);
});

it("keeps one quotation for the whole local calendar date", () => {
  const early = quoteForDate(at(2026, 10, 30, 0, 5));
  const late = quoteForDate(at(2026, 10, 30, 23, 55));
  expect(late.id).toBe(early.id);
  expect(civilDayNumber(at(2026, 10, 30, 0, 1))).toBe(
    civilDayNumber(at(2026, 10, 30, 23, 59)),
  );
});

it("rotates once on the next local date, including month, year and DST boundaries", () => {
  const today = quoteForDate(at(2026, 10, 30));
  const tomorrow = quoteForDate(at(2026, 10, 31));
  expect(tomorrow.id).not.toBe(today.id);
  expect(quoteForDate(at(2026, 11, 1)).id).not.toBe(tomorrow.id);
  // 2026-03-08 is a 23-hour civil day in US DST zones and 2026-11-01 a 25-hour one.
  for (const [a, b] of [
    [at(2026, 3, 8), at(2026, 3, 9)],
    [at(2026, 12, 31), at(2027, 1, 1)],
  ] as const)
    expect(quoteForDate(b).id).not.toBe(quoteForDate(a).id);
});

it("advances at the next local midnight without assuming 24-hour days", () => {
  expect(nextLocalMidnight(at(2026, 10, 30, 13, 20))).toEqual(at(2026, 10, 31));
  expect(nextLocalMidnight(at(2026, 12, 31, 23, 59))).toEqual(at(2027, 1, 1));
  const dstStart = at(2026, 3, 8);
  const elapsed = nextLocalMidnight(dstStart).getTime() - dstStart.getTime();
  expect(Math.abs(elapsed - 86_400_000)).toBeLessThanOrEqual(3_600_000);
  const remaining = msUntilNextLocalMidnight(at(2026, 10, 30, 23, 59));
  expect(remaining).toBeGreaterThan(0);
  expect(remaining).toBeLessThan(25 * 3_600_000);
});

it("renders the orb as the only identity on the empty conversation, with no greeting", () => {
  const html = renderToStaticMarkup(createElement(DailyQuote));
  expect(html).toContain('src="/design/home/meri-orb.png"');
  expect(html).toContain('width="320"');
  expect(html).toContain('alt="Meri"');
  expect(html).not.toMatch(/good morning|good afternoon|good evening|welcome/i);
  expect(html).not.toContain("What would you like to work on");
});

it("renders the longest quotation in full with its author and primary source", () => {
  const longest = [...stoicQuotes].sort(
    (a, b) => b.text.length - a.text.length,
  )[0]!;
  expect(longest.text.length).toBe(163);
  const html = renderToStaticMarkup(
    createElement(QuoteBlock, { quote: longest }),
  );
  expect(html).toContain(longest.text);
  expect(html).toContain(longest.author);
  expect(html).toContain(`${longest.work}, ${longest.locator}`);
  expect(html).toContain(longest.translator);
  expect(html).toContain(`href="${longest.sourceURL}"`);
  expect(html).toContain("Read the primary text");
  // No ellipsis, truncation or paraphrase of the verified words.
  expect(html).not.toContain("…");
});
