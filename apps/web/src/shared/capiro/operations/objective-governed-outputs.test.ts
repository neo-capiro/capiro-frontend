import { describe, expect, it } from "vitest";
import {
  governedObjectiveOutputsObservation,
  governedObjectiveOutputsReadOperation,
  receiveCurrentGovernedObjectiveOutputs,
  selectCurrentGovernedObjectiveOutputs,
} from "./objective-governed-outputs";

const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const clientId = id(1);
const objectiveId = id(2);
const read = {
  params: { clientId, objectiveId },
  query: { workAction: "objective.plan.prepare" as const },
};
const generation = {
  schemaVersion: 1,
  clientId,
  objective: {
    id: objectiveId,
    revision: { id: id(3), version: 8 },
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
  reconciliation: "accounted",
  accounting: { outcome: "applied", sourceRevision: { id: id(5), version: 6 } },
  commandReceipt: null,
  observedAt: "2026-10-17T12:00:00.000Z",
};
const output = {
  schemaVersion: 1,
  scope: "planner_project_receipts",
  clientId,
  objective: generation.objective,
  workAction: "objective.plan.prepare",
  requestedSource: generation.requestedSource,
  selectedSource: generation.requestedSource,
  observation: {
    state: "applied",
    strategy: { availability: "unavailable" },
    planner: {
      availability: "available",
      projects: [
        {
          availability: "available",
          creation: {
            receiptVersion: 2,
            recordedAt: "2026-10-17T11:00:00.000Z",
            version: 1,
          },
          application: {
            receiptVersion: 3,
            recordedAt: "2026-10-17T11:30:00.000Z",
          },
          current: {
            selection: { kind: "planner_project", id: id(6) },
            title: "Human edited project",
            ownerVersion: { kind: "counter", value: 4 },
            observedAt: "2026-10-17T12:01:00.000Z",
          },
        },
      ],
    },
  },
  taskDiscovery: "unsupported",
  observedAt: "2026-10-17T12:01:00.000Z",
};

describe("Core PR56 governed Objective Planner output receiving", () => {
  it("pins the exact GET contract with a closed source query", () => {
    expect(governedObjectiveOutputsReadOperation.service).toBe("core");
    expect(governedObjectiveOutputsReadOperation.method).toBe("GET");
    expect(governedObjectiveOutputsReadOperation.path).toBe(
      "/clients/:clientId/objectives/:objectiveId/generation/outputs",
    );
    const request = selectCurrentGovernedObjectiveOutputs(generation, read);
    expect(request.query).toEqual({
      workAction: "objective.plan.prepare",
      sourceRevisionId: id(4),
      sourceObjectiveVersion: "7",
      canonicalBindingVersion: "3",
    });
    expect(
      governedObjectiveOutputsReadOperation.request.safeParse({
        ...request,
        query: { ...request.query, projectId: id(6) },
      }).success,
    ).toBe(false);
    for (const bad of ["0", "01", "1e2", "1\n", "2147483648", 1])
      expect(
        governedObjectiveOutputsReadOperation.request.safeParse({
          ...request,
          query: { ...request.query, canonicalBindingVersion: bad },
        }).success,
      ).toBe(false);
  });

  it("selects the current ready source, not the older accounted revision", () => {
    const selected = selectCurrentGovernedObjectiveOutputs(generation, read);
    expect(selected.query.sourceRevisionId).toBe(id(4));
    expect(selected.query.sourceRevisionId).not.toBe(id(5));
    expect(() =>
      selectCurrentGovernedObjectiveOutputs(generation, {
        ...read,
        query: { ...read.query, requestId: id(7) },
      }),
    ).toThrow();
  });

  it("receives original v2 creation, retained v3 application, and current access separately", () => {
    const received = receiveCurrentGovernedObjectiveOutputs(
      output,
      generation,
      read,
    );
    expect(received.output.observation.planner.projects[0]?.creation).toEqual(
      output.observation.planner.projects[0]?.creation,
    );
    expect(
      received.output.observation.planner.projects[0]?.application,
    ).toEqual(output.observation.planner.projects[0]?.application);
    expect(received.currentProject?.selection).toEqual({
      kind: "planner_project",
      id: id(6),
    });
    expect(received.currentProject?.title).toBe("Human edited project");
  });

  it("allows a historical selected source in the wire schema but not the current receiver", () => {
    const historical = {
      ...output,
      selectedSource: {
        revision: { id: id(5), version: 6 },
        canonicalBindingVersion: 2,
      },
    };
    expect(
      governedObjectiveOutputsObservation.safeParse(historical).success,
    ).toBe(true);
    expect(() =>
      receiveCurrentGovernedObjectiveOutputs(historical, generation, read),
    ).toThrow("do not match");
  });

  it("requires client, Objective, action, current source, and current revision continuity", () => {
    for (const changed of [
      { ...output, clientId: id(8) },
      { ...output, objective: { ...output.objective, id: id(8) } },
      { ...output, workAction: "objective.strategy.draft" },
      {
        ...output,
        objective: {
          ...output.objective,
          revision: { id: id(8), version: 9 },
        },
      },
      {
        ...output,
        requestedSource: {
          ...output.requestedSource,
          canonicalBindingVersion: 4,
        },
      },
      { ...output, observedAt: "2026-10-17T11:59:59.000Z" },
    ])
      expect(() =>
        receiveCurrentGovernedObjectiveOutputs(changed, generation, read),
      ).toThrow();
  });

  it("withholds an archived or inaccessible project and rejects a leaked selector", () => {
    const masked = {
      ...output,
      observation: {
        ...output.observation,
        planner: {
          availability: "unavailable",
          projects: [
            {
              availability: "unavailable",
              creation: null,
              application: null,
              current: null,
            },
          ],
        },
      },
    };
    expect(
      receiveCurrentGovernedObjectiveOutputs(masked, generation, read)
        .currentProject,
    ).toBeNull();
    expect(
      governedObjectiveOutputsObservation.safeParse({
        ...masked,
        observation: {
          ...masked.observation,
          planner: {
            ...masked.observation.planner,
            projects: [
              {
                ...masked.observation.planner.projects[0],
                current: output.observation.planner.projects[0]?.current,
              },
            ],
          },
        },
      }).success,
    ).toBe(false);
  });

  it("offers no current selector for not-started, running, or uncertain work", () => {
    for (const state of [
      "not_started",
      "queued",
      "running",
      "outcome_unconfirmed",
    ])
      expect(
        receiveCurrentGovernedObjectiveOutputs(
          {
            ...output,
            observation: {
              ...output.observation,
              state,
              planner: {
                availability:
                  state === "outcome_unconfirmed"
                    ? "unavailable"
                    : "not_applied",
                projects: [],
              },
            },
          },
          generation,
          read,
        ).currentProject,
      ).toBeNull();
    expect(() =>
      receiveCurrentGovernedObjectiveOutputs(
        {
          ...output,
          observation: { ...output.observation, state: "running" },
        },
        generation,
        read,
      ),
    ).toThrow();
  });

  it("keeps the Strategy action explicitly unavailable", () => {
    const unavailable = {
      ...output,
      workAction: "objective.strategy.draft",
      observation: {
        state: "unavailable",
        strategy: { availability: "unavailable" },
        planner: { availability: "unavailable", projects: [] },
      },
    };
    expect(
      governedObjectiveOutputsObservation.safeParse(unavailable).success,
    ).toBe(true);
    expect(
      governedObjectiveOutputsObservation.safeParse({
        ...unavailable,
        observation: output.observation,
      }).success,
    ).toBe(false);
  });

  it("rejects reserved partial receiving and mismatched current timestamps", () => {
    expect(() =>
      receiveCurrentGovernedObjectiveOutputs(
        {
          ...output,
          observation: {
            ...output.observation,
            planner: { ...output.observation.planner, availability: "partial" },
          },
        },
        generation,
        read,
      ),
    ).toThrow("not supported");
    expect(
      governedObjectiveOutputsObservation.safeParse({
        ...output,
        observation: {
          ...output.observation,
          planner: {
            ...output.observation.planner,
            projects: [
              {
                ...output.observation.planner.projects[0],
                current: {
                  ...output.observation.planner.projects[0]?.current,
                  observedAt: "2026-10-17T12:00:00.000Z",
                },
              },
            ],
          },
        },
      }).success,
    ).toBe(false);
  });

  it("rejects private fields, wrong resource kind, invalid provenance, and task support claims", () => {
    for (const invalid of [
      { ...output, operationId: id(8) },
      { ...output, scope: "strategy_results" },
      { ...output, taskDiscovery: "available" },
      {
        ...output,
        observation: {
          ...output.observation,
          strategy: { availability: "available", strategyId: id(8) },
        },
      },
      {
        ...output,
        observation: {
          ...output.observation,
          planner: {
            ...output.observation.planner,
            projects: [
              { ...output.observation.planner.projects[0], receiptId: id(8) },
            ],
          },
        },
      },
      {
        ...output,
        observation: {
          ...output.observation,
          planner: {
            ...output.observation.planner,
            projects: [
              {
                ...output.observation.planner.projects[0],
                current: {
                  ...output.observation.planner.projects[0]?.current,
                  selection: { kind: "planner_task", id: id(6) },
                },
              },
            ],
          },
        },
      },
      {
        ...output,
        observation: {
          ...output.observation,
          planner: {
            ...output.observation.planner,
            projects: [
              {
                ...output.observation.planner.projects[0],
                creation: {
                  ...output.observation.planner.projects[0]?.creation,
                  recordedAt: "2026-10-17T11:45:00.000Z",
                },
              },
            ],
          },
        },
      },
    ])
      expect(
        governedObjectiveOutputsObservation.safeParse(invalid).success,
      ).toBe(false);
  });
});
