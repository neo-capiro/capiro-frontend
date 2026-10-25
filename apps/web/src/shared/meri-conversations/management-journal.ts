import { receiveConversationHistoryRequest } from "@capiro/meri-contracts/conversation-history";
import {
  tabRecord,
  requireMeriTabStorage,
  TabJournalUnavailable,
  type TabScope,
  type TabStorage,
} from "./tab-journal";
import {
  manageConversation,
  ConversationHistoryUnavailable,
  type ConversationHistoryManageRequest,
} from "./history-client";

const sameCommand = (
  left: ConversationHistoryManageRequest,
  right: ConversationHistoryManageRequest,
) =>
  left.version === right.version &&
  left.requestId === right.requestId &&
  left.conversationId === right.conversationId &&
  left.expectedRevision === right.expectedRevision &&
  left.operation === right.operation &&
  (left.operation !== "rename" ||
    (right.operation === "rename" && left.title === right.title));

/** Reuse the same-tab account owner; only an exact canonical command is retained. */
export function managementJournal(scope: TabScope, storage?: TabStorage) {
  const available = requireMeriTabStorage(storage);
  if (!available) throw Error("Management recovery unavailable");
  const record = tabRecord<ConversationHistoryManageRequest>(
    scope,
    "management",
    (value) => {
      const request = receiveConversationHistoryRequest(
        "manage",
        new TextEncoder().encode(JSON.stringify(value)),
      );
      if (request.conversationId !== scope.conversationId)
        throw Error("Management scope mismatch");
      return request;
    },
    "",
    available,
  );
  return {
    current: record.current,
    read: record.read,
    write(command: ConversationHistoryManageRequest) {
      const retained = record.read();
      if (retained && !sameCommand(retained, command))
        throw new TabJournalUnavailable();
      record.write(command);
    },
    clear(command: ConversationHistoryManageRequest) {
      const retained = record.read();
      if (retained && sameCommand(retained, command)) {
        record.clear();
        if (record.read() !== undefined) throw new TabJournalUnavailable();
      }
    },
  };
}

/** Clear only an admitted success or definitive CAS/expiry refusal; uncertainty retains exact bytes. */
export async function submitManagementChange(
  journal: ReturnType<typeof managementJournal>,
  clientId: string | null,
  command: ConversationHistoryManageRequest,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  journal.write(command);
  try {
    const receipt = await manageConversation(command, signal, fetcher);
    if (!journal.current() || receipt.conversation.clientId !== clientId)
      throw Error("Management scope changed");
    journal.clear(command);
    return receipt;
  } catch (error) {
    if (
      error instanceof ConversationHistoryUnavailable &&
      (error.code === "CONVERSATION_MANAGEMENT_CONFLICT" ||
        error.code === "CONVERSATION_RESTORE_EXPIRED") &&
      error.outcome === "NOT_DISPATCHED"
    )
      journal.clear(command);
    throw error;
  }
}
