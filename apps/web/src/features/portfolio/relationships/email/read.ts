"use client";
import { z } from "zod";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { type ApiClient, queryString } from "@/shared/portfolio/api/http";
import { useIdentity } from "@/shared/portfolio/auth/identity";

// Core 2262b5c: mail-thread-list/pages, mail-sync-coverage, mail-body-section.
const instant = z.iso.datetime({ offset: true });
const recipientSchema = z.object({
  email: z.string(),
  name: z.string().nullable().optional(),
});
export const mailReplyContextSchema = z.discriminatedUnion("supported", [
  z.object({
    supported: z.literal(true),
    operation: z.literal("reply"),
    originalMessageId: z.uuid(),
    originalUpdatedAt: instant,
    senderConnectionId: z.uuid(),
    subject: z.string().min(1).max(300),
    to: z.tuple([z.object({ email: z.email() })]),
  }),
  z.object({ supported: z.literal(false), reason: z.string().max(500) }),
]);
export type MailReplyContext = z.infer<typeof mailReplyContextSchema>;
export const messageSchema = z.object({
  id: z.uuid(),
  subject: z.string().nullable(),
  fromEmail: z.string().nullable(),
  fromName: z.string().nullable(),
  toRecipients: z.array(recipientSchema),
  ccRecipients: z.array(recipientSchema),
  bodyText: z.string().nullable(),
  sentAt: z.string().nullable(),
  receivedAt: z.string().nullable(),
  createdAt: z.string(),
});
export const threadSchema = z.object({
  id: z.uuid(),
  clientId: z.string().nullable(),
  subject: z.string(),
  snippet: z.string().nullable(),
  connectionEmail: z.string().nullable(),
  participants: z.array(recipientSchema),
  messages: z.array(messageSchema),
});
export type MailThread = z.infer<typeof threadSchema>;
export const mailCoverageSchema = z.object({
  sourceStatus: z.enum(["healthy", "degraded", "unavailable"]),
  reason: z.string().nullable(),
  lastMailSyncAt: instant.nullable(),
  lastConnectionSyncAt: instant.nullable(),
  backfillComplete: z.boolean(),
  hasMore: z.boolean(),
  captureRepair: z.enum([
    "required",
    "in_progress",
    "complete",
    "not_applicable",
  ]),
});
export type MailCoverage = z.infer<typeof mailCoverageSchema>;
export const mailBodySchema = messageSchema
  .extend({
    replyContext: mailReplyContextSchema.optional(),
    threadId: z.uuid(),
    sentAt: instant.nullable(),
    receivedAt: instant.nullable(),
    createdAt: instant,
    bodyText: z.string().max(6000),
    bodyOffset: z.number().int().nonnegative(),
    bodyLength: z.number().int().nonnegative(),
    bodyTruncated: z.boolean(),
    nextBodyOffset: z.number().int().positive().nullable(),
    bodySha256: z.string().regex(/^[a-f0-9]{64}$/),
    bodyStoredPresent: z.boolean(),
    bodyCompleteness: z.enum(["full", "preview", "truncated", "unknown"]),
  })
  .refine((message) => {
    const end = message.bodyOffset + message.bodyText.length;
    return (
      end <= message.bodyLength &&
      message.nextBodyOffset === (end < message.bodyLength ? end : null) &&
      message.bodyTruncated ===
        (message.bodyOffset > 0 || end < message.bodyLength) &&
      (message.bodyStoredPresent || message.bodyLength === 0)
    );
  }, "Invalid stored mail body continuation");
export type MailBody = z.infer<typeof mailBodySchema>;
const cursor = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^[A-Za-z0-9_-]+$/)
  .nullable();
