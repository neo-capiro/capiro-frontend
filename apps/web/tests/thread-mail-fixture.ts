import type { FullThread } from "../src/features/portfolio/relationships/thread/contracts";
export const threadClientId = "10000000-0000-4000-8000-000000000001";
export const threadId = "20000000-0000-4000-8000-000000000001";
export const threadTenantId = "90000000-0000-4000-8000-000000000001";
export const threadActorId = "70000000-0000-4000-8000-000000000001";
const threadConnectionId = "80000000-0000-4000-8000-000000000001";
const storedThread = {
  id: threadId,
  clientId: threadClientId,
  tenantId: threadTenantId,
  subject: "Synthetic policy discussion",
  snippet: "Stored preview",
  connectionEmail: "mailbox@example.test",
  connectionStatus: "connected",
  participants: [{ email: "never-use-roster@example.test" }],
  messages: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      threadId,
      subject: "Synthetic policy discussion",
      fromEmail: "mailbox@example.test",
      fromName: "Mailbox owner",
      toRecipients: [{ email: "taylor@example.test", name: "Taylor Test" }],
      ccRecipients: [],
      bodyText: "Earlier outgoing message.",
      sentAt: "2026-10-10T14:00:00Z",
      receivedAt: null,
      createdAt: "2026-10-10T14:00:01Z",
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      threadId,
      subject: "Synthetic policy discussion",
      fromEmail: "Taylor@EXAMPLE.test",
      fromName: "Taylor Test",
      toRecipients: [
        { email: "mailbox@example.test" },
        { email: "actor@example.test" },
        { email: "colleague@example.test", name: "Colleague Test" },
      ],
      ccRecipients: [
        { email: "copied@example.test" },
        { email: "COLLEAGUE@example.test" },
      ],
      bodyText:
        "Latest incoming stored message.\n<script>untrusted email is plain text</script>",
      sentAt: null,
      receivedAt: "2026-10-11T14:00:00Z",
      createdAt: "2026-10-11T14:00:01Z",
    },
  ],
};
export const fullThread: FullThread = {
  ...storedThread,
  associationClientId: null,
  connectionId: threadConnectionId,
  connectionOwnerTenantId: threadTenantId,
  connectionOwnerActorId: threadActorId,
  updatedAt: "2026-10-11T14:00:01.000Z",
  asOf: "2026-10-12T00:00:00.000Z",
  totalMessages: 2,
  messageOffset: 0,
  hasMore: false,
  nextCursor: null,
  nextMessageOffset: null,
  notice: "Synthetic stored current read",
  coverage: {
    sourceStatus: "healthy",
    reason: null,
    lastMailSyncAt: "2026-10-12T00:00:00.000Z",
    lastConnectionSyncAt: "2026-10-12T00:00:00.000Z",
    backfillComplete: true,
    hasMore: false,
    captureRepair: "complete",
  },
  messages: storedThread.messages.map((message) => ({
    ...message,
    tenantId: threadTenantId,
    connectionId: threadConnectionId,
    bodyOffset: 0,
    bodyLength: message.bodyText.length,
    bodyTruncated: false,
    nextBodyOffset: null,
    bodySha256: "a".repeat(64),
    bodyStoredPresent: true,
    bodyCompleteness: "full",
  })),
};
