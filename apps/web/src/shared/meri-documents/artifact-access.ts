import {
  receiveDocumentDownload,
  receiveDocumentRequest,
  type AdmittedDocumentVersion,
} from "@capiro/meri-contracts/document-application";
import { withActionDeadline } from "../meri-actions/bounded-json";
import { createLinkTransport } from "./link-transport";
import {
  DocumentAccessUnavailable,
  documentTransport,
} from "./workflow-transport";
import type { DocumentInspection } from "./workflow-port";

export type ArtifactPreview = Readonly<{
  versionId: string;
  artifactId: string;
  filename: string;
  mimeType: string;
  bytes: number;
  createdAt: string;
  generationStatus: AdmittedDocumentVersion["generationStatus"];
  previewStatus: AdmittedDocumentVersion["previewStatus"];
  inspection: DocumentInspection;
}>;
export type ArtifactFile = Readonly<{
  filename: string;
  mimeType: string;
  bytes: Uint8Array<ArrayBuffer>;
}>;
/** Closed refusal codes from the service, or a local code when nothing usable was received. */
export type ArtifactReply<T> =
  | { ok: true; value: T }
  | { ok: false; code: string };
export interface ArtifactAccess {
  inspect(
    versionId: string,
    signal: AbortSignal,
  ): Promise<ArtifactReply<ArtifactPreview>>;
  download(
    versionId: string,
    signal: AbortSignal,
  ): Promise<ArtifactReply<ArtifactFile>>;
}

const failure = (code: string) => ({ ok: false as const, code });
const failed = (error: unknown, fallback: string) =>
  failure(
    error instanceof DocumentAccessUnavailable
      ? "SESSION_REFUSED"
      : error instanceof Error && error.name === "AbortError"
        ? "CANCELLED"
        : fallback,
  );
const preview = (
  version: AdmittedDocumentVersion,
  inspection: DocumentInspection,
): ArtifactPreview =>
  Object.freeze({
    versionId: version.versionId,
    artifactId: version.artifactId,
    filename: version.filename,
    mimeType: version.mimeType,
    bytes: version.object.bytes,
    createdAt: version.createdAt,
    generationStatus: version.generationStatus,
    previewStatus: version.previewStatus,
    inspection,
  });

/**
 * Read-only access to artifacts in the session's own conversation, under that session's lifetime.
 * Preview is the canonical structural inspection. Download issues a short-lived signed link,
 * redeems it in a POST body and verifies the bytes against the exact inspected version.
 */
export function createArtifactAccess(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): ArtifactAccess {
  const documents = documentTransport(credential, lifetime, fetcher);
  const links = createLinkTransport(credential, lifetime, fetcher);
  async function inspected(versionId: string, signal: AbortSignal) {
    const request = receiveDocumentRequest(
      "inspect",
      new TextEncoder().encode(JSON.stringify({ versionId })),
    );
    const { value } = await documents.request("inspect", request, signal);
    if ("error" in value) return failure(value.error.code);
    if (value.version.versionId !== versionId)
      return failure("VERSION_MISMATCH");
    return { ok: true as const, value };
  }
  const bounded = <T>(
    caller: AbortSignal,
    fallback: string,
    run: (signal: AbortSignal) => Promise<ArtifactReply<T>>,
  ) =>
    withActionDeadline([caller, lifetime], run).catch((error: unknown) =>
      failed(error, fallback),
    );
  return {
    inspect: (versionId, caller) =>
      bounded(caller, "PREVIEW_UNAVAILABLE", async (signal) => {
        const reply = await inspected(versionId, signal);
        return reply.ok
          ? {
              ok: true,
              value: preview(reply.value.version, reply.value.inspection),
            }
          : reply;
      }),
    download: (versionId, caller) =>
      bounded(caller, "DOWNLOAD_UNAVAILABLE", async (signal) => {
        const reply = await inspected(versionId, signal);
        if (!reply.ok) return reply;
        const link = await links.issue(versionId, signal);
        if (!link.ok) return link;
        const redeemed = await links.redeem(link.token, signal);
        if (!redeemed.ok) return redeemed;
        const file = await receiveDocumentDownload(
          redeemed.response,
          reply.value.version,
          { signal, maxBytes: 16 * 1024 * 1024 },
        );
        return {
          ok: true,
          value: Object.freeze({
            filename: file.version.filename,
            mimeType: file.version.mimeType,
            bytes: file.bytes,
          }),
        };
      }),
  };
}
