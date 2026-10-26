import {
  receiveDocumentDownload,
  receiveDocumentRequest,
  type AdmittedDocumentVersion,
  type DocumentInspectionResponse,
} from "@capiro/meri-client/document-access";
import { withActionDeadline } from "../meri-actions/bounded-json";
import { createLinkTransport } from "./link-transport";
import {
  DocumentAccessUnavailable,
  documentAccessTransport,
} from "./workflow-transport";
type GeneratedInspection = Exclude<
  DocumentInspectionResponse,
  { kind: "native-file" }
>;
type ArtifactInspection = GeneratedInspection["inspection"];
type GeneratedVersion = Extract<AdmittedDocumentVersion, { filename: string }>;

export type ArtifactPreview = Readonly<{
  versionId: string;
  filename: string;
  mimeType: string;
  bytes: number;
  createdAt: string;
}> &
  (
    | Readonly<{
        kind: "generated";
        artifactId: string;
        generationStatus: GeneratedVersion["generationStatus"];
        previewStatus: GeneratedVersion["previewStatus"];
        inspection: ArtifactInspection;
      }>
    | Readonly<{
        kind: "native-file";
        path: string;
        currentBytesVerified: true;
      }>
  );
export type ArtifactFile = Readonly<{
  filename: string;
  mimeType: string;
  bytes: Uint8Array<ArrayBuffer>;
}>;
/** Closed refusal codes from the service, or a local code when nothing usable was received. */
export type ArtifactReply<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; accessDenied?: true };
export interface ArtifactAccess {
  /** Keeps early session renewal from cutting an active bounded file read. */
  pending(): boolean;
  inspect(
    versionId: string,
    signal: AbortSignal,
  ): Promise<ArtifactReply<ArtifactPreview>>;
  download(
    versionId: string,
    signal: AbortSignal,
  ): Promise<ArtifactReply<ArtifactFile>>;
}

const failure = (code: string, accessDenied = false) => ({
  ok: false as const,
  code,
  ...(accessDenied ? { accessDenied: true as const } : {}),
});
const failed = (error: unknown, fallback: string) =>
  failure(
    error instanceof DocumentAccessUnavailable
      ? "SESSION_REFUSED"
      : error instanceof Error && error.name === "AbortError"
        ? "CANCELLED"
        : fallback,
    error instanceof DocumentAccessUnavailable,
  );
const preview = (receipt: DocumentInspectionResponse): ArtifactPreview => {
  const { version } = receipt;
  const common = {
    versionId: version.versionId,
    bytes: version.object.bytes,
    createdAt: version.createdAt,
  };
  return "kind" in receipt
    ? Object.freeze({
        ...common,
        kind: "native-file",
        filename: receipt.version.path.split("/").at(-1)!,
        path: receipt.version.path,
        mimeType: "application/octet-stream",
        currentBytesVerified: receipt.integrity.currentBytesVerified,
      })
    : Object.freeze({
        ...common,
        kind: "generated",
        artifactId: receipt.version.artifactId,
        filename: receipt.version.filename,
        mimeType: receipt.version.mimeType,
        generationStatus: receipt.version.generationStatus,
        previewStatus: receipt.version.previewStatus,
        inspection: receipt.inspection,
      });
};

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
  let active = 0;
  const documents = documentAccessTransport(credential, lifetime, fetcher);
  const links = createLinkTransport(credential, lifetime, fetcher);
  async function inspected(versionId: string, signal: AbortSignal) {
    const request = receiveDocumentRequest(
      "inspect",
      new TextEncoder().encode(JSON.stringify({ versionId })),
    );
    const { status, value } = await documents.inspect(request, signal);
    if ("error" in value)
      return failure(value.error.code, status === 401 || status === 403);
    if (value.version.versionId !== versionId)
      return failure("VERSION_MISMATCH");
    return { ok: true as const, value };
  }
  const bounded = async <T>(
    caller: AbortSignal,
    fallback: string,
    run: (signal: AbortSignal) => Promise<ArtifactReply<T>>,
  ) => {
    active++;
    try {
      return await withActionDeadline([caller, lifetime], run);
    } catch (error) {
      return failed(error, fallback);
    } finally {
      active--;
    }
  };
  return {
    pending: () => active > 0,
    inspect: (versionId, caller) =>
      bounded(caller, "PREVIEW_UNAVAILABLE", async (signal) => {
        const reply = await inspected(versionId, signal);
        return reply.ok
          ? {
              ok: true,
              value: preview(reply.value),
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
            filename:
              "path" in file.version
                ? file.version.path.split("/").at(-1)!
                : file.version.filename,
            mimeType:
              "path" in file.version
                ? "application/octet-stream"
                : file.version.mimeType,
            bytes: file.bytes,
          }),
        };
      }),
  };
}
