import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import wire from "./objective-operational-contract-fixtures.json";
import {
  objectiveOperationalContractSHA256,
  objectiveOperationalOperations,
  operationalReadSchema,
  operationalReadRequest,
  operationalReadInput,
  operationalAssociationCommandSchema,
  operationalAssociationReceiptSchema,
  operationalFailureSchema,
  requireOperationalRead,
  implementedOperationalActions,
  type OperationalRead,
  type OperationalReadRequest,
} from "../src/shared/capiro/operations/objective-operational";
import { nextOperationalPageContext } from "../src/shared/capiro/operations/objective-operational-semantics";

const sample = (name: string) =>
  structuredClone(wire.examples.find((entry) => entry.name === name)!.value);
const observed = () =>
  operationalReadSchema.parse(
    sample("explicit-manual-and-current-owned-resources"),
  );
const current = (value: OperationalRead) => ({
  id: value.scope.objectiveId,
  clientId: value.scope.clientId,
  version: value.scope.objectiveVersion,
  status: value.scope.objectiveStatus,
});
const requestFor = (value: OperationalRead) =>
  operationalReadRequest(value.scope.clientId, value.scope.objectiveId);
const changed = (mutate: (value: OperationalRead) => void) => {
  const value = observed();
  mutate(value);
  return value;
};

