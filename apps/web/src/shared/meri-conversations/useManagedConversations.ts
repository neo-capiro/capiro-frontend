"use client";
import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { useManagementRefresh } from "./management-refresh";
import { useIdentity } from "../portfolio/auth/identity";
import {
  ConversationHistoryUnavailable,
  summarizeConversations,
  MANAGEMENT_VERSION,
  type ConversationSummary,
} from "./history-client";

type TitlesScope = { tenantId: string; actorId: string };

/**
 * A next page that timed out is the only closed refusal that asks for the same read again.
 * Every other status is a refusal, an unknown upstream failure or an unreadable answer: none of
 * them may be presented as a page retried over admitted rows.
 */
export const pageTimedOut = (error: unknown) =>
  error instanceof ConversationHistoryUnavailable &&
  error.status === 408 &&
  error.code === "DEADLINE";

/** One infinite title query; its key carries the whole remote scope, so a new scope never reuses it. */
export const managedTitleQuery = (
  scope: TitlesScope | undefined,
  status: ConversationSummary["status"],
  title: string,
  enabled = true,
) =>
  infiniteQueryOptions({
    queryKey: [
      "meri-owned-titles",
      scope?.tenantId,
      scope?.actorId,
      status,
      title.trim(),
    ],
    enabled: enabled && Boolean(scope),
    staleTime: 0,
    retry: false,
    initialPageParam: null as {
      updatedAt: string;
      conversationId: string;
    } | null,
    queryFn: ({ signal, pageParam }) =>
      summarizeConversations(
        {
          version: MANAGEMENT_VERSION,
          status,
          title: title.trim(),
          before: pageParam,
        },
        signal,
      ),
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });

type TitlesResult = {
  data:
    | { pages: readonly { conversations: readonly ConversationSummary[] }[] }
    | undefined;
  error: unknown;
  isSuccess: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
};

/**
 * Admitted rows stay on screen for the same query's in-flight or timed-out next page only, so a
 * failure after the first page no longer erases what an admitted read already returned.
 * Write availability keeps the stricter full-read rule: neither a page fetch nor a page failure
 * is current, so retained rows acquire no mutation authority.
 */
export function managedTitlesView(
  scope: TitlesScope | undefined,
  result: TitlesResult,
) {
  const retained =
    Boolean(scope) && result.isFetchNextPageError && pageTimedOut(result.error);
  const current =
    Boolean(scope) && result.isSuccess && !result.isFetching && !result.error;
  const summaries =
    scope && result.data && (!result.error || retained)
      ? result.data.pages.flatMap((page) => page.conversations)
      : [];
  return {
    current,
    retained,
    summaries,
    shown: Boolean(scope) && (current || result.isFetchingNextPage || retained),
  };
}

export function useManagedConversations(
  title: string,
  status: ConversationSummary["status"] = "active",
  enabled = true,
) {
  const identity = useIdentity();
  const account =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const scope = account?.tenant?.id
    ? { tenantId: account.tenant.id, actorId: account.user.id }
    : undefined;
  useManagementRefresh(scope, enabled);
  const query = useInfiniteQuery(
    managedTitleQuery(scope, status, title, enabled),
  );
  return { query, scope, ...managedTitlesView(scope, query) };
}
