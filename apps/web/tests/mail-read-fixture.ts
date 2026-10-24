import type {
  MailBody,
  MailCoverage,
  MailThread,
  MailThreadPage,
} from "../src/features/portfolio/relationships/email/read";
export const mailActorId = "90000000-0000-4000-8000-000000000002";
export const mailTenantId = "90000000-0000-4000-8000-000000000001";
export const mailAsOf = "2026-10-24T12:00:00.000Z";
export const mailCoverage: MailCoverage = {
  sourceStatus: "healthy",
  reason: null,
  lastMailSyncAt: mailAsOf,
  lastConnectionSyncAt: mailAsOf,
  backfillComplete: true,
  hasMore: false,
  captureRepair: "complete",
};
export function mailBodyFixture(
  message: MailThread["messages"][number],
  threadId: string,
): MailBody {
  const text = message.bodyText ?? "";
  return {
    ...message,
    threadId,
    bodyText: text,
    bodyOffset: 0,
    bodyLength: text.length,
    bodyTruncated: false,
    nextBodyOffset: null,
    bodySha256: "a".repeat(64),
    bodyStoredPresent: message.bodyText !== null,
    bodyCompleteness: "full",
  };
}
export function mailThreadFixture<T extends MailThread>(
  thread: T,
  overrides: Partial<MailThreadPage> = {},
): MailThreadPage {
  return {
    ...thread,
    tenantId: mailTenantId,
    associationClientId: null,
    connectionOwnerTenantId: mailTenantId,
    connectionOwnerActorId: mailActorId,
    connectionStatus: "connected",
    updatedAt: mailAsOf,
    asOf: mailAsOf,
    messages: thread.messages.map((message) =>
      mailBodyFixture(message, thread.id),
    ),
    totalMessages: thread.messages.length,
    messageOffset: 0,
    hasMore: false,
    nextMessageOffset: null,
    nextCursor: null,
    coverage: mailCoverage,
    notice: "Synthetic bounded stored mail page.",
    ...overrides,
  };
}
export function mailListFixture(
  threads: MailThread[],
  overrides: Record<string, unknown> = {},
) {
  return {
    items: threads.map((thread) => ({ ...thread, tenantId: mailTenantId })),
    hasMore: false,
    nextCursor: null,
    asOf: mailAsOf,
    coverageTruncated: false,
    mailboxes: [
      {
        id: "90000000-0000-4000-8000-000000000003",
        email: "mailbox@example.test",
        coverage: mailCoverage,
      },
    ],
    notice: "Synthetic bounded live-order mail list.",
    ...overrides,
  };
}
