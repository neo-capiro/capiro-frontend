import { mailActorId } from "../mail-read-fixture";
import { test, expect, type Page } from "@playwright/test";
import { installFixtures, sendingMailbox, sendingReceipt } from "./fixtures";
import type { MailThreadPage } from "../../src/features/portfolio/relationships/email/read";
import {
  fullThread,
  threadId,
  threadTenantId,
  threadClientId,
} from "../thread-mail-fixture";
async function setup(
  page: Page,
  options: {
    body?: unknown;
    status?: number;
    role?: string;
    hold?: Promise<void>;
    actual?: boolean;
  } = {},
) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      await route.abort();
      throw new Error(
        "External requests are forbidden in the synthetic mail fixture",
      );
    }
    return route.fallback();
  });
  await installFixtures(page);
  let reads = 0;
  const writes: string[] = [];
  let failing = Boolean(options.status);
  await page.route("**/api/backend/core/**", async (route) => {
    const path = new URL(route.request().url()).pathname.split(
      "/api/backend/core/",
    )[1];
    if (route.request().method() !== "GET") {
      writes.push(path ?? "unknown");
      return route.fulfill({
        status: 500,
        json: { message: "No writes authorized" },
      });
    }
    if (path === "me")
      return route.fulfill({
        json: {
          user: { id: mailActorId, email: "actor@example.test" },
          tenant: { id: threadTenantId, name: "Synthetic" },
          role: options.role ?? "standard_user",
        },
      });
    if (path === `engagement/mail-threads/${threadId}`) {
      reads++;
      await options.hold;
      const selected = new URL(route.request().url()).searchParams.get(
        "messageId",
      );
      const body = options.body ?? fullThread;
      const response =
        selected &&
        body &&
        typeof body === "object" &&
        "messages" in body &&
        Array.isArray(body.messages)
          ? {
              ...body,
              messages: body.messages.filter(
                (message) => message.id === selected,
              ),
              totalMessages: 1,
              hasMore: false,
              nextMessageOffset: null,
              nextCursor: null,
            }
          : body;
      return route.fulfill({
        status: failing ? options.status : 200,
        json: failing ? { message: "Synthetic thread read refused" } : response,
      });
    }
    if (path === "me/email-signature")
      return route.fulfill({ json: { html: null, enabled: false } });
    if (path === `clients/${threadClientId}/activity`)
      return route.fulfill({
        json: [
          {
            id: `email:${threadId}`,
            kind: "email",
            title: "Synthetic policy discussion",
            body: "Stored preview",
            occurredAt: "2026-10-11T14:00:00Z",
            sourceType: "mail_thread",
            sourceId: threadId,
            origin: "derived",
            dueAt: null,
            settledAt: null,
            pinned: false,
          },
          {
            id: "40000000-0000-4000-8000-000000000001",
            kind: "email",
            title: "Recorded email is not a synced thread",
            body: "Manually logged synthetic note",
            occurredAt: "2026-10-11T13:00:00Z",
            sourceType: "mail_thread",
            sourceId: threadId,
            origin: "recorded",
            dueAt: null,
            settledAt: null,
            pinned: false,
          },
          {
            id: "email:invalid",
            kind: "email",
            title: "Invalid synced source is not opened",
            body: null,
            occurredAt: "2026-10-11T12:00:00Z",
            sourceType: "mail_thread",
            sourceId: "provider-message-id-not-thread-uuid",
            origin: "derived",
            dueAt: null,
            settledAt: null,
            pinned: false,
          },
        ],
      });
    return route.fallback();
  });
  await page.goto(
    options.actual ? `/portfolio/${threadClientId}` : "/__test/thread-mail",
  );
  await expect(
    page.getByRole("button", { name: "Expand email thread" }),
  ).toBeVisible();
  return {
    reads: () => reads,
    writes,
    recover: () => {
      failing = false;
    },
  };
}
async function expand(page: Page) {
  await page.getByRole("button", { name: "Expand email thread" }).click();
}

