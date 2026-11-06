"use client";
import type { ResearchSelection } from "./research-context";
import type { OpeningCapture } from "./opening-capture";
import { useEffect } from "react";
import {
  infiniteQueryOptions,
  queryOptions,
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
  type ConversationTranscriptResult,
  isEmptyTranscript,
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
/** The closed access refusal of a history read: the person's access, never a missing feature. */
export const accessDenied = (error: unknown) =>
  error instanceof ConversationHistoryUnavailable &&
  ([401, 403].includes(error.status) || error.code === "MEMBERSHIP_CHANGED");
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
  research?: ResearchSelection,
) => [
  "meri-conversation-transcript",
  account.tenantId,
  account.actorId,
  clientId,
  conversationId,
  ...(research ? [research.scopeKind, research.scope] : []),
];

async function scopedTranscript(
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string | undefined,
  after: number | undefined,
  signal: AbortSignal,
  research?: ResearchSelection,
  capture?: OpeningCapture,
) {
  const page = await readConversationTranscript(
    { conversationId, after, limit: protocol.limits.pageItems },
    signal,
  );
  if (
    page.conversation.conversationId !== conversationId ||
    !conversationInClient(page.conversation, account, clientId, research)
  )
    throw new Error("Conversation client mismatch");
  if (isEmptyTranscript(page)) return page;
  // A page that claims more without moving the cursor is a failed read, never a silent end.
  if (page.hasMore && page.nextSequence <= (after ?? protocol.defaults.after))
    throw new Error("Transcript page did not advance");
  capture?.history(page);
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
export function latestTranscriptQuery(
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string | undefined,
  after: number | undefined,
  enabled: boolean,
  research?: ResearchSelection,
  capture?: OpeningCapture,
) {
  return queryOptions({
    queryKey: [
      ...transcriptKey(account, clientId, conversationId, research),
      "latest",
      after,
    ],
    enabled: enabled && after !== undefined,
    queryFn: async ({ signal }) => {
      const page = await scopedTranscript(
        account,
        clientId,
        conversationId,
        after,
        signal,
        research,
        capture,
      );
      // A positive saved page already identified a run, even when its sequence base is zero.
      if (isEmptyTranscript(page))
        throw new Error("Latest saved run unavailable");
      return page;
    },
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

/** Saved pages are read forward from the first event, one bounded page per request. */
export function savedTranscriptQuery(
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string | undefined,
  enabled: boolean,
  research?: ResearchSelection,
  capture?: OpeningCapture,
) {
  return infiniteQueryOptions({
    queryKey: transcriptKey(account, clientId, conversationId, research),
    enabled: enabled && !!conversationId,
    initialPageParam: protocol.defaults.after as number,
    queryFn: ({ pageParam: after, signal }) =>
      scopedTranscript(
        account,
        clientId,
        conversationId,
        after,
        signal,
        research,
        capture,
      ),
    getNextPageParam: (page) =>
      !isEmptyTranscript(page) && page.hasMore ? page.nextSequence : undefined,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

type SavedTranscriptQuery = {
  data: { pages: ConversationTranscriptResult[] } | undefined;
  error: unknown;
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchNextPageError: boolean;
  isRefetching: boolean;
};

/**
 * The first page stops at the page size, not at the conversation's end, while the latest run is
 * read on its own: shown together they would skip every turn in between, so the read continues
 * by itself until the whole saved transcript is loaded. Only a continuation that failed waits
 * for a manual retry.
 */
export const nextSavedPageDue = (
  query: Pick<SavedTranscriptQuery, "hasNextPage" | "isFetching" | "error">,
) => query.hasNextPage && !query.isFetching && !query.error;

/** Pages already admitted by this read stay on screen while the rest loads or after a continuation failed. */
export function savedHistory(
  query: SavedTranscriptQuery,
  enabled: boolean,
  account: ConversationAccount,
  clientId: string | null,
  research?: ResearchSelection,
) {
  const moreFailed =
    !!query.error && query.isFetchNextPageError && !accessDenied(query.error);
  let saved: ReturnType<typeof transcriptPages> | undefined,
    invalid = false,
    empty = false;
  // A re-read of the admitted pages hides them until the owner admits them again.
  if (
    enabled &&
    query.data &&
    (!query.error || moreFailed) &&
    !query.isRefetching
  ) {
    try {
      const pages = query.data.pages;
      const populated = pages.filter((page) => !isEmptyTranscript(page));
      if (populated.length !== pages.length) {
        if (
          pages.length !== 1 ||
          !conversationInClient(
            pages[0]!.conversation,
            account,
            clientId,
            research,
          )
        )
          throw new Error("Empty transcript changed across pages");
        empty = true;
      } else saved = transcriptPages(populated, account, clientId, research);
    } catch {
      invalid = true;
    }
  }
  return { saved, invalid, moreFailed, empty };
}

/** History and latest-run lineage use conversation cursors, never the SDK stream cursor. */
export function useConversationHistory(
  account: ConversationAccount,
  clientId: string | null,
  conversationId?: string,
  enabled = true,
  research?: ResearchSelection,
  capture?: OpeningCapture,
) {
  const cache = useQueryClient();
  const { tenantId, actorId } = account;
  useEffect(() => {
    if (!enabled)
      clearConversationReads(cache, { tenantId, actorId }, clientId);
  }, [cache, tenantId, actorId, clientId, enabled]);
  const query = useInfiniteQuery(
    savedTranscriptQuery(
      account,
      clientId,
      conversationId,
      enabled,
      research,
      capture,
    ),
  );
  const { hasNextPage, isFetching, error, fetchNextPage } = query;
  const selected = enabled && !!conversationId;
  useEffect(() => {
    if (selected && nextSavedPageDue({ hasNextPage, isFetching, error }))
      void fetchNextPage();
  }, [selected, hasNextPage, isFetching, error, fetchNextPage]);
  const { saved, invalid, moreFailed, empty } = savedHistory(
    query,
    enabled,
    account,
    clientId,
    research,
  );
  const latestBase = saved?.latest?.latestSequenceBase;
  const tail = useQuery(
    latestTranscriptQuery(
      account,
      clientId,
      conversationId,
      latestBase,
      enabled,
      research,
      capture,
    ),
  );
  const current =
    saved && !tail.error && !tail.isFetching && tail.data
      ? tail.data
      : undefined;
  const denied =
    enabled && (accessDenied(query.error) || accessDenied(tail.error));
  return {
    query,
    tail,
    saved: denied ? undefined : saved,
    current: denied ? undefined : current,
    denied,
    selected: !!conversationId,
    /** No turn has run yet; there is no saved history to show, which is not a failure. */
    empty,
    /** The pages after those shown could not be read; the shown pages are kept. */
    moreFailed: moreFailed && !denied,
    unavailable: (!!query.error && !empty && !moreFailed) || invalid || denied,
    refresh: () => {
      if (enabled && conversationId) void query.refetch();
      if (enabled && latestBase !== undefined) void tail.refetch();
    },
  };
}
