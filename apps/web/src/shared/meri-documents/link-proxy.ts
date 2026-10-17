import {
  boundedJsonBytes,
  boundedResponseBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { sameRequestOrigin } from "../request-origin";
import type { readDocumentConfig } from "./config";
import { linkRequestBody, type LinkAction } from "./link-wire";

/** Every link-route response is uncacheable, sends no referrer and is never sniffed. */
const linkHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const unavailable = (status: number) =>
  Response.json(
    { error: { code: "FRONTEND_DOWNLOAD_LINK_UNAVAILABLE" } },
    { status, headers: linkHeaders },
  );
const attachmentHeaders = [
  "content-type",
  "content-length",
  "content-disposition",
];

/**
 * Fixed same-origin adapter for POST /api/documents/links/{issue,redeem}. The token travels only in
 * the redeem JSON body: no query string is accepted and nothing here logs or stores a token. The
 * Meri control service owns authorization, link signing, expiry and revocation.
 */
export async function proxyDocumentLinkRequest(
  request: Request,
  action: string,
  config: ReturnType<typeof readDocumentConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  if (action !== "issue" && action !== "redeem") return unavailable(404);
  if (request.method !== "POST") return unavailable(405);
  const url = new URL(request.url);
  if (
    url.pathname !== `/api/documents/links/${action}` ||
    url.search ||
    url.hash ||
    !sameRequestOrigin(request, config.requestOrigin) ||
    request.headers.has("content-encoding") ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") ?? "",
    )
  )
    return unavailable(400);
  if (!config.readEnabled || !config.baseUrl) return unavailable(503);
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      const bearer = request.headers.get("authorization");
      if (
        !nativeToken ||
        !bearer ||
        !/^Bearer action_session_[A-Za-z0-9_-]{43}$/.test(bearer)
      )
        return unavailable(401);
      let body: string;
      try {
        const bytes = await boundedJsonBytes(
          new Response(request.body, { headers: request.headers }),
          signal,
          4096,
        );
        body = linkRequestBody(action as LinkAction, bytes);
      } catch {
        signal.throwIfAborted();
        return unavailable(400);
      }
      const response = await fetcher(
        `${config.baseUrl}/api/documents/links/${action}`,
        {
          method: "POST",
          body,
          headers: {
            "Content-Type": "application/json",
            Authorization: bearer,
          },
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal,
        },
      );
      return relayLinkResponse(response, action as LinkAction, signal);
    });
  } catch {
    // No issued link or released bytes are invented for an interrupted read.
    return unavailable(502);
  }
}

/** Bounded relay of the service answer: the attachment for a redeemed link, JSON otherwise. */
async function relayLinkResponse(
  response: Response,
  action: LinkAction,
  signal: AbortSignal,
) {
  try {
    signal.throwIfAborted();
    if (response.redirected || response.headers.has("content-encoding"))
      throw new Error("Unexpected download link response");
    const attachment = action === "redeem" && response.status === 200;
    const bytes = attachment
      ? await boundedResponseBytes(response, signal, 16 * 1024 * 1024)
      : await boundedJsonBytes(response, signal, 4096);
    signal.throwIfAborted();
    const headers = new Headers(linkHeaders);
    if (attachment)
      for (const name of attachmentHeaders) {
        const value = response.headers.get(name);
        if (value !== null) headers.set(name, value);
      }
    else headers.set("Content-Type", "application/json");
    return new Response(bytes, { status: response.status, headers });
  } finally {
    if (!response.bodyUsed) void response.body?.cancel().catch(() => undefined);
  }
}