async function nativeSetup(
  page: Page,
  options: {
    provider?: "google_workspace" | "microsoft_365";
    recover?: boolean;
    all?: boolean;
    unknown?: boolean;
    selectedHold?: Promise<void>;
  } = {},
) {
  const original = fullThread.messages[1]!;
  const context = {
    supported: true as const,
    operation: "reply" as const,
    originalMessageId: original.id,
    originalUpdatedAt: "2026-10-26T20:00:00.000Z",
    senderConnectionId: sendingMailbox.id,
    subject: fullThread.subject,
    to: [{ email: "verified-reply-to@example.test" }] as [{ email: string }],
  };
  const allContext = {
    ...context,
    operation: "reply_all" as const,
    to: [...context.to, { email: "colleague@example.test" }],
    cc: [{ email: "copied@example.test" }],
  };
  let current: MailThreadPage = {
    ...fullThread,
    connectionId: sendingMailbox.id,
    connectionEmail: sendingMailbox.accountEmail,
    messages: [
      {
        ...fullThread.messages[0]!,
        sentAt: "2026-10-26T21:00:00Z",
        fromEmail: sendingMailbox.accountEmail,
        replyContext: {
          supported: false,
          reason: "Outgoing originals cannot be replied to here.",
        },
      },
      { ...original, replyContext: context, replyAllContext: allContext },
    ],
  };
  const fixture = await setup(page, { body: current });
  const sent: Record<string, unknown>[] = [];
  let selectedReads = 0;
  let status = 200;
  const reads: string[] = [];
  await page.route(`**/engagement/mail-threads/${threadId}*`, async (route) => {
    const url = new URL(route.request().url());
    reads.push(url.search);
    const messageId = url.searchParams.get("messageId");
    const response = messageId
      ? {
          ...current,
          messages: current.messages.filter(
            (message) => message.id === messageId,
          ),
          totalMessages: 1,
          hasMore: false,
          nextMessageOffset: null,
          nextCursor: null,
        }
      : current;
    if (messageId) {
      selectedReads++;
      await options.selectedHold;
    }
    return route.fulfill({
      status,
      json:
        status === 200
          ? {
              ...response,
              associationClientId:
                url.searchParams.get("associationClientId") ??
                response.associationClientId,
            }
          : { message: "Synthetic current read refused" },
    });
  });
  await page.route("**/engagement/mail/mailboxes", (route) =>
    route.fulfill({
      json: [
        { ...sendingMailbox, provider: options.provider ?? "google_workspace" },
      ],
    }),
  );
  const receipt = (requestKey: string) => ({
    ok: true,
    intentId: "c0000000-0000-4000-8000-000000000001",
    requestKey,
    state: "accepted",
    threadId: "a0000000-0000-4000-8000-000000000099",
    messageId: "b0000000-0000-4000-8000-000000000099",
    operation: options.all ? "reply_all" : "reply",
    originalMessageId: original.id,
    originalThreadId: threadId,
    originalUpdatedAt: context.originalUpdatedAt,
    ...sendingReceipt,
  });
  await page.route("**/engagement/mail/send-intents/*", (route) => {
    const requestKey = new URL(route.request().url()).pathname
      .split("/")
      .at(-1)!;
    return route.fulfill({
      json:
        options.unknown || !sent.length
          ? {
              intentId: "c0000000-0000-4000-8000-000000000001",
              requestKey,
              state: options.unknown ? "unknown" : "sending",
            }
          : receipt(requestKey),
    });
  });
  await page.route("**/engagement/mail/send", (route) => {
    const body = route.request().postDataJSON();
    sent.push(body);
    return route.fulfill(
      options.recover || options.unknown
        ? { status: 503, json: { message: "Synthetic response unavailable" } }
        : { json: receipt(body.requestKey) },
    );
  });
  return {
    ...fixture,
    original,
    context,
    allContext,
    sent,
    reads,
    selectedReads: () => selectedReads,
    thread: () => current,
    replace: (next: MailThreadPage) => {
      current = next;
    },
    refuse: () => {
      status = 403;
    },
  };
}

