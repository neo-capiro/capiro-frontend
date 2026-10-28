import {
  UploadResponseError,
  receiveUploadDownload,
  receiveUploadRequest,
  receiveUploadResponse,
  uploadApplicationMetadata,
  uploadRequestPath,
  type AdmittedUploadReceipt,
  type UploadError,
  type UploadReceipt,
} from "./facade";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";

type Outcome = UploadError["error"]["outcome"];

/** A contract refusal or a local pre-dispatch code; the same closed shape the upload wire reports. */
export type UploadReadRefusal = Readonly<{
  code: string;
  outcome?: Outcome;
  status?: number;
  accessDenied?: boolean;
}>;
export type UploadReadReply<T> =
  | { ok: true; value: T }
  | { ok: false; refusal: UploadReadRefusal };

/**
 * The saved original identity a captured upload source event states. It is metadata the event
 * carries: it proves what was read then, not that this client may open it now, and it is never
 * treated as a grant.
 */
export type SavedUploadOriginal = Readonly<{
  uploadId: string;
  sha256: string;
  versionId: string;
  filename: string;
  mimeType: string;
  bytes: number;
}>;

/**
 * What the service currently says about this upload's custody, scan and extraction, captured by a
 * fresh canonical inspect. It is current state, not access, and it does not say how any answer used
 * the source.
 */
export type UploadCurrentCustody = Readonly<{
  /** True only when current custody still carries exactly the saved original of this event. */
  matchesSaved: boolean;
  storageStatus: UploadReceipt["storageStatus"];
  scanStatus: UploadReceipt["scanStatus"];
  scanReason: string | null;
  extraction: UploadReceipt["extraction"];
  originalBytesAvailable: boolean;
}>;

/** The exact original bytes one canonical read returned, verified against the inspected receipt. */
export type UploadOriginalBytes = Readonly<{
  filename: string;
  mimeType: string;
  bytes: Uint8Array<ArrayBuffer>;
}>;

/**
 * The current read of one saved upload original. A saved event never authorises a read: every call
 * re-queries the owner through the canonical inspect and read pair, and bytes are published only
 * when the current record still carries the saved original and custody, scan and retention allow it.
 */
export interface UploadCurrentRead {
  /** Keeps early session renewal from cutting an active bounded read. */
  pending(): boolean;
  /** A fresh inspect of this upload's current state, correlated to the saved original. */
  inspect(
    saved: SavedUploadOriginal,
    caller: AbortSignal,
  ): Promise<UploadReadReply<UploadCurrentCustody>>;
  /** A fresh inspect, then exactly one canonical read of the saved original bytes. */
  original(
    saved: SavedUploadOriginal,
    caller: AbortSignal,
  ): Promise<UploadReadReply<UploadOriginalBytes>>;
}

/**
 * The canonical inspect is allowed to scan and extract, so its bound matches the owner's own;
 * every other upload route is bounded by the shared action deadline.
 */
const inspectDeadlineMs = 150_000;
const readDeadlineMs = 30_000;
/** A local code for a saved reference the current record no longer carries; never a service code. */
export const uploadReferenceChanged = "UPLOAD_REFERENCE_CHANGED";

/** Whether the current receipt still carries exactly the original this saved event recorded. */
export function matchesSavedOriginal(
  saved: SavedUploadOriginal,
  receipt: UploadReceipt,
): boolean {
  const { original } = receipt;
  return (
    receipt.uploadId === saved.uploadId &&
    original.sha256 === saved.sha256 &&
    original.versionId !== null &&
    original.versionId === saved.versionId &&
    original.filename === saved.filename &&
    original.mimeType === saved.mimeType &&
    original.bytes === saved.bytes
  );
}

const custodyOf = (
  receipt: AdmittedUploadReceipt,
  saved: SavedUploadOriginal,
): UploadCurrentCustody =>
  Object.freeze({
    matchesSaved: matchesSavedOriginal(saved, receipt),
    storageStatus: receipt.storageStatus,
    scanStatus: receipt.scanStatus,
    scanReason: receipt.scanReason,
    extraction: receipt.extraction,
    originalBytesAvailable: receipt.originalBytesAvailable,
  });

