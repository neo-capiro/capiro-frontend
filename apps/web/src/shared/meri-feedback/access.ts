import {
  conversationApplicationMetadata as protocol,
  receiveConversationRequest,
  receiveConversationResponse,
  type ConversationFeedbackRequest,
  type ConversationFeedbackResponse,
  type ConversationFeedbackReadResponse,
} from "@capiro/meri-contracts/conversation-application";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";
import type { ConversationContext } from "../meri-conversations/session";

export type FeedbackReply<T> =
  | { kind: "ok"; value: T }
  | { kind: "refused"; code: string }
  | { kind: "unknown" }
  | { kind: "not_sent" };
export interface FeedbackAccess {
  pending(): boolean;
  record(
    input: ConversationFeedbackRequest,
    signal: AbortSignal,
  ): Promise<FeedbackReply<ConversationFeedbackResponse>>;
  read(
    runId: string,
    signal: AbortSignal,
  ): Promise<FeedbackReply<ConversationFeedbackReadResponse>>;
}
const definite = new Set([
  "INVALID_REQUEST",
  "REQUEST_TOO_LARGE",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "SESSION_REFUSED",
  "SESSION_CHANGED",
  "SCOPE_REFUSED",
  "STALE_WRITER",
  "FEEDBACK_TARGET_REFUSED",
  "FEEDBACK_SOURCE_REFUSED",
  "FEEDBACK_REVISION_CHANGED",
  "FEEDBACK_REPLAY_REFUSED",
  "FEEDBACK_LIMIT",
]);
const accessLost = new Set([
  "SESSION_REFUSED",
  "SESSION_CHANGED",
  "SCOPE_REFUSED",
  "STALE_WRITER",
]);

/** Existing opaque session, proxy and bounded receiver; no native token or model selection enters feedback. */
export function createFeedbackAccess({
  credential,
  context,
  lifetime,
  isCurrent,
  onAccessLost,
  fetcher = fetch,
  origin = "",
}: {
  credential: string;
  context: ConversationContext;
  lifetime: AbortSignal;
  isCurrent: () => boolean;
  onAccessLost: () => void;
  fetcher?: typeof fetch;
  origin?: string;
}): FeedbackAccess {
  let active = 0;
  async function exchange(
    route: "feedback" | "feedback-read",
    input: unknown,
    caller: AbortSignal,
  ) {
    let dispatched = false;
    active++;
    try {
      return await withActionDeadline([lifetime, caller], async (signal) => {
        signal.throwIfAborted();
        if (!isCurrent()) throw new Error("Feedback session ended");
        const body = new TextEncoder().encode(JSON.stringify(input));
        const request = receiveConversationRequest(route, body);
        dispatched = true;
        const response = await fetcher(origin + protocol.routes[route].path, {
          method: "POST",
          body,
          headers: {
            "Content-Type": "application/json",
            [origin ? "Authorization" : actionSessionHeader]: origin
              ? `Bearer ${credential}`
              : credential,
          },
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal,
        });
        try {
          if (response.redirected || response.headers.has("content-encoding"))
            throw new Error("Unexpected response");
          const bytes = await boundedJsonBytes(
            response,
            signal,
            protocol.limits.responseBytes,
          );
          const value = await receiveConversationResponse(
            route,
            response.status,
            bytes,
            request,
          );
          signal.throwIfAborted();
          if (!isCurrent()) throw new Error("Feedback session ended");
          if ("error" in value) {
            if (accessLost.has(value.error.code)) onAccessLost();
            return definite.has(value.error.code)
              ? { kind: "refused" as const, code: value.error.code }
              : { kind: "unknown" as const };
          }
          const receipts =
            "receipt" in value ? [value.receipt] : value.receipts;
          if (
            receipts.some(
              (r) =>
                r.actorId !== context.actorId ||
                r.conversationId !== context.conversationId,
            )
          )
            throw new Error("Feedback scope mismatch");
          return { kind: "ok" as const, value };
        } finally {
          if (!response.bodyUsed)
            void response.body?.cancel().catch(() => undefined);
        }
      });
    } catch {
      return dispatched
        ? { kind: "unknown" as const }
        : { kind: "not_sent" as const };
    } finally {
      active--;
    }
  }
  return {
    pending: () => active > 0,
    async record(input, signal) {
      const reply = await exchange("feedback", input, signal);
      return reply.kind !== "ok"
        ? reply
        : "receipt" in reply.value
          ? { kind: "ok", value: reply.value }
          : { kind: "unknown" };
    },
    async read(runId, signal) {
      const reply = await exchange("feedback-read", { runId }, signal);
      return reply.kind !== "ok"
        ? reply
        : "receipts" in reply.value
          ? { kind: "ok", value: reply.value }
          : { kind: "unknown" };
    },
  };
}
