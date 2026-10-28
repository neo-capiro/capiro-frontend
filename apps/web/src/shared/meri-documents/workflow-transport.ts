import {
  receiveDocumentResponse,
  receiveDocumentDownload,
  type AdmittedDocumentRequest,
  type AdmittedDocumentVersion,
  type DocumentDownload,
  type DocumentErrorResponse,
  type DocumentResponse,
  type DocumentRoute,
} from "@capiro/meri-contracts/document-application";
import {
  receiveDocumentResponse as receiveDocumentAccessResponse,
  type AdmittedDocumentRequest as AdmittedAccessRequest,
  type DocumentAccessRoute,
  type AdmittedGeneratedDocumentVersion,
  type AdmittedDocumentPreviewRequest,
  receiveDocumentPreview,
  receiveDocumentPreviewPublication,
} from "@capiro/meri-client/document-access";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";

type JsonRoute = Exclude<DocumentRoute, "download">;
export interface DocumentTransport {
  request<R extends JsonRoute>(
    route: R,
    request: AdmittedDocumentRequest<R>,
    signal: AbortSignal,
  ): Promise<{ status: number; value: DocumentResponse<R> }>;
  download(
    request: AdmittedDocumentRequest<"download">,
    version: AdmittedDocumentVersion,
    signal: AbortSignal,
  ): Promise<{
    status: number;
    value: DocumentDownload | DocumentErrorResponse;
  }>;
}
/** Local access loss conveys no remote write disposition. */
export class DocumentAccessUnavailable extends Error {}

function discard(response: Response) {
  try {
    void response.body?.cancel().catch(() => {});
  } catch {
    /* Already locked/consumed. */
  }
}

/** One HTTP owner for document writes and artifact reads; receivers own admission. */
function documentReceiver(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch,
) {
  let currentCredential = lifetime.aborted ? "" : credential;
  lifetime.addEventListener(
    "abort",
    () => {
      currentCredential = "";
    },
    { once: true },
  );
  return async function receive<T>(
    route: DocumentRoute | DocumentAccessRoute | "preview" | "preview-publish",
    request: unknown,
    caller: AbortSignal,
    decode: (response: Response, signal: AbortSignal) => Promise<T>,
  ): Promise<{ status: number; value: T }> {
    if (
      ![
        "create",
        "revise",
        "inspect",
        "download",
        "history",
        "list",
        "preview",
        "preview-publish",
      ].includes(route)
    )
      throw new Error("Unknown document route");
    const body = JSON.stringify(request);
    let accessLost = false;
    try {
      return await withActionDeadline([caller, lifetime], async (signal) => {
        const response = await fetcher(`/api/documents/${route}`, {
          method: "POST",
          body,
          headers: {
            "Content-Type": "application/json",
            [actionSessionHeader]: currentCredential,
          },
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal,
        });
        try {
          signal.throwIfAborted();
          accessLost = response.status === 401 || response.status === 403;
          const value = await decode(response, signal);
          signal.throwIfAborted();
          return { status: response.status, value };
        } finally {
          discard(response);
        }
      });
    } catch (error) {
      if (accessLost && !caller.aborted && !lifetime.aborted)
        throw new DocumentAccessUnavailable("Document access unavailable");
      throw error;
    }
  };
}

/** Fixed routes; public receiving owns schemas, request correlation and binary integrity. */
export function documentTransport(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): DocumentTransport {
  const receive = documentReceiver(credential, lifetime, fetcher);
  return {
    request: (route, request, signal) =>
      receive(route, request, signal, async (response, current) =>
        receiveDocumentResponse(
          route,
          response.status,
          await boundedJsonBytes(response, current, 16 * 1024 * 1024),
          request,
        ),
      ),
    download: async (request, version, signal) => {
      if (request.versionId !== version.versionId)
        throw new Error("Mismatched download version");
      return receive("download", request, signal, async (response, current) =>
        response.status === 200
          ? receiveDocumentDownload(response, version, {
              signal: current,
              maxBytes: 16 * 1024 * 1024,
            })
          : receiveDocumentResponse(
              "download",
              response.status,
              await boundedJsonBytes(response, current, 16 * 1024 * 1024),
              request,
            ),
      );
    },
  };
}

/** Artifact inspection uses the same B2 receiver instance as signed-link byte admission. */
export function documentAccessTransport(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const receive = documentReceiver(credential, lifetime, fetcher);
  return {
    metadata: <R extends "list" | "history">(
      route: R,
      request: AdmittedAccessRequest<R>,
      signal: AbortSignal,
    ) =>
      receive(route, request, signal, async (response, current) =>
        receiveDocumentAccessResponse(
          route,
          response.status,
          await boundedJsonBytes(response, current, 16 * 1024 * 1024),
          request,
        ),
      ),
    inspect: (request: AdmittedAccessRequest<"inspect">, signal: AbortSignal) =>
      receive("inspect", request, signal, async (response, current) =>
        receiveDocumentAccessResponse(
          "inspect",
          response.status,
          await boundedJsonBytes(response, current, 16 * 1024 * 1024),
          request,
        ),
      ),
  };
}

/** Read never triggers publication. Both routes retain the same current session and public receiver. */
export function documentPreviewTransport(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const receive = documentReceiver(credential, lifetime, fetcher);
  return {
    publish: (
      request: AdmittedDocumentPreviewRequest<"publish">,
      version: AdmittedGeneratedDocumentVersion,
      signal: AbortSignal,
    ) =>
      receive("preview-publish", request, signal, async (response, current) =>
        receiveDocumentPreviewPublication(
          response.status,
          await boundedJsonBytes(response, current, 65536),
          request,
          version,
        ),
      ),
    read: (
      request: AdmittedDocumentPreviewRequest<"read">,
      version: AdmittedGeneratedDocumentVersion,
      signal: AbortSignal,
    ) =>
      receive("preview", request, signal, async (response, current) =>
        receiveDocumentPreview(response, version, {
          signal: current,
          maxBytes: 8 * 1024 * 1024,
        }),
      ),
  };
}
