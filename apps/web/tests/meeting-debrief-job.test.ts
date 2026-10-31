import { describe, expect, it } from "vitest";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import {
  cancelDebriefJob,
  debriefBody,
  debriefFailureMessage,
  debriefRequestKey,
  debriefSaveBody,
  pollDebriefJob,
  readLatestDebriefJob,
  retryDebriefJob,
  startDebriefGeneration,
  type DebriefJob,
} from "../src/features/portfolio/calendar/debrief/api";

const contextSummary = {
  version: "debrief-context-v1",
  boundTokens: 8000,
  totalTokens: 1240,
  sourceTruncated: false,
  sections: [
    { name: "source", tokens: 900, state: "kept" as const },
    { name: "prep", tokens: 340, state: "kept" as const },
  ],
};
const draft = {
  recap: "Discussed the submitted source.",
  actionItems: ["Send the one-pager."],
  notes: "Retain this qualification.",
  provider: "anthropic" as const,
  model: "service-model",
  usage: { inputTokens: 1240, outputTokens: 320 },
  contextSummary,
};

function job(overrides: Partial<DebriefJob> = {}): DebriefJob {
  return {
    jobId: "job-1",
    meetingId: "meeting/one",
    requestKey: "key-1",
    status: "queued",
    stage: "queued",
    debriefId: null,
    errorCode: null,
    deadlineAt: "2026-10-31T12:15:00.000Z",
    createdAt: "2026-10-31T12:00:00.000Z",
    updatedAt: "2026-10-31T12:00:00.000Z",
    draft: null,
    ...overrides,
  };
}

function harness(
  respond: (path: string, method: string) => Response | Promise<Response>,
) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const api = createApiClient(async (path, options) => {
    const url = String(path);
    const method = options?.method ?? "GET";
    calls.push({
      path: url,
      method,
      body: options?.body ? JSON.parse(String(options.body)) : undefined,
    });
    return respond(url, method);
  });
  return { api, calls };
}

const immediate = async () => {};

