import {
  receiveConversationLifecycleRequest,
  type ConversationLifecycleControlRequest,
} from "@capiro/meri-contracts/conversation-lifecycle";
import type { ConversationContext } from "../meri-conversations/session";
import {
  tabRecord,
  requireMeriTabStorage,
  TabJournalUnavailable,
  type TabStorage,
} from "../meri-conversations/tab-journal";

const receive = (value: unknown) =>
  receiveConversationLifecycleRequest(
    "control",
    new TextEncoder().encode(JSON.stringify(value)),
  );
const same = (
  left: ConversationLifecycleControlRequest,
  right: ConversationLifecycleControlRequest,
) =>
  left.controlId === right.controlId &&
  left.intent === right.intent &&
  (left.intent !== "steer" ||
    (right.intent === "steer" && left.text === right.text)) &&
  (left.intent !== "approval.wait" ||
    (right.intent === "approval.wait" &&
      left.proposalId === right.proposalId)) &&
  (!("checkpointId" in left) ||
    ("checkpointId" in right &&
      left.checkpointId === right.checkpointId &&
      left.checkpointSha256 === right.checkpointSha256));

/** One exact unresolved control per source run, in the existing signed-in tab journal. */
export function lifecycleJournal(
  context: ConversationContext,
  storage?: TabStorage,
) {
  const available = requireMeriTabStorage(storage);
  if (!available) throw new TabJournalUnavailable();
  const record = tabRecord<ConversationLifecycleControlRequest>(
    { ...context, clientId: context.selectedClientId },
    "lifecycle",
    receive,
    context.runId,
    available,
  );
  return {
    current: record.current,
    read: record.read,
    retain(command: ConversationLifecycleControlRequest) {
      const retained = record.read();
      if (retained && !same(retained, command))
        throw new TabJournalUnavailable();
      record.write(command);
      return record.read()!;
    },
    clear(command: ConversationLifecycleControlRequest) {
      const retained = record.read();
      if (retained && same(retained, command)) {
        record.clear();
        if (record.read() !== undefined) throw new TabJournalUnavailable();
      }
    },
  };
}
