import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import type { ConversationIntent } from "../../../shared/meri-conversations/query-journal";
import {
  storedSubmission,
  submissionIdentity,
} from "../../../shared/meri-conversations/query-journal";
import type {
  ConversationStoredRequest,
  ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";

/**
 * Meri answers the contract's 404 NOT_FOUND for a session's history before the conversation's
 * first run (runtime H1). There is nothing to read or observe yet; it is not a failure. A 404
 * never revokes the session (the client revokes only on 401/403).
 */
export const historyNotStarted = (cause: unknown) =>
  cause instanceof ConversationUnavailable && cause.code === "NOT_FOUND";

/** Reads and records nonsecret write uncertainty for the run's exact context. */
export type IntentRecord = Readonly<{
  read: () => ConversationIntent;
  write: (value: ConversationIntent) => void;
}>;

/** Match every original request field; normalized execution fields are not retry identity. */
export function matchesStoredRequest(
  retained: ConversationIntent["submit"],
  stored: ConversationStoredRequest,
) {
  if (!retained) return false;
  const request = { ...retained };
  Reflect.deleteProperty(request, "state");
  Reflect.deleteProperty(request, "workflow");
  return (
    submissionIdentity(request) === submissionIdentity(storedSubmission(stored))
  );
}

/** Positive exact-run history can resolve delivery uncertainty without sending anything. */
export async function reconcileStoredRequest(
  port: MeriConversationPort,
  intent: IntentRecord,
  stored: ConversationStoredRequest,
) {
  const retained = intent.read().submit;
  const snapshot = port.getSnapshot();
  if (
    retained?.state !== "unknown" ||
    snapshot.status !== "ready" ||
    !snapshot.observation ||
    snapshot.observation.runState === "queued"
  )
    return;
  if (!matchesStoredRequest(retained, stored))
    throw new ConversationUnavailable("retained-submit-mismatch");
  intent.write({
    ...intent.read(),
    submit: { ...retained, state: "observed" },
  });
}

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
  onRecorded?: (request: ConversationSubmitRequest) => void,
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
  const { state: _state, workflow, ...request } = input;
  try {
    if (!retry) onRecorded?.(request);
    if (retry && port.getSnapshot().submit === "unknown")
      await port.retrySubmit();
    else {
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
  if (retained && !matchesStoredRequest(retained, stored))
    throw new ConversationUnavailable("retained-submit-mismatch");
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
