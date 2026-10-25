import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { memoryTitle } from "../src/features/meri/memory-review/MemoryCorrectionComposer";
import { MemoryCard } from "../src/features/meri/screens/memory/MemoryCard";

vi.mock("../src/features/meri/memory-review/useOwnerCorrection", () => ({
  useOwnerCorrection: () => ({}),
}));

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

it("shows the readable slug of a canonical memory key, never the owner id", () => {
  expect(memoryTitle(`user:${id(7)}:monday-client-board-mapping`)).toBe(
    "Monday client board mapping",
  );
  expect(
    memoryTitle(`learning-signal:meri.chat:meri_feedback_negative:${id(8)}`),
  ).toBe("Meri feedback negative");
  expect(memoryTitle("Synthetic communication preference")).toBe(
    "Synthetic communication preference",
  );
  expect(memoryTitle(`user:${id(7)}:`)).toBe(`user:${id(7)}:`);
});

it("renders the Figma 05.04 card with a live correction control and an explained evidence link", () => {
  const onSelect = vi.fn();
  const html = renderToStaticMarkup(
    createElement(MemoryCard, {
      unavailable: "Evidence links are not connected for personal memory yet.",
      item: {
        id: id(1),
        title: "Preferred briefing format",
        meta: "Personal · firm-wide",
        fact: "Use a one-page executive summary before the detailed appendix.",
        status: { label: "Current", tone: "neutral" },
        terms: [],
        evidence: { label: "View evidence" },
        correction: { onSelect, selected: true, disabled: false },
      },
    }),
  );
  expect(html).toContain("Preferred briefing format");
  expect(html).toContain("Personal · firm-wide");
  expect(html).toContain(">Current<");
  expect(html).toMatch(
    /<button[^>]*disabled[^>]*title="Evidence links are not connected[^"]*"[^>]*>View evidence<\/button>/,
  );
  expect(html).toMatch(
    /<button[^>]*aria-pressed="true"[^>]*>.*Propose a correction<\/button>/,
  );
});
