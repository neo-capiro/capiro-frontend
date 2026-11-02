import {
  ConversationUnavailable,
  EDGE_REFUSED,
} from "@capiro/meri-client/conversation";
import { ConversationHistoryUnavailable } from "../../../shared/meri-conversations/history-client";

/**
 * A command that Capiro's conversation control never answered, or that the shared edge refused
 * before control saw it. Neither is a refusal of the person's access nor proof that anything is in
 * flight: the retained request is kept and may be retried as the same request.
 */
export type ControlFailure = "unreachable" | "refused";

/** Control did not answer; nothing is known to be refused or in flight. */
export const controlUnreachableMessage =
  "Capiro is not reachable right now. Try again in a moment.";
/** The edge refused the message before control saw it; the same message can be sent again. */
export const inputRefusedMessage =
  "Capiro could not accept this message. Try again in a moment.";
/** A read that control did not answer is re-read on a backed-off schedule; nothing is resent. */
export const controlReconnectingMessage =
  "Capiro is not reachable right now. Your conversation is safe; we'll reconnect automatically.";

/** Gateway, overload and deadline answers from the same-origin proxy. */
export const transientStatus = (status: number | undefined) =>
  status !== undefined && (status === 408 || status === 429 || status >= 500);

export function controlFailure(cause: unknown): ControlFailure | undefined {
  if (cause instanceof ConversationHistoryUnavailable)
    return cause.status === 403
      ? "refused"
      : transientStatus(cause.status)
        ? "unreachable"
        : undefined;
  if (cause instanceof ConversationUnavailable)
    return cause.code === EDGE_REFUSED
      ? "refused"
      : transientStatus(cause.status)
        ? "unreachable"
        : undefined;
  // fetch rejects with a TypeError when the network fails; the request deadline aborts.
  if (cause instanceof TypeError) return "unreachable";
  if (
    cause instanceof DOMException &&
    (cause.name === "AbortError" || cause.name === "TimeoutError")
  )
    return "unreachable";
  return undefined;
}

export const controlFailureMessage = (failure: ControlFailure) =>
  failure === "refused" ? inputRefusedMessage : controlUnreachableMessage;
