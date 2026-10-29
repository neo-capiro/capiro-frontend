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

describe("native reply-all receiver", () => {
  const allInput: SendInput = {
    ...input,
    operation: "reply_all",
    to: [...input.to, { email: "other@example.test" }],
    cc: [{ email: "copy@example.test" }],
  };
  const allContext = {
    ...context,
    operation: "reply_all",
    to: allInput.to,
    cc: allInput.cc,
  };
  function allTransport(
    change: Record<string, unknown> = {},
    result: Record<string, unknown> = { ...accepted, operation: "reply_all" },
  ) {
    const sent: unknown[] = [];
    const api = createApiClient(async (url, options) => {
      const path = String(url);
      if (path.endsWith("/mail/mailboxes")) return Response.json([mailbox]);
      if (path.includes("/mail-threads/"))
        return Response.json({
          id: originalThreadId,
          clientId: input.clientId,
          connectionId: mailbox.id,
          messages: [
            {
              id: originalMessageId,
              replyContext: context,
              replyAllContext: { ...allContext, ...change },
            },
          ],
        });
      if (options?.method === "POST") {
        sent.push(JSON.parse(String(options.body)));
        return Response.json(result);
      }
      throw new Error("Unexpected synthetic request");
    });
    return { api, sent };
  }
  it("reply-all sends only exact reviewed To/Cc and accepts matching durable operation", async () => {
    const h = allTransport();
    expect(
      await sendReviewedMail(h.api, allInput, () => {}, requestKey),
    ).toMatchObject({ operation: "reply_all", originalMessageId });
    expect(h.sent).toEqual([
      expect.objectContaining({
        operation: "reply_all",
        to: allInput.to,
        cc: allInput.cc,
        requestKey,
      }),
    ]);
  });
  it.each([
    { operation: "reply" },
    { cc: [{ email: "changed@example.test" }] },
    { to: input.to },
    { supported: false },
  ])("reply-all context drift %j refuses before POST", async (change) => {
    const h = allTransport(change);
    await expect(
      sendReviewedMail(h.api, allInput, () => {}, requestKey),
    ).rejects.toMatchObject({ uncertain: false });
    expect(h.sent).toHaveLength(0);
  });
  it("reply-all cannot accept a single-reply receipt or unlock its durable attempt", async () => {
    const h = allTransport({}, accepted);
    await expect(
      sendReviewedMail(h.api, allInput, () => {}, requestKey),
    ).rejects.toMatchObject({ uncertain: true });
    expect(h.sent).toHaveLength(1);
    const cache = new QueryClient(),
      key = mailAttemptKey(id(20), id(21), id(1), "reply-all");
    const token = await beginMailAttempt(cache, key, allInput);
    expect(
      await recoverMailAttempt(cache, key, {
        ...accepted,
        requestKey: token,
      } as never),
    ).toBeNull();
    expect(cache.getQueryData(key)).toBeTruthy();
    expect(
      await recoverMailAttempt(cache, key, {
        ...accepted,
        operation: "reply_all",
        requestKey: token,
      } as never),
    ).toBe("accepted");
    cache.clear();
  });
});

describe("native forward receiver", () => {
  const digest = "a".repeat(64);
  const forwardInput: SendInput = {
    ...input,
    operation: "forward",
    subject: "Fwd: Original subject",
    originalBodySha256: digest,
    to: [{ email: "new@example.test" }],
    cc: [{ email: "copy@example.test" }],
  };
  const forwardContext = {
    ...context,
    operation: "forward",
    subject: forwardInput.subject,
    to: [],
    cc: [],
    originalBodySha256: digest,
    originalBodyText: "Complete original",
  };
  const receipt = {
    ...accepted,
    operation: "forward",
    originalBodySha256: digest,
  };
  function forwardTransport(
    change: Record<string, unknown> = {},
    result: Record<string, unknown> = receipt,
  ) {
    const sent: unknown[] = [];
    const api = createApiClient(async (url, options) => {
      const path = String(url);
      if (path.endsWith("/mail/mailboxes")) return Response.json([mailbox]);
      if (path.includes("/mail-threads/"))
        return Response.json({
          id: originalThreadId,
          clientId: input.clientId,
          connectionId: mailbox.id,
          messages: [
            {
              id: originalMessageId,
              forwardContext: { ...forwardContext, ...change },
            },
          ],
        });
      if (options?.method === "POST") {
        sent.push(JSON.parse(String(options.body)));
        return Response.json(result);
      }
      throw new Error("Unexpected synthetic request");
    });
    return { api, sent };
  }
  it("forward binds the reviewed original hash and explicit new recipients without posting original content", async () => {
    const h = forwardTransport();
    expect(
      await sendReviewedMail(h.api, forwardInput, () => {}, requestKey),
    ).toMatchObject({ operation: "forward", originalBodySha256: digest });
    expect(h.sent).toEqual([
      expect.objectContaining({
        originalBodySha256: digest,
        to: forwardInput.to,
        cc: forwardInput.cc,
      }),
    ]);
    expect(h.sent[0]).not.toHaveProperty("originalBodyText");
  });
  it.each([
    { originalBodySha256: "b".repeat(64) },
    { supported: false },
    { operation: "reply" },
  ])("forward changed proof %j refuses before POST", async (change) => {
    const h = forwardTransport(change);
    await expect(
      sendReviewedMail(h.api, forwardInput, () => {}, requestKey),
    ).rejects.toMatchObject({ uncertain: false });
    expect(h.sent).toHaveLength(0);
  });
  it("forward wrong-body receipt stays unknown and cannot retire its stored attempt", async () => {
    const wrong = { ...receipt, originalBodySha256: "b".repeat(64) },
      h = forwardTransport({}, wrong);
    await expect(
      sendReviewedMail(h.api, forwardInput, () => {}, requestKey),
    ).rejects.toMatchObject({ uncertain: true });
    const cache = new QueryClient(),
      key = mailAttemptKey(id(20), id(21), id(1), "forward");
    const token = await beginMailAttempt(cache, key, forwardInput);
    expect(
      await recoverMailAttempt(cache, key, {
        ...wrong,
        requestKey: token,
      } as never),
    ).toBeNull();
    expect(cache.getQueryData(key)).toBeTruthy();
    expect(
      await recoverMailAttempt(cache, key, {
        ...receipt,
        requestKey: token,
      } as never),
    ).toBe("accepted");
    cache.clear();
  });
});
