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
  receiveNativeResultsRequest,
  receiveNativeResultsResponse,
} from "@capiro/meri-client/document-access";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";
import {
  receiveFederalResponse,
  type FederalRoute,
  type AdmittedFederalRequest,
  type AdmittedFederalReview,
} from "@capiro/meri-contracts/federal-workbench";

type JsonRoute = Exclude<DocumentRoute, "download">;
/** The admitted native-result request is the receiver's own shape; no contract type is re-declared. */
type NativeResultsRequest = ReturnType<typeof receiveNativeResultsRequest>;
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
    route:
      | DocumentRoute
      | DocumentAccessRoute
      | FederalRoute
      | "preview"
      | "preview-publish"
      | "results",
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
        "results",
        "federal-prepare",
        "federal-load",
        "federal-publish",
        "federal-import",
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

/** Uses the existing authenticated, bounded document transport. */
export function federalTransport(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const receive = documentReceiver(credential, lifetime, fetcher);
  return <R extends FederalRoute>(
    route: R,
    request: AdmittedFederalRequest<R>,
    signal: AbortSignal,
    review?: AdmittedFederalReview,
  ) =>
    receive(route, request, signal, async (response, current) =>
      receiveFederalResponse(
        route,
        response.status,
        await boundedJsonBytes(response, current, 2 * 1024 * 1024),
        request,
        review,
      ),
    );
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
    /**
     * The additive native-result discovery read. The wire request is the receiver's own closed empty
     * object; the admitted `request` is the correlation token the canonical receiver checks the
     * answer against, so the browser never supplies a scope, run, actor or client binding. It admits
     * no version for inspect or download, leaving the existing inspect/download receiver the byte
     * authority.
     */
    results: (request: NativeResultsRequest, signal: AbortSignal) =>
      receive("results", {}, signal, async (response, current) =>
        receiveNativeResultsResponse(
          response.status,
          await boundedJsonBytes(response, current, 256 * 1024),
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
