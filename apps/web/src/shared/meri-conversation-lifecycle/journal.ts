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
/** An answer is identified by the question it answers and the exact labels submitted, key order included out of the
 * comparison by sorting: two different answers to the same question must never be treated as the same retained control. */
const answerBytes = (
  answers: Readonly<Record<string, string | readonly string[]>>,
) =>
  JSON.stringify(
    Object.keys(answers)
      .sort()
      .map((key) => [
        key,
        typeof answers[key] === "string" ? answers[key] : [...(answers[key] as readonly string[])],
      ]),
  );
const same = (
  left: ConversationLifecycleControlRequest,
  right: ConversationLifecycleControlRequest,
) =>
  left.controlId === right.controlId &&
  left.intent === right.intent &&
  (left.intent !== "answer" ||
    (right.intent === "answer" &&
      left.questionId === right.questionId &&
      answerBytes(left.answers) === answerBytes(right.answers))) &&
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
