import { describe, expect, it } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  combineThreadPages,
  distinctMailItems,
  storedMessageSchema,
  threadListPageSchema,
  threadPageSchema,
  type MailThreadPage,
} from "../src/features/portfolio/relationships/email/read-contracts";
import {
  readBodyPage,
  readThreadPage,
} from "../src/features/portfolio/relationships/email/read-pages";

const ids = {
  tenant: "10000000-0000-4000-8000-000000000001",
  actor: "20000000-0000-4000-8000-000000000001",
  client: "30000000-0000-4000-8000-000000000001",
  thread: "40000000-0000-4000-8000-000000000001",
  box: "50000000-0000-4000-8000-000000000001",
  message: "60000000-0000-4000-8000-000000000001",
};
const at = "2026-10-01T12:00:00.000Z";
const scope = { tenantId: ids.tenant, userId: ids.actor, clientId: ids.client };
const coverage = {
  sourceStatus: "degraded" as const,
  reason: "mail_sync_incomplete",
  lastMailSyncAt: at,
  lastConnectionSyncAt: at,
  backfillComplete: false,
  hasMore: true,
  captureRepair: "in_progress" as const,
};
function page(): MailThreadPage {
  return {
    id: ids.thread,
    tenantId: ids.tenant,
    clientId: ids.client,
    associationClientId: null,
    connectionId: ids.box,
    connectionEmail: "owner@example.test",
    connectionStatus: "connected",
    connectionOwnerTenantId: ids.tenant,
    connectionOwnerActorId: ids.actor,
    subject: "Synthetic stored thread",
    snippet: "Preview",
    participants: [],
    updatedAt: at,
    totalMessages: 1,
    messageOffset: 0,
    hasMore: false,
    nextMessageOffset: null,
    nextCursor: null,
    asOf: at,
    coverage,
    notice: "Stored current read",
    messages: [
      {
        id: ids.message,
        tenantId: ids.tenant,
        threadId: ids.thread,
        connectionId: ids.box,
        subject: "Synthetic stored thread",
        fromEmail: "person@example.test",
        fromName: null,
        toRecipients: [{ email: "owner@example.test" }],
        ccRecipients: [],
        sentAt: at,
        receivedAt: null,
        createdAt: at,
        bodyText: "Stored text",
        bodyOffset: 0,
        bodyLength: 11,
        bodyTruncated: false,
        nextBodyOffset: null,
        bodySha256: "a".repeat(64),
        bodyStoredPresent: true,
        bodyCompleteness: "unknown",
      },
    ],
  };
}
function api(body: unknown, calls: string[] = []) {
  return createApiClient(async (input) => {
    calls.push(String(input));
    return Response.json(body);
  });
}
describe("bounded stored Mail reads", () => {
  it("validates and requests an exact owned client page", async () => {
    const calls: string[] = [];
    expect(
      await readThreadPage(api(page(), calls), scope, ids.thread, null),
    ).toEqual(page());
    expect(calls[0]).toContain(`clientId=${ids.client}`);
    expect(calls[0]).not.toContain("cursor=");
  });
  it("keeps Contact association explicit without weakening exact-client reads", async () => {
    const associated = {
      ...page(),
      clientId: null,
      associationClientId: ids.client,
    };
    const contactScope = {
      tenantId: ids.tenant,
      userId: ids.actor,
      associationClientId: ids.client,
      recipientEmails: ["person@example.test"],
    };
    const calls: string[] = [];
    expect(
      (
        await readThreadPage(
          api(associated, calls),
          contactScope,
          ids.thread,
          null,
        )
      ).clientId,
    ).toBeNull();
    const url = new URL(calls[0]!, "http://localhost");
    expect(url.searchParams.get("associationClientId")).toBe(ids.client);
    expect(url.searchParams.has("clientId")).toBe(false);
    await expect(
      readThreadPage(api(associated), scope, ids.thread, null),
    ).rejects.toThrow();
    await expect(
      readThreadPage(
        api({ ...associated, associationClientId: ids.actor }),
        contactScope,
        ids.thread,
        null,
      ),
    ).rejects.toThrow();
  });
  it.each(["tenantId", "connectionOwnerActorId", "clientId", "id"] as const)(
    "rejects the wrong %s",
    async (field) => {
      await expect(
        readThreadPage(
          api({ ...page(), [field]: ids.message }),
          scope,
          ids.thread,
          null,
        ),
      ).rejects.toThrow();
    },
  );
  it.each(["threadId", "tenantId", "connectionId"] as const)(
    "rejects a message with the wrong %s",
    async (field) => {
      const value = page();
      value.messages[0]![field] = ids.actor;
      await expect(
        readThreadPage(api(value), scope, ids.thread, null),
      ).rejects.toThrow();
    },
  );
  it("binds continuation to the previously delivered offset, timestamp and asOf", async () => {
    const continuation = {
      cursor: "c2VjdGlvbg",
      asOf: at,
      updatedAt: at,
      offset: 3,
    };
    const later = { ...page(), messageOffset: 3, totalMessages: 4 };
    expect(
      (await readThreadPage(api(later), scope, ids.thread, continuation))
        .messageOffset,
    ).toBe(3);
    for (const delta of [
      { messageOffset: 2 },
      { updatedAt: "2026-10-02T12:00:00.000Z" },
      { asOf: "2026-10-02T12:00:00.000Z" },
    ])
      await expect(
        readThreadPage(
          api({ ...later, ...delta }),
          scope,
          ids.thread,
          continuation,
        ),
      ).rejects.toThrow();
  });
  it("rejects duplicate message IDs and invented end-of-list states", () => {
    expect(
      threadPageSchema.safeParse({
        ...page(),
        messages: [page().messages[0], page().messages[0]],
      }).success,
    ).toBe(false);
    expect(
      threadPageSchema.safeParse({ ...page(), hasMore: true }).success,
    ).toBe(false);
    expect(
      threadPageSchema.safeParse({ ...page(), nextCursor: "c2VjdGlvbg" })
        .success,
    ).toBe(false);
  });
  it("rejects oversized or inconsistent body sections", () => {
    const message = page().messages[0]!;
    for (const delta of [
      { bodyText: "x".repeat(6001), bodyLength: 6001 },
      { bodyLength: 10 },
      { nextBodyOffset: 8 },
      { bodyTruncated: true },
      { bodySha256: "invalid" },
    ])
      expect(
        storedMessageSchema.safeParse({ ...message, ...delta }).success,
      ).toBe(false);
  });
  it("requires the exact delivered body hash, offset, source and thread timestamp", async () => {
    const first = page();
    const next = page();
    first.messages[0] = {
      ...first.messages[0]!,
      bodyLength: 15,
      nextBodyOffset: 11,
      bodyTruncated: true,
    };
    next.messages[0] = {
      ...next.messages[0]!,
      bodyText: "more",
      bodyOffset: 11,
      bodyLength: 15,
      bodyTruncated: true,
    };
    const calls: string[] = [];
    expect(
      (
        await readBodyPage(
          api(next, calls),
          scope,
          first,
          ids.message,
          "a".repeat(64),
          11,
        )
      ).bodyText,
    ).toBe("more");
    expect(calls[0]).toContain("bodyOffset=11");
    expect(calls[0]).toContain(`expectedBodySha256=${"a".repeat(64)}`);
    for (const delta of [
      { bodySha256: "b".repeat(64) },
      { id: ids.actor },
      { bodyOffset: 10, bodyLength: 14 },
    ])
      await expect(
        readBodyPage(
          api({ ...next, messages: [{ ...next.messages[0], ...delta }] }),
          scope,
          first,
          ids.message,
          "a".repeat(64),
          11,
        ),
      ).rejects.toThrow();
    await expect(
      readBodyPage(
        api({ ...next, updatedAt: "2026-10-02T12:00:00.000Z" }),
        scope,
        first,
        ids.message,
        "a".repeat(64),
        11,
      ),
    ).rejects.toThrow();
  });
  it("deduplicates live list IDs without changing their first visible position", () => {
    expect(
      distinctMailItems([
        [
          { id: "a", value: 1 },
          { id: "b", value: 2 },
        ],
        [
          { id: "a", value: 3 },
          { id: "c", value: 4 },
        ],
      ]),
    ).toEqual([
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "c", value: 4 },
    ]);
    const first = page();
    const next = page();
    next.messages[0]!.id = ids.actor;
    expect(combineThreadPages([first, next])?.messages).toHaveLength(2);
  });
  it("retains honest truncated mailbox coverage and bounds list previews in Unicode scalars", () => {
    const value = {
      items: [
        {
          ...page(),
          messages: [{ ...page().messages[0], bodyText: "😀".repeat(400) }],
        },
      ],
      asOf: at,
      hasMore: false,
      nextCursor: null,
      mailboxes: [{ id: ids.box, email: "owner@example.test", coverage }],
      coverageTruncated: true,
      notice: "Live activity ordering",
    };
    expect(threadListPageSchema.parse(value).coverageTruncated).toBe(true);
    expect(
      threadListPageSchema.safeParse({ ...value, hasMore: true }).success,
    ).toBe(false);
    expect(
      threadListPageSchema.safeParse({
        ...value,
        items: Array(51).fill(value.items[0]),
      }).success,
    ).toBe(false);
  });
});
