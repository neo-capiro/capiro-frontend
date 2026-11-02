import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { MemoryReviewDetail } from "@capiro/shared/memory-review";

vi.mock("../src/features/settings/useSettingsMutation", () => ({
  useSettingsMutation: () => ({
    locked: false,
    pending: null,
    reconcile: async () => undefined,
    action: { busy: false, error: null, message: null, run: vi.fn() },
    api: { request: vi.fn() },
  }),
}));
vi.mock("../src/features/settings/SettingsMutationNotice", () => ({
  SettingsMutationNotice: () => null,
}));

const { MemoryReviewActions } =
  await import("../src/features/settings/memory/review/MemoryReviewActions");

function render(
  status: MemoryReviewDetail["status"],
  capabilities: { approve: boolean; reject: boolean },
) {
  const review = {
    candidateId: "candidate",
    reviewRequestId: "request",
    revisionNumber: 1,
    status,
    capabilities,
  } as unknown as MemoryReviewDetail;
  return renderToStaticMarkup(
    createElement(MemoryReviewActions, { review, refresh: () => undefined }),
  );
}

it("renders no decision form for an already decided review", () => {
  const html = render("approved", { approve: false, reject: false });
  expect(html).not.toContain("<form");
  expect(html).not.toContain("Record decision");
  expect(html).not.toContain("No decision is currently permitted");
});

it("explains a pending review the viewer may not decide, without a form", () => {
  const html = render("pending", { approve: false, reject: false });
  expect(html).not.toContain("<form");
  expect(html).not.toContain("Record decision");
  expect(html).toContain("No decision is currently permitted");
});

it("renders the decision form when Core permits a decision", () => {
  const html = render("pending", { approve: true, reject: true });
  expect(html).toContain("<form");
  expect(html).toContain("Record decision");
  expect(html).not.toContain("No decision is currently permitted");
});
