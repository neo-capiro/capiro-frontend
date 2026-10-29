import type { FederalNativeSelection } from "@capiro/meri-contracts/federal-workbench";
import { conversationHistoryMetadata } from "@capiro/meri-contracts/conversation-history";
import type { ActionSessionReceipt } from "../meri-actions/session-receipt";
import { readConversationTranscript } from "../meri-conversations/history-client";
import { conversationInClient } from "../meri-conversations/history-pages";

export type FederalSourceChoice = Readonly<{
  eventId: string;
  selection: FederalNativeSelection;
}>;
export type FederalSourcePage = Readonly<{
  sources: readonly FederalSourceChoice[];
  nextAfter: number | null;
}>;

/** Existing native history supplies selectors only. Import re-reads current Core
 * authority and full official bytes; saved source metadata never grants access. */
export async function readFederalSources(
  context: ActionSessionReceipt["context"],
  after: number,
  signal: AbortSignal,
  read = readConversationTranscript,
): Promise<FederalSourcePage> {
  const page = await read(
    {
      conversationId: context.conversationId,
      after,
      limit: conversationHistoryMetadata.limits.pageItems,
    },
    signal,
  );
  signal.throwIfAborted();
  if (
    page.conversation.conversationId !== context.conversationId ||
    !conversationInClient(
      page.conversation,
      context,
      context.selectedClientId,
    ) ||
    page.nextSequence < after ||
    (page.hasMore && page.nextSequence === after)
  )
    throw new Error(
      "The source conversation changed. Reconnect to load sources.",
    );
  return {
    sources: page.events.flatMap(({ event }) => {
      if (event.type !== "source.native-bill-text") return [];
      const { billId, versionCode, revisionId, versionHash, textHash } =
        event.data.source;
      return [
        {
          eventId: event.eventId,
          selection: { billId, versionCode, revisionId, versionHash, textHash },
        },
      ];
    }),
    nextAfter: page.hasMore ? page.nextSequence : null,
  };
}
