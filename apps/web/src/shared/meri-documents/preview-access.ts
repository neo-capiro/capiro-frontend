import {
  receiveDocumentRequest,
  receiveDocumentPreviewRequest,
  type DocumentPreview,
  type DocumentPreviewPublication,
  type DocumentErrorResponse,
  documentAccessMetadata,
} from "@capiro/meri-client/document-access";
import type { ArtifactReply } from "./artifact-access";
import {
  documentAccessTransport,
  documentPreviewTransport,
  DocumentAccessUnavailable,
} from "./workflow-transport";

export type PreviewReply<T> = ArtifactReply<T> & {
  outcome?: DocumentErrorResponse["error"]["outcome"];
};
export interface PreviewAccess {
  readPreview(
    versionId: string,
    signal: AbortSignal,
  ): Promise<PreviewReply<DocumentPreview>>;
  publishPreview(
    versionId: string,
    signal: AbortSignal,
  ): Promise<PreviewReply<DocumentPreviewPublication>>;
  pending(): boolean;
}
/** Fresh inspection admits source bytes for each explicit action. Library metadata never substitutes for it. */
export function createPreviewAccess(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): PreviewAccess {
  const access = documentAccessTransport(credential, lifetime, fetcher);
  const previews = documentPreviewTransport(credential, lifetime, fetcher);
  let active = 0;
  const encode = (value: unknown) =>
    new TextEncoder().encode(JSON.stringify(value));
  async function perform<A extends "read" | "publish">(
    action: A,
    versionId: string,
    signal: AbortSignal,
  ): Promise<
    PreviewReply<
      A extends "read" ? DocumentPreview : DocumentPreviewPublication
    >
  > {
    active++;
    try {
      const inspected = await access.inspect(
        receiveDocumentRequest("inspect", encode({ versionId })),
        signal,
      );
      if ("error" in inspected.value)
        return {
          ok: false,
          code: inspected.value.error.code,
          outcome: "NOT_DISPATCHED",
          ...(inspected.status === 401 || inspected.status === 403
            ? { accessDenied: true as const }
            : {}),
        };
      if ("kind" in inspected.value)
        return {
          ok: false,
          code: "NATIVE_PREVIEW_UNSUPPORTED",
          outcome: "NOT_DISPATCHED",
        };
      const version = inspected.value.version;
      if (
        !documentAccessMetadata.previewFormats.some(
          (format) =>
            documentAccessMetadata.mimeTypes[format] === version.mimeType,
        )
      )
        return {
          ok: false,
          code: "ARTIFACT_PREVIEW_UNSUPPORTED",
          outcome: "NOT_DISPATCHED",
        };
      const reply =
        action === "read"
          ? await previews.read(
              receiveDocumentPreviewRequest("read", encode({ versionId })),
              version,
              signal,
            )
          : await previews.publish(
              receiveDocumentPreviewRequest("publish", encode({ versionId })),
              version,
              signal,
            );
      signal.throwIfAborted();
      lifetime.throwIfAborted();
      if ("error" in reply.value)
        return {
          ok: false,
          code: reply.value.error.code,
          outcome: reply.value.error.outcome,
          ...(reply.status === 401 || reply.status === 403
            ? { accessDenied: true as const }
            : {}),
        };
      return {
        ok: true,
        value: reply.value as A extends "read"
          ? DocumentPreview
          : DocumentPreviewPublication,
      };
    } catch (error) {
      return {
        ok: false,
        code:
          error instanceof DocumentAccessUnavailable
            ? "SESSION_REFUSED"
            : action === "publish"
              ? "PREVIEW_PUBLICATION_UNKNOWN"
              : "PREVIEW_READ_UNAVAILABLE",
        ...(error instanceof DocumentAccessUnavailable
          ? { accessDenied: true as const }
          : {}),
      };
    } finally {
      active--;
    }
  }
  return {
    pending: () => active > 0,
    readPreview: (id, signal) => perform("read", id, signal),
    publishPreview: (id, signal) => perform("publish", id, signal),
  };
}
