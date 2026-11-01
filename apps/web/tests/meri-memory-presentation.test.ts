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

/**
 * Core currently sends `displayTitle` equal to the stored key, so headings rendered the raw
 * identifier (`user:<uuid>:monday-client-board-mapping`) even though the key carries a readable
 * slug and the record carries readable text. A key echoed as its own title is an identifier, not a
 * display title: fall back to the readable projection, never to invented content.
 */
it("never shows a machine key as the memory heading", () => {
  const echoed = decode({
    ...original,
    displayTitle: original.title,
    contentStatus: "available",
    contentLimitation: null,
  });
  expect(memoryPresentation(echoed).title).toBe("Communication preference");
  expect(memoryPresentation(echoed).title).not.toContain(id(7));
});

it("titles an unslugged identifier from the record's own first sentence", () => {
  const value =
    "For the synthetic W3-ACCEPT-20261026-B fixture, label acceptance notes Synthetic fixture.";
  const item = decode({
    id: id(2),
    title: `meri:${id(9)}`,
    value,
    scope: "user_private",
    clientId: null,
    updatedAt: "2026-10-26T15:38:22.305279Z",
    displayTitle: `meri:${id(9)}`,
    contentStatus: "available",
    contentLimitation: null,
  });
  expect(memoryPresentation(item).title).toBe(value);
  expect(memoryPresentation(item).title).not.toContain("meri:");
});

it("rejects a machine-shaped displayTitle and keeps the readable slug", () => {
  const item = decode({
    ...original,
    displayTitle: `meri:${id(9)}`,
    contentStatus: "available",
    contentLimitation: null,
  });
  expect(memoryPresentation(item).title).toBe("Communication preference");
});

it.each(["echoed", "legacy", "machine display"])(
  "preserves a readable stored title with %s presentation",
  (presentation) => {
    const source = {
      ...original,
      title: "Preferred briefing format",
      value: "Use a one-page summary.",
    };
    const item = decode({
      ...source,
      ...(presentation === "legacy"
        ? {}
        : {
            displayTitle:
              presentation === "echoed" ? source.title : `meri:${id(9)}`,
            contentStatus: "available",
            contentLimitation: null,
          }),
    });
    expect(memoryPresentation(item)).toEqual({
      title: source.title,
      fact: source.value,
    });
    expect(item).toMatchObject(source);
  },
);

it("falls back to a stable label when nothing readable exists", () => {
  const item = decode({
    id: id(3),
    title: `meri:${id(9)}`,
    value: '{"feedbackKind":"negative","runId":"synthetic-run"}',
    scope: "user_private",
    clientId: null,
    updatedAt: "2026-10-26T15:38:22.305279Z",
    displayTitle: `meri:${id(9)}`,
    contentStatus: "available",
    contentLimitation: null,
  });
  // A JSON payload is not a heading and the namespace prefix is not a title.
  expect(memoryPresentation(item).title).toBe("Memory record");
  expect(memoryPresentation(item).title).not.toContain("feedbackKind");
});
