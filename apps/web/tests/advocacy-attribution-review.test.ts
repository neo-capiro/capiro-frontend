import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AdvocacyTimeline } from "../src/features/portfolio/advocacy/AdvocacyTimeline";
import { advocacyEvents } from "./advocacy-history-fixtures";

const render = (entries = advocacyEvents) =>
  renderToStaticMarkup(
    createElement(AdvocacyTimeline, { entries, onSelect: () => {} }),
  );
const history = (html: string) =>
  html.match(
    /<ol aria-label="Loaded advocacy events"[^>]*>([\s\S]*?)<\/ol>/,
  )?.[1] ?? "";

it("separates review candidates from established events without discarding either population", () => {
  const html = render();
  expect(history(html)).not.toContain("Synthetic unassigned record");
  expect(history(html)).toContain("Synthetic meeting evidence");
  expect(html).toContain("Attribution review");
  expect(html).toContain("Synthetic unassigned record");
  expect(html).toContain("Match confidence 74%");
  expect(html).toContain(
    "Source verification does not confirm client attribution.",
  );
});

it("keeps an all-review history explicitly unestablished", () => {
  const html = render(
    advocacyEvents.map((entry) => ({ ...entry, attributionNeedsReview: true })),
  );
  expect(history(html)).not.toContain("Synthetic meeting evidence");
  expect(html).toContain("No established client events in the loaded history.");
  expect(html).toContain("6 candidates");
  for (const entry of advocacyEvents) expect(html).toContain(entry.title);
});

it("retains the empty state without manufacturing a review queue", () => {
  const html = render([]);
  expect(html).toContain("No matching events");
  expect(html).not.toContain("Attribution review");
});
