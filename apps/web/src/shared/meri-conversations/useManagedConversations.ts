"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useManagementRefresh } from "./management-refresh";
import { useIdentity } from "../portfolio/auth/identity";
import {
  summarizeConversations,
  MANAGEMENT_VERSION,
  type ConversationSummary,
} from "./history-client";

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
  const query = useInfiniteQuery({
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
  return {
    query,
    scope,
    current:
      Boolean(scope) && query.isSuccess && !query.isFetching && !query.error,
  };
}
