import { describe, expect, it } from "vitest";
import wire from "./objective-generation-wire-fixtures.json";
import {
  objectiveGenerationRequest,
  objectiveGenerationAccepted,
  objectiveGenerationJob,
  objectiveGenerationHref,
  requireObjectiveGeneration,
  requireGeneratedStrategy,
} from "../src/shared/capiro/operations/objective-generation";
import { readObjectiveLocation } from "../src/shared/capiro/operations/objective-destination-binding";
import { capiroOperations } from "../src/shared/capiro/registry";

describe("backend-pinned Objective generation contract", () => {
  it("admits the exact backend public examples and no caller context fields", () => {
    expect(objectiveGenerationRequest.parse(wire.request.body)).toEqual(
      wire.request.body,
    );
    expect(
      objectiveGenerationAccepted.safeParse(wire.accepted.body).success,
    ).toBe(true);
    for (const value of [
      wire.pendingPoll.body,
      wire.completedPoll.body,
      wire.incompleteContextPoll.body,
    ])
      expect(objectiveGenerationJob.safeParse(value).success).toBe(true);
    expect(
      objectiveGenerationRequest.safeParse({
        ...wire.request.body,
        meriContext: "caller facts",
      }).success,
    ).toBe(false);
    expect(
      objectiveGenerationRequest.safeParse({
        ...wire.request.body,
        type: "funding",
      }).success,
    ).toBe(false);
  });
  it.each([
    ["missing receipt", ["objectiveGeneration"], undefined],
    [
      "missing re-observation",
      ["objectiveGeneration", "context", "reobservedAt"],
      null,
    ],
    ["missing result", ["objectiveGeneration", "result"], null],
    ["wrong Strategy", ["strategyId"], wire.request.body.clientId],
    ...["sourceDigest", "coverageDigest", "inputDigest"].map(
      (field) =>
        [
          `wrong ${field}`,
          ["objectiveGeneration", "result", field],
          "d".repeat(64),
        ] as const,
    ),
    [
      "wrong packet",
      ["objectiveGeneration", "result", "contextPacketId"],
      "different",
    ],
    [
      "incomplete success",
      ["objectiveGeneration", "context", "state"],
      "incomplete",
    ],
    [
      "success with failure",
      ["objectiveGeneration", "failure"],
      wire.incompleteContextPoll.body.objectiveGeneration.failure,
    ],
    ["credential extras", ["bearer"], "must never be public"],
    ["stream content", ["streamPreview"], "raw model content"],
  ] as const)("rejects %s", (_name, path, replacement) => {
    const value = structuredClone(wire.completedPoll.body);
    let target: object = value;
    for (const part of path.slice(0, -1)) {
      const child: unknown = Reflect.get(target, part);
      if (!child || typeof child !== "object")
        throw new Error("Invalid fixture path");
      target = child;
    }
    const key = path[path.length - 1]!;
    if (replacement === undefined) Reflect.deleteProperty(target, key);
    else Reflect.set(target, key, replacement);
    expect(objectiveGenerationJob.safeParse(value).success).toBe(false);
  });
  it("rejects false pending and unsafe failure projections", () => {
    const pending = structuredClone(wire.pendingPoll.body);
    pending.objectiveGeneration.context = wire.completedPoll.body
      .objectiveGeneration.context as never;
    expect(objectiveGenerationJob.safeParse(pending).success).toBe(false);
    const failed = structuredClone(wire.incompleteContextPoll.body);
    failed.objectiveGeneration.failure.message = "raw provider failure";
    expect(objectiveGenerationJob.safeParse(failed).success).toBe(false);
  });
  it("binds response request, client, Objective version and job before display", () => {
    const request = objectiveGenerationRequest.parse(wire.request.body);
    const job = objectiveGenerationJob.parse(wire.completedPoll.body);
    expect(requireObjectiveGeneration(job, request, job.jobId)).toBe(job);
    for (const change of [
      { ...request, requestId: job.jobId },
      { ...request, clientId: job.jobId },
      { ...request, objective: { ...request.objective, objectiveVersion: 8 } },
    ])
      expect(() => requireObjectiveGeneration(job, change)).toThrow();
    expect(() =>
      requireObjectiveGeneration(job, request, request.requestId),
    ).toThrow();
  });
  it("carries and revalidates exact saved version navigation with a closed URL", () => {
    const job = objectiveGenerationJob.parse(wire.completedPoll.body);
    const href = objectiveGenerationHref(
      objectiveGenerationAccepted.parse({
        jobId: job.jobId,
        status: job.status,
        objectiveGeneration: job.objectiveGeneration,
      }),
    );
    const params = new URL(href, "https://synthetic.invalid").searchParams;
    const keys = ["strategyId", "strategyVersionId", "generatedJobId"] as const;
    const selected = readObjectiveLocation(params, keys)!;
    expect(requireGeneratedStrategy(job, selected)).toEqual(job);
    expect(selected.ids.strategyVersionId).toBe(
      job.objectiveGeneration.result!.strategyVersionId,
    );
    expect(() =>
      requireGeneratedStrategy(job, {
        ...selected,
        ids: { ...selected.ids, strategyVersionId: job.jobId },
      }),
    ).toThrow();
    params.append("generatedJobId", job.jobId);
    expect(readObjectiveLocation(params, keys)).toBeUndefined();
    expect(() =>
      objectiveGenerationHref(
        objectiveGenerationAccepted.parse(wire.accepted.body),
      ),
    ).toThrow();
  });
  it("keeps the scoped job GET and removes the replaced legacy POST", () => {
    expect("strategies.objectiveDraft" in capiroOperations).toBe(false);
    expect(capiroOperations["strategies.objectiveDraftJob"].path).toBe(
      "/strategies/draft-jobs/:jobId",
    );
  });
});