export const mailThreadPageSchema = threadSchema
  .extend({
    tenantId: z.uuid(),
    associationClientId: z.uuid().nullable(),
    connectionId: z.uuid().nullable(),
    connectionOwnerTenantId: z.uuid(),
    connectionOwnerActorId: z.uuid(),
    connectionStatus: z.string().nullable(),
    updatedAt: instant,
    messages: z.array(mailBodySchema).max(10),
    totalMessages: z.number().int().nonnegative(),
    messageOffset: z.number().int().min(0).max(10000),
    hasMore: z.boolean(),
    nextMessageOffset: z.number().int().min(1).max(10000).nullable(),
    nextCursor: cursor,
    asOf: instant,
    coverage: mailCoverageSchema,
    notice: z.string(),
  })
  .refine((page) => {
    const end = page.messageOffset + page.messages.length;
    return (
      page.messages.every(
        (message) =>
          message.threadId === page.id &&
          (!message.replyContext?.supported ||
            (message.replyContext.originalMessageId === message.id &&
              message.replyContext.senderConnectionId === page.connectionId)),
      ) &&
      new Set(page.messages.map((message) => message.id)).size ===
        page.messages.length &&
      end <= page.totalMessages &&
      page.hasMore === end < page.totalMessages &&
      (page.nextCursor !== null) === (page.nextMessageOffset !== null) &&
      (page.nextMessageOffset === null ||
        (page.hasMore && page.nextMessageOffset === end))
    );
  }, "Invalid mail thread page");
export type MailThreadPage = z.infer<typeof mailThreadPageSchema>;
export const contactMailPageSchema = z
  .object({
    items: z
      .array(
        threadSchema.extend({
          tenantId: z.uuid(),
          messages: z.array(messageSchema).max(3),
        }),
      )
      .max(50),
    hasMore: z.boolean(),
    nextCursor: cursor,
    asOf: instant,
    coverageTruncated: z.boolean(),
    mailboxes: z
      .array(
        z.object({
          id: z.uuid(),
          email: z.string().nullable(),
          coverage: mailCoverageSchema,
        }),
      )
      .max(50),
    notice: z.string(),
  })
  .refine(
    (page) => page.hasMore === (page.nextCursor !== null),
    "Invalid mail list continuation",
  );
