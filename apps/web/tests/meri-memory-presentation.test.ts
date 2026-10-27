import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  MemoryCorrectionComposer,
  memoryPresentation,
  memoryTitle,
} from "../src/features/meri/memory-review/MemoryCorrectionComposer";
import {
  receiveOwnerCorrectionPage,
  type OwnerCorrectionItem,
} from "../src/features/meri/memory-review/owner-correction";
import { MemoryCard } from "../src/features/meri/screens/memory/MemoryCard";

const owner = vi.hoisted(() => ({ items: [] as OwnerCorrectionItem[] }));
vi.mock("../src/features/meri/memory-review/useOwnerCorrection", () => ({
  useOwnerCorrection: () => ({
    items: { state: "ready", items: owner.items, nextCursor: null },
    holdStatus: "ready",
    unknownIds: new Set(),
  }),
}));

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const original = {
  id: id(1),
  title: `user:${id(7)}:communication-preference`,
  value: '{"feedbackKind":"negative","runId":"synthetic-run"}',
  scope: "user_private",
  clientId: null,
  updatedAt: "2026-10-27T12:34:56.123456Z",
} as const;
const decode = (item: unknown) =>
  receiveOwnerCorrectionPage({
    schemaVersion: 1,
    items: [item],
    nextCursor: null,
  }).items[0]!;

it.each(["metadata_only", "empty"] as const)(
  "renders Core's %s limitation while retaining the exact correction source",
  (contentStatus) => {
    const item = decode({
      ...original,
      displayTitle: "Learning feedback",
      contentStatus,
      contentLimitation: "No substantive memory content is available.",
    });
    expect(item).toMatchObject(original);
    owner.items = [item];
    const html = renderToStaticMarkup(
      createElement(MemoryCorrectionComposer, { enabled: true }),
    );
    expect(html).toContain("Learning feedback");
    expect(html).toContain("No substantive memory content is available.");
    expect(html).not.toContain("feedbackKind");
    expect(html).not.toContain("synthetic-run");
  },
);

it("preserves authored JSON when Core marks its content available", () => {
  const item = decode({
    ...original,
    displayTitle: "Authored JSON preference",
    contentStatus: "available",
    contentLimitation: null,
  });
  expect(memoryPresentation(item)).toEqual({
    title: "Authored JSON preference",
    fact: original.value,
  });
  expect(item.value).toBe(original.value);
});

it("accepts an all-absent legacy presentation without inventing content status", () => {
  const item = decode(original);
  expect(item).toEqual(original);
  expect(memoryPresentation(item)).toEqual({
    title: "Communication preference",
    fact: original.value,
  });
});

it.each([
  { displayTitle: "Partial" },
  { displayTitle: "Record", contentStatus: "unknown", contentLimitation: null },
  {
    displayTitle: "Record",
    contentStatus: "available",
    contentLimitation: "Unexpected",
  },
  {
    displayTitle: "Record",
    contentStatus: "metadata_only",
    contentLimitation: null,
  },
  { displayTitle: "", contentStatus: "empty", contentLimitation: "No content" },
])("holds a malformed canonical presentation closed: %j", (presentation) => {
  expect(() => decode({ ...original, ...presentation })).toThrow(
    "Invalid memory presentation",
  );
});

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
