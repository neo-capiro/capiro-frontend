import { describe, expect, it } from "vitest";
import {
  governedObjectiveStrategyIntakeOperation,
  governedObjectiveStrategyIntakeRequest,
  governedObjectiveStrategyIntakeResponse,
  requireGovernedObjectiveStrategyIntakeReceipt,
} from "./objective-governed-strategy-intake";

const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const clientId = id(1);
const objectiveId = id(2);
const requestId = id(3);
const generationRequestId = id(4);

const request = {
  params: { clientId, objectiveId },
  body: {
    schemaVersion: 2 as const,
    command: {
      schemaVersion: 1 as const,
      requestId,
      command: "retry" as const,
      workAction: "objective.strategy.draft" as const,
      expectedObjectiveVersion: 7,
      expectedControlVersion: 0 as const,
      expectedCanonicalBindingVersion: 3,
      targetAuthorizationRequestId: null,
    },
    selection: { type: "appropriations" as const, generationRequestId },
  },
};
const observed = {
  schemaVersion: 1 as const,
  clientId,
  objective: {
    id: objectiveId,
    revision: { id: id(5), version: 7 },
    status: "ready" as const,
  },
  workAction: "objective.strategy.draft" as const,
  requestedSource: {
    revision: { id: id(5), version: 7 },
    canonicalBindingVersion: 3,
  },
  control: {
    version: 0,
    currentAuthorizationRequestId: null,
    cancelledAt: null,
  },
  consent: null,
  reconciliation: "outcome_unconfirmed" as const,
  accounting: null,
  commandReceipt: null,
  observedAt: "2026-10-17T12:00:00.000Z",
};
const response = {
  schemaVersion: 2,
  generationJobId: id(20),
  commandReceipt: {
    schemaVersion: 1,
    receiptId: id(7),
    requestId,
    payloadDigest: "a".repeat(64),
    clientId,
    objectiveId,
    command: "retry",
    workAction: "objective.strategy.draft",
    commandRevision: observed.objective.revision,
    sourceRevision: observed.requestedSource.revision,
    rootIntentId: id(8),
    controlVersionBefore: 0,
    controlVersionAfter: 1,
    targetAuthorizationRequestId: null,
    authorizationRequestId: id(9),
    consent: {
      id: id(9),
      confirmedAt: "2026-10-17T12:00:00.000Z",
      expiresAt: "2026-10-17T12:15:00.000Z",
    },
    outcome: "reconsent_recorded",
    committedAt: "2026-10-17T12:00:01.000Z",
  },
  selection: request.body.selection,
};

describe("Core PR61 Strategy reserved intake", () => {
  it("registers the exact Core POST with a closed v2 wrapper and distinct IDs", () => {
    expect(governedObjectiveStrategyIntakeOperation.service).toBe("core");
    expect(governedObjectiveStrategyIntakeOperation.method).toBe("POST");
    expect(governedObjectiveStrategyIntakeOperation.path).toBe(
      "/clients/:clientId/objectives/:objectiveId/generation/strategy-commands",
    );
    expect(
      governedObjectiveStrategyIntakeRequest.safeParse(request).success,
    ).toBe(true);
    for (const invalid of [
      { ...request, query: { workAction: "objective.strategy.draft" } },
      { ...request, body: { ...request.body, privateOperationId: id(10) } },
      {
        ...request,
        body: {
          ...request.body,
          command: { ...request.body.command, command: "cancel" },
        },
      },
      {
        ...request,
        body: {
          ...request.body,
          command: { ...request.body.command, expectedControlVersion: 1 },
        },
      },
      {
        ...request,
        body: {
          ...request.body,
          selection: { ...request.body.selection, type: "unknown" },
        },
      },
      {
        ...request,
        body: {
          ...request.body,
          selection: {
            ...request.body.selection,
            generationRequestId: requestId,
          },
        },
      },
    ])
      expect(
        governedObjectiveStrategyIntakeRequest.safeParse(invalid).success,
      ).toBe(false);
  });

  it("accepts only a v1 command receipt and exact v2 selection echo", () => {
    expect(
      governedObjectiveStrategyIntakeResponse.safeParse(response).success,
    ).toBe(true);
    expect(
      requireGovernedObjectiveStrategyIntakeReceipt(
        response,
        request,
        observed,
      ),
    ).toEqual(response);
    expect(
      governedObjectiveStrategyIntakeResponse.safeParse({
        ...response,
        operationId: id(10),
      }).success,
    ).toBe(false);
    for (const changed of [
      { ...response, selection: { ...response.selection, type: "coalition" } },
      {
        ...response,
        selection: { ...response.selection, generationRequestId: id(10) },
      },
      {
        ...response,
        commandReceipt: { ...response.commandReceipt, requestId: id(10) },
      },
      {
        ...response,
        commandReceipt: { ...response.commandReceipt, clientId: id(10) },
      },
      {
        ...response,
        commandReceipt: {
          ...response.commandReceipt,
          commandRevision: {
            ...response.commandReceipt.commandRevision,
            id: id(10),
          },
        },
      },
      {
        ...response,
        commandReceipt: {
          ...response.commandReceipt,
          sourceRevision: {
            ...response.commandReceipt.sourceRevision,
            id: id(10),
          },
        },
      },
    ])
      expect(() =>
        requireGovernedObjectiveStrategyIntakeReceipt(
          changed,
          request,
          observed,
        ),
      ).toThrow();
  });

  it("binds the saved command to the exact earlier Objective and requested source", () => {
    for (const changed of [
      { ...observed, clientId: id(10) },
      { ...observed, objective: { ...observed.objective, id: id(10) } },
      {
        ...observed,
        objective: {
          ...observed.objective,
          revision: { ...observed.objective.revision, version: 8 },
        },
      },
      {
        ...observed,
        requestedSource: {
          ...observed.requestedSource,
          canonicalBindingVersion: 4,
        },
      },
      { ...observed, control: { ...observed.control, version: 1 } },
    ])
      expect(() =>
        requireGovernedObjectiveStrategyIntakeReceipt(
          response,
          request,
          changed,
        ),
      ).toThrow();
  });
});
