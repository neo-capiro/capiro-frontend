import {
  parseNewsletterCampaign,
  parseNewsletterOutreachRecord,
  parseNewsletterOutreachStage,
  parseNewsletterPreview,
  parseNewsletterStageReceipt,
  parseNewsletterWriteReceipt,
  parseNewsletterSaveRefusal,
  type NewsletterCreateRequest,
  type NewsletterSaveRequest,
  type NewsletterWriteBinding,
  type NewsletterSaveRefusal,
  type NewsletterReceiveIdentity,
  type NewsletterReceiveResult,
  type NewsletterOutreachStage,
} from "@capiro/shared/newsletter";
import { CapiroApiError, type CapiroApi } from "./http";
import { richNewsletterOperations } from "./operations/rich-newsletter";

type Registry = typeof richNewsletterOperations;
export class RichNewsletterSaveRefused extends Error {
  constructor(readonly refusal: NewsletterSaveRefusal) {
    super(
      "This save made no change. Read current saved content before resolving your retained edits.",
    );
  }
}

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
    async create(body: NewsletterCreateRequest, signal: AbortSignal) {
      const submitted = structuredClone(body);
      const value = await api.request(
        "workspace.richNewsletter.create",
        { body: submitted },
        { signal },
      );
      return bound(
        parseNewsletterWriteReceipt(value, {
          requestId: submitted.requestId,
          operation: "create",
        }),
      );
    },
    async detail(
      id: string,
      clientId: string | null | undefined,
      signal: AbortSignal,
    ) {
      const value = await api.request(
        "workspace.richNewsletter.detail",
        {
          params: { id },
        },
        { signal },
      );
      return bound(
        parseNewsletterCampaign(value, {
          documentId: id,
          ...(clientId === undefined ? {} : { clientId }),
        }),
      );
    },
    async save(id: string, body: NewsletterSaveRequest, signal: AbortSignal) {
      const submitted = structuredClone(body);
      const expected = {
        requestId: submitted.requestId,
        operation: "save" as const,
        documentId: id,
        previousRevision: submitted.revision,
      };
      try {
        const value = await api.request(
          "workspace.richNewsletter.save",
          {
            params: { id },
            body: submitted,
          },
          { signal },
        );
        return bound(parseNewsletterWriteReceipt(value, expected));
      } catch (error) {
        if (error instanceof CapiroApiError && error.status === 409) {
          const refusal = parseNewsletterSaveRefusal(
            error.newsletterSaveRefusal,
            expected,
          );
          if (refusal.ok) throw new RichNewsletterSaveRefused(refusal.value);
        }
        throw error;
      }
    },
    async writeRequest(expected: NewsletterWriteBinding, signal: AbortSignal) {
      const captured = { ...expected };
      const value = await api.request(
        "workspace.richNewsletter.writeRequest",
        { params: { requestId: captured.requestId } },
        { signal },
      );
      return value === null
        ? null
        : bound(parseNewsletterWriteReceipt(value, captured));
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
    /** Explicit intent only: Core conditionally reuses a draft, not a replay receipt. */
    async open(stage: NewsletterOutreachStage, signal: AbortSignal) {
      const expected = {
        stageId: stage.id,
        documentId: stage.documentId,
        revision: stage.revision,
        clientId: stage.config.clientId,
      };
      const value = await api.request(
        "engagement.richNewsletter.open",
        { params: { id: expected.stageId } },
        { signal },
      );
      return bound(parseNewsletterOutreachRecord(value, expected));
    },
  };
}