/** Nothing is published from a client's own opinion; only the canonical receivers admit a reply. */
export function createUploadCurrentRead(
  credential: string,
  lifetime: AbortSignal,
  isCurrent: () => boolean,
  fetcher: typeof fetch = fetch,
): UploadCurrentRead {
  let current = lifetime.aborted ? "" : credential;
  lifetime.addEventListener("abort", () => (current = ""), { once: true });
  let active = 0;

  const refuse = (
    code: string,
    extra: Omit<UploadReadRefusal, "code"> = {},
  ): UploadReadReply<never> => ({
    ok: false,
    refusal: Object.freeze({ code, ...extra }),
  });

  const discard = (response: Response) =>
    void response.body?.cancel().catch(() => undefined);

  const failureOf = (
    error: unknown,
    route: "inspect" | "read",
  ): UploadReadRefusal => {
    if (error instanceof UploadResponseError)
      return Object.freeze({ code: error.code });
    const aborted = error instanceof Error && error.name === "AbortError";
    return Object.freeze({
      code: aborted ? "CANCELLED" : "UPLOAD_UNAVAILABLE",
      outcome:
        route === "read"
          ? ("READ_UNAVAILABLE" as Outcome)
          : ("UNKNOWN" as Outcome),
    });
  };

  /** One fresh inspect: current custody, access, removal and extraction for this saved upload. */
  async function inspected(
    saved: SavedUploadOriginal,
    signal: AbortSignal,
  ): Promise<UploadReadReply<AdmittedUploadReceipt>> {
    if (!current)
      return refuse("UPLOAD_UNAVAILABLE", {
        outcome: "UNKNOWN",
      });
    const bytes = new TextEncoder().encode(
      JSON.stringify({ uploadId: saved.uploadId }),
    );
    const request = receiveUploadRequest("inspect", bytes);
    const response = await fetcher(uploadRequestPath("inspect", request), {
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
    // Access is decided by the current session, not by this page: a refusal is reported as one.
    if (response.status === 401 || response.status === 403) {
      discard(response);
      return refuse("UPLOAD_ACCESS_DENIED", {
        status: response.status,
        accessDenied: true,
      });
    }
    const received = await boundedJsonBytes(
      response,
      signal,
      uploadApplicationMetadata.responseBytes,
    );
    const admitted = receiveUploadResponse(
      "inspect",
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
      : { ok: true as const, value: admitted };
  }

  /** The deadline covers issuing, sending, receiving and verifying, not just response headers. */
  const bounded = async <T>(
    caller: AbortSignal,
    route: "inspect" | "read",
    run: (signal: AbortSignal) => Promise<UploadReadReply<T>>,
  ): Promise<UploadReadReply<T>> => {
    active++;
    try {
      return await withActionDeadline(
        [caller, lifetime],
        run,
        route === "read" ? readDeadlineMs : inspectDeadlineMs,
      );
    } catch (error) {
      return refuse(failureOf(error, route).code, failureOf(error, route));
    } finally {
      active--;
    }
  };

  /** The bytes are read once, and only from a 200 that the canonical download receiver admitted. */
  async function read(
    saved: SavedUploadOriginal,
    receipt: AdmittedUploadReceipt,
    signal: AbortSignal,
  ): Promise<UploadReadReply<UploadOriginalBytes>> {
    const bytes = new TextEncoder().encode(
      JSON.stringify({ uploadId: saved.uploadId }),
    );
    const request = receiveUploadRequest("read", bytes);
    const response = await fetcher(uploadRequestPath("read", request), {
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
    if (response.status !== 200) {
      if (response.status === 401 || response.status === 403) {
        discard(response);
        return refuse("UPLOAD_ACCESS_DENIED", {
          status: response.status,
          accessDenied: true,
        });
      }
      const received = await boundedJsonBytes(
        response,
        signal,
        uploadApplicationMetadata.responseBytes,
      );
      try {
        const refused = receiveUploadResponse(
          "read",
          response.status,
          received,
          request,
        );
        // A 200 is the binary body, so this branch is always the closed error shape.
        return "error" in refused
          ? refuse(refused.error.code, {
              outcome: refused.error.outcome,
              status: response.status,
            })
          : refuse("UPLOAD_UNAVAILABLE", { outcome: "READ_UNAVAILABLE" });
      } catch {
        // The reply carried no canonical error: this page invents no code from its own reading.
        return refuse("UPLOAD_UNAVAILABLE", { outcome: "READ_UNAVAILABLE" });
      }
    }
    const granted = await receiveUploadDownload(response, request, receipt, {
      timeoutMs: readDeadlineMs,
      signal,
    });
    return {
      ok: true as const,
      value: Object.freeze({
        filename: granted.receipt.original.filename,
        mimeType: granted.receipt.original.mimeType,
        // A fresh copy owns its buffer, so the published bytes never alias the response stream.
        bytes: new Uint8Array(granted.bytes),
      }),
    };
  }

  return {
    pending: () => active > 0,
    inspect: (saved, caller) =>
      bounded(caller, "inspect", async (signal) => {
        const reply = await inspected(saved, signal);
        return reply.ok
          ? { ok: true as const, value: custodyOf(reply.value, saved) }
          : reply;
      }),
    original: (saved, caller) =>
      bounded(caller, "read", async (signal) => {
        // The saved event is never the authority: current custody is re-read before any byte.
        const reply = await inspected(saved, signal);
        if (!reply.ok) return reply;
        if (!matchesSavedOriginal(saved, reply.value))
          return refuse(uploadReferenceChanged);
        if (!reply.value.originalBytesAvailable)
          // The owner decides why; this page only repeats the state it just read.
          return refuse(
            reply.value.storageStatus === "stored"
              ? "UPLOAD_NOT_CLEAN"
              : "UPLOAD_NOT_STORED",
            { status: 409 },
          );
        if (!current || !isCurrent()) return refuse("CANCELLED");
        const bytes = await read(saved, reply.value, signal);
        // A read that completed after this session moved on is discarded, not handed over.
        if (!current || !isCurrent()) return refuse("CANCELLED");
        return bytes;
      }),
  };
}
