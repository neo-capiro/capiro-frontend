import { expect, test } from "@playwright/test";
import { generate, origin } from "./objective-generation-browser-fixtures";
import { retryFixture } from "./objective-strategy-retry-fixture";

test("expired generation offers explicit new consent with fresh identities and survives reload", async ({
  page,
}, info) => {
  const f = await retryFixture(page);
  await page.goto(origin);
  await generate(page);
  await expect(
    page.getByText("Generation queued.", { exact: true }),
  ).toBeVisible();
  f.expire();
  await page
    .getByRole("button", { name: "Refresh saved intake and access" })
    .click();
  const retry = page.getByRole("button", {
    name: "Request new generation",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  expect(f.writes).toHaveLength(1);
  await page.screenshot({
    path: info.outputPath("expired-attempt.png"),
    fullPage: true,
  });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => f.writes.length).toBe(2);
  await expect.poll(() => f.starts.length).toBe(2);
  const [previous, next] = f.writes;
  expect(next!.body.command.expectedControlVersion).toBe(1);
  expect(next!.body.command.targetAuthorizationRequestId).toBe(
    f.receipts.get(previous!.body.command.requestId)!.commandReceipt
      .authorizationRequestId,
  );
  expect(next!.body.command.requestId).not.toBe(
    previous!.body.command.requestId,
  );
  expect(next!.body.selection.generationRequestId).not.toBe(
    previous!.body.selection.generationRequestId,
  );
  expect(f.starts[1]!.generationJobId).not.toBe(f.starts[0]!.generationJobId);
  await page.reload();
  await expect(
    page.getByText("Generation queued.", { exact: true }),
  ).toBeVisible();
  await expect(retry).toHaveCount(0);
  expect(f.writes).toHaveLength(2);
  expect(f.starts).toHaveLength(2);
  expect(f.unexpected).toEqual([]);
});

test("phone failed attempt keeps a lost successor reply recoverable with the same request", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await retryFixture(page, true);
  await page.goto(origin);
  await generate(page);
  await expect(
    page.getByText("Generation failed.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Refresh saved intake and access" })
    .click();
  const retry = page.getByRole("button", {
    name: "Request new generation",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("failed-attempt-phone.png"),
    fullPage: true,
  });
  f.loseNextReply();
  await retry.click();
  const recover = page.getByRole("button", {
    name: "Recover same Strategy request",
    exact: true,
  });
  await expect(recover).toBeEnabled();
  const successor = structuredClone(f.writes[1]);
  await page.reload();
  await expect(recover).toBeEnabled();
  await expect(retry).toHaveCount(0);
  await recover.click();
  await expect.poll(() => f.starts.length).toBe(2);
  expect(f.writes).toEqual([f.writes[0], successor, successor]);
  expect(f.unexpected).toEqual([]);
});
