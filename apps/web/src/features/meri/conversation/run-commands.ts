import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import type { ConversationIntent } from "../../../shared/meri-conversations/query-journal";
import {
  storedSubmission,
  submissionIdentity,
} from "../../../shared/meri-conversations/query-journal";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";

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
  initial = false,
) {
  const retained = intent.read().submit;
  if ((!retry && retained) || (retry && !retained))
    throw new ConversationUnavailable("retained-submit-intent");
  const input = retry
    ? retained!
    : {
        requestId: crypto.randomUUID(),
        prompt,
        state: "pending" as const,
        ...(initial ? { workflow: "initial" as const } : {}),
      };
  intent.write({ ...intent.read(), submit: { ...input, state: "pending" } });
  try {
    if (retry && port.getSnapshot().submit === "unknown")
      await port.retrySubmit();
    else {
      const { state: _state, workflow, ...request } = input;
      if (workflow === "initial") await port.submitInitial(request);
      else await port.submit(request);
    }
    intent.write({ ...intent.read(), submit: { ...input, state: "observed" } });
  } catch (cause) {
    intent.write({ ...intent.read(), submit: { ...input, state: "unknown" } });
    throw cause;
  }
}

/** Only a positive canonical stored request can restore lost local input identity. */
export async function recoverRequest(
  port: MeriConversationPort,
  intent: IntentRecord,
  stored: ConversationStoredRequest,
) {
  const request = storedSubmission(stored),
    retained = intent.read().submit;
  if (retained) {
    const { state: _state, workflow: _workflow, ...previous } = retained;
    if (submissionIdentity(previous) !== submissionIdentity(request))
      throw new ConversationUnavailable("retained-submit-mismatch");
  }
  // Canonical stored input already exists. A recreated port can use ordinary admission;
  // a still-live unknown SDK operation retains and retries its own exact original workflow.
  intent.write({ ...intent.read(), submit: { ...request, state: "unknown" } });
  return sendRequest(port, intent, request.prompt, true);
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