export type ContactMailPage = z.infer<typeof contactMailPageSchema>;
export type MailFilters = {
  query: string;
  folder: "all" | "inbox" | "sent";
  withinDays: string;
};
export const defaultMailFilters: MailFilters = {
  query: "",
  folder: "all",
  withinDays: "",
};
export type MailReadScope = {
  tenantId: string;
  userId: string;
  threadId: string;
} & (
  | { clientId: string; associationClientId?: never; recipientEmails?: never }
  | { clientId?: never; associationClientId: string; recipientEmails: string }
);
export type MailContinuation = {
  cursor?: string;
  asOf?: string;
  expectedUpdatedAt?: string;
};
type BodyRequest = {
  messageId: string;
  bodyOffset: number;
  expectedBodySha256: string;
};
export function nextMailPage(
  page: MailThreadPage,
): MailContinuation | undefined {
  return page.nextCursor
    ? {
        cursor: page.nextCursor,
        asOf: page.asOf,
        expectedUpdatedAt: page.updatedAt,
      }
    : undefined;
}
export function uniqueMailRows<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}
export function mergeMailPages(pages: MailThreadPage[]): MailThreadPage {
  const last = pages[pages.length - 1]!;
  return {
    ...pages[0]!,
    messages: uniqueMailRows(pages.flatMap((page) => page.messages)),
    hasMore: last.hasMore,
    nextCursor: last.nextCursor,
    nextMessageOffset: last.nextMessageOffset,
  };
}
export function readMailThreadPage(
  api: ApiClient,
  scope: MailReadScope,
  continuation: MailContinuation = {},
  signal?: AbortSignal,
  body?: BodyRequest,
) {
  const params = queryString({
    clientId: scope.clientId,
    associationClientId: scope.associationClientId,
    recipientEmails: scope.recipientEmails,
    limit: 10,
    ...continuation,
    ...body,
  });
  return api.request(
    "core",
    `engagement/mail-threads/${scope.threadId}?${params}`,
    mailThreadPageSchema.refine(
      (page) =>
        page.id === scope.threadId &&
        page.tenantId === scope.tenantId &&
        page.connectionOwnerTenantId === scope.tenantId &&
        page.connectionOwnerActorId === scope.userId &&
        (scope.clientId
          ? page.clientId === scope.clientId
          : page.associationClientId === scope.associationClientId) &&
        (!continuation.asOf || page.asOf === continuation.asOf) &&
        (!continuation.expectedUpdatedAt ||
          page.updatedAt === continuation.expectedUpdatedAt) &&
        (!body ||
          (page.messages.length === 1 &&
            page.messages[0]!.id === body.messageId &&
            page.messages[0]!.bodyOffset === body.bodyOffset &&
            page.messages[0]!.bodySha256 === body.expectedBodySha256)),
      "Mail page does not match its requested scope or continuation",
    ),
    { signal },
  );
}
export function readContactMailPage(
  api: ApiClient,
  scope: { clientId: string; email: string; tenantId: string },
  filters: MailFilters,
  continuation: { cursor?: string; asOf?: string } = {},
  signal?: AbortSignal,
) {
  const params = queryString({
    clientId: scope.clientId,
    recipientEmails: scope.email,
    query: filters.query || undefined,
    folder: filters.folder,
    withinDays: filters.withinDays || undefined,
    limit: 50,
    ...continuation,
  });
  return api.request(
    "core",
    `engagement/mail-threads?${params}`,
    contactMailPageSchema.refine(
      (page) =>
        page.items.every((item) => item.tenantId === scope.tenantId) &&
        (!continuation.asOf || page.asOf === continuation.asOf),
      "Mail list scope changed",
    ),
    { signal },
  );
}
export function useContactThreads(
  clientId: string,
  email: string | null,
  filters = defaultMailFilters,
) {
  const api = useApi(),
    cache = useQueryClient(),
    identity = useIdentity();
  const tenantId = identity.data?.tenant?.id ?? "",
    userId = identity.data?.user.id ?? "";
  const queryKey = ["contact-mail", clientId, email, tenantId, userId, filters];
  const query = useInfiniteQuery({
    queryKey,
    enabled: Boolean(
      email && tenantId && userId && identity.isSuccess && !identity.error,
    ),
    initialPageParam: {} as { cursor?: string; asOf?: string },
    queryFn: ({ pageParam, signal }) =>
      readContactMailPage(
        api,
        { clientId, email: email!, tenantId },
        filters,
        pageParam,
        signal,
      ),
    getNextPageParam: (page) =>
      page.nextCursor
        ? { cursor: page.nextCursor, asOf: page.asOf }
        : undefined,
    select: (data) => ({
      ...data.pages[data.pages.length - 1]!,
      items: uniqueMailRows(data.pages.flatMap((page) => page.items)),
    }),
  });
  return {
    ...query,
    restart: () => cache.resetQueries({ queryKey, exact: true }),
  };
}
export function useMailThread(
  id: string | null,
  clientId: string,
  email: string | null,
) {
  const api = useApi(),
    cache = useQueryClient(),
    identity = useIdentity();
  const scope: MailReadScope = {
    tenantId: identity.data?.tenant?.id ?? "",
    userId: identity.data?.user.id ?? "",
    threadId: id ?? "",
    associationClientId: clientId,
    recipientEmails: email ?? "",
  };
  const queryKey = ["mail-thread", scope];
  const query = useInfiniteQuery({
    queryKey,
    enabled: Boolean(
      id &&
      email &&
      scope.tenantId &&
      scope.userId &&
      identity.isSuccess &&
      !identity.error,
    ),
    initialPageParam: {} as MailContinuation,
    queryFn: ({ pageParam, signal }) =>
      readMailThreadPage(api, scope, pageParam, signal),
    getNextPageParam: nextMailPage,
    select: (data) => mergeMailPages(data.pages),
  });
  return {
    ...query,
    scope,
    restart: () => cache.resetQueries({ queryKey, exact: true }),
  };
}