describe("exact Objective operational contract receiving", () => {
  it("retains the byte-identical reviewed 6ce schema custody", () => {
    const bytes = readFileSync(
      new URL(
        "../src/shared/capiro/operations/objective-operational.contract.json",
        import.meta.url,
      ),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      objectiveOperationalContractSHA256,
    );
  });
  it("accepts pinned strict wire examples without inventing source facts", () => {
    for (const entry of wire.examples) {
      if (entry.type === "ReadResponse") {
        const value = operationalReadSchema.parse(entry.value);
        expect(
          requireOperationalRead(value, requestFor(value), current(value)),
        ).toEqual(value);
      } else if (entry.type === "AssociationCommand")
        expect(
          operationalAssociationCommandSchema.safeParse(entry.value).success,
        ).toBe(true);
      else if (entry.type === "AssociationReceipt")
        expect(
          operationalAssociationReceiptSchema.safeParse(entry.value).success,
        ).toBe(true);
      else if (entry.type === "Error")
        expect(operationalFailureSchema.safeParse(entry.value).success).toBe(
          true,
        );
    }
  });
  it("uses fixed paths and confirmed flat GET selectors, omitting null cursors", () => {
    const value = observed(),
      request = requestFor(value);
    const input = operationalReadInput(request);
    const read = objectiveOperationalOperations["objectives.operational.read"];
    expect(read.path).toBe("/clients/:clientId/objectives/operational");
    expect(read.method).toBe("GET");
    expect(input.query).toMatchObject({
      schemaVersion: 1,
      objectiveId: value.scope.objectiveId,
      limit: 25,
    });
    expect(input.query.strategiesCursor).toBeUndefined();
    expect(read.request.safeParse(input).success).toBe(true);
    expect(read.request.safeParse({ ...input, body: {} }).success).toBe(false);
    expect(
      read.request.safeParse({
        ...input,
        query: { ...input.query, cursors: {} },
      }).success,
    ).toBe(false);
    const next = operationalReadInput({
      ...request,
      cursors: { ...request.cursors, projects: "opaque:synthetic" },
    });
    expect(next.query.projectsCursor).toBe("opaque:synthetic");
    expect(
      objectiveOperationalOperations["objectives.operational.receipt"].path,
    ).toBe("/clients/:clientId/objectives/operational-associations/:requestId");
  });
  it("rejects foreign client/Objective, stale version and changed status before exposing data", () => {
    const value = observed(),
      request = requestFor(value),
      objective = current(value);
    for (const scope of [
      { ...objective, id: value.scope.currentRevisionId },
      { ...objective, clientId: value.scope.currentRevisionId },
      { ...objective, version: objective.version + 1 },
      { ...objective, status: "draft" as const },
    ])
      expect(() => requireOperationalRead(value, request, scope)).toThrow();
    expect(() =>
      requireOperationalRead(
        value,
        { ...request, objectiveId: value.scope.currentRevisionId },
        objective,
      ),
    ).toThrow();
    expect(
      operationalReadSchema.safeParse({ ...value, hiddenTitles: ["Synthetic"] })
        .success,
    ).toBe(false);
  });
  it("keeps unknown counts null and refuses inferred full-page/composite/question success", () => {
    const value = observed();
    const partial = operationalReadSchema.parse(
      sample("hidden-strategy-visible-project-partial"),
    );
    expect(partial.plannerMetrics.taskCount).toBeNull();
    expect(
      operationalReadSchema.safeParse({
        ...value,
        automation: { availability: "available", projection: {} },
      }).success,
    ).toBe(false);
    expect(
      operationalReadSchema.safeParse(
        changed((v) => {
          v.sections.projects.coverage = "partial";
          v.sections.projects.reasons = ["source_unverifiable"];
        }),
      ).success,
    ).toBe(false);
    expect(
      operationalReadSchema.safeParse(
        changed((v) => {
          v.sections.questions.coverage = "complete";
          v.sections.questions.total = 0;
        }),
      ).success,
    ).toBe(false);
    expect(
      operationalReadSchema.safeParse(
        changed((v) => {
          v.plannerMetrics.doneCount = 10;
        }),
      ).success,
    ).toBe(false);
    expect(
      operationalReadSchema.safeParse(
        changed((v) => {
          v.plannerMetrics.asOf = "2027-01-01T00:00:00.000Z";
        }),
      ).success,
    ).toBe(false);
  });
  it("rejects association identity aliasing while retaining project-derived task provenance", () => {
    expect(
      operationalReadSchema.safeParse(
        changed((v) => {
          const project = v.sections.projects.items[0]!.provenance[0]!;
          if (project.kind === "manual")
            project.associationId =
              v.sections.strategies.items[0]!.provenance[0]!.kind === "manual"
                ? (
                    v.sections.strategies.items[0]!.provenance[0] as {
                      associationId: string;
                    }
                  ).associationId
                : "";
        }),
      ).success,
    ).toBe(false);
    const inherited = changed((v) => {
      v.sections.decisions.items[0]!.provenance = structuredClone(
        v.sections.projects.items[0]!.provenance,
      );
    });
    expect(operationalReadSchema.safeParse(inherited).success).toBe(true);
  });
  it("retains multiple receipt witnesses but rejects immutable version digest disagreement", () => {
    const value = operationalReadSchema.parse(
      sample("verified-two-receipts-one-immutable-version-current-content"),
    );
    expect(value.sections.strategies.items[0]!.savedVersions).toHaveLength(2);
    value.sections.strategies.items[0]!.savedVersions[1]!.digest = "c".repeat(
      64,
    );
    expect(operationalReadSchema.safeParse(value).success).toBe(false);
  });
  it("requires initial completeness and real continuation progress without rejecting a valid final page", () => {
    const first = observed(),
      request = requestFor(first),
      objective = current(first);
    first.sections.projects.total = 2;
    expect(() => requireOperationalRead(first, request, objective)).toThrow();
    first.sections.projects.nextCursor = "opaque-next";
    expect(requireOperationalRead(first, request, objective)).toEqual(first);
    const prior = nextOperationalPageContext(first, "projects", {});
    const last = structuredClone(first),
      row = last.sections.projects.items[0]!;
    row.resource.selection.id = first.scope.currentRevisionId;
    if (row.provenance[0]!.kind === "manual") {
      row.provenance[0]!.via.id = row.resource.selection.id;
      row.provenance[0]!.associationId = row.resource.selection.id;
    }
    last.sections.projects.nextCursor = null;
    last.actions = last.actions.filter(
      (action) => action.kind !== "open_resource",
    );
    const next: OperationalReadRequest = {
      ...request,
      cursors: { ...request.cursors, projects: "opaque-next" },
    };
    expect(requireOperationalRead(last, next, objective, prior)).toEqual(last);
    expect(() =>
      requireOperationalRead(first, next, objective, prior),
    ).toThrow();
    expect(() =>
      requireOperationalRead(last, next, objective, {
        projects: {
          ...prior.projects!,
          snapshotId: first.scope.currentRevisionId,
        },
      }),
    ).toThrow();
    expect(() =>
      requireOperationalRead(last, { ...next, limit: 0 }, objective, prior),
    ).toThrow();
  });
  it("refuses unrelated/stale actions and never exposes unimplemented generated or Outreach actions", () => {
    const value = operationalReadSchema.parse(
      sample("verified-two-receipts-one-immutable-version-current-content"),
    );
    expect(
      implementedOperationalActions(value).every((action) =>
        ["edit_objective", "open_resource", "review_planner_approval"].includes(
          action.kind,
        ),
      ),
    ).toBe(true);
    const generated = value.actions.find(
      (action) => action.kind === "open_generated_strategy",
    );
    expect(generated).toBeDefined();
    if (generated?.kind === "open_generated_strategy")
      generated.generatedJobId =
        value.sections.strategies.items[0]!.savedVersions[0]!.receiptId;
    expect(operationalReadSchema.safeParse(value).success).toBe(false);
    expect(
      operationalReadSchema.safeParse(
        changed((v) => {
          const action = v.actions.find(
            (a) => a.kind === "review_planner_approval",
          );
          if (action?.kind === "review_planner_approval")
            action.taskVersion += 1;
        }),
      ).success,
    ).toBe(false);
  });
  it("preserves strict command restrictions and safe unknown receipt outcomes", () => {
    const command = wire.examples.find(
      (entry) => entry.type === "AssociationCommand",
    )!.value;
    const receipt = operationalAssociationReceiptSchema.parse(
      wire.examples.find((entry) => entry.type === "AssociationReceipt")!.value,
    );
    expect(
      operationalAssociationCommandSchema.safeParse({
        ...command,
        tenantId: "forged",
      }).success,
    ).toBe(false);
    expect(
      operationalAssociationReceiptSchema.safeParse({
        ...receipt,
        action: "unlink",
        outcome: "linked",
      }).success,
    ).toBe(false);
    expect(
      operationalFailureSchema.safeParse({
        schemaVersion: 1,
        status: 404,
        code: "RECEIPT_NOT_AVAILABLE",
        outcome: "unknown",
        requestId: receipt.requestId,
      }).success,
    ).toBe(true);
    expect(
      operationalFailureSchema.safeParse({
        schemaVersion: 1,
        status: 404,
        code: "RECEIPT_NOT_AVAILABLE",
        outcome: "rejected",
        requestId: receipt.requestId,
      }).success,
    ).toBe(false);
  });
});
