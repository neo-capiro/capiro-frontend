import { describe, expect, it } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { sendReviewedMail as dispatchReviewedMail } from "../src/features/portfolio/relationships/email/send";
import { sendingMailboxesSchema } from "../src/features/portfolio/relationships/email/mailboxes";
const requestKey = "44444444-4444-4444-8444-444444444444";
const sendReviewedMail = (
  api: Parameters<typeof dispatchReviewedMail>[0],
  input: Parameters<typeof dispatchReviewedMail>[1],
  assert: Parameters<typeof dispatchReviewedMail>[2],
) => dispatchReviewedMail(api, input, assert, requestKey);
const a = "10000000-0000-4000-8000-000000000001";
const b = "10000000-0000-4000-8000-000000000002";
const clientId = "20000000-0000-4000-8000-000000000001";
const threadId = "30000000-0000-4000-8000-000000000001";
const mailbox = {
  id: b,
  provider: "google_workspace" as const,
  accountEmail: "b@example.test",
  displayName: "Mailbox B",
  availability: "available" as const,
  signaturePolicy: "actor" as const,
};
const input = {
  clientId,
  to: [{ email: "recipient@example.test" }],
  subject: "Reviewed sender",
  bodyHtml: "<p>Local fixture</p>",
  appendSignature: false,
  senderConnectionId: b,
  reviewedSender: mailbox,
};
const receipt = {
  ok: true,
  intentId: requestKey,
  requestKey,
  state: "accepted",
  threadId,
  messageId: a,
  senderConnectionId: b,
  senderEmail: mailbox.accountEmail,
  senderName: mailbox.displayName,
  signaturePolicy: "actor",
  signatureAppended: false,
};
function fixture({
  rows = [mailbox],
  result = receipt,
  status = 200,
  connectionId = b,
}: {
  rows?: unknown;
  result?: unknown;
  status?: number;
  connectionId?: string;
} = {}) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const api = createApiClient(async (url, options) => {
    const path = String(url);
    const method = options?.method ?? "GET";
    calls.push({
      path,
      method,
      body: options?.body ? JSON.parse(String(options.body)) : undefined,
    });
    const value = path.endsWith("/mailboxes")
      ? rows
      : path.endsWith(`/mail-threads/${threadId}`)
        ? { id: threadId, clientId, connectionId }
        : result;
    return new Response(JSON.stringify(value), {
      status: method === "POST" ? status : 200,
    });
  });
  return {
    api,
    calls,
    writes: () => calls.filter((call) => call.method === "POST"),
  };
}
describe("reviewed exact mailbox selection", () => {
  it("rechecks and sends mailbox B, without leaking review metadata", async () => {
    const f = fixture({
      rows: [{ ...mailbox, id: a, accountEmail: "a@example.test" }, mailbox],
    });
    await expect(
      sendReviewedMail(f.api, input, () => {}),
    ).resolves.toMatchObject(receipt);
    expect(f.calls.map((call) => call.path)).toEqual([
      "/api/backend/core/engagement/mail/mailboxes",
      "/api/backend/core/engagement/mail/send",
    ]);
    expect(f.writes()).toHaveLength(1);
    expect(f.writes()[0]?.body).toMatchObject({ senderConnectionId: b });
    expect(f.writes()[0]?.body).not.toHaveProperty("reviewedSender");
  });
  it.each(
    [
      [],
      [{ ...mailbox, id: a }],
      [{ ...mailbox, accountEmail: "changed@example.test" }],
      [{ ...mailbox, displayName: "Changed name" }],
      [{ ...mailbox, provider: "microsoft_365" }],
    ].map((rows) => ({ rows })),
  )(
    "never substitutes or dispatches a stale/absent mailbox",
    async ({ rows }) => {
      const f = fixture({ rows });
      await expect(
        sendReviewedMail(f.api, input, () => {}),
      ).rejects.toMatchObject({ uncertain: false });
      expect(f.writes()).toHaveLength(0);
    },
  );
  it.each([
    { senderConnectionId: a },
    { senderEmail: "a@example.test" },
    { senderName: "Wrong name" },
    { signaturePolicy: "mailbox" },
    { signatureAppended: undefined },
    { signatureAppended: true },
  ])(
    "a mismatched sender/signature receipt is uncertain and never replayed",
    async (change) => {
      const f = fixture({ result: { ...receipt, ...change } });
      await expect(
        sendReviewedMail(f.api, input, () => {}),
      ).rejects.toMatchObject({ uncertain: true });
      expect(f.writes()).toHaveLength(1);
    },
  );
  it.each(["MAIL_SEND_OUTCOME_UNKNOWN", "MAIL_SEND_RECEIPT_UNAVAILABLE"])(
    "%s is an uncertain single attempt",
    async (error) => {
      const f = fixture({
        status: 503,
        result: {
          error,
          retryable: false,
          senderConnectionId: b,
          senderEmail: mailbox.accountEmail,
        },
      });
      await expect(
        sendReviewedMail(f.api, input, () => {}),
      ).rejects.toMatchObject({ uncertain: true });
      expect(f.writes()).toHaveLength(1);
    },
  );
  it("refuses a reply from B to an A-owned thread before dispatch", async () => {
    const f = fixture({ connectionId: a });
    await expect(
      sendReviewedMail(f.api, { ...input, threadId }, () => {}),
    ).rejects.toMatchObject({ uncertain: false });
    expect(f.writes()).toHaveLength(0);
  });
  it("an actor change during mailbox reread dispatches nothing", async () => {
    const f = fixture();
    await expect(
      sendReviewedMail(f.api, input, () => {
        if (f.calls.length) throw Error("Actor replaced");
      }),
    ).rejects.toMatchObject({ uncertain: false });
    expect(f.writes()).toHaveLength(0);
  });
  it("requires unique safe current mailbox projections", () => {
    expect(sendingMailboxesSchema.safeParse([mailbox, mailbox]).success).toBe(
      false,
    );
    expect(
      sendingMailboxesSchema.safeParse([
        { ...mailbox, token: "forbidden fixture field" },
      ]).success,
    ).toBe(false);
    expect(
      sendingMailboxesSchema.safeParse([
        { ...mailbox, availability: "unavailable" },
      ]).success,
    ).toBe(false);
  });
});
