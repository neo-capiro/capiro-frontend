import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const itemId = "00000000-0000-4000-8000-000000000001";
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ userId: "user", orgId: "org" }),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({ state: "no-selection" }),
}));
vi.mock("../src/features/meri/memory-review/useOwnerCorrection", () => ({
  useOwnerCorrection: () => ({
    items: {
      state: "ready",
      items: [
        {
          reference: { kind: "item", id: itemId },
          id: itemId,
          title: "Preferred briefing format",
          value: "Use a one-page summary.",
          scope: "user_private",
          clientId: null,
          updatedAt: "2026-10-27T12:34:56.123456Z",
        },
      ],
      nextCursor: null,
    },
    holdStatus: "ready",
    unknownIds: new Set(),
  }),
}));
vi.mock("../src/features/meri/memory-review/useOwnerMemoryInbox", () => ({
  useOwnerMemoryInbox: () => ({
    inbox: {
      state: "ready",
      candidates: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          kind: "addition",
          key: "briefing-cadence",
          value: "Send the weekly briefing on Monday.",
          sourceType: "meri",
          createdAt: "2026-10-27T12:00:00.000Z",
        },
      ],
      nextCursor: null,
    },
    feedback: null,
    working: null,
    loadingMore: false,
    loadMoreError: null,
    verifying: false,
    holdStatus: "ready",
    uncertainIds: new Set(),
    refresh: vi.fn(),
    loadMore: vi.fn(),
    verifyUncertain: vi.fn(),
    decide: vi.fn(),
  }),
}));

const { MemoryCorrectionComposer } =
  await import("../src/features/meri/memory-review/MemoryCorrectionComposer");
const { MemoryOwnerInbox } =
  await import("../src/features/meri/memory-review/MemoryOwnerInbox");

it("keeps one H1 on the memory route and nests its sections beneath it", () => {
  // Same composition as src/app/meri/memory/page.tsx.
  const html = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      createElement(MemoryCorrectionComposer, { enabled: true }),
      createElement(MemoryOwnerInbox, { enabled: true }),
    ),
  );
  const headings = [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)].map(
    ([, level, text]) => `h${level}:${text!.replace(/<[^>]+>/g, "")}`,
  );
  expect(headings.filter((heading) => heading.startsWith("h1:"))).toEqual([
    "h1:Institutional Memory",
  ]);
  expect(headings).toContain("h2:Preferred briefing format");
  expect(headings).toContain("h3:History for Preferred briefing format");
  expect(headings).toContain("h2:Personal memory review");
  expect(headings.indexOf("h2:Personal memory review")).toBeLessThan(
    headings.indexOf("h3:briefing-cadence"),
  );
});
