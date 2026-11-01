import { expect, it } from "vitest";
import type { GovernedObjectiveGenerationObservation } from "../src/shared/capiro/operations/objective-governed-generation";
import {
  ObjectivePlannerConsentSession,
  type PlannerConsentRecovery,
} from "../src/features/portfolio/objectives/objective-planner-consent-session";
import {
  plannerConsentFor,
  requirePlannerConsentReceipt,
  type RetainedPlannerConsent,
} from "../src/shared/capiro/operations/objective-planner-consent";
const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const selection = {
  query: { clientId: id(2), objectiveId: id(3), objectiveVersion: 2 },
  ids: { strategyId: id(5), strategyVersionId: id(6), generatedJobId: id(4) },
};
function setup() {
  const origin: GovernedObjectiveGenerationObservation = {
    schemaVersion: 1,
    clientId: id(2),
    objective: {
      id: id(3),
      revision: { id: id(8), version: 2 },
      status: "ready",
    },
    workAction: "objective.plan.prepare",
    requestedSource: {
      revision: { id: id(8), version: 2 },
      canonicalBindingVersion: 2,
    },
    control: {
      version: 0,
      currentAuthorizationRequestId: null,
      cancelledAt: null,
    },
    consent: null,
    reconciliation: "not_started",
    accounting: null,
    commandReceipt: null,
    observedAt: "2026-11-01T00:00:00.000Z",
  };
  const saved = {
    destination: {
      kind: "strategy_saved_review",
      resourceId: id(5),
      ...selection.query,
      objectiveRevisionId: id(8),
    },
    source: {
      ...selection.query,
      generationJobId: id(4),
      generationRequestId: id(7),
      objectiveRevisionId: id(8),
      strategyId: id(5),
      strategyVersionId: id(6),
      snapshotDigest: "1".repeat(64),
    },
    savedAt: "2026-11-01T00:00:00.000Z",
    context: {
      state: "complete",
      compiledAt: "2026-11-01T00:00:00.000Z",
      reobservedAt: "2026-11-01T00:00:00.000Z",
    },
    snapshot: {
      meta: {
        id: id(5),
        clientId: id(2),
        title: "Saved",
        type: "coalition",
        goal: null,
        targetDate: null,
        ownerUserId: "synthetic",
      },
      nodes: [],
    },
    currentNodes: [],
  };
  let retained: RetainedPlannerConsent | null = null;
  let receipt: ReturnType<typeof requirePlannerConsentReceipt> | undefined;
  const receipts = new Map<string, NonNullable<typeof receipt>>();
  let refuseReceiptRead = false;
  let lostReply = false,
    denied = false,
    posts = 0,
    allocations = 0;
  const recovery: PlannerConsentRecovery = {
    guard() {
      if (denied) throw Error("denied");
    },
    authorize: async () => {
      if (denied) throw Error("denied");
    },
    load: async () => retained && structuredClone(retained),
    reserve: async (v) => {
      allocations++;
      retained ??= structuredClone(v);
      return structuredClone(retained);
    },
    save: async (v) => {
      retained = structuredClone(v);
    },
    acknowledge: async (value) => {
      expect(value.receipt).toBeTruthy();
      expect(retained).toEqual(value);
      retained = null;
    },
    lock: async (action) => action(),
  };
  const session = () =>
    new ObjectivePlannerConsentSession(
      {
        saved: async () => saved,
        generation: async (requestId) => {
          if (requestId && (refuseReceiptRead || !receipts.has(requestId)))
            throw Error("unavailable");
          return structuredClone(
            requestId
              ? { ...origin, commandReceipt: receipts.get(requestId) }
              : origin,
          );
        },
        command: async (request) => {
          posts++;
          const command = request.body.command;
          receipt = receipts.get(request.body.requestId) ?? {
            schemaVersion: 1,
            receiptId: id(20),
            requestId: request.body.requestId,
            payloadDigest: "1".repeat(64),
            clientId: id(2),
            objectiveId: id(3),
            command,
            workAction: "objective.plan.prepare",
            commandRevision: { id: id(8), version: 2 },
            sourceRevision: { id: id(8), version: 2 },
            rootIntentId: id(21),
            controlVersionBefore: request.body.expectedControlVersion,
            controlVersionAfter: request.body.expectedControlVersion + 1,
            targetAuthorizationRequestId:
              request.body.targetAuthorizationRequestId,
            authorizationRequestId:
              command === "retry"
                ? id(22 + posts)
                : request.body.targetAuthorizationRequestId,
            consent:
              command === "cancel"
                ? null
                : {
                    id: id(22 + posts),
                    confirmedAt: "2026-11-01T00:00:01.000Z",
                    expiresAt: "2026-11-01T00:10:00.000Z",
                  },
            outcome:
              command === "cancel"
                ? "cancellation_recorded"
                : "reconsent_recorded",
            committedAt: "2026-11-01T00:00:01.000Z",
          };
          receipts.set(receipt.requestId, receipt);
          origin.control = {
            version: receipt.controlVersionAfter,
            currentAuthorizationRequestId: receipt.authorizationRequestId,
            cancelledAt: command === "cancel" ? receipt.committedAt : null,
          };
          if (receipt.consent)
            origin.consent = { ...receipt.consent, expired: false };
          origin.observedAt = "2026-11-01T00:00:02.000Z";
          if (lostReply) throw Error("reply lost");
          return receipt;
        },
      },
      recovery,
      selection,
    );
  return {
    origin,
    saved,
    session,
    get retained() {
      return retained;
    },
    get posts() {
      return posts;
    },
    get allocations() {
      return allocations;
    },
    loseReply: () => {
      lostReply = true;
    },
    deny: () => {
      denied = true;
    },
    erase: () => {
      retained = null;
    },
    blockReceiptRead: () => {
      refuseReceiptRead = true;
    },
    settle: (outcome: "failed" | "cancelled" | "applied") => {
      origin.reconciliation = "accounted";
      origin.accounting = {
        outcome,
        sourceRevision: { id: id(8), version: 2 },
      };
      if (origin.consent) {
        origin.consent.expired = true;
        origin.observedAt = "2026-11-01T00:11:00.000Z";
      }
    },
  };
}
it("mount and repeated refresh read only; only explicit consent posts", async () => {
  const f = setup(),
    flow = f.session();
  await flow.refresh();
  await flow.refresh();
  expect(flow.snapshot().ready).toBe(true);
  expect(f.posts).toBe(0);
  expect(f.allocations).toBe(0);
  await flow.execute();
  expect(f.posts).toBe(1);
  expect(flow.snapshot().retained?.receipt?.outcome).toBe("reconsent_recorded");
  await flow.execute();
  await flow.refresh();
  expect(f.posts).toBe(1);
});
it("lost reply is recovered by the original command read after remount, without renewing consent", async () => {
  const f = setup(),
    flow = f.session();
  f.loseReply();
  await flow.execute();
  const original = f.retained?.request;
  expect(flow.snapshot().error).toBeTruthy();
  const reopened = f.session();
  await reopened.refresh();
  expect(reopened.snapshot().retained?.request).toEqual(original);
  expect(reopened.snapshot().retained?.receipt).toBeTruthy();
  expect(f.posts).toBe(1);
  expect(f.allocations).toBe(1);
});
it("missing recovery cannot replace the mounted view's original command", async () => {
  const f = setup(),
    flow = f.session();
  f.loseReply();
  await flow.execute();
  const original = flow.snapshot().retained;
  f.erase();
  await flow.execute();
  expect(f.posts).toBe(1);
  expect(f.allocations).toBe(1);
  expect(flow.snapshot().retained).toEqual(original);
  expect(flow.snapshot().error).toBeTruthy();
});
it("current actor denial cannot dispatch consent", async () => {
  const f = setup(),
    flow = f.session();
  f.deny();
  await flow.execute();
  expect(f.posts).toBe(0);
  expect(f.allocations).toBe(0);
});
it.each(["strategyVersionId", "generationJobId", "objectiveRevisionId"])(
  "refuses substituted saved %s before reservation",
  async (field) => {
    const f = setup();
    Object.assign(f.saved.source, { [field]: id(99) });
    await f.session().execute();
    expect(f.posts).toBe(0);
    expect(f.allocations).toBe(0);
  },
);
it("refuses stale revision, uncertain operation and active consent instead of issuing a successor", () => {
  const f = setup();
  f.origin.objective.revision.id = id(99);
  expect(() =>
    plannerConsentFor(f.origin, f.saved, selection, id(50)),
  ).toThrow();
  f.origin.objective.revision.id = id(8);
  f.origin.reconciliation = "outcome_unconfirmed";
  expect(() =>
    plannerConsentFor(f.origin, f.saved, selection, id(50)),
  ).toThrow();
  f.origin.reconciliation = "not_started";
  const active = {
    ...f.origin,
    control: {
      version: 1,
      currentAuthorizationRequestId: id(22),
      cancelledAt: null,
    },
    consent: {
      id: id(22),
      confirmedAt: "2026-10-31T23:59:00.000Z",
      expiresAt: "2026-11-01T00:10:00.000Z",
      expired: false,
    },
  };
  expect(() => plannerConsentFor(active, f.saved, selection, id(50))).toThrow();
});
it("rejects a receipt for another original command", async () => {
  const f = setup(),
    flow = f.session();
  await flow.execute();
  const v = flow.snapshot().retained!;
  expect(() =>
    requirePlannerConsentReceipt(
      { ...v.receipt, requestId: id(99) },
      v.request,
      v.origin,
    ),
  ).toThrow();
});
it("cancel uses a separate explicit original command and never implies undo", async () => {
  const f = setup(),
    flow = f.session();
  await flow.execute();
  const first = f.retained!.request.body.requestId;
  expect(flow.snapshot().canCancel).toBe(true);
  await flow.change("cancel");
  expect(f.posts).toBe(2);
  expect(f.retained!.request.body.requestId).not.toBe(first);
  expect(f.retained!.receipt?.outcome).toBe("cancellation_recorded");
  expect(flow.snapshot().canCancel).toBe(false);
});
it.each(["failed", "cancelled"] as const)(
  "explicit new consent can follow settled %s without replacing an unknown original",
  async (outcome) => {
    const f = setup(),
      flow = f.session();
    await flow.execute();
    const original = f.retained!.request.body.requestId;
    f.settle(outcome);
    await flow.refresh();
    expect(flow.snapshot().canRetry).toBe(true);
    await flow.change("retry");
    expect(f.posts).toBe(2);
    expect(f.allocations).toBe(2);
    expect(f.retained!.request.body.requestId).not.toBe(original);
  },
);
it("unconfirmed original receipt prevents cancellation/reconsent replacement", async () => {
  const f = setup(),
    flow = f.session();
  f.loseReply();
  await flow.execute();
  const original = f.retained;
  f.blockReceiptRead();
  await flow.change("cancel");
  expect(f.posts).toBe(1);
  expect(f.retained).toEqual(original);
});
it("applied same-source work cannot be reconsented or cancelled as an undo", async () => {
  const f = setup(),
    flow = f.session();
  await flow.execute();
  f.settle("applied");
  await flow.refresh();
  expect(flow.snapshot().canRetry).toBe(false);
  expect(flow.snapshot().canCancel).toBe(false);
  await flow.change("retry");
  expect(f.posts).toBe(1);
});
