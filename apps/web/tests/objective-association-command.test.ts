import "./command-recovery-platform";
import { describe, expect, it, vi } from "vitest";
import wire from "./objective-operational-contract-fixtures.json";
import { barrier, installPlatform } from "./command-recovery-platform";
import { CapiroApiError, createCapiroApi } from "../src/shared/capiro/http";
import {
  objectiveOperationalOperations,
  operationalAssociationCommandSchema,
  operationalAssociationReceiptSchema,
  operationalReadSchema,
  type OperationalAssociationReceipt,
} from "../src/shared/capiro/operations/objective-operational";
import {
  captureAssociation,
  requireRetainedAssociation,
  requireUnchangedAssociationSource,
} from "../src/features/portfolio/objectives/operational/association-command";
import {
  createAssociationRecovery,
  dispatchAssociation,
  finishAssociationReview,
  reconcileAssociation,
} from "../src/features/portfolio/objectives/operational/association-recovery";

installPlatform();
const signal = new AbortController().signal;
const other = "f0000000-0000-4000-8000-000000000001";
function fixture() {
  const command = operationalAssociationCommandSchema.parse(
    wire.examples.find((row) => row.type === "AssociationCommand")!.value,
  );
  if (command.action !== "link") throw new Error("Link fixture required");
  const receipt = operationalAssociationReceiptSchema.parse(
    wire.examples.find((row) => row.type === "AssociationReceipt")!.value,
  );
  const source = {
    clientId: command.clientId,
    kind: "strategy" as const,
    id: command.resource.id,
    title: "Synthetic reviewed work",
    revision: "2026-10-15T12:00:00Z",
  };
  const pending = { command, payloadDigest: receipt.payloadDigest, source };
  const actor = { userId: other, tenantId: command.clientId };
  const target = { clientId: command.clientId, id: command.objectiveId };
  const recovery = createAssociationRecovery(actor, target, () => undefined);
  return { command, receipt, pending, source, actor, target, recovery };
}
function responding(receipt: OperationalAssociationReceipt) {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(receipt));
  return {
    ...createCapiroApi(objectiveOperationalOperations, { fetcher }),
    fetcher,
  };
}

