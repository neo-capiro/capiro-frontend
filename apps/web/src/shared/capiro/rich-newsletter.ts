import {
  parseNewsletterCampaign,
  parseNewsletterOutreachRecord,
  parseNewsletterOutreachStage,
  parseNewsletterPreview,
  parseNewsletterStageReceipt,
  type NewsletterReceiveIdentity,
  type NewsletterReceiveResult,
} from "@capiro/shared/newsletter";
import type { OperationRequest } from "./contracts";
import { CapiroApiError, type CapiroApi } from "./http";
import { richNewsletterOperations } from "./operations/rich-newsletter";

type Registry = typeof richNewsletterOperations;
type SaveBody = OperationRequest<
  Registry["workspace.richNewsletter.save"]
>["body"];
type CreateBody = OperationRequest<
  Registry["workspace.richNewsletter.create"]
>["body"];

function bound<T>(result: NewsletterReceiveResult<T>): T {
  if (result.ok) return result.value;
  throw new CapiroApiError(
    502,
    "The newsletter response does not match this request.",
  );
}

/**
 * Request-bound receipts on the existing authenticated, cancelling transport.
 * No redispatch, approval or cross-client authority here.
 * The feature owner must retain its write fence until deliberate readback review.
 */
export function createRichNewsletterAdapter(
  api: Pick<CapiroApi<Registry>, "request">,
) {
  return {
    list: (signal: AbortSignal) =>
      api.request("workspace.richNewsletter.list", {}, { signal }),
    create: (body: CreateBody, signal: AbortSignal) =>
      api.request("workspace.richNewsletter.create", { body }, { signal }),
    async detail(id: string, clientId: string | null, signal: AbortSignal) {
      const value = await api.request(
        "workspace.richNewsletter.detail",
        {
          params: { id },
        },
        { signal },
      );
      return bound(
        parseNewsletterCampaign(value, { documentId: id, clientId }),
      );
    },
    async save(id: string, body: SaveBody, signal: AbortSignal) {
      const submitted = structuredClone(body);
      const value = await api.request(
        "workspace.richNewsletter.save",
        {
          params: { id },
          body: submitted,
        },
        { signal },
      );
      return bound(
        parseNewsletterCampaign(value, {
          documentId: id,
          revision: submitted.revision + 1,
          clientId: submitted.config.clientId,
        }),
      );
    },
    async preview(
      id: string,
      revision: number,
      liveMergeTags: boolean,
      signal: AbortSignal,
    ) {
      const value = await api.request(
        "workspace.richNewsletter.preview",
        {
          params: { id },
          body: { liveMergeTags },
        },
        { signal },
      );
      return bound(parseNewsletterPreview(value, { documentId: id, revision }));
    },
    async stagedRevision(id: string, revision: number, signal: AbortSignal) {
      const value = await api.request(
        "workspace.richNewsletter.stagedRevision",
        { params: { id, revision } },
        { signal },
      );
      return value === null
        ? null
        : bound(
            parseNewsletterStageReceipt(value, { documentId: id, revision }),
          );
    },
    async stage(id: string, revision: number, signal: AbortSignal) {
      const value = await api.request(
        "workspace.richNewsletter.stage",
        {
          params: { id },
          body: { revision },
        },
        { signal },
      );
      return bound(
        parseNewsletterStageReceipt(value, { documentId: id, revision }),
      );
    },
    async stageDetail(
      id: string,
      expected: Pick<
        NewsletterReceiveIdentity,
        "documentId" | "revision" | "clientId"
      >,
      signal: AbortSignal,
    ) {
      const requested = { ...expected, stageId: id };
      const value = await api.request(
        "engagement.richNewsletter.stage",
        {
          params: { id },
        },
        { signal },
      );
      return bound(parseNewsletterOutreachStage(value, requested));
    },
    async record(
      id: string,
      expected: Omit<NewsletterReceiveIdentity, "recordId">,
      signal: AbortSignal,
    ) {
      const requested = { ...expected, recordId: id };
      const value = await api.request(
        "engagement.richNewsletter.record",
        {
          params: { id },
        },
        { signal },
      );
      return bound(parseNewsletterOutreachRecord(value, requested));
    },
  };
}
