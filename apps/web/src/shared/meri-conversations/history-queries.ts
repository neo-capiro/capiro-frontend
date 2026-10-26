"use client";
import { useEffect } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { conversationHistoryMetadata as protocol } from "@capiro/meri-contracts/conversation-history";
import type { ConversationAccount } from "./host-controller";
import {
  listConversations,
  readConversationTranscript,
  type ConversationListPage,
  ConversationHistoryUnavailable,
  summarizeConversations,
  MANAGEMENT_VERSION,
} from "./history-client";
import { useManagementRefresh } from "./management-refresh";
import {
  conversationInClient,
  discoveryConversations,
  transcriptPages,
} from "./history-pages";
const accessDenied = (error: unknown) =>
  error instanceof ConversationHistoryUnavailable &&
  ([401, 403].includes(error.status) || error.code === "MEMBERSHIP_CHANGED");
/** Empty-history presentation only; not-found never proves ownership or grants admission. */
export const historyNotStarted = (error: unknown) =>
  error instanceof ConversationHistoryUnavailable &&
  error.status === 404 &&
  (error.code === "NOT_FOUND" || error.code === "CONVERSATION_NOT_FOUND");
/**
 * The durable owner's statement that the owned conversation has no run at all (`NOT_FOUND` on an
 * owned, valid zero-run record). `CONVERSATION_NOT_FOUND` (missing, foreign or trashed) does not
 * count. Still no ownership proof and no admission; it only says nothing has started.
 */
export const historyUnstarted = (error: unknown) =>
  error instanceof ConversationHistoryUnavailable &&
  error.status === 404 &&
  error.code === "NOT_FOUND";

/** One bounded title page enriches Recents without replacing scheduled discovery. */
export function useRecentConversationTitles(account: ConversationAccount) {
  useManagementRefresh(account, true);
  const query = useQuery({
    queryKey: [
      "meri-owned-titles",
      account.tenantId,
      account.actorId,
      "recents",
    ],
    queryFn: ({ signal }) =>
      summarizeConversations(
        {
          version: MANAGEMENT_VERSION,
          status: "active",
          title: "",
          before: null,
        },
        signal,
      ),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return query.isSuccess && !query.isFetching && !query.error
    ? query.data.conversations
    : undefined;
}

const transcriptKey = (
  account: ConversationAccount,
  clientId: string | null,
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
  clientId: string | null,
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

/** Revoke only private read material; exact command/selection identities retain their existing owners. */
export function clearConversationReads(
  cache: QueryClient,
  account: ConversationAccount,
  clientId: string | null,
) {
  const filters = {
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const [kind, tenant, actor, client] = query.queryKey;
      return (
        (kind === "meri-conversation-transcript" ||
          kind === "meri-conversation-list") &&
        tenant === account.tenantId &&
        actor === account.actorId &&
        client === clientId
      );
    },
  };
  void cache.cancelQueries(filters);
  cache.removeQueries(filters);
}

/** Read the latest run's lineage even when earlier conversation pages remain unloaded. */
function useLatestTranscript(
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string | undefined,
  after: number | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...transcriptKey(account, clientId, conversationId),
      "latest",
      after,
    ],
    enabled: enabled && after !== undefined,
    queryFn: ({ signal }) =>
      scopedTranscript(account, clientId, conversationId, after, signal),
    retry: false,
    staleTime: 0,
  });
}

/** Read failures and revalidation hide cached private data until the owner admits it again. */
export function useConversationDiscovery(
  account: ConversationAccount,
  clientId: string | null,
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
      // The shared edge WAF's SQL-injection body rule blocks `{"before":null,"limit":50}` and a bare `limit`
      // (it reads like SQL `LIMIT n`). The first page sends the protocol defaults implicitly as `{}`.
      const page = await listConversations(
        before === null ? {} : { before, limit: protocol.defaults.limit },
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
  clientId: string | null,
  conversationId?: string,
  enabled = true,
) {
  const cache = useQueryClient();
  const { tenantId, actorId } = account;
  useEffect(() => {
    if (!enabled)
      clearConversationReads(cache, { tenantId, actorId }, clientId);
  }, [cache, tenantId, actorId, clientId, enabled]);
  const query = useInfiniteQuery({
    queryKey: transcriptKey(account, clientId, conversationId),
    enabled: enabled && !!conversationId,
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
  if (enabled && query.data && !query.error && !query.isRefetching) {
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
    enabled,
  );
  const current =
    saved && !tail.error && !tail.isFetching ? tail.data : undefined;
  const denied =
    enabled && (accessDenied(query.error) || accessDenied(tail.error));
  const empty = !!conversationId && historyNotStarted(query.error);
  return {
    query,
    tail,
    saved: denied ? undefined : saved,
    current: denied ? undefined : current,
    denied,
    selected: !!conversationId,
    /** No turn has run yet; there is no saved history to show, which is not a failure. */
    empty,
    /** The owner answered that this conversation has no run; the last answer stays while reads are disabled. */
    unstarted: !!conversationId && !denied && historyUnstarted(query.error),
    unavailable: (!!query.error && !empty) || invalid || denied,
    refresh: () => {
      if (enabled && conversationId) void query.refetch();
      if (enabled && latestBase !== undefined) void tail.refetch();
    },
  };
}
