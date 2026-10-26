import { describe, expect, it } from "vitest";
import {
  workspaceHillDayOperations as operations,
  hillDayJobStatus,
} from "../src/shared/capiro/operations/workspace-hillday";
import { hillDayDocument } from "../src/shared/capiro/operations/workspace-schemas";
import {
  bindHillDayJob,
  hillDayStartContract,
  hillDayStartScope,
} from "../src/features/modules/workspace/hillday/hillday-generation-state";
import {
  hillDayPhases,
  readWorkspaceRoute,
  workspaceHref,
} from "../src/features/modules/workspace/workspace-route";
import {
  savedDocument,
  savedJob,
  documentId,
  jobId,
} from "../test/browser/workspace-hillday-resume-fixture";

const requestId = "53000000-0000-4000-8000-000000000011";
const otherId = "53000000-0000-4000-8000-000000000099";
const clientId = savedDocument().client.id;
const intent = { requestId, documentId, clientId };
const read = (query: string) => readWorkspaceRoute(new URLSearchParams(query));

describe("Hill Day producer contracts and native resume destination", () => {
  it.each(hillDayPhases)(
    "round trips the saved document and %s phase",
    (phase) => {
      const destination = {
        kind: "hillday" as const,
        hilldayId: documentId,
        clientId,
        phase,
      };
      expect(read(workspaceHref(destination).split("?")[1]!)).toEqual(
        destination,
      );
    },
  );
  it.each([
    "hilldayPhase=generate",
    "view=hillday&hilldayPhase=generate",
    `view=hillday&hilldayId=${documentId}&hilldayPhase=unknown`,
    `view=hillday&hilldayId=${documentId}&hilldayPhase=`,
    `view=hillday&hilldayId=${documentId}&hilldayPhase=generate&hilldayPhase=context`,
    `view=documents&draftId=${documentId}&hilldayPhase=generate`,
    `view=hillday&hilldayId=${documentId}&hilldayPhase=generate&briefSource=encoded`,
  ])("rejects ambiguous or unbound resume destination %s", (query) => {
    expect(read(query)).toEqual({ kind: "invalid" });
  });
  it("requires a retained UUID on every new generation request", () => {
    const operation = operations["workspace.hillday.generate"];
    expect(
      operation.request.safeParse({ params: { id: documentId } }).success,
    ).toBe(false);
    expect(
      operation.request.safeParse({
        params: { id: documentId },
        body: { requestId: "bad" },
      }).success,
    ).toBe(false);
    expect(
      operation.request.parse({
        params: { id: documentId },
        body: { requestId },
      }).body.requestId,
    ).toBe(requestId);
  });
  it.each(["queued", "running", "complete", "failed", "cancelled"] as const)(
    "accepts original start replay in %s state",
    (status) => {
      expect(
        operations["workspace.hillday.generate"].response.parse({
          jobId,
          status,
        }),
      ).toEqual({ jobId, status });
      expect(hillDayJobStatus.parse(savedJob(status)).status).toBe(status);
    },
  );
  it("preserves unknown-unit and cancellation evidence without defaulting missing fields", () => {
    const job = savedJob();
    job.units[1] = {
      ...job.units[1]!,
      state: "unknown",
      reason: "Unresolved provider response",
    };
    job.cancelRequestedAt = job.startedAt;
    expect(hillDayJobStatus.parse(job)).toEqual(job);
    expect(
      hillDayJobStatus.safeParse({ ...job, cancelRequestedAt: undefined })
        .success,
    ).toBe(false);
    expect(
      hillDayJobStatus.safeParse({
        ...job,
        units: [{ ...job.units[1], at: undefined }],
      }).success,
    ).toBe(false);
  });
  it("distinguishes an explicit no-job result and validates same-job control routes", () => {
    expect(
      operations["workspace.hillday.generation"].response.parse({ job: null }),
    ).toEqual({ job: null });
    expect(
      operations["workspace.hillday.generation"].response.safeParse({}).success,
    ).toBe(false);
    for (const kind of ["retry", "cancel"] as const) {
      const operation = operations[`workspace.hillday.${kind}`];
      expect(operation.method).toBe("POST");
      expect(operation.path).toBe(
        `/hillday/documents/:id/generate/:jobId/${kind}`,
      );
      expect(
        operation.request.parse({ params: { id: documentId, jobId } }),
      ).toEqual({ params: { id: documentId, jobId } });
      expect(
        operation.request.safeParse({
          params: { id: documentId, jobId },
          body: { requestId },
        }).success,
      ).toBe(false);
    }
  });
  it("keeps saved schedule, meeting order and manual edits on document read", () => {
    const value = hillDayDocument.parse(savedDocument());
    expect(value.weekStart).toBe("2026-10-26");
    expect(value.sections.map((section) => section.meetingId)).toEqual([
      "meeting-1",
      "meeting-2",
    ]);
    expect(value.sections[0]?.edited.focus).toBe(true);
    expect(value.sections[0]?.focus).toBe("Manual edited focus retained");
  });
});

describe("Hill Day local use of the shared recovery journal", () => {
  it("permits attaching one acknowledged job while refusing changed request/document/client/job identity", () => {
    expect(() =>
      hillDayStartContract.validateUpdate?.(intent, { ...intent, jobId }),
    ).not.toThrow();
    for (const changed of [
      { requestId: otherId },
      { documentId: otherId },
      { clientId: otherId },
    ])
      expect(() =>
        hillDayStartContract.validateUpdate?.(intent, {
          ...intent,
          ...changed,
        }),
      ).toThrow();
    expect(() =>
      hillDayStartContract.validateUpdate?.(
        { ...intent, jobId },
        { ...intent, jobId: otherId },
      ),
    ).toThrow();
    expect(() =>
      hillDayStartContract.validateUpdate?.({ ...intent, jobId }, intent),
    ).toThrow();
  });
  it("binds known-job reads to the exact document and job", () => {
    expect(bindHillDayJob(savedJob(), documentId, jobId).jobId).toBe(jobId);
    expect(() => bindHillDayJob(savedJob(), otherId, jobId)).toThrow(
      /does not match/,
    );
    expect(() => bindHillDayJob(savedJob(), documentId, otherId)).toThrow(
      /does not match/,
    );
  });
  it("isolates the retained request across every existing identity dimension", () => {
    const scope = {
      tenantId: "tenant",
      userId: "user",
      actorId: "actor",
      documentId,
      clientId,
    };
    const original = hillDayStartScope(scope);
    for (const key of Object.keys(scope) as (keyof typeof scope)[])
      expect(hillDayStartScope({ ...scope, [key]: "other" })).not.toBe(
        original,
      );
  });
});
