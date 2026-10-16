import type { ConversationAccount } from "./host-controller";
import type {
  ConversationListPage,
  ConversationTranscriptPage,
} from "./history-client";

type SavedTurn = ConversationTranscriptPage["turns"][number];
type Conversation = ConversationListPage["conversations"][number];

/** The receiver validates each response. This layer correlates pages and the current UI scope. */
export function conversationInClient(
  conversation: Conversation,
  account: ConversationAccount,
  clientId: string,
) {
  if (
    conversation.owner.tenantId !== account.tenantId ||
    conversation.owner.actorId !== account.actorId
  )
    throw new Error("Conversation account mismatch");
  const clients = conversation.scopes.filter(
    (scope) => scope.kind === "client",
  );
  return (
    clients.length > 0 &&
    clients.every((scope) => scope.resourceId === clientId)
  );
}

export function discoveryConversations(
  pages: readonly ConversationListPage[],
  account: ConversationAccount,
  clientId: string,
) {
  const seen = new Set<string>();
  return pages.flatMap((page) =>
    page.conversations.filter((conversation) => {
      if (seen.has(conversation.conversationId))
        throw new Error("Repeated conversation page");
      seen.add(conversation.conversationId);
      return conversationInClient(conversation, account, clientId);
    }),
  );
}

/** Property order has no meaning in immutable admitted JSON identities. */
const identity = (value: unknown): string =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
const immutableTurn = ({
  run: { state: _state, ...run },
  lastSequence: _last,
  sequenceEnd: _end,
  ...turn
}: SavedTurn) => identity({ ...turn, run });
const requestContent = ({ requestId: _id, ...content }: SavedTurn["request"]) =>
  identity(content);

/** Conversation cursor is used only for these pages; original events retain their run-local sequence. */
export function transcriptPages(
  pages: readonly ConversationTranscriptPage[],
  account: ConversationAccount,
  clientId: string,
) {
  const turns = new Map<string, SavedTurn>(),
    eventIds = new Set<string>();
  const events: ConversationTranscriptPage["events"][number][] = [];
  let cursor = 0;
  const first = pages[0];
  for (const page of pages) {
    if (
      !conversationInClient(page.conversation, account, clientId) ||
      identity(page.conversation) !== identity(first!.conversation)
    )
      throw new Error("Conversation scope changed");
    for (const turn of page.turns) {
      const previous = turns.get(turn.run.binding.runId);
      if (
        previous &&
        (immutableTurn(previous) !== immutableTurn(turn) ||
          turn.lastSequence < previous.lastSequence ||
          (previous.sequenceEnd !== null &&
            previous.sequenceEnd !== turn.sequenceEnd))
      )
        throw new Error("Saved turn changed across pages");
      turns.set(turn.run.binding.runId, turn);
    }
    for (const wrapped of page.events) {
      if (wrapped.sequence !== ++cursor || eventIds.has(wrapped.event.eventId))
        throw new Error("Transcript page gap or duplicate");
      eventIds.add(wrapped.event.eventId);
      events.push(wrapped);
    }
    if (page.nextSequence !== cursor)
      throw new Error("Transcript cursor changed");
  }
  let previous: SavedTurn | undefined;
  const latest = pages.at(-1);
  for (const turn of turns.values()) {
    const end = turn.sequenceBase + turn.lastSequence;
    if (
      (previous &&
        previous.sequenceBase + previous.lastSequence !== turn.sequenceBase) ||
      (turn.run.binding.runId !== latest?.latestRun.binding.runId &&
        end > latest!.latestSequenceBase)
    )
      throw new Error("Saved run ranges overlap or have a gap");
    previous = turn;
    const lineage = turn.promptLineage;
    if (lineage.kind !== "resume") continue;
    const source = turns.get(lineage.sourceBinding.runId);
    if (
      source &&
      (identity(source.run.binding) !== identity(lineage.sourceBinding) ||
        source.request.requestId !== lineage.sourceRequestId ||
        source.promptLineage.logicalRequestId !== lineage.logicalRequestId ||
        requestContent(source.request) !== requestContent(turn.request))
    )
      throw new Error("Prompt lineage changed across pages");
  }
  return { turns: [...turns.values()], events, cursor, latest };
}
