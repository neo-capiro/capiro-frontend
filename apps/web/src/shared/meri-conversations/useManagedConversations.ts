"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useManagementRefresh } from "./management-refresh";
import { useCapiro } from "../capiro/CapiroBoundary";
import { useIdentity } from "../portfolio/auth/identity";
import {
  managedListKey,
  managedListReceipt,
  managementVersion,
  type ManagedConversation,
} from "../capiro/operations/meri-conversation-management";

export function useManagedConversations(
  title: string,
  status: ManagedConversation["status"] = "active",
  enabled = true,
) {
  const identity = useIdentity();
  const api = useCapiro();
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
    queryFn: async ({ signal, pageParam }) =>
      managedListReceipt.parse(
        await api.request(
          managedListKey,
          {
            body: {
              version: managementVersion,
              status,
              title: title.trim(),
              before: pageParam,
            },
          },
          { signal },
        ),
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
