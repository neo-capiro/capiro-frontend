import { describe, expect, it } from "vitest";
import {
  governedObjectiveCommandReceipt,
  governedObjectiveGenerationObservation,
  governedObjectiveGenerationReadOperation,
  requireGovernedObjectiveGenerationObservation,
} from "./objective-governed-generation";

const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const clientId = id(1);
const objectiveId = id(2);
const requestId = id(3);
const selected = {
  params: { clientId, objectiveId },
  query: { workAction: "objective.plan.prepare" as const },
};
const observation = {
  schemaVersion: 1,
  clientId,
  objective: {
    id: objectiveId,
    revision: { id: id(4), version: 7 },
    status: "ready",
  },
  workAction: "objective.plan.prepare",
  requestedSource: {
    revision: { id: id(4), version: 7 },
    canonicalBindingVersion: 3,
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
  observedAt: "2026-10-17T12:00:00.000Z",
};
const receipt = {
  schemaVersion: 1,
  receiptId: id(5),
  requestId,
  payloadDigest: "a".repeat(64),
  clientId,
  objectiveId,
  command: "retry",
  workAction: "objective.plan.prepare",
  commandRevision: { id: id(6), version: 5 },
  sourceRevision: { id: id(6), version: 5 },
  rootIntentId: id(7),
  controlVersionBefore: 1,
  controlVersionAfter: 2,
  targetAuthorizationRequestId: id(8),
  authorizationRequestId: id(9),
  consent: {
    id: id(9),
    confirmedAt: "2026-10-17T11:00:00.000Z",
    expiresAt: "2026-10-17T11:15:00.000Z",
  },
  outcome: "reconsent_recorded",
  committedAt: "2026-10-17T11:00:01.000Z",
};

describe("Core PR53 governed Objective read receiving", () => {
  it("pins a read-only unmounted operation and a closed GET query", () => {
    expect(governedObjectiveGenerationReadOperation.service).toBe("core");
    expect(governedObjectiveGenerationReadOperation.method).toBe("GET");
    expect(governedObjectiveGenerationReadOperation.path).toBe(
      "/clients/:clientId/objectives/:objectiveId/generation",
    );
    expect(
      governedObjectiveGenerationReadOperation.request.safeParse(selected)
        .success,
    ).toBe(true);
    expect(
      governedObjectiveGenerationReadOperation.request.safeParse({
        ...selected,
        query: { ...selected.query, ownerId: id(10) },
      }).success,
    ).toBe(false);
  });

  it("binds a current observation to the selected client, Objective, and action", () => {
    expect(
      requireGovernedObjectiveGenerationObservation(observation, selected),
    ).toEqual(observation);
    expect(() =>
      requireGovernedObjectiveGenerationObservation(observation, {
        ...selected,
        params: { ...selected.params, objectiveId: id(10) },
      }),
    ).toThrow("does not match");
    expect(() =>
      requireGovernedObjectiveGenerationObservation(observation, {
        ...selected,
        query: { workAction: "objective.strategy.draft" },
      }),
    ).toThrow("does not match");
  });

  it("preserves the new requested source separately from older accounted work", () => {
    const newer = {
      ...observation,
      reconciliation: "accounted",
      accounting: {
        outcome: "applied",
        sourceRevision: { id: id(6), version: 5 },
      },
    };
    const parsed = governedObjectiveGenerationObservation.parse(newer);
    expect(parsed.requestedSource.revision.version).toBe(7);
    expect(parsed.accounting?.sourceRevision.version).toBe(5);
    expect(
      governedObjectiveGenerationObservation.safeParse({
        ...newer,
        reconciliation: "outcome_unconfirmed",
      }).success,
    ).toBe(false);
  });

  it("requires an exact historical receipt only for a requestId lookup", () => {
    const recovered = { ...observation, commandReceipt: receipt };
    expect(
      requireGovernedObjectiveGenerationObservation(recovered, {
        ...selected,
        query: { ...selected.query, requestId },
      }).commandReceipt?.sourceRevision.version,
    ).toBe(5);
    expect(() =>
      requireGovernedObjectiveGenerationObservation(recovered, selected),
    ).toThrow("does not match");
    expect(() =>
      requireGovernedObjectiveGenerationObservation(recovered, {
        ...selected,
        query: { ...selected.query, requestId: id(11) },
      }),
    ).toThrow("does not match");
    expect(() =>
      requireGovernedObjectiveGenerationObservation(observation, {
        ...selected,
        query: { ...selected.query, requestId },
      }),
    ).toThrow("does not match");
  });

  it("rejects contradictory receipt outcomes and foreign receipt scope", () => {
    expect(governedObjectiveCommandReceipt.safeParse(receipt).success).toBe(
      true,
    );
    expect(
      governedObjectiveCommandReceipt.safeParse({
        ...receipt,
        controlVersionAfter: 3,
      }).success,
    ).toBe(false);
    expect(
      governedObjectiveCommandReceipt.safeParse({
        ...receipt,
        outcome: "unchanged",
      }).success,
    ).toBe(false);
    expect(
      governedObjectiveGenerationObservation.safeParse({
        ...observation,
        commandReceipt: { ...receipt, clientId: id(12) },
      }).success,
    ).toBe(false);
  });

  it("accepts a historical no-op cancellation without turning it into new consent", () => {
    const cancelled = {
      ...receipt,
      command: "cancel",
      consent: null,
      authorizationRequestId: receipt.targetAuthorizationRequestId,
      outcome: "unchanged",
      controlVersionAfter: receipt.controlVersionBefore,
    };
    expect(governedObjectiveCommandReceipt.safeParse(cancelled).success).toBe(
      true,
    );
  });

  it("accepts a current consent only when its expiry agrees with observation time", () => {
    const current = {
      ...observation,
      control: { ...observation.control, currentAuthorizationRequestId: id(9) },
      consent: {
        id: id(9),
        confirmedAt: "2026-10-17T11:00:00.000Z",
        expiresAt: "2026-10-17T11:15:00.000Z",
        expired: true,
      },
    };
    expect(
      governedObjectiveGenerationObservation.safeParse(current).success,
    ).toBe(true);
    expect(
      governedObjectiveGenerationObservation.safeParse({
        ...current,
        consent: { ...current.consent, expired: false },
      }).success,
    ).toBe(false);
  });

  it("rejects inconsistent consent, timestamps, and unknown projection fields", () => {
    expect(
      governedObjectiveGenerationObservation.safeParse({
        ...observation,
        consent: {
          id: id(9),
          confirmedAt: "2026-10-17T11:00:00.000Z",
          expiresAt: "2026-10-17T11:15:00.000Z",
          expired: true,
        },
      }).success,
    ).toBe(false);
    expect(
      governedObjectiveGenerationObservation.safeParse({
        ...observation,
        observedAt: "2026-10-17T12:00:00+00:00",
      }).success,
    ).toBe(false);
    expect(
      governedObjectiveGenerationObservation.safeParse({
        ...observation,
        operationId: id(13),
      }).success,
    ).toBe(false);
  });
});