describe("Objective association authoring and durable recovery", () => {
  it("serializes two submits and reloads into the same immutable command without replay", async () => {
    const { recovery, pending, receipt } = fixture(),
      api = responding(receipt);
    const results = await Promise.all([
      dispatchAssociation(
        recovery,
        api,
        pending,
        signal,
        async () => undefined,
      ),
      dispatchAssociation(
        recovery,
        api,
        pending,
        signal,
        async () => undefined,
      ),
    ]);
    expect(api.fetcher).toHaveBeenCalledTimes(1);
    expect(results.map((row) => row.receipt)).toEqual([receipt, receipt]);
    const reload = fixture().recovery;
    expect((await reload.load())?.command).toEqual(pending.command);
    await dispatchAssociation(
      reload,
      api,
      { ...pending, command: { ...pending.command, requestId: other } },
      signal,
      async () => undefined,
    );
    expect(api.fetcher).toHaveBeenCalledTimes(1);
  });
  it("recovers a response loss using GET even after the source is moved or deleted", async () => {
    const { recovery, pending, receipt } = fixture();
    const lost = {
      request: vi.fn(async () => {
        throw new Error("Synthetic lost response");
      }),
    };
    await expect(
      dispatchAssociation(
        recovery,
        lost,
        pending,
        signal,
        async () => undefined,
      ),
    ).rejects.toThrow("lost response");
    expect(await recovery.load()).toEqual(pending);
    const api = responding(receipt);
    expect(
      (await reconcileAssociation(fixture().recovery, api, signal))?.receipt,
    ).toEqual(receipt);
    expect(api.fetcher.mock.calls[0]?.[0]).toContain(
      "/api/capiro/objectives.operational.receipt?",
    );
    await finishAssociationReview(recovery, async () => undefined);
    expect(await recovery.load()).toBeNull();
  });
  it("keeps unknown or mismatched receipts fenced and refuses edited retained commands", async () => {
    const { recovery, pending, receipt } = fixture();
    await recovery.reserve(pending);
    await expect(
      reconcileAssociation(
        recovery,
        responding({ ...receipt, requestId: other }),
        signal,
      ),
    ).rejects.toThrow();
    expect(await recovery.load()).toEqual(pending);
    await expect(
      recovery.save({
        ...pending,
        source: { ...pending.source, title: "Changed after review" },
      }),
    ).rejects.toThrow();
    await expect(
      finishAssociationReview(recovery, async () => undefined),
    ).rejects.toThrow("uncertain");
    await expect(
      requireRetainedAssociation(
        {
          ...pending,
          command: { ...pending.command, expectedAssociationSetVersion: 300 },
        },
        pending.command.clientId,
        pending.command.objectiveId,
      ),
    ).rejects.toThrow();
  });
  it("records exact rejection and requires a successful fresh review before retiring", async () => {
    const { recovery, pending } = fixture();
    const refusal = {
      schemaVersion: 1 as const,
      status: 409 as const,
      code: "ASSOCIATION_VERSION_CONFLICT" as const,
      outcome: "rejected" as const,
      requestId: pending.command.requestId,
    };
    const api = {
      request: vi.fn(async () => {
        throw new CapiroApiError(409, "Conflict", undefined, refusal);
      }),
    };
    expect(
      (
        await dispatchAssociation(
          recovery,
          api,
          pending,
          signal,
          async () => undefined,
        )
      ).refusal,
    ).toEqual(refusal);
    await expect(
      finishAssociationReview(recovery, async () => {
        throw new Error("fresh read denied");
      }),
    ).rejects.toThrow("denied");
    expect(await recovery.load()).not.toBeNull();
    await finishAssociationReview(recovery, async () => undefined);
    expect(await recovery.load()).toBeNull();
  });
  it("does not reserve or write a source that changed before dispatch", async () => {
    const { recovery, pending, receipt, source } = fixture(),
      api = responding(receipt);
    await expect(
      dispatchAssociation(recovery, api, pending, signal, async () => {
        requireUnchangedAssociationSource(source, {
          ...source,
          revision: "new",
        });
      }),
    ).rejects.toThrow("changed");
    expect(api.fetcher).not.toHaveBeenCalled();
    expect(await recovery.load()).toBeNull();
  });
  it("does not acknowledge or write after the actor lifetime is revoked during a wait", async () => {
    const { actor, target, pending, receipt } = fixture();
    let current = true;
    const recovery = createAssociationRecovery(actor, target, () => {
      if (!current) throw new DOMException("Revoked", "AbortError");
    });
    const ready = barrier(),
      release = barrier(),
      api = responding(receipt);
    const work = dispatchAssociation(
      recovery,
      api,
      pending,
      signal,
      async () => {
        ready.resolve();
        await release.promise;
      },
    );
    await ready.promise;
    current = false;
    release.resolve();
    await expect(work).rejects.toThrow("Revoked");
    expect(api.fetcher).not.toHaveBeenCalled();
    expect(await fixture().recovery.load()).toBeNull();
  });
  it("separates actor, tenant, client and Objective journals", async () => {
    const { recovery, pending, actor, target } = fixture();
    await recovery.reserve(pending);
    for (const [scopeActor, scopeTarget] of [
      [{ ...actor, userId: target.id }, target],
      [{ ...actor, tenantId: other }, target],
      [actor, { ...target, clientId: other }],
      [actor, { ...target, id: other }],
    ] as const)
      expect(
        await createAssociationRecovery(
          scopeActor,
          scopeTarget,
          () => undefined,
        ).load(),
      ).toBeNull();
  });
  it("captures an immutable snapshot and refuses foreign client, kind, cycle and stale Objective", async () => {
    const { source } = fixture();
    const read = operationalReadSchema.parse(
      wire.examples.find(
        (row) =>
          row.type === "ReadResponse" &&
          row.value.associationSetVersion !== null,
      )!.value,
    );
    const objective = {
      clientId: read.scope.clientId,
      id: read.scope.objectiveId,
      version: read.scope.objectiveVersion,
      status: read.scope.objectiveStatus,
    };
    const reviewed = { ...source, clientId: objective.clientId };
    const captured = await captureAssociation(read, objective, {
      action: "link",
      source: reviewed,
      cycles: [],
    });
    reviewed.title = "Edited local object";
    expect(captured.source?.title).toBe(source.title);
    await expect(
      captureAssociation(read, objective, {
        action: "link",
        source: { ...source, clientId: other },
        cycles: [],
      }),
    ).rejects.toThrow();
    await expect(
      captureAssociation(
        read,
        { ...objective, version: objective.version + 1 },
        { action: "link", source: reviewed, cycles: [] },
      ),
    ).rejects.toThrow();
    await expect(
      captureAssociation(read, objective, {
        action: "link",
        source: { ...reviewed, kind: "meeting" },
        cycles: [
          {
            fiscalYear: 2028,
            authorityTrack: null,
            basis: "human_annotation",
            context: null,
          },
        ],
      }),
    ).rejects.toThrow();
    await expect(
      captureAssociation(read, objective, {
        action: "link",
        source: { ...reviewed, kind: "directory_target" as never },
        cycles: [],
      }),
    ).rejects.toThrow();
  });
});