async function openNativeAll(page: Page, originalId: string) {
  await page
    .getByLabel("Original message", { exact: true })
    .selectOption(originalId);
  await page.getByRole("button", { name: "Reply all", exact: true }).click();
  return page.getByRole("dialog", { name: "Reply all", exact: true });
}

async function openNative(page: Page, originalId: string) {
  await page
    .getByLabel("Original message", { exact: true })
    .selectOption(originalId);
  await page
    .getByRole("button", {
      name: "Reply to verified-reply-to@example.test",
      exact: true,
    })
    .click();
  return page.getByRole("dialog", { name: "Reply", exact: true });
}

for (const provider of ["google_workspace", "microsoft_365"] as const)
  test(`native Timeline ${provider} replies to the selected older incoming origin and preserves acceptance`, async ({
    page,
  }, info) => {
    const fixture = await nativeSetup(page, { provider });
    await expand(page);
    await page
      .getByLabel("Original message", { exact: true })
      .selectOption(fullThread.messages[0]!.id);
    await expect(page.getByRole("note")).toContainText("Outgoing originals");
    await expect(
      page.getByRole("button", { name: "Reply", exact: true }),
    ).toBeDisabled();
    const dialog = await openNative(page, fixture.original.id);
    await expect(dialog.getByLabel("From mailbox")).toBeDisabled();
    await expect(dialog.getByLabel("Subject", { exact: true })).toBeDisabled();
    await dialog
      .getByLabel("Message", { exact: true })
      .fill("Synthetic Timeline native reply.");
    await dialog
      .getByRole("button", { name: "Review email", exact: true })
      .click();
    const review = page.getByRole("dialog", {
      name: "Send email",
      exact: true,
    });
    await expect(
      review.getByText("To: verified-reply-to@example.test", { exact: true }),
    ).toBeVisible();
    await expect(review.getByText(/^From:/)).toContainText(
      sendingMailbox.accountEmail,
    );
    await expect(review.getByText(/^Cc:/)).toHaveCount(0);
    await review
      .getByRole("button", { name: "Send email", exact: true })
      .click();
    await expect(
      page.getByText("Your mailbox accepted the email.", { exact: true }),
    ).toBeVisible();
    expect(fixture.sent).toHaveLength(1);
    expect(fixture.sent[0]).toMatchObject({
      operation: "reply",
      originalMessageId: fixture.original.id,
      originalUpdatedAt: fixture.context.originalUpdatedAt,
      threadId,
      senderConnectionId: sendingMailbox.id,
      to: fixture.context.to,
    });
    expect(fixture.selectedReads()).toBeGreaterThanOrEqual(3);
    expect(
      fixture.reads.some(
        (query) =>
          query.includes(
            `expectedUpdatedAt=${encodeURIComponent(fullThread.updatedAt)}`,
          ) &&
          query.includes(`expectedBodySha256=${fixture.original.bodySha256}`),
      ),
    ).toBe(true);
    expect(fixture.writes).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`native-${provider}-accepted.png`),
      fullPage: true,
    });
  });

for (const event of [
  "thread-actor-change",
  "thread-client-change",
  "thread-identity-invalidate",
])
  test(`native Timeline draft retires on ${event}`, async ({ page }) => {
    const fixture = await nativeSetup(page);
    await expand(page);
    const dialog = await openNative(page, fixture.original.id);
    await dialog
      .getByLabel("Message", { exact: true })
      .fill("Private old-scope draft");
    await page.evaluate(
      (event) => window.dispatchEvent(new Event(event)),
      event,
    );
    await expect(dialog).toHaveCount(0);
    expect(fixture.sent).toEqual([]);
  });

test("parent collapse and refresh callbacks retire an open native draft without a send", async ({
  page,
}) => {
  const fixture = await nativeSetup(page);
  await expand(page);
  await openNative(page, fixture.original.id);
  await page
    .getByRole("button", {
      name: "Show less",
      exact: true,
      includeHidden: true,
    })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expand(page);
  await expect(
    page.getByLabel("Original message", { exact: true }),
  ).toHaveValue("");
  await openNative(page, fixture.original.id);
  await page
    .getByRole("button", {
      name: "Refresh thread",
      exact: true,
      includeHidden: true,
    })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByLabel("Original message", { exact: true }),
  ).toHaveValue("");
  expect(fixture.sent).toEqual([]);
});

