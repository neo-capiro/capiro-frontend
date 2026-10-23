"use client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  ApiError,
  queryString,
  type ApiClient,
} from "@/shared/portfolio/api/http";
import { identitySchema, useIdentity } from "@/shared/portfolio/auth/identity";
import {
  combineThreadPages,
  distinctMailItems,
  threadListPageSchema,
  threadPageSchema,
  type MailFilters,
  type MailReadScope,
  type MailThreadPage,
} from "./read-contracts";

export function mailThreadKey(scope: MailReadScope, id: string | null) {
  return [
    "mail-thread",
    scope.tenantId,
    scope.userId,
    scope.clientId ?? null,
    id,
    "pages",
    scope.associationClientId ?? null,
    scope.recipientEmails ?? [],
  ] as const;
}
function threadInScope(thread: MailThreadPage, scope: MailReadScope) {
  return (
    thread.tenantId === scope.tenantId &&
    thread.connectionOwnerActorId === scope.userId &&
    (!scope.clientId || thread.clientId === scope.clientId) &&
    thread.associationClientId === (scope.associationClientId ?? null)
  );
}
export interface ThreadContinuation {
  cursor: string;
  asOf: string;
  updatedAt: string;
  offset: number;
}
interface ListContinuation {
  cursor: string;
  asOf: string;
}
export async function readThreadPage(
  api: ApiClient,
  scope: MailReadScope,
  id: string,
  continuation: ThreadContinuation | null,
  signal?: AbortSignal,
) {
  return api.request(
    "core",
    `engagement/mail-threads/${encodeURIComponent(id)}?${queryString({
      clientId: scope.clientId,
      cursor: continuation?.cursor,
      associationClientId: scope.associationClientId,
      recipientEmails: scope.recipientEmails?.join(","),
    })}`,
    threadPageSchema.refine(
      (thread) =>
        thread.id === id &&
        threadInScope(thread, scope) &&
        thread.messages.every((message) => message.bodyOffset === 0) &&
        (continuation
          ? thread.asOf === continuation.asOf &&
            thread.updatedAt === continuation.updatedAt &&
            thread.messageOffset === continuation.offset
          : thread.messageOffset === 0),
      "Requested mail scope mismatch",
    ),
    { signal },
  );
}
export async function readBodyPage(
  api: ApiClient,
  scope: MailReadScope,
  thread: MailThreadPage,
  messageId: string,
  bodySha256: string,
  offset: number,
  signal?: AbortSignal,
) {
  const original = thread.messages.find((message) => message.id === messageId);
  if (!original || original.bodySha256 !== bodySha256)
    throw new ApiError(409, "Refresh this message before continuing.");
  const page = await api.request(
    "core",
    `engagement/mail-threads/${thread.id}?${queryString({
      clientId: scope.clientId,
      messageId,
      bodyOffset: offset,
      expectedBodySha256: bodySha256,
      associationClientId: scope.associationClientId,
      recipientEmails: scope.recipientEmails?.join(","),
      asOf: thread.asOf,
      expectedUpdatedAt: thread.updatedAt,
    })}`,
    threadPageSchema.refine(
      (value) =>
        value.id === thread.id &&
        threadInScope(value, scope) &&
        value.connectionId === thread.connectionId &&
        value.asOf === thread.asOf &&
        value.updatedAt === thread.updatedAt &&
        value.messages.length === 1 &&
        value.messages[0]!.id === messageId &&
        value.messages[0]!.bodySha256 === bodySha256 &&
        value.messages[0]!.bodyLength === original.bodyLength &&
        value.messages[0]!.bodyOffset === offset,
      "Requested mail body mismatch",
    ),
    { signal },
  );
  return page.messages[0]!;
}

