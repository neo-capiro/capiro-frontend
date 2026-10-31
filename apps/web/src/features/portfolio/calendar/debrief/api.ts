import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";

const meetingPath = (id: string) =>
  `engagement/meetings/${encodeURIComponent(id)}`;

// D2: the server returns what the model actually saw with the draft. Older servers
// do not send it, so it is optional here — the draft itself stays required.
export const debriefContextSummarySchema = z.object({
  version: z.string(),
  boundTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  sourceTruncated: z.boolean(),
  sections: z.array(
    z.object({
      name: z.string(),
      tokens: z.number().int().nonnegative(),
      state: z.enum(["kept", "shortened", "dropped"]),
    }),
  ),
});
export type DebriefContextSummary = z.infer<typeof debriefContextSummarySchema>;

// The generation endpoint returns a proposal, not a persisted debrief.
export const debriefDraftSchema = z.object({
  recap: z.string(),
  actionItems: z.array(z.string()),
  notes: z.string(),
  provider: z.enum(["openai", "anthropic"]),
  model: z.string().min(1),
  usage: z
    .object({
      inputTokens: z.number().int().nonnegative().optional(),
      outputTokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
  usedTenantKey: z.boolean().optional(),
  contextSummary: debriefContextSummarySchema.optional(),
});
export type DebriefDraft = z.infer<typeof debriefDraftSchema>;

// D1: the same request can now be accepted as a job (202) and read back by id.
export const debriefJobSchema = z.object({
  jobId: z.string(),
  meetingId: z.string(),
  requestKey: z.string().nullish(),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  stage: z.string(),
  debriefId: z.string().nullish(),
  errorCode: z.string().nullish(),
  deadlineAt: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  draft: debriefDraftSchema.nullish(),
});
export type DebriefJob = z.infer<typeof debriefJobSchema>;

export const debriefRequestKey = () => crypto.randomUUID();

const nonemptyDraft = (draft: DebriefDraft) =>
  Boolean(
    draft.recap.trim() ||
    draft.notes.trim() ||
    draft.actionItems.some((item) => item.trim()),
  );
const checkedDraftSchema = debriefDraftSchema.refine(
  nonemptyDraft,
  "The service returned an empty draft",
);
const generationResponseSchema = z.union([
  debriefJobSchema,
  checkedDraftSchema,
]);

function checkJob(job: DebriefJob | null, meetingId: string, jobId?: string) {
  if (job && (job.meetingId !== meetingId || (jobId && job.jobId !== jobId)))
    throw new ApiError(
      502,
      "Debrief status belongs to a different meeting. Refresh this meeting.",
    );
  return job;
}

/** The synchronous path (server gate off) — unchanged for existing callers. */
export function generateDebrief(
  api: ApiClient,
  meetingId: string,
  sourceText: string,
  signal?: AbortSignal,
  method: "upload" | "manual" | "voice" = "upload",
) {
  if (!sourceText.trim())
    throw new ApiError(422, "Review a nonempty source before generating.");
  return api.request(
    "core",
    `${meetingPath(meetingId)}/debrief-draft`,
    checkedDraftSchema,
    { method: "POST", body: { method, sourceText }, signal },
  );
}

/**
 * One generation attempt. The portfolio client returns parsed JSON, so the
 * accepted shape decides the outcome: a job carries `jobId`/`status`/`stage`, a
 * draft does not.
 */
export async function startDebriefGeneration(
  api: ApiClient,
  meetingId: string,
  input: {
    sourceText: string;
    method?: "upload" | "manual" | "voice";
    requestKey?: string;
  },
  signal?: AbortSignal,
): Promise<
  { kind: "draft"; draft: DebriefDraft } | { kind: "job"; job: DebriefJob }
> {
  if (!input.sourceText.trim())
    throw new ApiError(422, "Review a nonempty source before generating.");
  const result = await api.request(
    "core",
    `${meetingPath(meetingId)}/debrief-draft`,
    generationResponseSchema,
    {
      method: "POST",
      body: {
        method: input.method ?? "upload",
        sourceText: input.sourceText,
        ...(input.requestKey ? { requestKey: input.requestKey } : {}),
      },
      signal,
    },
  );
  return "jobId" in result
    ? { kind: "job", job: checkJob(result, meetingId)! }
    : { kind: "draft", draft: result };
}

export async function readLatestDebriefJob(
  api: ApiClient,
  meetingId: string,
  signal?: AbortSignal,
) {
  return checkJob(
    await api.request(
      "core",
      `${meetingPath(meetingId)}/debrief-jobs/latest`,
      debriefJobSchema.nullable(),
      { signal },
    ),
    meetingId,
  );
}

export async function readDebriefJob(
  api: ApiClient,
  meetingId: string,
  jobId: string,
  signal?: AbortSignal,
) {
  return checkJob(
    await api.request(
      "core",
      `${meetingPath(meetingId)}/debrief-jobs/${encodeURIComponent(jobId)}`,
      debriefJobSchema,
      { signal },
    ),
    meetingId,
    jobId,
  )!;
}

export async function cancelDebriefJob(
  api: ApiClient,
  meetingId: string,
  jobId: string,
) {
  return checkJob(
    await api.request(
      "core",
      `${meetingPath(meetingId)}/debrief-jobs/${encodeURIComponent(jobId)}`,
      debriefJobSchema.nullable(),
      { method: "DELETE" },
    ),
    meetingId,
    jobId,
  );
}

export async function resumeDebriefJob(
  api: ApiClient,
  meetingId: string,
  jobId: string,
) {
  return checkJob(
    await api.request(
      "core",
      `${meetingPath(meetingId)}/debrief-jobs/${encodeURIComponent(jobId)}/resume`,
      debriefJobSchema,
      { method: "POST" },
    ),
    meetingId,
    jobId,
  )!;
}

export const debriefJobActive = (job: DebriefJob | null | undefined) =>
  job?.status === "queued" || job?.status === "running";

/** A retry may only resume; the server decides whether that attempt is allowed. */
export async function retryDebriefJob(
  api: ApiClient,
  meetingId: string,
  job: DebriefJob,
): Promise<{ kind: "resumed"; job: DebriefJob } | { kind: "new-run" }> {
  try {
    return {
      kind: "resumed",
      job: await resumeDebriefJob(api, meetingId, job.jobId),
    };
  } catch (error) {
    // 400 means the server will not resume this job (deadline or attempt budget):
    // the only remaining option is an explicit new run.
    if (error instanceof ApiError && error.status === 400)
      return { kind: "new-run" };
    throw error;
  }
}

export function debriefFailureMessage(code: string | null | undefined) {
  switch (code) {
    case "DEBRIEF_DEADLINE_EXCEEDED":
      return "Generation ran out of time. Your source is retained — start a new run.";
    case "DEBRIEF_BUDGET_EXHAUSTED":
      return "This job used its remaining attempts. Start a new run from the same source.";
    case "DEBRIEF_SCOPE_CHANGED":
      return "The meeting or its client changed while this ran. Reload the meeting before generating again.";
    case "DEBRIEF_GENERATION_FAILED":
      return "The service could not generate a draft. Your source is retained.";
    default:
      return "The generation did not complete. Your source is retained.";
  }
}

/**
 * Polls the accepted job until it is terminal. Returns the last job seen; a
 * cancelled/failed job is a normal outcome, not an exception.
 */
export async function pollDebriefJob(
  api: ApiClient,
  meetingId: string,
  job: DebriefJob,
  options: {
    signal?: AbortSignal;
    wait?: (ms: number) => Promise<void>;
    onStage?: (job: DebriefJob) => void;
  } = {},
) {
  const wait =
    options.wait ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let current = job;
  let delay = 3000;
  while (debriefJobActive(current)) {
    await wait(delay);
    if (options.signal?.aborted) return current;
    current = await readDebriefJob(api, meetingId, job.jobId, options.signal);
    options.onStage?.(current);
    delay = Math.min(Math.round(delay * 1.5), 10000);
  }
  return current;
}

/** The body the existing save call takes, plus the audited context. */
export type DebriefSaveBody = { body: string; generatedFrom?: unknown };
export function debriefSaveBody(draft: DebriefDraft): DebriefSaveBody {
  return {
    body: debriefBody(draft),
    ...(draft.contextSummary ? { generatedFrom: draft.contextSummary } : {}),
  };
}

export function debriefBody(draft: z.infer<typeof debriefDraftSchema>) {
  return [
    draft.recap.trim(),
    draft.actionItems.some((item) => item.trim())
      ? `Action items\n${draft.actionItems
          .filter((item) => item.trim())
          .map((item) => `• ${item.trim()}`)
          .join("\n")}`
      : "",
    draft.notes.trim() ? `Notes\n${draft.notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
