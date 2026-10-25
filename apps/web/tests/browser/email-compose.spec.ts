import { expectMailMessage } from "./mail-message-assertions";
import { test, expect, type Page } from "@playwright/test";
import { sendingMailbox, sendingReceipt } from "./fixtures";
import {
  mailActorId,
  mailTenantId,
  mailThreadFixture,
} from "../mail-read-fixture";
const clientId = "10000000-0000-4000-8000-000000000001";
const id = "20000000-0000-4000-8000-000000000001";
const other = "20000000-0000-4000-8000-000000000002";
const file = {
  id,
  clientId,
  fileName: "brief.pdf",
  contentType: "application/pdf",
  byteSize: 12,
  source: "email-compose",
  s3Key: "tenants/tenant-a/engagement/test/brief.pdf",
  folder: null,
  viewerMode: "all",
  viewerUserIds: [],
  uploadedByUserId: "actor-a",
  createdAt: "2026-10-11T00:00:00Z",
  lifecycleStatus: "ready",
  scanStatus: "clean",
  extractionStatus: "pending",
  indexedAt: null,
  usable: true,
};
const person = {
  id,
  clientId,
  name: "Taylor Test",
  title: "Director",
  email: "taylor@example.test",
  phone: null,
  role: null,
  notes: null,
  hierarchyLevel: null,
  reportsToPersonId: null,
  placementSource: "manual",
  reviewRequired: false,
  createdAt: "2026-10-11T00:00:00Z",
};
async function setup(
  page: Page,
  options: {
    scan?: boolean;
    sendStatus?: number;
    badReceipt?: boolean;
    wrongRequestKey?: boolean;
    role?: string;
    replyClient?: string;
    holdPrepare?: boolean;
    holdRead?: boolean;
    confirmFailure?: boolean;
  } = {},
) {
  let user = mailActorId;
  let usable = options.scan !== false;
  let prepares = 0;
  let uploads = 0;
  let confirms = 0;
  let reads = 0;
  let releasePrepare: (() => void) | undefined;
  let releaseRead: (() => void) | undefined;
  let failConfirm = options.confirmFailure ?? false;
  const sent: unknown[] = [];
  await page.route("**/api/backend/core/**", async (route) => {
    const path = new URL(route.request().url()).pathname.split(
      "/api/backend/core/",
    )[1];
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, json: body });
    if (path === "me")
      return json({
        user: { id: user, email: "actor@example.test" },
        tenant: { id: mailTenantId, name: "Synthetic" },
        role: options.role ?? "standard_user",
      });
    if (path === "me/email-signature")
      return json({ html: null, enabled: false });
    if (path === "engagement/mail/mailboxes") return json([sendingMailbox]);
    if (path === `clients/${clientId}/people`)
      return json([
        person,
        {
          ...person,
          id: other,
          name: "Morgan Test",
          email: "morgan@example.test",
        },
        {
          ...person,
          id: "20000000-0000-4000-8000-000000000003",
          name: "No email",
          email: null,
        },
      ]);
    if (path === `engagement/mail-threads/${id}`)
      return json(
        mailThreadFixture(
          {
            id,
            clientId: options.replyClient ?? clientId,
            connectionId: sendingMailbox.id,
            subject: "Previous review",
            snippet: null,
            connectionEmail: sendingMailbox.accountEmail,
            participants: [{ email: person.email }],
            messages: [],
          },
          { associationClientId: clientId, connectionOwnerActorId: user },
        ),
      );
    if (path === "engagement/attachments/upload-url") {
      prepares++;
      if (options.holdPrepare)
        await new Promise<void>((resolve) => {
          releasePrepare = resolve;
        });
      return json({
        url: "https://storage.example.test/upload",
        fields: { key: "tenants/tenant-a/engagement/test/brief.pdf" },
        s3Key: "tenants/tenant-a/engagement/test/brief.pdf",
      });
    }
    if (path === "engagement/attachments/confirm") {
      confirms++;
      if (failConfirm) {
        failConfirm = false;
        return json({ message: "Confirmation temporarily unavailable" }, 503);
      }
      return json(file);
    }
    if (path === "engagement/attachments") {
      expect(new URL(route.request().url()).searchParams.get("clientId")).toBe(
        clientId,
      );
      reads++;
      if (options.holdRead && reads > 1)
        await new Promise<void>((resolve) => {
          releaseRead = resolve;
        });
      return json([
        {
          ...file,
          usable,
          blockedReason: usable ? undefined : "Awaiting malware scan",
          scanStatus: usable ? "clean" : "pending",
          lifecycleStatus: usable ? "ready" : "quarantined",
          scanDisclosure: usable ? undefined : "Awaiting malware scan",
        },
      ]);
    }
    if (path === "engagement/mail/send") {
      expect(route.request().method()).toBe("POST");
      const input = route.request().postDataJSON();
      sent.push(input);
      if (options.wrongRequestKey) expect(input.requestKey).not.toBe(other);
      return json(
        options.badReceipt
          ? { ok: true }
          : options.sendStatus
            ? { message: "Delivery could not be confirmed" }
            : {
                ok: true,
                intentId: id,
                requestKey: options.wrongRequestKey ? other : input.requestKey,
                state: "accepted",
                threadId: id,
                messageId: other,
                ...sendingReceipt,
              },
        options.sendStatus ?? 200,
      );
    }
    return json({ message: `Unexpected fixture route: ${path}` }, 500);
  });
  await page.route("https://storage.example.test/**", async (route) => {
    uploads++;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/__test/email-compose");
  return {
    sent,
    counts: () => ({ prepares, uploads, confirms, reads }),
    setUsable: () => {
      usable = true;
    },
    actor: () => {
      user = "actor-b";
    },
    releasePrepare: () => releasePrepare?.(),
    releaseRead: () => releaseRead?.(),
  };
}
async function compose(page: Page, reply = false, reviewAvailable = true) {
  await page
    .getByRole("button", {
      name: reply ? "Reply to thread" : "Mail contact",
      exact: true,
    })
    .click();
  await page.getByLabel("Subject", { exact: true }).fill("Synthetic review");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Draft retained for explicit review.");
  if (!reply)
    await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  if (reviewAvailable)
    await expect(
      page.getByRole("button", { name: "Review email", exact: true }),
    ).toBeEnabled();
}
async function attach(page: Page) {
  await page.getByLabel("Attach file", { exact: true }).setInputFiles({
    name: "brief.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-fixture"),
  });
}
test("explicit mailbox B is shown in review and confirmed by its exact sender receipt", async ({
  page,
}) => {
  await setup(page);
  const second = {
    ...sendingMailbox,
    id: other,
    accountEmail: "second@example.test",
    displayName: "Second mailbox",
  };
  const sent: unknown[] = [];
  await page.route("**/engagement/mail/mailboxes", (route) =>
    route.fulfill({ json: [sendingMailbox, second] }),
  );
  await page.route("**/engagement/mail/send", (route) => {
    const body = route.request().postDataJSON();
    sent.push(body);
    expect(body.senderConnectionId).toBe(second.id);
    expect(body).not.toHaveProperty("reviewedSender");
    return route.fulfill({
      json: {
        ok: true,
        intentId: id,
        requestKey: body.requestKey,
        state: "accepted",
        threadId: id,
        messageId: other,
        ...sendingReceipt,
        senderConnectionId: second.id,
        senderEmail: second.accountEmail,
        senderName: second.displayName,
      },
    });
  });
  await compose(page);
  await page.getByLabel("From mailbox").selectOption(second.id);
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Send email", exact: true });
  await expect(
    review.getByText("From: Second mailbox · second@example.test", {
      exact: true,
    }),
  ).toBeVisible();
  await review.getByRole("button", { name: "Send email", exact: true }).click();
  await expect(page.getByText("Email sent.", { exact: true })).toBeVisible();
  await expect(
    page.getByText("From: second@example.test", { exact: true }),
  ).toBeVisible();
  expect(sent).toHaveLength(1);
});
test("a removed reviewed mailbox is not replaced by another mailbox", async ({
  page,
}) => {
  const state = await setup(page);
  await compose(page);
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  await page.route("**/engagement/mail/mailboxes", (route) =>
    route.fulfill({
      json: [
        { ...sendingMailbox, id: other, accountEmail: "other@example.test" },
      ],
    }),
  );
  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect(
    page.getByText(/reviewed sending mailbox changed or is unavailable/).last(),
  ).toBeVisible();
  expect(state.sent).toHaveLength(0);
  await page.keyboard.press("Escape");
  await expectMailMessage(page, "Draft retained for explicit review.");
});
test("an unavailable mailbox contract leaves the draft review disabled", async ({
  page,
}) => {
  const state = await setup(page);
  await page.route("**/engagement/mail/mailboxes", (route) =>
    route.fulfill({ status: 404, json: { message: "Mailboxes unavailable" } }),
  );
  await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  await page.getByLabel("Message", { exact: true }).fill("Retained draft");
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Mailboxes unavailable", { exact: true }),
  ).toBeVisible();
  await expectMailMessage(page, "Retained draft");
  expect(state.sent).toHaveLength(0);
});
test("overlay clicks respect context gestures and dismiss only the top email review", async ({
  page,
}) => {
  const state = await setup(page);
  await compose(page);
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Send email", exact: true });
  await expect(review).toBeVisible();
  await page.mouse.click(4, 4, { button: "right" });
  await expect(review).toBeVisible();
  await page.keyboard.down("Control");
  await page.mouse.click(4, 4);
  await page.keyboard.up("Control");
  await expect(review).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(review).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "New email", exact: true }),
  ).toBeVisible();
  await expectMailMessage(page, "Draft retained for explicit review.");
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeFocused();
  expect(state.sent).toHaveLength(0);
});
test("invalidated successful idle identity refuses mail dispatch and retains draft", async ({
  page,
}) => {
  const state = await setup(page);
  await compose(page);
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  expect(await page.evaluate(() => window.__mailInvalidate?.())).toEqual({
    status: "success",
    fetchStatus: "idle",
    isInvalidated: true,
  });
  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect(
    page.getByText(/mailbox session changed or is unverified/).last(),
  ).toBeVisible({ timeout: 2000 });
  expect(state.sent).toHaveLength(0);
  await page.keyboard.press("Escape");
  await expectMailMessage(page, "Draft retained for explicit review.");
});
test("invalidated successful idle identity refuses upload prepare dispatch", async ({
  page,
}) => {
  const state = await setup(page);
  await compose(page);
  expect(await page.evaluate(() => window.__mailInvalidate?.())).toEqual({
    status: "success",
    fetchStatus: "idle",
    isInvalidated: true,
  });
  await attach(page);
  await expect(
    page.getByText(/mailbox session changed or is unverified/).last(),
  ).toBeVisible({ timeout: 2000 });
  expect(state.counts()).toMatchObject({
    prepares: 0,
    uploads: 0,
    confirms: 0,
  });
  expect(state.sent).toHaveLength(0);
});
test("contact picker and CC/BCC survive explicit review and send exact receipt", async ({
  page,
}) => {
  const state = await setup(page);
  await compose(page);
  await page
    .getByRole("button", { name: "+ Add recipient", exact: true })
    .click();
  await page.getByLabel("Search client contacts").fill("morgan");
  await page
    .getByRole("button", { name: "Morgan Test · morgan@example.test" })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove recipient morgan@example.test" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cc", exact: true }).click();
  await page.getByLabel("Cc", { exact: true }).fill("copied@example.test");
  await page.getByRole("button", { name: "Bcc", exact: true }).click();
  await page.getByLabel("Bcc", { exact: true }).fill("blind@example.test");
  await page.screenshot({
    path: process.env.PORTFOLIO_EMAIL_SCREENSHOT_DIR
      ? `${process.env.PORTFOLIO_EMAIL_SCREENSHOT_DIR}/email-picker-desktop-light.png`
      : "test-results/email-picker-desktop-light.png",
  });
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  await expect(
    page.getByText("Bcc: blind@example.test", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect(page.getByText("Email sent.", { exact: true })).toBeVisible();
  expect(state.sent).toHaveLength(1);
  expect(state.sent[0]).toMatchObject({
    clientId,
    personIds: [id, other],
    to: [
      { email: "taylor@example.test", name: "Taylor Test" },
      { email: "morgan@example.test", name: "Morgan Test" },
    ],
    cc: [{ email: "copied@example.test" }],
    bcc: [{ email: "blind@example.test" }],
  });
});
test("invalid/duplicate copied recipient retains draft and never sends", async ({
  page,
}) => {
  const state = await setup(page);
  await compose(page);
  await page.getByRole("button", { name: "Cc", exact: true }).click();
  await page.getByLabel("Cc", { exact: true }).fill("TAYLOR@example.test");
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  await expect(page.getByText(/only once across/)).toBeVisible();
  await expectMailMessage(page, "Draft retained for explicit review.");
  expect(state.sent).toHaveLength(0);
});
test("upload confirmation and scan readiness stay separate before send", async ({
  page,
}) => {
  const state = await setup(page, { scan: false });
  await compose(page);
  await attach(page);
  await expect(
    page.getByRole("button", { name: "Check scan status" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  expect(state.counts()).toMatchObject({
    prepares: 1,
    uploads: 1,
    confirms: 1,
    reads: 1,
  });
  state.setUsable();
  await page.getByRole("button", { name: "Check scan status" }).click();
  await expect(
    page.getByText("Ready to attach", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect(page.getByText("Email sent.", { exact: true })).toBeVisible();
  expect(state.sent[0]).toMatchObject({ attachmentIds: [id] });
  expect(state.counts()).toMatchObject({
    prepares: 1,
    uploads: 1,
    confirms: 1,
    reads: 3,
  });
});
test("confirmation retry reuses storage attempt without another byte upload", async ({
  page,
}) => {
  const state = await setup(page, { confirmFailure: true });
  await compose(page);
  await attach(page);
  await expect(
    page.getByText("Confirmation temporarily unavailable", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retry confirmation / upload" })
    .click();
  await expect(
    page.getByText("Ready to attach", { exact: true }),
  ).toBeVisible();
  expect(state.counts()).toMatchObject({
    prepares: 1,
    uploads: 1,
    confirms: 2,
  });
});
test("oversize file refuses before prepare and draft removal never deletes Files", async ({
  page,
}) => {
  const state = await setup(page);
  await compose(page);
  await page.getByLabel("Attach file", { exact: true }).setInputFiles({
    name: "large.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(3 * 1024 * 1024 + 1),
  });
  await expect(page.getByText(/3 MiB or smaller per file/)).toBeVisible();
  expect(state.counts().prepares).toBe(0);
  await page
    .getByRole("button", { name: "Remove attachment large.pdf" })
    .click();
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeEnabled();
});
for (const status of [503, 200, "wrong-key"] as const)
  test(`uncertain or malformed receipt freezes send attempt (${status})`, async ({
    page,
  }) => {
    const state = await setup(
      page,
      status === 503
        ? { sendStatus: 503 }
        : status === "wrong-key"
          ? { wrongRequestKey: true }
          : { badReceipt: true },
    );
    await compose(page);
    await page
      .getByRole("button", { name: "Review email", exact: true })
      .click();
    await page.getByRole("button", { name: "Send email", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Send email", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(
      page.getByText(/This attempt cannot be retried here/),
    ).toBeVisible();
    await expectMailMessage(page, "Draft retained for explicit review.");
    expect(state.sent).toHaveLength(1);
  });
test("actor change while prepare awaits causes zero storage/confirm/send", async ({
  page,
}) => {
  const state = await setup(page, { holdPrepare: true });
  await compose(page);
  await attach(page);
  await expect.poll(() => state.counts().prepares).toBe(1);
  state.actor();
  await page.evaluate(() => window.__mailRecheck?.());
  state.releasePrepare();
  await expect(
    page.getByRole("region", { name: "Email attachments" }).getByRole("alert"),
  ).toContainText("mailbox session changed or is unverified");
  expect(state.counts()).toMatchObject({ uploads: 0, confirms: 0 });
  expect(state.sent).toHaveLength(0);
});
test("unmounted actor lifetime refuses delayed upload dispatch", async ({
  page,
}) => {
  const state = await setup(page, { holdPrepare: true });
  await compose(page);
  await attach(page);
  await expect.poll(() => state.counts().prepares).toBe(1);
  await page.evaluate(() => window.__mailUnmount?.());
  state.releasePrepare();
  await expect(
    page.getByRole("button", { name: "Mail contact", exact: true }),
  ).toBeVisible();
  await expect.poll(() => state.counts().uploads).toBe(0);
  expect(state.counts().confirms).toBe(0);
});
test("reply to foreign-client thread refuses before mail send", async ({
  page,
}) => {
  const state = await setup(page, { replyClient: other });
  await compose(page, true, false);
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("The reply thread belongs to another client.").last(),
  ).toBeVisible();
  await expectMailMessage(page, "Draft retained for explicit review.");
  expect(state.sent).toHaveLength(0);
});
test("read-only role cannot upload or send", async ({ page }) => {
  const state = await setup(page, { role: "viewer" });
  await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Attach file", { exact: true })).toBeDisabled();
  expect(state.sent).toHaveLength(0);
});
test("mobile dark attachment strip fits, keyboard enters picker and removes recipient", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await compose(page);
  await attach(page);
  await expect(
    page.getByText("Ready to attach", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "+ Add recipient", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Search client contacts")).toBeVisible();
  await expect(page.locator('[role="dialog"]').first()).toHaveCSS(
    "font-family",
    /Geist/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator('[role="dialog"]').first()).toHaveCSS(
    "background-color",
    "rgb(27, 27, 27)",
  );
  await page
    .getByText("Ready to attach", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: process.env.PORTFOLIO_EMAIL_SCREENSHOT_DIR
      ? `${process.env.PORTFOLIO_EMAIL_SCREENSHOT_DIR}/email-attachment-mobile-dark.png`
      : "test-results/email-attachment-mobile-dark.png",
  });
});
test("prepared seed requires canonical availability and an explicit selected recipient", async ({
  page,
}) => {
  const state = await setup(page);
  await page
    .getByRole("button", { name: "Email prepared document", exact: true })
    .click();
  await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Prepared review",
  );
  await expectMailMessage(page, "Prepared document for your review.");
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "+ Add recipient", exact: true })
    .click();
  await page.getByLabel("Search client contacts").fill("Morgan");
  await page
    .getByRole("button", { name: "Morgan Test · morgan@example.test" })
    .click();
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Check scan status", exact: true })
    .click();
  await expect(
    page.getByText("Ready to attach", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect(page.getByText("Email sent.", { exact: true })).toBeVisible();
  expect(state.counts()).toMatchObject({
    prepares: 0,
    uploads: 0,
    confirms: 0,
    reads: 2,
  });
  expect(state.sent[0]).toMatchObject({
    to: [{ email: "morgan@example.test", name: "Morgan Test" }],
    attachmentIds: [id],
  });
});
test("actor change during send attachment preflight causes zero mail POST", async ({
  page,
}) => {
  const state = await setup(page, { holdRead: true });
  await compose(page);
  await attach(page);
  await expect(
    page.getByText("Ready to attach", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect.poll(() => state.counts().reads).toBe(2);
  state.actor();
  await page.evaluate(() => window.__mailRecheck?.());
  state.releaseRead();
  await expect(
    page.getByText(/mailbox session changed or is unverified/).last(),
  ).toBeVisible();
  expect(state.sent).toHaveLength(0);
});