test("closing the native dialog permits ordinary collapse and refresh with blank selection", async ({
  page,
}) => {
  const fixture = await nativeSetup(page);
  await expand(page);
  for (const action of ["Show less", "Refresh thread"]) {
    const dialog = await openNative(page, fixture.original.id);
    await dialog
      .getByLabel("Message", { exact: true })
      .fill("Discarded local draft");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: action, exact: true }).click();
    if (action === "Show less") await expand(page);
    await expect(
      page.getByLabel("Original message", { exact: true }),
    ).toHaveValue("");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(fixture.sent).toEqual([]);
});

for (const change of ["removed", "body", "revision", "mailbox", "refused"])
  test(`current ${change} original retires native reply draft`, async ({
    page,
  }) => {
    const fixture = await nativeSetup(page);
    await expand(page);
    const dialog = await openNative(page, fixture.original.id);
    const current = fixture.thread();
    if (change === "refused") fixture.refuse();
    else
      fixture.replace({
        ...current,
        ...(change === "mailbox"
          ? { connectionId: "70000000-0000-4000-8000-000000000099" }
          : {}),
        messages:
          change === "removed"
            ? [current.messages[0]!]
            : current.messages.map((message) =>
                message.id !== fixture.original.id
                  ? message
                  : {
                      ...message,
                      ...(change === "body"
                        ? { bodySha256: "b".repeat(64) }
                        : {}),
                      replyContext: {
                        ...fixture.context,
                        ...(change === "revision"
                          ? { originalUpdatedAt: "2026-10-27T00:00:00.000Z" }
                          : {}),
                        ...(change === "mailbox"
                          ? {
                              senderConnectionId:
                                "70000000-0000-4000-8000-000000000099",
                            }
                          : {}),
                      },
                    },
              ),
        ...(change === "removed" ? { totalMessages: 1 } : {}),
        updatedAt: "2026-10-27T00:00:00.000Z",
      });
    await page.evaluate(() =>
      window.dispatchEvent(new Event("thread-refresh")),
    );
    await expect(dialog).toHaveCount(0);
    expect(fixture.sent).toEqual([]);
  });

