"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { conversationHistoryMetadata as protocol } from "@capiro/meri-contracts/conversation-history";
import type { ConversationAccount } from "./host-controller";
import {
  listConversations,
  readConversationTranscript,
  type ConversationListPage,
  ConversationHistoryUnavailable,
} from "./history-client";
import {
  conversationInClient,
  discoveryConversations,
  transcriptPages,
} from "./history-pages";
const accessDenied = (error: unknown) =>
  error instanceof ConversationHistoryUnavailable &&
  ([401, 403].includes(error.status) || error.code === "MEMBERSHIP_CHANGED");

const transcriptKey = (
  account: ConversationAccount,
  clientId: string,
  conversationId?: string,
) => [
  "meri-conversation-transcript",
  account.tenantId,
  account.actorId,
  clientId,
  conversationId,
];

async function scopedTranscript(
  account: ConversationAccount,
  clientId: string,
  conversationId: string | undefined,
  after: number | undefined,
  signal: AbortSignal,
) {
  const page = await readConversationTranscript(
    { conversationId, after, limit: protocol.limits.pageItems },
    signal,
  );
  if (!conversationInClient(page.conversation, account, clientId))
    throw new Error("Conversation client mismatch");
  return page;
}

/** Read the latest run's lineage even when earlier conversation pages remain unloaded. */
function useLatestTranscript(
  account: ConversationAccount,
  clientId: string,
  conversationId: string | undefined,
  after: number | undefined,
) {
  return useQuery({
    queryKey: [
      ...transcriptKey(account, clientId, conversationId),
      "latest",
      after,
    ],
    enabled: after !== undefined,
    queryFn: ({ signal }) =>
      scopedTranscript(account, clientId, conversationId, after, signal),
    retry: false,
    staleTime: 0,
  });
}

/** Read failures and revalidation hide cached private data until the owner admits it again. */
export function useConversationDiscovery(
  account: ConversationAccount,
  clientId: string,
) {
  const query = useInfiniteQuery({
    queryKey: [
      "meri-conversation-list",
      account.tenantId,
      account.actorId,
      clientId,
    ],
    initialPageParam: null as ConversationListPage["nextBefore"],
    queryFn: async ({ pageParam: before, signal }) => {
      const page = await listConversations(
        { before, limit: protocol.defaults.limit },
        signal,
      );
      // Check every owner, including entries belonging to another permitted client.
      discoveryConversations([page], account, clientId);
      return page;
    },
    getNextPageParam: (page) => page.nextBefore ?? undefined,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  let conversations: ReturnType<typeof discoveryConversations> = [],
    invalid = false;
  if (query.data && !query.error && !query.isRefetching) {
    try {
      conversations = discoveryConversations(
        query.data.pages,
        account,
        clientId,
      );
    } catch {
      invalid = true;
    }
  }
  return { query, conversations, unavailable: !!query.error || invalid };
}

/** History and latest-run lineage use conversation cursors, never the SDK stream cursor. */
export function useConversationHistory(
  account: ConversationAccount,
  clientId: string,
  conversationId?: string,
) {
  const query = useInfiniteQuery({
    queryKey: transcriptKey(account, clientId, conversationId),
    enabled: !!conversationId,
    initialPageParam: protocol.defaults.after as number,
    queryFn: ({ pageParam: after, signal }) =>
      scopedTranscript(account, clientId, conversationId, after, signal),
    getNextPageParam: (page) => (page.hasMore ? page.nextSequence : undefined),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  let saved: ReturnType<typeof transcriptPages> | undefined,
    invalid = false;
  if (query.data && !query.error && !query.isRefetching) {
    try {
      saved = transcriptPages(query.data.pages, account, clientId);
    } catch {
      invalid = true;
    }
  }
  const latestBase = saved?.latest?.latestSequenceBase;
  const tail = useLatestTranscript(
    account,
    clientId,
    conversationId,
    latestBase,
  );
  const current =
    saved && !tail.error && !tail.isFetching ? tail.data : undefined;
  const denied = accessDenied(query.error) || accessDenied(tail.error);
  return {
    query,
    tail,
    saved: denied ? undefined : saved,
    current: denied ? undefined : current,
    denied,
    selected: !!conversationId,
    unavailable: !!query.error || invalid || denied,
    refresh: () => {
      if (conversationId) void query.refetch();
      if (latestBase !== undefined) void tail.refetch();
    },
  };
}
