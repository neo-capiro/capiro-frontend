import { readConversationTranscript } from "../meri-conversations/history-client";
import { conversationInClient } from "../meri-conversations/history-pages";

/** Select only a saved run of this conversation; an unpinned session can reserve a new turn. */
export async function documentSessionContext({
  account,
  clientId,
  conversationId,
  signal,
  fetcher,
}: {
  account: { tenantId: string; actorId: string };
  clientId: string;
  conversationId: string;
  signal: AbortSignal;
  fetcher: typeof fetch;
}) {
  const page = await readConversationTranscript(
    { conversationId, limit: 1 },
    signal,
    fetcher,
  );
  if (
    page.conversation.conversationId !== conversationId ||
    !conversationInClient(page.conversation, account, clientId) ||
    page.pendingTurn ||
    page.latestRun.state === "cancelled"
  )
    throw new Error(
      "The current document conversation has no available saved run.",
    );
  return { conversationId, clientId, runId: page.latestRun.binding.runId };
}
