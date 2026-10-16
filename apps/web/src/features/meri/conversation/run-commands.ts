import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import type { ConversationIntent } from "../../../shared/meri-conversations/query-journal";

/** Reads and records nonsecret write uncertainty for the run's exact context. */
export type IntentRecord = Readonly<{
  read: () => ConversationIntent;
  write: (value: ConversationIntent) => void;
}>;

/**
 * Sends the run's single request, or retries the exact retained one. A failure after dispatch is
 * recorded as uncertain so the same request id and prompt are retried, never a new request.
 */
export async function sendRequest(
  port: MeriConversationPort,
  intent: IntentRecord,
  prompt: string,
  retry: boolean,
) {
  const retained = intent.read().submit;
  if ((!retry && retained) || (retry && !retained))
    throw new ConversationUnavailable("retained-submit-intent");
  const input = retry
    ? retained!
    : { requestId: crypto.randomUUID(), prompt, state: "pending" as const };
  intent.write({ ...intent.read(), submit: { ...input, state: "pending" } });
  try {
    if (retry && port.getSnapshot().submit === "unknown")
      await port.retrySubmit();
    else
      await port.submit({ requestId: input.requestId, prompt: input.prompt });
    intent.write({ ...intent.read(), submit: { ...input, state: "observed" } });
  } catch (cause) {
    intent.write({ ...intent.read(), submit: { ...input, state: "unknown" } });
    throw cause;
  }
}

/** Requests durable cancellation. The receipt is not the run's status. */
export async function requestStop(
  port: MeriConversationPort,
  intent: IntentRecord,
) {
  intent.write({ ...intent.read(), cancel: "pending" });
  try {
    await port.cancel();
    intent.write({ ...intent.read(), cancel: "observed" });
  } catch (cause) {
    intent.write({ ...intent.read(), cancel: "unknown" });
    throw cause;
  }
}