test("late selected-origin response after collapse cannot restore reply authority", async ({
  page,
}) => {
  let release = () => {};
  const selectedHold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fixture = await nativeSetup(page, { selectedHold });
  await expand(page);
  await page
    .getByLabel("Original message", { exact: true })
    .selectOption(fixture.original.id);
  await expect.poll(() => fixture.selectedReads()).toBe(1);
  await page.getByRole("button", { name: "Show less", exact: true }).click();
  release();
  await expand(page);
  await expect(
    page.getByLabel("Original message", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Reply", exact: true }),
  ).toBeDisabled();
  expect(fixture.sent).toEqual([]);
});

for (const unknown of [false, true])
  test(`native Timeline lost response ${unknown ? "stays UNKNOWN after reload" : "recovers exact accepted origin"} without replay`, async ({
    page,
  }) => {
    const fixture = await nativeSetup(page, { recover: true, unknown });
    await expand(page);
    const dialog = await openNative(page, fixture.original.id);
    await dialog
      .getByLabel("Message", { exact: true })
      .fill("Synthetic one-attempt reply.");
    await dialog
      .getByRole("button", { name: "Review email", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Send email", exact: true })
      .getByRole("button", { name: "Send email", exact: true })
      .click();
    if (unknown) {
      await expect(
        page.getByText(/This reviewed attempt cannot be sent again/),
      ).toBeVisible();
      await page.reload();
      await expand(page);
      const restored = await openNative(page, fixture.original.id);
      await expect(
        restored.getByRole("button", { name: "Review email", exact: true }),
      ).toBeDisabled();
      await expect(
        restored.getByText(/This attempt cannot be retried here/),
      ).toBeVisible();
    } else
      await expect(
        page.getByText("Your mailbox accepted the email.", { exact: true }),
      ).toBeVisible({ timeout: 12000 });
    expect(fixture.sent).toHaveLength(1);
    expect(fixture.writes).toEqual([]);
  });
test("expands exact stored messages on demand, orders incoming newest and collapses", async ({
  page,
}, info) => {
  const fixture = await setup(page);
  expect(fixture.reads()).toBe(0);
  await expand(page);
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toBeVisible();
  const messages = page
    .getByRole("region", { name: "Synced email thread" })
    .getByRole("article");
  await expect(messages.first()).toContainText(
    "Latest incoming stored message",
  );
  await expect(messages.first()).toContainText(
    "<script>untrusted email is plain text</script>",
  );
  await page.evaluate(async () => {
    await document.fonts.load('13px "Geist Test"');
  });
  expect(
    await page.evaluate(() => document.fonts.check('13px "Geist Test"')),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("thread-expanded-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Show less" }).click();
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).not.toBeVisible();
  await expand(page);
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toBeVisible();
  expect(fixture.reads()).toBe(1);
  expect(fixture.writes).toEqual([]);
});
test("unsupported original retains ordinary stored body and refuses native preparation", async ({
  page,
}) => {
  const fixture = await setup(page);
  await expand(page);
  await page
    .getByLabel("Original message", { exact: true })
    .selectOption(fullThread.messages[1]!.id);
  await expect(
    page.getByText(
      "Native reply is unavailable for this original. Reply from your mailbox.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reply", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
});

for (const provider of ["google_workspace", "microsoft_365"] as const)
  test(`native reply-all ${provider} sends only the canonical reviewed To and Cc`, async ({
    page,
  }) => {
    const fixture = await nativeSetup(page, { provider, all: true });
    await expand(page);
    const dialog = await openNativeAll(page, fixture.original.id);
    await expect(dialog.getByLabel("Cc", { exact: true })).toHaveValue(
      "copied@example.test",
    );
    await expect(dialog.getByLabel("Cc", { exact: true })).toBeDisabled();
    await dialog
      .getByLabel("Message", { exact: true })
      .fill("Synthetic native reply all.");
    await dialog
      .getByRole("button", { name: "Review email", exact: true })
      .click();
    const review = page.getByRole("dialog", {
      name: "Send email",
      exact: true,
    });
    await expect(
      review.getByText("Cc: copied@example.test", { exact: true }),
    ).toBeVisible();
    await expect(
      review.getByText(
        "To: verified-reply-to@example.test, colleague@example.test",
        { exact: true },
      ),
    ).toBeVisible();
    await review
      .getByRole("button", { name: "Send email", exact: true })
      .click();
    await expect(
      page.getByText("Your mailbox accepted the email.", { exact: true }),
    ).toBeVisible();
    expect(fixture.sent).toHaveLength(1);
    expect(fixture.sent[0]).toMatchObject({
      operation: "reply_all",
      originalMessageId: fixture.original.id,
      originalUpdatedAt: fixture.context.originalUpdatedAt,
      threadId,
      senderConnectionId: sendingMailbox.id,
      to: fixture.allContext.to,
      cc: fixture.allContext.cc,
    });
    expect(fixture.writes).toEqual([]);
  });

test("a failed thread read retries only GET and cannot leak stale message content", async ({
  page,
}) => {
  const fixture = await setup(page, { status: 403 });
  await expand(page);
  await expect(page.getByRole("alert")).toContainText("permission");
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toHaveCount(0);
  fixture.recover();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toBeVisible();
  expect(fixture.reads()).toBe(2);
  expect(fixture.writes).toEqual([]);
});
test("wrong client receipt is refused", async ({ page }) => {
  const fixture = await setup(page, {
    body: { ...fullThread, clientId: threadTenantId },
  });
  await expand(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reply", exact: true }),
  ).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
});
test("cross-thread message receipt is refused", async ({ page }) => {
  await setup(page, {
    body: {
      ...fullThread,
      messages: [{ ...fullThread.messages[0], threadId: threadTenantId }],
    },
  });
  await expand(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toHaveCount(0);
});
test("missing mailbox identity blocks recipient review without guessing from snippet", async ({
  page,
}) => {
  const fixture = await setup(page, {
    body: { ...fullThread, connectionEmail: null },
  });
  await expand(page);
  await page
    .getByLabel("Original message", { exact: true })
    .selectOption(fullThread.messages[1]!.id);
  await expect(
    page.getByRole("button", { name: "Reply all", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
});
test("read-only actor can expand but cannot prepare a reply", async ({
  page,
}) => {
  const fixture = await setup(page, { role: "viewer" });
  await expand(page);
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reply all", exact: true }),
  ).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
});
test("actor change closes the previous actor's draft and cached thread", async ({
  page,
}) => {
  const fixture = await nativeSetup(page, { all: true });
  await expand(page);
  await openNativeAll(page, fixture.original.id);
  await page
    .getByLabel("Message", { exact: true })
    .fill("Previous actor private draft");
  await page.evaluate(() =>
    window.dispatchEvent(new Event("thread-actor-change")),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Expand email thread" }),
  ).toBeVisible();
});
test("client change during held detail read never exposes the previous client message", async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fixture = await setup(page, { hold: held });
  await expand(page);
  await expect.poll(() => fixture.reads()).toBe(1);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("thread-client-change")),
  );
  release();
  await expect(
    page.getByRole("button", { name: "Expand email thread" }),
  ).toBeVisible();
  await expand(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toHaveCount(0);
});
test("invalidated identity cannot retain an open reviewed draft", async ({
  page,
}) => {
  const fixture = await nativeSetup(page, { all: true });
  await expand(page);
  await openNativeAll(page, fixture.original.id);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("thread-identity-invalidate")),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toHaveCount(0);
});
test("empty stored thread has honest empty state and no reply", async ({
  page,
}) => {
  await setup(page, {
    body: { ...fullThread, messages: [], totalMessages: 0 },
  });
  await expand(page);
  await expect(
    page.getByText("No active stored messages in this thread."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reply", exact: true }),
  ).toBeDisabled();
});
test("mobile dark expansion wraps without overflow", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await setup(page);
  await expand(page);
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("thread-mobile-dark.png"),
    fullPage: true,
  });
});
test("actual Overview expands only a valid derived synced source and requires canonical reply context", async ({
  page,
}, info) => {
  const fixture = await setup(page, { actual: true });
  const timeline = page.getByRole("region", {
    name: "Activity timeline",
    exact: true,
  });
  await expect(
    timeline.getByText("Recorded email is not a synced thread", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    timeline.getByText("Invalid synced source is not opened", { exact: true }),
  ).toBeVisible();
  await expect(
    timeline.getByRole("button", { name: "Expand email thread" }),
  ).toHaveCount(1);
  expect(fixture.reads()).toBe(0);
  await expand(page);
  await expect(
    timeline.getByText("Earlier outgoing message.", { exact: true }),
  ).toBeVisible();
  await expect(
    timeline.getByRole("button", { name: "Reply all", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await timeline.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("actual-overview-thread-desktop.png"),
  });
  expect(fixture.reads()).toBe(1);
  expect(fixture.writes).toEqual([]);
});
test("actual Overview thread fits mobile dark with inline collapse", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  const fixture = await setup(page, { actual: true });
  await expand(page);
  const timeline = page.getByRole("region", {
    name: "Activity timeline",
    exact: true,
  });
  await expect(
    timeline.getByText("Earlier outgoing message.", { exact: true }),
  ).toBeVisible();
  await timeline.scrollIntoViewIfNeeded();
  expect(
    await page
      .getByLabel("Original message", { exact: true })
      .evaluate(
        (select) => select.getBoundingClientRect().right <= window.innerWidth,
      ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("actual-overview-thread-mobile-dark.png"),
  });
  await timeline.getByRole("button", { name: "Show less" }).click();
  await expect(
    timeline.getByText("Earlier outgoing message.", { exact: true }),
  ).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
});
