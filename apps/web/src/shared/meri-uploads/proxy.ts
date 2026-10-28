import {
  UPLOAD_LIMITS,
  receiveUploadRequest,
  uploadApplicationMetadata,
  type UploadError,
  type UploadRoute,
} from "./facade";
import {
  boundedJsonBytes,
  boundedResponseBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { receivedActionSession } from "../meri-actions/session-header";
import { sameRequestOrigin } from "../request-origin";
import type { readUploadConfig } from "./config";

/** The fixed forwarding leaves this deployment has a caller for; nothing else is reachable. */
const routes = new Set<string>([
  "initiate",
  "status",
  "remove",
  // The saved-source read: inspect re-resolves current custody, read returns the original bytes.
  "inspect",
  "read",
]);
/**
 * The exact original-download headers the read leaf relays, and nothing else: the canonical
 * download receiver admits a read response only when every one of them is present and exact, so a
 * relayed read carries no header Meri did not set and no header it set is dropped.
 */
const downloadHeaders = [
  "content-type",
  "content-length",
  "content-disposition",
  "x-meri-upload-id",
  "x-meri-upload-sha256",
  "x-meri-upload-version",
] as const;
const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const uploadIdShape =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sha256Shape = /^[0-9a-f]{64}$/;
const declaredLengthShape = /^(0|[1-9][0-9]*)$/;
/**
 * The digest header the canonical read response already carries for an original. On this leaf it is
 * the caller's own declaration of the bytes it is handing over, checked against what arrived before
 * anything is forwarded; it grants no authority, and custody still re-verifies the original.
 */
export const uploadDigestHeader = "x-meri-upload-sha256";

type Outcome = UploadError["error"]["outcome"];

/** Canonical error shape of this resource. A local refusal is provably NOT_DISPATCHED. */
const refused = (
  status: number,
  code: string,
  outcome: Outcome = "NOT_DISPATCHED",
) =>
  Response.json({ error: { code, outcome } }, { status, headers: jsonHeaders });

/** The reply was lost after the request left this server; no dispatch outcome is invented. */
const lost = (route: string) =>
  route === "read"
    ? // A read has no dispatch outcome to report, and its own canonical outcome is READ_UNAVAILABLE.
      refused(503, "UPLOAD_UNAVAILABLE", "READ_UNAVAILABLE")
    : refused(503, "UPLOAD_UNAVAILABLE", "UNKNOWN");

const hex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const sameOriginAndHeaders = (
  request: Request,
  path: string,
  config: ReturnType<typeof readUploadConfig>,
) => {
  const url = new URL(request.url);
  return !(
    url.pathname !== path ||
    url.search ||
    url.hash ||
    !sameRequestOrigin(request, config.requestOrigin) ||
    // A browser bearer would shadow the native Clerk cookie; the opaque session has its own header.
    request.headers.has("authorization")
  );
};

/**
 * Fixed upload route forwarding only: the write commands initiate, complete, status and remove, and
 * the saved-source reads inspect and read. The admitted body is the browser's exact bytes,
 * re-admitted here through the same public receiver the caller used, so a malformed or
 * out-of-contract request never reaches the remote application. A read relays the canonical
 * original bytes with exactly the download headers Meri set, and relays nothing else. The remote
 * application owns current authority, custody and every effect.
 */
export async function proxyUploadRequest(
  request: Request,
  operation: string,
  config: ReturnType<typeof readUploadConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  if (!routes.has(operation)) return refused(404, "NOT_FOUND");
  if (request.method !== "POST") return refused(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginAndHeaders(request, `/api/uploads/${operation}`, config))
    return refused(404, "NOT_FOUND");
  if (request.headers.get("content-type") !== "application/json")
    return refused(400, "UPLOAD_FORMAT");
  if (request.headers.has("content-encoding"))
    return refused(400, "UPLOAD_ENCODING");
  if (!config.enabled) return lost(operation);
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      if (!nativeToken) return refused(401, "UPLOAD_ACCESS_DENIED");
      const session = receivedActionSession(request);
      if (!session) return refused(401, "UPLOAD_ACCESS_DENIED");
      let body: Uint8Array<ArrayBuffer>;
      try {
        body = await boundedJsonBytes(
          new Response(request.body, { headers: request.headers }),
          signal,
          uploadApplicationMetadata.requestBytes,
        );
        receiveUploadRequest(
          operation as Exclude<UploadRoute, "complete">,
          body,
        );
      } catch {
        signal.throwIfAborted();
        return refused(400, "INVALID_BODY");
      }
      signal.throwIfAborted();
      let response: Response;
      try {
        response = await fetcher(`${config.baseUrl}/api/uploads/${operation}`, {
          method: "POST",
          body,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session}`,
          },
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          signal,
        });
      } catch {
        signal.throwIfAborted();
        return lost(operation);
      }
      try {
        signal.throwIfAborted();
        if (response.redirected) throw new Error("Redirected upload response");
        // A canonical read answers 200 with the original bytes; every other reply is the JSON shape.
        const download = operation === "read" && response.status === 200;
        if (download && response.headers.has("content-encoding"))
          throw new Error("Encoded upload download");
        const bytes = await boundedResponseBytes(
          response,
          signal,
          download
            ? UPLOAD_LIMITS.originalBytes
            : uploadApplicationMetadata.responseBytes,
        );
        signal.throwIfAborted();
        if (!download)
          return new Response(bytes, {
            status: response.status,
            headers: jsonHeaders,
          });
        // The canonical no-store/nosniff pair plus exactly the download headers Meri set.
        const headers = new Headers(jsonHeaders);
        headers.delete("Content-Type");
        for (const name of downloadHeaders) {
          const value = response.headers.get(name);
          if (value !== null) headers.set(name, value);
        }
        return new Response(bytes, { status: response.status, headers });
      } finally {
        if (!response.bodyUsed)
          void response.body?.cancel().catch(() => undefined);
      }
    });
  } catch {
    // An interrupted request may have reached Meri; no dispatch outcome is invented.
    return lost(operation);
  }
}

/**
 * The one bounded original write. Its purpose-specific route takes one canonical upload id and a PUT
 * of the exact declared bytes: the receiving bound, an exact content-length and a digest check of
 * what actually arrived are enforced here, so a truncated, oversized or substituted body is refused
 * before anything is forwarded. The remote application still re-verifies the original against its own
 * custody record.
 */
export async function proxyUploadOriginal(
  request: Request,
  uploadId: string,
  config: ReturnType<typeof readUploadConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  if (!uploadIdShape.test(uploadId)) return refused(404, "NOT_FOUND");
  if (request.method !== "PUT") return refused(405, "METHOD_NOT_ALLOWED");
  if (
    !sameOriginAndHeaders(request, `/api/uploads/original/${uploadId}`, config)
  )
    return refused(404, "NOT_FOUND");
  if (request.headers.get("content-type") !== "application/octet-stream")
    return refused(400, "UPLOAD_FORMAT");
  if (request.headers.has("content-encoding"))
    return refused(400, "UPLOAD_ENCODING");
  const declared = request.headers.get("content-length");
  if (declared === null || !declaredLengthShape.test(declared))
    return refused(400, "INVALID_CONTENT_LENGTH");
  if (Number(declared) < 1 || Number(declared) > UPLOAD_LIMITS.originalBytes)
    return refused(413, "UPLOAD_SIZE");
  const digest = request.headers.get(uploadDigestHeader);
  if (digest === null || !sha256Shape.test(digest))
    return refused(400, "UPLOAD_HASH");
  if (!config.enabled) return refused(503, "UPLOAD_UNAVAILABLE", "UNKNOWN");
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      if (!nativeToken) return refused(401, "UPLOAD_ACCESS_DENIED");
      const session = receivedActionSession(request);
      if (!session) return refused(401, "UPLOAD_ACCESS_DENIED");
      let bytes: Uint8Array<ArrayBuffer>;
      try {
        bytes = await boundedResponseBytes(
          new Response(request.body, { headers: request.headers }),
          signal,
          UPLOAD_LIMITS.originalBytes,
        );
      } catch {
        signal.throwIfAborted();
        return refused(413, "UPLOAD_SIZE");
      }
      signal.throwIfAborted();
      if (bytes.byteLength !== Number(declared))
        return refused(413, "UPLOAD_SIZE");
      if (
        hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))) !==
        digest
      )
        return refused(400, "UPLOAD_ORIGINAL_MISMATCH");
      let response: Response;
      try {
        response = await fetcher(
          `${config.baseUrl}/api/uploads/original/${uploadId}`,
          {
            method: "PUT",
            // The verified bytes, whose length is the exact content-length Meri expects.
            body: bytes,
            headers: {
              "Content-Type": "application/octet-stream",
              Authorization: `Bearer ${session}`,
            },
            credentials: "omit",
            redirect: "error",
            cache: "no-store",
            signal,
          },
        );
      } catch {
        signal.throwIfAborted();
        return lost("complete");
      }
      try {
        signal.throwIfAborted();
        if (response.redirected) throw new Error("Redirected upload response");
        const received = await boundedResponseBytes(
          response,
          signal,
          uploadApplicationMetadata.responseBytes,
        );
        signal.throwIfAborted();
        return new Response(received, {
          status: response.status,
          headers: jsonHeaders,
        });
      } finally {
        if (!response.bodyUsed)
          void response.body?.cancel().catch(() => undefined);
      }
    });
  } catch {
    return lost("complete");
  }
}