/** Cache separation and stale-response suppression only; Core authorizes each read. */
export function useMailReadScope(clientId?: string) {
  const identity = useIdentity();
  const cache = useQueryClient();
  const scope = {
    tenantId: identity.data?.tenant?.id ?? "",
    userId: identity.data?.user.id ?? "",
    clientId,
  };
  const active =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    !cache.getQueryState(["identity"])?.isInvalidated &&
    Boolean(scope.tenantId && scope.userId);
  function assertCurrent() {
    const now = identitySchema.safeParse(cache.getQueryData(["identity"]));
    const state = cache.getQueryState(["identity"]);
    if (
      !active ||
      !now.success ||
      state?.isInvalidated ||
      state?.status !== "success" ||
      state.fetchStatus !== "idle" ||
      now.data.tenant?.id !== scope.tenantId ||
      now.data.user.id !== scope.userId
    )
      throw new ApiError(
        403,
        "Mail access changed. Refresh before continuing.",
      );
  }
  return { scope, active, assertCurrent, identity };
}

export function useContactThreads(
  clientId: string,
  email: string | null,
  filters: MailFilters = {},
) {
  const api = useApi();
  const cache = useQueryClient();
  const access = useMailReadScope(clientId);
  const queryKey = [
    "contact-mail",
    access.scope.tenantId,
    access.scope.userId,
    clientId,
    email?.trim().toLowerCase(),
    filters.query ?? "",
    filters.folder ?? "all",
    filters.withinDays ?? null,
  ] as const;
  const query = useInfiniteQuery({
    queryKey,
    enabled: access.active && Boolean(email),
    initialPageParam: null as ListContinuation | null,
    retry: false,
    queryFn: async ({ signal, pageParam }) => {
      access.assertCurrent();
      const page = await api.request(
        "core",
        `engagement/mail-threads?${queryString({
          clientId,
          recipientEmails: email?.trim(),
          query: filters.query,
          folder: filters.folder,
          withinDays: filters.withinDays,
          cursor: pageParam?.cursor,
        })}`,
        threadListPageSchema.refine(
          (value) =>
            value.items.every(
              (item) => item.tenantId === access.scope.tenantId,
            ) &&
            (!pageParam || value.asOf === pageParam.asOf),
          "Mail list tenant mismatch",
        ),
        { signal },
      );
      access.assertCurrent();
      return page;
    },
    getNextPageParam: (page) =>
      page.nextCursor ? { cursor: page.nextCursor, asOf: page.asOf } : null,
  });
  const pages = access.active && !query.error ? query.data?.pages : undefined;
  return {
    ...query,
    data: pages
      ? distinctMailItems(pages.map((page) => page.items))
      : undefined,
    page: pages?.[pages.length - 1],
    scope: access.scope,
    isPending: query.isPending || !access.active,
    error: access.identity.error ?? query.error,
    refresh: () => cache.resetQueries({ queryKey, exact: true }),
  };
}

export function useMailThread(
  id: string | null,
  clientId?: string,
  enabled = true,
  recipientEmail?: string,
) {
  const api = useApi();
  const cache = useQueryClient();
  const access = useMailReadScope(clientId);
  const scope: MailReadScope = recipientEmail
    ? {
        ...access.scope,
        clientId: undefined,
        associationClientId: clientId,
        recipientEmails: [recipientEmail.trim().toLowerCase()],
      }
    : access.scope;
  const queryKey = mailThreadKey(scope, id);
  const query = useInfiniteQuery({
    queryKey,
    enabled: enabled && access.active && Boolean(id),
    initialPageParam: null as ThreadContinuation | null,
    retry: false,
    queryFn: async ({ signal, pageParam }) => {
      access.assertCurrent();
      const page = await readThreadPage(api, scope, id!, pageParam, signal);
      access.assertCurrent();
      return page;
    },
    getNextPageParam: (page) =>
      page.nextCursor && page.nextMessageOffset !== null
        ? {
            cursor: page.nextCursor,
            asOf: page.asOf,
            updatedAt: page.updatedAt,
            offset: page.nextMessageOffset,
          }
        : null,
  });
  return {
    ...query,
    data:
      access.active && !query.error
        ? combineThreadPages(query.data?.pages ?? [])
        : undefined,
    scope,
    isPending: query.isPending || !access.active,
    error: access.identity.error ?? query.error,
    refresh: async () => {
      const bodyKey = ["mail-body", ...queryKey];
      await cache.cancelQueries({ queryKey: bodyKey });
      cache.removeQueries({ queryKey: bodyKey });
      await cache.resetQueries({ queryKey, exact: true });
    },
  };
}