describe("debrief generation as a job", () => {
  it("202 then running then completed delivers the draft with the audited context", async () => {
    let reads = 0;
    const h = harness((path, method) => {
      if (method === "POST" && path.endsWith("/debrief-draft"))
        return Response.json(job(), { status: 202 });
      reads += 1;
      return reads === 1
        ? Response.json(job({ status: "running", stage: "generating" }))
        : Response.json(
            job({ status: "completed", stage: "completed", draft }),
          );
    });

    const start = await startDebriefGeneration(h.api, "meeting/one", {
      sourceText: "Reviewed source",
      requestKey: "key-1",
    });
    expect(start.kind).toBe("job");
    if (start.kind !== "job") throw new Error("expected a job");

    const final = await pollDebriefJob(h.api, "meeting/one", start.job, {
      wait: immediate,
    });

    expect(final.status).toBe("completed");
    expect(final.draft?.contextSummary).toEqual(contextSummary);
    // The save path receives the assembled context with the body.
    const save = debriefSaveBody(final.draft!);
    expect(save.generatedFrom).toEqual(contextSummary);
    expect(save.body).toBe(debriefBody(draft));
    expect(h.calls.map((call) => call.method)).toEqual(["POST", "GET", "GET"]);
    expect(h.calls[0]!.body).toEqual({
      method: "upload",
      sourceText: "Reviewed source",
      requestKey: "key-1",
    });
    expect(h.calls[1]!.path).toContain("/debrief-jobs/job-1");
  });

  it("the synchronous 201 path issues exactly one POST and no job read", async () => {
    const h = harness((path, method) =>
      method === "POST" && path.endsWith("/debrief-draft")
        ? Response.json(draft, { status: 201 })
        : Response.json({ message: "unexpected" }, { status: 500 }),
    );

    const start = await startDebriefGeneration(h.api, "meeting/one", {
      sourceText: "Reviewed source",
      requestKey: "key-1",
    });

    expect(start.kind).toBe("draft");
    if (start.kind !== "draft") throw new Error("expected a draft");
    expect(debriefBody(start.draft)).toContain("Send the one-pager.");
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]!.method).toBe("POST");
    expect(h.calls.some((call) => call.path.includes("/debrief-jobs"))).toBe(
      false,
    );
  });

  it("a failed job maps its error code and a retry never generates on its own", async () => {
    const h = harness((path, method) => {
      if (method === "POST" && path.endsWith("/resume"))
        return Response.json(
          { message: "The generation deadline has passed." },
          { status: 400 },
        );
      return Response.json({ message: "unexpected" }, { status: 500 });
    });
    const failed = job({
      status: "failed",
      stage: "failed",
      errorCode: "DEBRIEF_DEADLINE_EXCEEDED",
    });

    expect(debriefFailureMessage(failed.errorCode)).toMatch(/ran out of time/);
    expect(debriefFailureMessage("DEBRIEF_SCOPE_CHANGED")).toMatch(
      /meeting or its client changed/,
    );
    expect(debriefFailureMessage("DEBRIEF_BUDGET_EXHAUSTED")).toMatch(
      /remaining attempts/,
    );
    expect(debriefFailureMessage("DEBRIEF_GENERATION_FAILED")).toMatch(
      /could not generate/,
    );

    const outcome = await retryDebriefJob(h.api, "meeting/one", failed);

    // 400 means the server will not resume: the caller must start a new run.
    expect(outcome).toEqual({ kind: "new-run" });
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]!.method).toBe("POST");
    expect(h.calls[0]!.path).toContain("/debrief-jobs/job-1/resume");
    expect(h.calls.some((call) => call.path.endsWith("/debrief-draft"))).toBe(
      false,
    );
  });

  it("resumes an allowed job instead of starting another generation", async () => {
    const h = harness(() =>
      Response.json(job({ status: "queued", stage: "queued" }), {
        status: 202,
      }),
    );
    const outcome = await retryDebriefJob(
      h.api,
      "meeting/one",
      job({ status: "failed", errorCode: "DEBRIEF_GENERATION_FAILED" }),
    );
    expect(outcome.kind).toBe("resumed");
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]!.path).toContain("/resume");
  });

  it("cancels once and then stops reading the job", async () => {
    const h = harness((path, method) =>
      method === "DELETE"
        ? Response.json(job({ status: "cancelled", stage: "cancelled" }))
        : Response.json({ message: "unexpected" }, { status: 500 }),
    );

    const cancelled = await cancelDebriefJob(h.api, "meeting/one", "job-1");
    expect(cancelled?.status).toBe("cancelled");
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]!.method).toBe("DELETE");
    expect(h.calls[0]!.path).toContain("/debrief-jobs/job-1");

    const final = await pollDebriefJob(h.api, "meeting/one", cancelled!, {
      wait: immediate,
    });
    expect(final.status).toBe("cancelled");
    // no further reads after a terminal cancel
    expect(h.calls).toHaveLength(1);
  });

  it("mount with a running latest job resumes polling without a new POST", async () => {
    const h = harness((path) => {
      if (path.endsWith("/debrief-jobs/latest"))
        return Response.json(job({ status: "running", stage: "assembling" }));
      return Response.json(
        job({
          status: "completed",
          stage: "completed",
          debriefId: "debrief-1",
          draft,
        }),
      );
    });

    const latest = await readLatestDebriefJob(h.api, "meeting/one");
    expect(latest?.status).toBe("running");

    const final = await pollDebriefJob(h.api, "meeting/one", latest!, {
      wait: immediate,
    });
    expect(final.status).toBe("completed");
    expect(final.draft?.recap).toBe(draft.recap);
    expect(h.calls.every((call) => call.method === "GET")).toBe(true);
    expect(h.calls.map((call) => call.path)).toEqual([
      "/api/backend/core/engagement/meetings/meeting%2Fone/debrief-jobs/latest",
      "/api/backend/core/engagement/meetings/meeting%2Fone/debrief-jobs/job-1",
    ]);
  });

  it("surfaces a reused request key as a conflict without a second generation", async () => {
    const h = harness(() =>
      Response.json(
        { message: "That request key was used for a different source." },
        { status: 409 },
      ),
    );

    await expect(
      startDebriefGeneration(h.api, "meeting/one", {
        sourceText: "A different source",
        requestKey: "key-1",
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(h.calls).toHaveLength(1);
    expect(
      h.calls.filter((call) => call.path.endsWith("/debrief-draft")),
    ).toHaveLength(1);
  });

  it("rejects an empty source before any request and mints server-shaped keys", async () => {
    const h = harness(() => Response.json({ message: "unexpected" }));
    await expect(
      startDebriefGeneration(h.api, "meeting/one", {
        sourceText: "   ",
        requestKey: "key-1",
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(h.calls).toHaveLength(0);
    expect(debriefRequestKey()).toMatch(/^[\w-]{8,128}$/);
  });
});
