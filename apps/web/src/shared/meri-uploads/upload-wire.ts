import {
  UPLOAD_LIMITS,
  UPLOAD_MIME,
  UploadResponseError,
  receiveUploadOriginal,
  receiveUploadRequest,
  receiveUploadResponse,
  uploadApplicationMetadata,
  uploadNotDispatchedErrors,
  uploadRequestPath,
  type AdmittedUploadReceipt,
  type AdmittedUploadRequest,
  type UploadError,
  type UploadRoute,
} from "./facade";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";
import type { RetainedUpload } from "./upload-recovery";

type Outcome = UploadError["error"]["outcome"];
/** A contract refusal, a server error body, or a local pre-dispatch code; never a client authority. */
export type UploadRefusal = Readonly<{
  code: string;
  outcome?: Outcome;
  status?: number;
  accessDenied?: boolean;
  /**
   * The dispatched command may have reached the service with no usable reply. Nothing may
   * re-dispatch itself off this flag; only a status read may re-resolve the attempt.
   */
  uncertain?: true;
}>;
export type UploadReply<T> =
  | { ok: true; value: T }
  | { ok: false; refusal: UploadRefusal };

export type UploadDeclaration = Readonly<{
  admitted: AdmittedUploadRequest<"initiate">;
  bytes: Uint8Array;
  sha256: string;
  /** The declared original bytes, kept for the canonical preflight that precedes the write. */
  original: Uint8Array;
  receipt: AdmittedUploadReceipt;
}>;

const refuse = (
  code: string,
  extra: Omit<UploadRefusal, "code"> = {},
): UploadReply<never> => ({
  ok: false,
  refusal: Object.freeze({ code, ...extra }),
});
/** Codes the contract reserves for a command that provably never reached the service. */
const notDispatched = (code: string) => uploadNotDispatchedErrors.includes(code);
const failureOf = (error: unknown, route: UploadRoute): UploadRefusal => {
  if (error instanceof UploadResponseError)
    return Object.freeze({
      code: error.code,
      ...(route === "complete" && !notDispatched(error.code)
        ? { outcome: "UNKNOWN" as Outcome, uncertain: true as const }
        : {}),
    });
  const aborted = error instanceof Error && error.name === "AbortError";
  if (route === "complete")
    // An original write that lost its caller or its reply is the contract's uncertain case.
    return Object.freeze({
      code: aborted ? "CANCELLED" : "UPLOAD_PUT_UNKNOWN",
      outcome: "UNKNOWN" as Outcome,
      uncertain: true as const,
    });
  return Object.freeze({
    code: aborted ? "CANCELLED" : "UPLOAD_UNAVAILABLE",
    outcome: (route === "status" || route === "read"
      ? "READ_UNAVAILABLE"
      : "NOT_DISPATCHED") as Outcome,
    ...(aborted ? {} : { uncertain: true as const }),
  });
};
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/** One transport for the canonical upload routes; the public receivers own every admission. */
export interface UploadWire {
  /** Keeps early session renewal from cutting an active bounded write. */
  pending(): boolean;
  /** Admit and dispatch the declaration, returning the exact bytes for every later read. */
  declare(
    requestId: string,
    file: File,
    caller: AbortSignal,
  ): Promise<UploadReply<UploadDeclaration>>;
  /** Preflight the exact declared bytes, then write the bounded original once. */
  write(
    retained: RetainedUpload,
    caller: AbortSignal,
  ): Promise<UploadReply<AdmittedUploadReceipt>>;
  status(
    uploadId: string,
    caller: AbortSignal,
  ): Promise<UploadReply<AdmittedUploadReceipt>>;
  remove(
    uploadId: string,
    caller: AbortSignal,
  ): Promise<UploadReply<AdmittedUploadReceipt>>;
}

