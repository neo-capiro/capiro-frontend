import { expect } from "@playwright/test";
import { test } from "../runtime-observed-test";
import { barrier, fixture, href } from "./fixtures";
import {
  requestKey,
  sendReadback,
  versionId,
  otherId,
  recordId,
} from "../../../tests/newsletter-delivery-fixtures";
import {
  auditPresentation,
  capturePresentation,
} from "../ordinary-presentation-evidence";
const button = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name, exact: true });

test("manual destinations prepare once, immutable preview stays inert, test and deliberate send remain separate", async ({
  page,
}, info) => {
  const state = await fixture(page, false);
  await page.goto(href);
  await expect(
    page.getByRole("heading", { name: "Select destinations" }),
  ).toBeVisible();
  expect(state.calls.every((call) => call.method === "GET")).toBe(true);
  await page.getByRole("tab", { name: "Manual Add" }).click();
  await page.getByLabel("First name", { exact: true }).fill("Taylor");
  await page.getByLabel("Last name", { exact: true }).fill("Reed");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("taylor@example.test");
  await button(page, "Add recipient").click();
  await button(page, "Cc or Bcc").click();
  await page.getByLabel("Cc", { exact: true }).fill("copy@example.test");
  await capturePresentation(
    page,
    info,
    "copies-dialog",
    page.getByRole("dialog"),
  );
  await button(page, "Apply to selected recipient").click();
  await expect(button(page, "Cc or Bcc")).toBeFocused();
  await page.getByRole("combobox", { name: "Send from" }).click();
  await page
    .getByRole("option", { name: "Synthetic Author · author@example.test" })
    .click();
  await page.screenshot({
    path: info.outputPath("destinations.png"),
    fullPage: true,
  });
  await button(page, "Prepare preview").click();
  await expect(
    page.getByRole("heading", { name: "Preview newsletter", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Prepared for Taylor" }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute("sandbox", "");
  expect(
    state.calls
      .filter((call) => call.method === "POST")
      .map((call) => call.key),
  ).toEqual(["engagement.newsletter.prepare"]);
  await page.screenshot({
    path: info.outputPath("prepared.png"),
    fullPage: true,
  });
  await auditPresentation(
    page,
    info,
    "prepared",
    'section[aria-label="Newsletter delivery"]',
  );
  await button(page, "Send test to my inbox").click();
  await expect(
    page.getByRole("region", { name: "Test delivery status" }),
  ).toBeVisible();
  await expect(
    page.getByText("Client addresses and Cc/Bcc are excluded from this test."),
  ).toBeVisible();
  await capturePresentation(page, info, "test-status");
  const testCall = state.calls.find((call) => call.key.endsWith(".test"))!;
  expect(testCall.retained).toBe(testCall.input.body!.requestKey);
  expect(testCall.input.body!.versionIds).toEqual([versionId]);
  await expect(button(page, "Continue to send")).toBeDisabled();
  state.result!.intent!.status = "complete";
  state.result!.intent!.deliveries[0]!.status = "sent";
  await button(page, "Check status").click();
  await expect(button(page, "Continue to send")).toBeEnabled();
  await button(page, "Continue to send").click();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
  expect(state.calls.some((call) => call.key.endsWith(".send"))).toBe(false);
  await page.screenshot({
    path: info.outputPath("send-review.png"),
    fullPage: true,
  });
  await button(page, "Send to 1 destinations").click();
  await expect(
    page.getByRole("region", { name: "Newsletter delivery status" }),
  ).toBeVisible();
  await expect(
    page.getByText("Cc: copy@example.test", { exact: true }),
  ).toBeVisible();
  expect(state.calls.filter((call) => call.key.endsWith(".send"))).toHaveLength(
    1,
  );
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Newsletter delivery status" }),
  ).toBeVisible();
  expect(state.calls.filter((call) => call.key.endsWith(".send"))).toHaveLength(
    1,
  );
  await page.screenshot({
    path: info.outputPath("delivery.png"),
    fullPage: true,
  });
  expect(state.unexpected).toEqual([]);
});
test("lost acknowledgement retains exact request through reload and checks status without replay", async ({
  page,
}) => {
  const state = await fixture(page);
  state.loseAck = true;
  await page.goto(href);
  await button(page, "Continue to send").click();
  await button(page, "Send to 1 destinations").click();
  await expect(
    page.getByText(
      "The send outcome is not confirmed. Check this retained request's status; do not send it again.",
    ),
  ).toBeVisible();
  const sent = state.calls.find((call) => call.key.endsWith(".send"))!;
  expect(sent.retained).toBe(sent.input.body!.requestKey);
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Newsletter delivery status" }),
  ).toBeVisible();
  await button(page, "Check status").click();
  expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(
    state.calls
      .filter((call) => call.key.endsWith("sendRequest"))
      .every((call) => call.input.params!.requestKey === sent.retained),
  ).toBe(true);
});
test("absent, unavailable, and unknown results stay fenced with no automatic dispatch", async ({
  page,
}, info) => {
  const state = await fixture(page);
  await page.goto(`${href}&newsletterSendRequest=${requestKey}`);
  await expect(
    page.getByRole("heading", { name: "Send outcome not confirmed" }),
  ).toBeVisible();
  await expect(button(page, "Continue to send")).toHaveCount(0);
  state.unavailable = true;
  await button(page, "Check status").click();
  await expect(
    page.getByRole("heading", { name: "Unable to load this view" }),
  ).toBeVisible();
  state.unavailable = false;
  state.result = sendReadback(false, "unknown");
  state.result.intent!.deliveries[0]!.status = "unknown";
  await button(page, "Try again").click();
  await expect(
    page.getByText("Awaiting confirmation. Do not resend this email."),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("unknown.png"),
    fullPage: true,
  });
  expect(state.calls.every((call) => call.method === "GET")).toBe(true);
});
test("mailbox replacement before final confirmation prevents dispatch and clears private preview", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(href);
  await button(page, "Continue to send").click();
  state.mailboxes = [
    { ...state.mailboxes[0]!, accountEmail: "changed@example.test" },
  ];
  await button(page, "Send to 1 destinations").click();
  await expect(
    page.getByText(
      "The send was not started. Refresh and review the current mailbox and prepared copies.",
    ),
  ).toBeVisible();
  expect(state.calls.every((call) => call.method === "GET")).toBe(true);
  expect(new URL(page.url()).searchParams.has("newsletterSendRequest")).toBe(
    false,
  );
});
test("session replacement disposes late reads and revocation removes recipient content", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(href);
  await expect(
    page.getByRole("heading", { name: "Preview newsletter" }),
  ).toBeVisible();
  state.hold = barrier();
  await button(page, "Refresh newsletter").click();
  await expect(page.locator("iframe")).toHaveCount(0);
  state.revoked = true;
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "different-user",
          sessionId: "different-session",
          orgId: "different-org",
        },
      }),
    ),
  );
  state.hold.release();
  await expect(
    page.getByRole("heading", { name: "Unable to load this view" }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(state.calls.every((call) => call.method === "GET")).toBe(true);
});
test("foreign record/readback and malformed request links never admit a send action", async ({
  page,
}) => {
  const state = await fixture(page);
  state.record.id = otherId;
  await page.goto(href);
  await expect(
    page.getByRole("heading", { name: "Unable to load this view" }),
  ).toBeVisible();
  state.record.id = recordId;
  state.result = sendReadback();
  state.result.intent!.outreachRecordId = otherId;
  await page.goto(`${href}&newsletterSendRequest=${requestKey}`);
  await expect(
    page.getByRole("heading", { name: "Unable to load this view" }),
  ).toBeVisible();
  const before = state.calls.length;
  await page.goto(`${href}&newsletterSendRequest=`);
  await expect(
    page.getByText("This newsletter request link is invalid."),
  ).toBeVisible();
  expect(state.calls.length).toBe(before);
  expect(state.calls.every((call) => call.method === "GET")).toBe(true);
});
test("narrow prepared controls remain visible, keyboard operable, and free of overflow", async ({
  page,
}, info) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(href);
  await expect(
    page.getByRole("heading", { name: "Preview newsletter" }),
  ).toBeVisible();
  await button(page, "Mobile").focus();
  await page.keyboard.press("Enter");
  await expect(button(page, "Mobile")).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("prepared-narrow.png"),
    fullPage: true,
  });
  await auditPresentation(
    page,
    info,
    "prepared-narrow",
    'section[aria-label="Newsletter delivery"]',
  );
});
