import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { memoryGovernanceOperations as operations } from "../src/shared/capiro/operations/memory-governance";
import { MemoryPaging } from "../src/features/settings/memory/MemoryPaging";
import {
  snapshotSettingsWrite,
  assertSettingsReceipt,
} from "../src/features/settings/security-writes";
import { reconcileMemoryGovernance } from "../src/features/settings/memory/governance-reconciliation";
import { reconcileMemoryReview } from "../src/features/settings/memory/review-reconciliation";
const id = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";
const account = { user: { id: "admin" }, tenant: { id: "tenant" } };
function write(action = "markStale") {
  const result = snapshotSettingsWrite(`settings.memory.governance.${action}`, {
    params: { id },
    body: { expectedVersion: "mv1:old", reason: "Reviewed reason" },
  });
  result.expectedAccount = {
    userId: account.user.id,
    tenantId: account.tenant.id,
  };
  return result;
}
function api(value: unknown) {
  return {
    request: vi.fn(async (operation: string) =>
      operation === "me.read" ? account : value,
    ),
  };
}
it("refuses a governance action without an expected version before dispatch", () => {
  expect(() =>
    operations["settings.memory.governance.markStale"].request.parse({
      params: { id },
      body: { reason: "Reason" },
    }),
  ).toThrow();
});
it("a short empty page can still advance by the owner's next cursor", () => {
  const value = operations["settings.memory.governance.items"].response.parse({
    enabled: true,
    items: [],
    nextCursor: "opaque-next",
  });
  const html = renderToStaticMarkup(
    createElement(MemoryPaging, {
      page: { page: 1, cursor: undefined, next: vi.fn(), back: vi.fn() },
      nextCursor: value.nextCursor,
      busy: false,
    }),
  );
  const next = html.match(/<button[^>]*>Next page<\/button>/)?.[0];
  expect(next).toBeDefined();
  expect(next).not.toMatch(/\sdisabled(?:=|\s|>)/);
});
it("a success for another item or outcome is not an acknowledgement", () => {
  expect(() =>
    assertSettingsReceipt(write(), {
      ok: true,
      itemId: requestId,
      outcome: "marked_stale",
    }),
  ).toThrow();
  expect(() =>
    assertSettingsReceipt(write(), {
      ok: true,
      itemId: id,
      outcome: "approved",
    }),
  ).toThrow();
});
it("unchanged version cannot confirm an uncertain mutation; a newer requested state can be inspected without replay", async () => {
  for (const [version, expected] of [
    ["mv1:old", false],
    ["mv1:new", true],
  ] as const) {
    const port = api({
      enabled: true,
      item: { id, version, governedStatus: "stale" },
    });
    expect(
      await reconcileMemoryGovernance(
        port as never,
        write(),
        new AbortController().signal,
      ),
    ).toBe(expected);
    expect(port.request.mock.calls.map((call) => call[0])).toEqual([
      "me.read",
      "settings.memory.governance.item",
    ]);
  }
});
it("missing projection is not proof of completion; exact job readback checks actual progress", async () => {
  for (const [job, expected] of [
    [null, false],
    [{ id, version: "mv1:new", status: "failed" }, false],
    [{ id, version: "mv1:new", status: "running" }, true],
  ] as const) {
    expect(
      await reconcileMemoryGovernance(
        api({ enabled: true, job }) as never,
        write("retry"),
        new AbortController().signal,
      ),
    ).toBe(expected);
  }
});
it("review readback binds candidate, request and deciding actor", async () => {
  const attempt = {
    ...write(),
    operation: "settings.memory.review.approve",
    input: { params: { id, requestId } },
  };
  const review = {
    reviewRequestId: requestId,
    candidateId: id,
    status: "approved",
    decidedBy: { userId: "admin" },
  };
  expect(
    await reconcileMemoryReview(
      api(review) as never,
      attempt,
      new AbortController().signal,
    ),
  ).toBe(true);
  expect(
    await reconcileMemoryReview(
      api({ ...review, candidateId: requestId }) as never,
      attempt,
      new AbortController().signal,
    ),
  ).toBe(false);
  expect(
    await reconcileMemoryReview(
      api({ ...review, status: "pending" }) as never,
      attempt,
      new AbortController().signal,
    ),
  ).toBe(false);
});
