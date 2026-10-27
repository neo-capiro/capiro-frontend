import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  sendReviewedMail,
  type SendInput,
} from "../src/features/portfolio/relationships/email/send";
import {
  beginMailAttempt,
  mailAttemptKey,
  recoverMailAttempt,
  settleMailAttempt,
} from "../src/features/portfolio/relationships/email/send-attempt";
import { mailThreadPageSchema } from "../src/features/portfolio/relationships/email/read";
import { fullThread } from "./thread-mail-fixture";
const id = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const requestKey = id(9),
  originalMessageId = id(2),
  originalThreadId = id(3);
const mailbox = {
  id: id(4),
  provider: "google_workspace" as const,
  accountEmail: "owner@example.test",
  displayName: "Owner",
  availability: "available" as const,
  signaturePolicy: "actor" as const,
};
const input: SendInput = {
  clientId: id(1),
  operation: "reply",
  originalMessageId,
  originalUpdatedAt: "2026-10-26T20:00:00.000Z",
  threadId: originalThreadId,
  senderConnectionId: mailbox.id,
  subject: "Original subject",
  to: [{ email: "reply@example.test" }],
  bodyHtml: "<p>Reviewed reply 😀</p>",
  appendSignature: false,
  reviewedSender: mailbox,
};
const context = {
  supported: true as const,
  operation: "reply" as const,
  originalMessageId,
  originalUpdatedAt: input.originalUpdatedAt!,
  senderConnectionId: mailbox.id,
  subject: input.subject,
  to: input.to,
};
const accepted = {
  ok: true,
  intentId: id(8),
  requestKey,
  state: "accepted",
  threadId: id(6),
  messageId: id(7),
  operation: "reply",
  originalMessageId,
  originalThreadId,
  originalUpdatedAt: input.originalUpdatedAt,
  senderConnectionId: mailbox.id,
  senderEmail: mailbox.accountEmail,
  senderName: mailbox.displayName,
  signaturePolicy: "actor",
  signatureAppended: false,
};
function transport(
  change: Record<string, unknown> = {},
  receipt: Record<string, unknown> = accepted,
) {
  const requests: { path: string; method: string; body?: unknown }[] = [];
  return {
    requests,
    api: createApiClient(async (url, options) => {
      const path = String(url);
      requests.push({
        path,
        method: options?.method ?? "GET",
        body: options?.body ? JSON.parse(String(options.body)) : undefined,
      });
      if (path.endsWith("/mail/mailboxes")) return Response.json([mailbox]);
      if (path.includes("/mail-threads/"))
        return Response.json({
          id: originalThreadId,
          clientId: input.clientId,
          connectionId: mailbox.id,
          messages: [
            { id: originalMessageId, replyContext: { ...context, ...change } },
          ],
        });
      if (options?.method === "POST") return Response.json(receipt);
      throw new Error(`Unexpected ${path}`);
    }),
  };
}
describe("native Gmail reply receiver", () => {
  it("reads exact selected original and accepts actual returned conversation only with exact origin", async () => {
    const h = transport();
    const result = await sendReviewedMail(h.api, input, () => {}, requestKey);
    expect(result.threadId).toBe(id(6));
    expect(result.originalThreadId).toBe(originalThreadId);
    expect(h.requests.map((r) => r.path)).toEqual([
      "/api/backend/core/engagement/mail/mailboxes",
      `/api/backend/core/engagement/mail-threads/${originalThreadId}?messageId=${originalMessageId}`,
      "/api/backend/core/engagement/mail/send",
    ]);
    expect(h.requests[2]?.body).toMatchObject({
      operation: "reply",
      originalMessageId,
      threadId: originalThreadId,
      bodyHtml: input.bodyHtml,
      requestKey,
      subject: input.subject,
    });
    expect(h.requests[2]?.body).not.toHaveProperty("reviewedSender");
    expect(h.requests[2]?.body).not.toHaveProperty("providerThreadId");
  });
  it.each([
    { supported: false },
    { originalMessageId: id(99) },
    { originalUpdatedAt: "2026-10-26T20:01:00.000Z" },
    { senderConnectionId: id(99) },
    { subject: "Changed" },
    { to: [{ email: "other@example.test" }] },
  ])("changed original context %j refuses before POST", async (change) => {
    const h = transport(change);
    await expect(
      sendReviewedMail(h.api, input, () => {}, requestKey),
    ).rejects.toMatchObject({ uncertain: false });
    expect(h.requests.filter((r) => r.method === "POST")).toHaveLength(0);
  });
  it.each([
    { originalMessageId: id(99) },
    { originalThreadId: id(99) },
    { originalUpdatedAt: "2026-10-26T20:01:00.000Z" },
    { senderConnectionId: id(99) },
    { operation: undefined },
    { requestKey: id(99) },
  ])(
    "mismatched accepted receipt %j stays uncertain after one POST",
    async (change) => {
      const h = transport({}, { ...accepted, ...change });
      await expect(
        sendReviewedMail(h.api, input, () => {}, requestKey),
      ).rejects.toMatchObject({ uncertain: true });
      expect(h.requests.filter((r) => r.method === "POST")).toHaveLength(1);
    },
  );
  it("legacy local-thread input cannot silently send a new message", async () => {
    const h = transport();
    await expect(
      sendReviewedMail(
        h.api,
        { ...input, operation: undefined },
        () => {},
        requestKey,
      ),
    ).rejects.toMatchObject({ uncertain: false });
    expect(h.requests).toHaveLength(0);
  });
  it("canonical read parser preserves safe reply fields and rejects mismatched original", () => {
    const page = {
      ...fullThread,
      totalMessages: 1,
      connectionId: mailbox.id,
      messages: [
        {
          ...fullThread.messages[0]!,
          replyContext: {
            ...context,
            originalMessageId: fullThread.messages[0]!.id,
            senderConnectionId: mailbox.id,
          },
        },
      ],
    };
    expect(
      mailThreadPageSchema.parse(page).messages[0]?.replyContext,
    ).toMatchObject({ supported: true, subject: input.subject });
    page.messages[0]!.replyContext.originalMessageId = id(99);
    expect(mailThreadPageSchema.safeParse(page).success).toBe(false);
  });
});
const values = new Map<string, string>();
const key = mailAttemptKey("tenant", "actor", input.clientId, "contact");
beforeEach(() => {
  values.clear();
  let queue = Promise.resolve();
  vi.stubGlobal("navigator", {
    locks: {
      request: (_key: string, run: () => unknown) => {
        const result = queue.then(run);
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    },
  });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
});
describe("reply origin recovery", () => {
  it("reload retains only origin identity and rejects mismatch before accepting exact durable receipt", async () => {
    const token = await beginMailAttempt(new QueryClient(), key, input);
    const stored = [...values.values()][0]!;
    expect(JSON.parse(stored)).toMatchObject({
      token,
      replyBinding: {
        operation: "reply",
        threadId: originalThreadId,
        originalMessageId,
        originalUpdatedAt: input.originalUpdatedAt,
        senderConnectionId: mailbox.id,
      },
    });
    for (const privateValue of [
      input.subject,
      input.bodyHtml,
      input.to[0]!.email,
      mailbox.accountEmail,
    ])
      expect(stored).not.toContain(privateValue);
    const reloaded = new QueryClient();
    reloaded.setQueryData(key, { token, status: "unknown" });
    for (const change of [
      { originalMessageId: id(99) },
      { senderConnectionId: id(99) },
      { operation: undefined },
      { originalUpdatedAt: undefined },
      { requestKey: id(99) },
      { state: "unknown" },
    ]) {
      expect(
        await recoverMailAttempt(reloaded, key, {
          ...accepted,
          requestKey: token,
          ...change,
        }),
      ).toBeNull();
      expect(values.size).toBe(1);
    }
    expect(
      await recoverMailAttempt(reloaded, key, {
        ...accepted,
        requestKey: token,
      }),
    ).toBe("accepted");
    expect(values.size).toBe(0);
  });
  it("malformed stored origin and late completion cannot unlock another attempt", async () => {
    const cache = new QueryClient();
    const token = await beginMailAttempt(cache, key, input);
    const storedKey = [...values.keys()][0]!;
    values.set(
      storedKey,
      JSON.stringify({ token, replyBinding: { operation: "reply" } }),
    );
    cache.setQueryData(key, { token, status: "unknown" });
    expect(
      await recoverMailAttempt(cache, key, { ...accepted, requestKey: token }),
    ).toBeNull();
    values.set(storedKey, JSON.stringify({ token: id(99) }));
    await settleMailAttempt(cache, key, token);
    expect(values.get(storedKey)).toContain(id(99));
  });
});
