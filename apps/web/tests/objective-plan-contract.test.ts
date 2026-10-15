import { describe, expect, it } from "vitest";
import wire from "./objective-plan-wire-fixtures.json";
import generation from "./objective-generation-wire-fixtures.json";
import { objectiveGenerationJob } from "../src/shared/capiro/operations/objective-generation";
import {
  planRequest,
  planResponse,
  planFailure,
  requirePlan,
  requireRequestedGroups,
  planHref,
  readPlanLocation,
  requireSelectedPlan,
} from "../src/shared/capiro/operations/strategy-materialization";
import { capiroOperations } from "../src/shared/capiro/registry";

import { rememberPlanOutputs } from "../src/shared/capiro/operations/strategy-materialization-semantics";

describe("centrally allocated exact Planner materialization contract", () => {
  it("accepts every complete pinned response and safe error, including zero-work, regrouping and partial", () => {
    expect(planRequest.safeParse(wire.request).success).toBe(true);
    expect(planRequest.safeParse(wire.multipleGroupRequest).success).toBe(true);
    for (const value of Object.values(wire.responses))
      expect(planResponse.safeParse(value).success).toBe(true);
    for (const value of wire.errors)
      expect(planFailure.safeParse(value).success).toBe(true);
  });
  it("rejects forged fields, raw errors and contradictory current availability", () => {
    expect(
      planRequest.safeParse({ ...wire.request, tenantId: "forged" }).success,
    ).toBe(false);
    expect(
      planFailure.safeParse({
        ...wire.errors[0],
        message: "raw provider detail",
      }).success,
    ).toBe(false);
    const value = structuredClone(wire.responses.prepared);
    value.tasks[0]!.output.currentVersion = 0;
    expect(planResponse.safeParse(value).success).toBe(false);
    const partial = structuredClone(wire.responses.partialUnavailableOutput);
    expect(
      planResponse.safeParse({ ...partial, status: "prepared" }).success,
    ).toBe(false);
  });
  it("rejects count, membership, duplicate node, missing source and cycle contradictions", () => {
    const value = planResponse.parse(wire.responses.prepared);
    expect(
      planResponse.safeParse({
        ...value,
        counts: { ...value.counts, createdTasks: 50 },
      }).success,
    ).toBe(false);
    expect(
      planResponse.safeParse({
        ...value,
        tasks: [...value.tasks, value.tasks[0]],
      }).success,
    ).toBe(false);
    expect(
      planResponse.safeParse({
        ...value,
        tasks: value.tasks.map((t) => ({
          ...t,
          originalGroupKeys: ["forged"],
        })),
      }).success,
    ).toBe(false);
    const node = value.tasks[0]!.sourceNodeId;
    expect(
      planResponse.safeParse({
        ...value,
        edges: [
          {
            sourceNodeId: node,
            dependsOnSourceNodeId: node,
            disposition: "task_dependency",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      planResponse.safeParse({
        ...value,
        edges: [
          {
            sourceNodeId: node,
            dependsOnSourceNodeId: wire.request.requestId,
            disposition: "task_dependency",
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("binds the entire generation job/source/request/version chain and closed URL", () => {
    const value = planResponse.parse(wire.responses.prepared),
      request = planRequest.parse(wire.request);
    const job = objectiveGenerationJob.parse(generation.completedPoll.body);
    job.jobId = value.source.generationJobId;
    job.objectiveGeneration.requestId = value.source.generationRequestId;
    job.objectiveGeneration.source = {
      clientId: value.source.clientId,
      objectiveId: value.source.objectiveId,
      objectiveVersion: value.source.objectiveVersion,
      objectiveRevisionId: value.source.objectiveRevisionId,
    };
    job.strategyId = value.source.strategyId;
    job.objectiveGeneration.result!.strategyId = value.source.strategyId;
    job.objectiveGeneration.result!.strategyVersionId =
      value.source.strategyVersionId;
    expect(requirePlan(value, request, job)).toEqual(value);
    const selected = readPlanLocation(
      new URL(planHref(value), "https://synthetic.invalid").searchParams,
    )!;
    expect(requireSelectedPlan(value, job, selected)).toEqual(value);
    for (const field of [
      "generationJobId",
      "generationRequestId",
      "clientId",
      "objectiveId",
      "objectiveRevisionId",
      "strategyId",
      "strategyVersionId",
    ] as const) {
      expect(() =>
        requirePlan(
          { ...value, source: { ...value.source, [field]: request.requestId } },
          request,
          job,
        ),
      ).toThrow();
    }
    const url = new URL(planHref(value), "https://synthetic.invalid");
    url.searchParams.append("materializationRequestId", request.requestId);
    expect(readPlanLocation(url.searchParams)).toBeUndefined();
    expect(() =>
      planHref(planResponse.parse(wire.responses.partialUnavailableOutput)),
    ).toThrow();
  });
  it("uses only the allocated fixed POST and GET registry paths", () => {
    expect(capiroOperations["planner.strategyMaterialize"].path).toBe(
      "/planner/strategy-materializations",
    );
    expect(capiroOperations["planner.strategyMaterialization"].path).toBe(
      "/planner/strategy-materializations/:requestId",
    );
  });
  it("requires exact context outgoing dependency equality", () => {
    const value = planResponse.parse(
      wire.responses.preparedWithUnsupportedContextDependency,
    );
    const context = value.context[0]!,
      task = value.tasks[0]!;
    const outgoing = {
      sourceNodeId: context.sourceNodeId,
      dependsOnSourceNodeId: task.sourceNodeId,
      disposition: "context_only" as const,
    };
    // Remove the existing inverse edge to keep the example acyclic.
    const missing = {
      ...value,
      edges: [outgoing],
      context: [{ ...context, dependsOnSourceNodeIds: [] }],
    };
    expect(planResponse.safeParse(missing).success).toBe(false);
    expect(
      planResponse.safeParse({
        ...missing,
        context: [{ ...context, dependsOnSourceNodeIds: [task.sourceNodeId] }],
      }).success,
    ).toBe(true);
    expect(
      planResponse.safeParse({
        ...missing,
        edges: [],
        context: [{ ...context, dependsOnSourceNodeIds: [task.sourceNodeId] }],
      }).success,
    ).toBe(false);
  });
  it.each([
    [true, "recorded", true],
    [null, "unconfirmed", true],
    [true, "unconfirmed", false],
    [null, "recorded", false],
  ])(
    "preserves conditional error truth %s/%s",
    (recordedAttempt, outcome, accepted) => {
      expect(
        planFailure.safeParse({ ...wire.errors[3], recordedAttempt, outcome })
          .success,
      ).toBe(accepted);
    },
  );
  it("binds explicit group membership and names to the frozen request", () => {
    const request = planRequest.parse(wire.multipleGroupRequest);
    const value = planResponse.parse(
      wire.responses.preparedMultipleGroupsOneTask,
    );
    expect(() => requireRequestedGroups(value, request)).not.toThrow();
    const forged = structuredClone(value);
    forged.projects[0]!.name = "Another intent";
    expect(() => requireRequestedGroups(forged, request)).toThrow();
    expect(
      planRequest.safeParse({
        ...request,
        groups: [request.groups![0], request.groups![0]],
      }).success,
    ).toBe(false);
  });
  it.each(["constructor", "toString"])(
    "retains valid ordinary group key %s without inherited-property confusion",
    (key) => {
      const value = planResponse.parse(wire.responses.prepared);
      value.projects[0]!.groupKey = key;
      const known = rememberPlanOutputs(undefined, value);
      expect(known.projects[key]).toBe(value.projects[0]!.output.id);
      expect(() => rememberPlanOutputs(known, value)).not.toThrow();
      value.projects[0]!.output.id = wire.request.requestId;
      expect(() => rememberPlanOutputs(known, value)).toThrow();
    },
  );
});
