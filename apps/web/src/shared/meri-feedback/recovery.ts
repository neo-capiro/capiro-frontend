import {
  receiveConversationRequest,
  receiveConversationResponse,
  type ConversationFeedbackRequest,
  type ConversationFeedbackReceipt,
} from "@capiro/meri-contracts/conversation-application";
import type { ConversationContext } from "../meri-conversations/session";
import {
  tabRecord,
  requireMeriTabStorage,
  TabJournalUnavailable,
  type TabStorage,
} from "../meri-conversations/tab-journal";
const encode = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const receive = (value: unknown) =>
  receiveConversationRequest("feedback", encode(value));

/** One unresolved request per run, reusing signed-in tab recovery across session renewal/reload. */
export function feedbackRecovery(
  context: ConversationContext,
  runId: string,
  storage?: TabStorage,
) {
  const available = requireMeriTabStorage(storage);
  if (!available) throw new TabJournalUnavailable();
  const record = tabRecord(
    { ...context, clientId: context.selectedClientId },
    "feedback",
    (value) => {
      const request = receive(value);
      if (request.target.runId !== runId) throw new TabJournalUnavailable();
      return request;
    },
    runId,
    available,
  );
  return {
    ...record,
    write(input: ConversationFeedbackRequest) {
      const pending = record.read();
      if (pending && JSON.stringify(pending) !== JSON.stringify(input))
        throw new TabJournalUnavailable();
      record.write(receive(input));
    },
  };
}

/** Readback must match every captured request field before uncertainty is released. */
export async function matchingFeedback(
  input: ConversationFeedbackRequest,
  receipts: readonly ConversationFeedbackReceipt[],
) {
  const receipt = receipts.find((value) => value.requestId === input.requestId);
  if (!receipt) return undefined;
  const response = await receiveConversationResponse(
    "feedback",
    200,
    encode({ receipt, replayed: true }),
    receive(input),
  );
  if ("error" in response) throw new Error("Feedback receipt mismatch");
  return response.receipt;
}
