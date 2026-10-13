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
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";

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

/** Fixed routes; public receiving owns schemas, request correlation and binary integrity. */
export function documentTransport(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): DocumentTransport {
  let currentCredential = lifetime.aborted ? "" : credential;
  lifetime.addEventListener(
    "abort",
    () => {
      currentCredential = "";
    },
    { once: true },
  );
  async function receive<T>(
    route: DocumentRoute,
    request: unknown,
    caller: AbortSignal,
    decode: (response: Response, signal: AbortSignal) => Promise<T>,
  ): Promise<{ status: number; value: T }> {
    if (!["create", "revise", "inspect", "download"].includes(route))
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
            Authorization: `Bearer ${currentCredential}`,
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
  }
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
