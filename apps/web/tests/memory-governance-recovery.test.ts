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
function readbackAs(userId: string, tenantId: string, value: unknown) {
  return {
    request: vi.fn(async (operation: string) =>
      operation === "me.read" ? { user: { id: userId }, tenant: { id: tenantId } } : value,
    ),
  };
}
function confirmation(overrides: Record<string, unknown> = {}) {
  return {
    id: requestId,
    memoryItemId: id,
    fromStatus: null,
    toStatus: "conflicted",
    reason: "Memory confirmed from the Governance Center.",
    occurredAt: "2026-10-28T12:00:00.000Z",
    actorUserId: account.user.id,
    ...overrides,
  };
}
function confirmedConflicted(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    item: {
      id,
      version: "mv1:new",
      governedStatus: "conflicted",
      secondApprovedByUserId: null,
      transitions: [confirmation()],
      ...overrides,
    },
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
it("a lost response for a confirmed conflicted item is recovered from its recorded confirmation", async () => {
  const port = api(confirmedConflicted());
  expect(
    await reconcileMemoryGovernance(
      port as never,
      write("confirm"),
      new AbortController().signal,
    ),
  ).toBe(true);
  expect(port.request.mock.calls.map((call) => call[0])).toEqual([
    "me.read",
    "settings.memory.governance.item",
  ]);
});
it("a conflicted readback that does not prove this confirmation stays unknown", async () => {
  const reads = ["me.read", "settings.memory.governance.item"];
  const cases: Array<[unknown, string, string, boolean]> = [
    [confirmedConflicted({ version: "mv1:old" }), account.user.id, account.tenant.id, false],
    [confirmedConflicted(), "someone-else", account.tenant.id, false],
    [confirmedConflicted(), account.user.id, "another-tenant", false],
    [confirmedConflicted({ id: requestId }), account.user.id, account.tenant.id, false],
    [{ enabled: false, item: confirmedConflicted().item }, account.user.id, account.tenant.id, false],
    [{ enabled: true, item: null }, account.user.id, account.tenant.id, false],
    [
      confirmedConflicted({
        governedStatus: "revoked",
        transitions: [confirmation({ toStatus: "revoked" })],
      }),
      account.user.id,
      account.tenant.id,
      false,
    ],
    [
      confirmedConflicted({
        governedStatus: "stale",
        transitions: [confirmation({ toStatus: "stale" })],
      }),
      account.user.id,
      account.tenant.id,
      false,
    ],
    [
      confirmedConflicted({ transitions: [confirmation({ actorUserId: "someone-else" })] }),
      account.user.id,
      account.tenant.id,
      false,
    ],
    [
      confirmedConflicted({ transitions: [confirmation({ fromStatus: "active" })] }),
      account.user.id,
      account.tenant.id,
      false,
    ],
    [
      confirmedConflicted({
        transitions: [confirmation({ actorUserId: "someone-else" }), confirmation()],
      }),
      account.user.id,
      account.tenant.id,
      false,
    ],
    [confirmedConflicted({ transitions: [] }), account.user.id, account.tenant.id, false],
    [confirmedConflicted({ transitions: undefined }), account.user.id, account.tenant.id, false],
    [
      confirmedConflicted({ secondApprovedByUserId: account.user.id }),
      account.user.id,
      account.tenant.id,
      false,
    ],
  ];
  for (const [value, userId, tenantId, expected] of cases) {
    const port = readbackAs(userId, tenantId, value);
    expect(
      await reconcileMemoryGovernance(
        port as never,
        write("confirm"),
        new AbortController().signal,
      ),
    ).toBe(expected);
    expect(
      port.request.mock.calls.every((call) => reads.includes(call[0])),
    ).toBe(true);
  }
});