export function createUploadWire(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): UploadWire {
  let current = lifetime.aborted ? "" : credential;
  lifetime.addEventListener("abort", () => (current = ""), { once: true });
  let active = 0;

  /** POST the exact admitted bytes; the canonical receiver, not this module, reads the reply. */
  async function post<R extends Exclude<UploadRoute, "complete" | "read">>(
    route: R,
    request: AdmittedUploadRequest<R>,
    bytes: Uint8Array<ArrayBuffer>,
    signal: AbortSignal,
  ): Promise<UploadReply<AdmittedUploadReceipt>> {
    if (!current)
      return refuse("UPLOAD_UNAVAILABLE", {
        outcome: "UNKNOWN",
        uncertain: true,
      });
    const response = await fetcher(uploadRequestPath(route, request), {
      method: "POST",
      body: bytes,
      headers: {
        "Content-Type": "application/json",
        [actionSessionHeader]: current,
      },
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal,
    });
    const received = await boundedJsonBytes(
      response,
      signal,
      uploadApplicationMetadata.responseBytes,
    );
    const admitted = receiveUploadResponse(
      route,
      response.status,
      received,
      request,
    );
    return "error" in admitted
      ? refuse(admitted.error.code, {
          outcome: admitted.error.outcome,
          status: response.status,
          accessDenied: response.status === 401 || response.status === 403,
        })
      : { ok: true, value: admitted };
  }

  /** The deadline covers issuing, sending and receiving, not just the response headers. */
  const bounded = async <T>(
    caller: AbortSignal,
    route: UploadRoute,
    run: (signal: AbortSignal) => Promise<UploadReply<T>>,
  ): Promise<UploadReply<T>> => {
    active++;
    try {
      return await withActionDeadline([caller, lifetime], run);
    } catch (error) {
      const refusal = failureOf(error, route);
      return refuse(refusal.code, refusal);
    } finally {
      active--;
    }
  };

  const byId = (
    route: "status" | "remove",
    uploadId: string,
    caller: AbortSignal,
  ): Promise<UploadReply<AdmittedUploadReceipt>> =>
    bounded(caller, route, async (signal) => {
      // The same bounded bytes are admitted and dispatched; a repeat read re-sends them verbatim.
      const bytes = new TextEncoder().encode(JSON.stringify({ uploadId }));
      return post(route, receiveUploadRequest(route, bytes), bytes, signal);
    });

  return {
    pending: () => active > 0,
    declare: (requestId, file, caller) =>
      bounded(caller, "initiate", async (signal) => {
        // The declaration digest is computed locally; the receiver re-verifies these exact bytes.
        if (!Number.isSafeInteger(file.size) || file.size < 1)
          return refuse("INVALID_UPLOAD_DECLARATION");
        if (file.size > UPLOAD_LIMITS.originalBytes)
          // The canonical declaration enforces this same bound; refused before any dispatch.
          return refuse("UPLOAD_SIZE", { status: 413 });
        const body = new Uint8Array(await file.arrayBuffer());
        if (body.byteLength !== file.size) return refuse("UPLOAD_BYTE_LIMIT");
        const sha256 = hex(await crypto.subtle.digest("SHA-256", body));
        const format = /\.[a-z0-9]+$/iu.exec(file.name)?.[1]?.toLowerCase();
        const bytes = new TextEncoder().encode(
          JSON.stringify({
            requestId,
            filename: file.name,
            // Prefilled from the canonical MIME map; `receiveUploadRequest` decides admission.
            mimeType:
              (format
                ? UPLOAD_MIME[format as keyof typeof UPLOAD_MIME]
                : undefined) ?? file.type,
            bytes: file.size,
            sha256,
          }),
        );
        const admitted = receiveUploadRequest("initiate", bytes);
        const reply = await post("initiate", admitted, bytes, signal);
        return reply.ok
          ? {
              ok: true as const,
              value: { admitted, bytes, sha256, original: body, receipt: reply.value },
            }
          : reply;
      }),
    write: (retained, caller) =>
      bounded(caller, "complete", async (signal) => {
        if (!current)
          return refuse("UPLOAD_UNAVAILABLE", {
            outcome: "UNKNOWN",
            uncertain: true,
          });
        // Canonical preflight: a receipt that is no longer awaiting its original refuses a write,
        // and the bytes must be exactly the ones the service was told to expect.
        const original = await receiveUploadOriginal(
          retained.original,
          retained.complete,
          retained.receipt,
        );
        const response = await fetcher(
          uploadRequestPath("complete", retained.complete),
          {
            method: "PUT",
            // The verified original, as the one buffer this request owns for the duration.
            body: new Uint8Array(original),
            headers: {
              "Content-Type": "application/octet-stream",
              [actionSessionHeader]: current,
            },
            credentials: "same-origin",
            cache: "no-store",
            redirect: "error",
            signal,
          },
        );
        const received = await boundedJsonBytes(
          response,
          signal,
          uploadApplicationMetadata.responseBytes,
        );
        const admitted = receiveUploadResponse(
          "complete",
          response.status,
          received,
          retained.complete,
        );
        return "error" in admitted
          ? refuse(admitted.error.code, {
              outcome: admitted.error.outcome,
              status: response.status,
            })
          : { ok: true, value: admitted };
      }),
    status: (uploadId, caller) => byId("status", uploadId, caller),
    remove: (uploadId, caller) => byId("remove", uploadId, caller),
  };
}
