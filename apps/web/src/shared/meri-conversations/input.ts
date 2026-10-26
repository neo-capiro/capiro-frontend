import {
  conversationApplicationMetadata as protocol,
  receiveConversationRequest,
  type ConversationRoute,
} from "@capiro/meri-contracts/conversation-application";
import {
  conversationInputMetadata,
  receiveConversationInputRequest,
} from "@capiro/meri-contracts/conversation-input";
import {
  conversationInitialInputMetadata,
  receiveConversationInitialInputRequest,
} from "@capiro/meri-contracts/conversation-initial-input";
import { boundedJsonBytes } from "../meri-actions/bounded-json";
import { publicRequestOrigin } from "../request-origin";
import {
  conversationLifecycleMetadata,
  receiveConversationLifecycleRequest,
} from "@capiro/meri-contracts/conversation-lifecycle";

const reconnectPath =
  /^events\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/stream$/;

/** Only public protocol routes; no user-selected upstream destination. */
export function conversationRoute(path: string) {
  if (
    `/api/conversations/${path}` ===
    conversationLifecycleMetadata.routes.control.path
  )
    return "control" as const;
  if (
    `/api/conversations/${path}` ===
    conversationLifecycleMetadata.routes.inspect.path
  )
    return "inspect" as const;
  if (
    `/api/conversations/${path}` ===
    conversationInitialInputMetadata.routes.allocate.path
  )
    return "inputAllocate" as const;
  if (
    `/api/conversations/${path}` === conversationInputMetadata.routes.admit.path
  )
    return "inputAdmit" as const;
  if (reconnectPath.test(path)) return "reconnect" as const;
  if (
    path === "submit" ||
    path === "history" ||
    path === "cancel" ||
    path === "feedback" ||
    path === "feedback-read" ||
    path === "events"
  )
    return path;
  return undefined;
}

export function validConversationRequest(
  request: Request,
  path: string,
  route: NonNullable<ReturnType<typeof conversationRoute>>,
  requestOrigin?: string | null,
) {
  const url = new URL(request.url);
  const expected = publicRequestOrigin(request, requestOrigin);
  if (expected === null) return false;
  const origin = request.headers.get("origin");
  const length = request.headers.get("content-length");
  const limit =
    route === "inputAllocate"
      ? conversationInitialInputMetadata.limits.requestBytes
      : protocol.limits.requestBytes;
  if (
    url.pathname !== `/api/conversations/${path}` ||
    url.search ||
    url.hash ||
    // The opaque session has its own header; a bearer here would shadow the native Clerk cookie.
    request.headers.has("authorization") ||
    request.headers.has("content-encoding") ||
    request.headers.has("last-event-id") ||
    (origin !== null && origin !== expected) ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (length !== null &&
      (!/^(0|[1-9]\d*)$/.test(length) || !Number.isSafeInteger(Number(length))))
  )
    return false;
  if (route === "reconnect") {
    const cursor = request.headers.get(protocol.routes.reconnect.cursorHeader);
    return (
      request.body === null &&
      !request.headers.has("content-type") &&
      (length === null || length === "0") &&
      (cursor === null ||
        (/^(0|[1-9]\d*)$/.test(cursor) && Number.isSafeInteger(Number(cursor))))
    );
  }
  return (
    origin === expected &&
    !request.headers.has(protocol.routes.reconnect.cursorHeader) &&
    (length === null || Number(length) <= limit) &&
    /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") ?? "",
    )
  );
}

export async function conversationBody(
  request: Request,
  route:
    | ConversationRoute
    | "inputAdmit"
    | "inputAllocate"
    | "control"
    | "inspect",
  signal: AbortSignal,
) {
  const bytes = await boundedJsonBytes(
    new Response(request.body, { headers: request.headers }),
    signal,
    route === "inputAllocate"
      ? conversationInitialInputMetadata.limits.requestBytes
      : protocol.limits.requestBytes,
  );
  if (route === "inputAllocate") receiveConversationInitialInputRequest(bytes);
  else if (route === "inputAdmit") receiveConversationInputRequest(bytes);
  else if (route === "control" || route === "inspect")
    receiveConversationLifecycleRequest(route, bytes);
  else receiveConversationRequest(route, bytes);
  return bytes;
}
