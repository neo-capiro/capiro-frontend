import { z } from "zod";

const instant = z.iso.datetime({ offset: true });
const position = z.number().int().nonnegative();
const cursor = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^[A-Za-z0-9_-]+$/)
  .nullable();
const recipientSchema = z.object({
  email: z.string(),
  name: z.string().nullable().optional(),
});
export const messageSchema = z.object({
  id: z.uuid(),
  subject: z.string().nullable(),
  fromEmail: z.string().nullable(),
  fromName: z.string().nullable(),
  toRecipients: z.array(recipientSchema),
  ccRecipients: z.array(recipientSchema),
  bodyText: z.string().nullable(),
  sentAt: instant.nullable(),
  receivedAt: instant.nullable(),
  createdAt: instant,
});
export const threadSchema = z.object({
  id: z.uuid(),
  clientId: z.uuid().nullable(),
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
export const threadListPageSchema = z
  .object({
    items: z
      .array(
        threadSchema.extend({
          tenantId: z.uuid(),
          connectionId: z.uuid(),
          // PostgreSQL LEFT counts Unicode scalars; a preview can use two UTF-16 units each.
          messages: z
            .array(
              messageSchema.extend({
                bodyText: z.string().max(800).nullable(),
              }),
            )
            .max(3),
        }),
      )
      .max(50),
    hasMore: z.boolean(),
    nextCursor: cursor,
    asOf: instant,
    mailboxes: z
      .array(
        z.object({
          id: z.uuid(),
          email: z.string().nullable(),
          coverage: mailCoverageSchema,
        }),
      )
      .max(50),
    coverageTruncated: z.boolean(),
    notice: z.string(),
  })
  .refine(
    (page) =>
      page.hasMore === (page.nextCursor !== null) &&
      new Set(page.items.map((item) => item.id)).size === page.items.length,
    "Mail list continuation mismatch",
  );

export const storedMessageSchema = messageSchema
  .extend({
    tenantId: z.uuid(),
    threadId: z.uuid(),
    connectionId: z.uuid(),
    bodyText: z.string().max(6000),
    bodyOffset: position.max(10_000_000),
    bodyLength: position,
    bodyTruncated: z.boolean(),
    nextBodyOffset: position.nullable(),
    bodySha256: z.string().regex(/^[a-f0-9]{64}$/),
    bodyStoredPresent: z.boolean(),
    // Historical rows can have no completeness annotation. Unknown is never full.
    bodyCompleteness: z.string(),
  })
  .refine((message) => {
    const end = message.bodyOffset + message.bodyText.length;
    return (
      end <= message.bodyLength &&
      (message.nextBodyOffset === null
        ? end === message.bodyLength
        : message.nextBodyOffset === end &&
          end < message.bodyLength &&
          end > message.bodyOffset) &&
      message.bodyTruncated ===
        (message.bodyOffset > 0 || end < message.bodyLength)
    );
  }, "Mail body continuation mismatch");
export type StoredMailMessage = z.infer<typeof storedMessageSchema>;

export const threadPageSchema = threadSchema
  .extend({
    associationClientId: z.uuid().nullable(),
    tenantId: z.uuid(),
    connectionId: z.uuid(),
    connectionStatus: z.string().nullable(),
    connectionOwnerTenantId: z.uuid(),
    connectionOwnerActorId: z.uuid(),
    updatedAt: instant,
    messages: z.array(storedMessageSchema).max(10),
    totalMessages: position,
    messageOffset: position.max(10_000),
    hasMore: z.boolean(),
    nextMessageOffset: position.max(10_000).nullable(),
    nextCursor: cursor,
    asOf: instant,
    coverage: mailCoverageSchema,
    notice: z.string(),
  })
  .refine((thread) => {
    const next = thread.messageOffset + thread.messages.length;
    return (
      thread.messages.every(
        (message) =>
          message.threadId === thread.id &&
          message.tenantId === thread.tenantId &&
          message.connectionId === thread.connectionId,
      ) &&
      new Set(thread.messages.map((message) => message.id)).size ===
        thread.messages.length &&
      thread.connectionOwnerTenantId === thread.tenantId &&
      thread.hasMore === next < thread.totalMessages &&
      ((thread.nextCursor === null && thread.nextMessageOffset === null) ||
        (thread.hasMore &&
          thread.messages.length > 0 &&
          thread.nextMessageOffset === next &&
          thread.nextCursor !== null))
    );
  }, "Mail thread continuation or association mismatch");
export type MailThreadPage = z.infer<typeof threadPageSchema>;
export type MailThreadListPage = z.infer<typeof threadListPageSchema>;
export interface MailReadScope {
  tenantId: string;
  userId: string;
  clientId?: string;
  associationClientId?: string;
  recipientEmails?: string[];
}
export interface MailFilters {
  query?: string;
  folder?: "all" | "inbox" | "sent";
  withinDays?: number;
}

/** Live activity pages can repeat an ID when a thread moves. Preserve its first position. */
export function distinctMailItems<T extends { id: string }>(
  pages: readonly (readonly T[])[],
): T[] {
  const items = new Map<string, T>();
  for (const page of pages)
    for (const item of page) if (!items.has(item.id)) items.set(item.id, item);
  return [...items.values()];
}
export function combineThreadPages(pages: readonly MailThreadPage[]) {
  const first = pages[0];
  if (!first) return undefined;
  const last = pages[pages.length - 1]!;
  return {
    ...first,
    hasMore: last.hasMore,
    nextCursor: last.nextCursor,
    nextMessageOffset: last.nextMessageOffset,
    messages: distinctMailItems(pages.map((page) => page.messages)),
  };
}

/** Kept for existing callers; the paged contact reader uses Core's full-message association. */
export function threadsForRecipient(threads: MailThread[], email: string) {
  const target = email.trim().toLowerCase();
  return threads.filter(
    (thread) =>
      thread.participants.some(
        (person) => person.email.toLowerCase() === target,
      ) ||
      thread.messages.some(
        (message) =>
          message.fromEmail?.toLowerCase() === target ||
          [...message.toRecipients, ...message.ccRecipients].some(
            (person) => person.email.toLowerCase() === target,
          ),
      ),
  );
}
