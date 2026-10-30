import { z } from "zod";
import type { OperationRequest } from "./contracts";
import { CapiroApiError, type CapiroApi } from "./http";
import type { capiroOperations } from "./registry";
import type { ImportJob, ImportJobCounts } from "./onboard-contracts";

type Registry = typeof capiroOperations;
type Body<Key extends keyof Registry> =
  OperationRequest<Registry[Key]> extends { body: infer T } ? T : never;
const nativeClientId = z.uuid();

/**
 * One receiving invariant for every job-shaped payload: counts are derived from
 * item outcomes, so created + already-present + rejected must equal processed,
 * and only zero outstanding may be terminal.
 */
export function assertImportJobCounts(
  counts: ImportJobCounts,
  terminal: boolean,
) {
  const processed = counts.created + counts.alreadyPresent + counts.rejected;
  if (
    counts.successful !== counts.created + counts.alreadyPresent ||
    counts.processed !== processed ||
    counts.outstanding !== counts.total - counts.processed ||
    counts.outstanding < 0 ||
    terminal !== (counts.outstanding === 0)
  )
    throw new CapiroApiError(
      502,
      "The import job response does not reconcile its item outcomes.",
    );
}

function assertImportJob(job: ImportJob) {
  if (job.counts.total !== job.requestedIds.length)
    throw new CapiroApiError(
      502,
      "The import job response does not match its requested selection.",
    );
  assertImportJobCounts(job.counts, job.terminal);
  if (job.items.length > 0 && job.items.length !== job.counts.total)
    throw new CapiroApiError(
      502,
      "The import job detail does not account for its requested items.",
    );
}

/** Onboard-specific receipt bindings; existing me/client/invitation owners survive. */
export function createOnboardCoreApi(api: CapiroApi<Registry>) {
  return {
    me: () => api.request("me.read", {}),
    searchLdaRegistrants: (q: string) =>
      api.request("onboard.core.registrants", { query: { q } }),
    getRegistrant: () => api.request("onboard.core.registrant", {}),
    async setRegistrant(registrantId: number) {
      const result = await api.request("onboard.core.setRegistrant", {
        body: { registrantId },
      });
      if (result.ldaRegistrantId !== registrantId)
        throw new CapiroApiError(
          502,
          "The firm response does not match the selected registrant.",
        );
      return result;
    },
    getImportCandidates: () => api.request("onboard.core.importCandidates", {}),
    async createClient(body: Body<"settings.profiles.create">) {
      const submitted = { ...body };
      const result = await api.request("settings.profiles.create", {
        body: submitted,
      });
      // Native Core creates a UUID and stores the submitted name unchanged.
      // This receipt binds observation, never backend tenant authorization.
      if (
        !nativeClientId.safeParse(result.id).success ||
        result.name !== submitted.name
      )
        throw new CapiroApiError(
          502,
          "The creation response does not match the submitted client.",
        );
      return result;
    },
    /**
     * One dispatch of at most 100 selected LDA ids with a caller-retained
     * stable request identity. The receipt must account for the exact selection
     * and for the durable job created/reconciled for that identity.
     */
    async importClientChunk(ldaClientIds: number[], requestId: string) {
      const submitted = [...ldaClientIds];
      // Core persists the exact NORMALIZED selection (positive integers, deduped).
      const expected = new Set(
        submitted.filter((id) => Number.isInteger(id) && id > 0),
      );
      const result = await api.request("onboard.core.import", {
        body: { ldaClientIds: submitted, requestId },
      });
      const outcomes = [...result.items, ...result.skipped].map(
        (item) => item.ldaClientId,
      );
      if (
        result.created !== result.items.length ||
        outcomes.length !== expected.size ||
        new Set(outcomes).size !== outcomes.length ||
        outcomes.some((id) => !expected.has(id)) ||
        result.job.requestId !== requestId ||
        result.job.counts.total !== expected.size ||
        result.job.counts.processed !== outcomes.length
      )
        throw new CapiroApiError(
          502,
          "The import response does not account for the submitted client selection.",
        );
      return result;
    },
    async getImportJobs(input: {
      limit?: number;
      cursor?: string;
      requestId?: string;
    }) {
      const page = await api.request("onboard.core.importJobs", {
        query: input,
      });
      for (const job of page.jobs) assertImportJob(job);
      if (
        page.jobs.length > (input.limit ?? 20) ||
        Number(page.population.total) < page.jobs.length
      )
        throw new CapiroApiError(
          502,
          "The import job page does not reconcile its population.",
        );
      return page;
    },
    async getImportJob(jobId: string) {
      const job = await api.request("onboard.core.importJob", {
        params: { jobId },
      });
      assertImportJob(job);
      return job;
    },
    async getImportJobStatus(jobId: string) {
      const status = await api.request("onboard.core.importJobStatus", {
        params: { jobId },
      });
      assertImportJobCounts(status.counts, status.terminal);
      return status;
    },
    async inviteTeamMember(
      body: Omit<Body<"settings.team.invite">, "redirectUrl">,
    ) {
      const submitted = {
        email: body.email,
        role: body.role,
        firstName: body.firstName,
        lastName: body.lastName,
      };
      const receipt = await api.request("settings.team.invite", {
        body: submitted,
      });
      if (
        receipt.invitation.email.toLowerCase() !==
          submitted.email.toLowerCase() ||
        receipt.invitation.role !== submitted.role
      )
        throw new CapiroApiError(
          502,
          "The invitation response does not match the intended recipient and role.",
        );
      return receipt;
    },
  };
}
