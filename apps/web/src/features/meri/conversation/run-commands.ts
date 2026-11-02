import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import type { ConversationIntent } from "../../../shared/meri-conversations/query-journal";
import {
  storedSubmission,
  submissionIdentity,
  skillSelectionFields,
  type ConversationSkillSelection,
} from "../../../shared/meri-conversations/query-journal";
import type {
  ConversationStoredRequest,
  ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";
import { receiveConversationInputRequest } from "@capiro/meri-contracts/conversation-input";

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
  const saved = { ...storedSubmission(stored) };
  // Admission resolves omitted defaults/inheritance into the stored request.
  // Only an originally explicit choice is part of the retained input identity.
  if (request.modelSelection === undefined) delete saved.modelSelection;
  return submissionIdentity(request) === submissionIdentity(saved);
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
 *
 * Attachments attach at this one funnel: a new request carries the exact ordered argument the
 * session's upload access holds, and a retry or recovery re-sends the retained request verbatim, so
 * no retry can ever declare or write an original again.
 *
 * The selected-input funnel carries every explicit choice, the Start Work / Delegate definition
 * included. An installed contract that does not admit a work definition refuses the proposal here,
 * before the journal write, so the refusal is fail-closed and dispatches nothing.
 */
export async function sendRequest(
  port: MeriConversationPort,
  intent: IntentRecord,
  prompt: string,
  retry: boolean,
  initial = false,
  onRecorded?: (request: ConversationSubmitRequest) => void,
  modelSelection?: ConversationSubmitRequest["modelSelection"],
  selection: ConversationSkillSelection = {},
) {
  const retained = intent.read().submit;
  if ((!retry && retained) || (retry && !retained))
    throw new ConversationUnavailable("retained-submit-intent");
  // Only a stored attempt enters the argument: an uncertain write is never sent as if it were stored.
  // The one port factory always binds this access, and a port without it can offer no selection at
  // all, so nothing a person chose can be dropped here.
  const uploads = retry ? [] : (port.uploads?.sendArgument() ?? []);
  const input = retry
    ? retained!
    : {
        requestId: crypto.randomUUID(),
        prompt,
        ...skillSelectionFields(selection),
        ...(uploads.length ? { uploads } : {}),
        ...(modelSelection
          ? { modelSelection: Object.freeze({ ...modelSelection }) }
          : {}),
        state: "pending" as const,
        ...(initial ? { workflow: "initial" as const } : {}),
      };
  const { workflow, ...proposal } = input;
  Reflect.deleteProperty(proposal, "state");
  // The canonical public receiver is the only constructor of a request this app may submit, and it is
  // what gives the attachments field its exact tuple type. A locally shaped object is a proposal until
  // it admits it, so a locally refused request leaves the journal untouched and dispatches nothing.
  const request = receiveConversationInputRequest(
    new TextEncoder().encode(JSON.stringify(proposal)),
  );
  // Only the admitted request is journaled: the retained identity is the canonical one, plus the two
  // local fields this page owns (its own uncertainty and its local recovery route).
  const journal = {
    ...request,
    ...(workflow ? { workflow: "initial" as const } : {}),
  };
  intent.write({ ...intent.read(), submit: { ...journal, state: "pending" } });
  try {
    if (!retry) onRecorded?.(request);
    if (retry && port.getSnapshot().submit === "unknown")
      await port.retrySubmit();
    else {
      // A successful history read already admitted this run. An explicit retry then
      // uses ordinary admission with the original bytes, without allocating it again.
      if (workflow === "initial" && (!retry || !port.getSnapshot().observation))
        await port.submitInitial(request);
      else await port.submit(request);
    }
    intent.write({
      ...intent.read(),
      submit: { ...journal, state: "observed" },
    });
  } catch (cause) {
    intent.write({
      ...intent.read(),
      submit: { ...journal, state: "unknown" },
    });
    throw cause;
  }
}

/** Only a positive canonical stored request can restore lost local input identity. */
export async function recoverRequest(
  port: MeriConversationPort,
  intent: IntentRecord,
  stored: ConversationStoredRequest,
) {
  const request = { ...storedSubmission(stored) },
    retained = intent.read().submit;
  if (retained && !matchesStoredRequest(retained, stored))
    throw new ConversationUnavailable("retained-submit-mismatch");
  if (retained && retained.modelSelection === undefined)
    delete request.modelSelection;
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
