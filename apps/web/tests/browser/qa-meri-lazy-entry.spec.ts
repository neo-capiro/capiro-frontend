import { expect, test, type Page } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";

const account = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
};
const conversationId = "88888888-8888-4888-8888-888888888888";

async function setup(page: Page) {
  const unexpected = await installFixtures(page);
  const bootstraps: unknown[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.route("**/api/capiro/**", (route) =>
    json(route, { error: { code: "NOT_CONFIGURED" } }, 503),
  );
  await page.route("**/api/conversations/**", (route) =>
    json(route, { error: { code: "NOT_CONFIGURED" } }, 503),
  );
  await page.route("**/api/capiro/meri.conversation.bootstrap.v2", (route) => {
    const body = route.request().postDataJSON().body;
    bootstraps.push(body);
    return json(route, {
      ...body,
      tenantId: account.tenantId,
      actorId: account.actorId,
      conversationId,
    });
  });
  await page.route("**/api/capiro/meri.conversation.bootstrap", (route) => {
    const body = route.request().postDataJSON().body;
    bootstraps.push(body);
    return json(route, {
      ...body,
      tenantId: account.tenantId,
      actorId: account.actorId,
      conversationId,
    });
  });
  return { bootstraps, unexpected, pageErrors, consoleErrors };
}

test("General Meri entry stays read-only until explicit Start", async ({
  page,
}, testInfo) => {
  const { bootstraps, unexpected, pageErrors, consoleErrors } =
    await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/meri-lazy-entry.html?scope=general");
  const start = page.getByRole("button", { name: "Start conversation" });
  await expect(start).toBeVisible();
  const panel = page.getByRole("region", { name: "Start a conversation" });
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.y + panelBox!.height / 2).toBeGreaterThan(260);
  const buttonBox = await start.boundingBox();
  expect(buttonBox).not.toBeNull();
  expect(Math.abs(buttonBox!.x + buttonBox!.width / 2 - 195)).toBeLessThan(50);
  await page.waitForTimeout(400);
  expect(bootstraps).toHaveLength(0);
  expect(unexpected).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("mobile-general-before-start.png"),
  });
  await start.click();
  await expect.poll(() => bootstraps.length).toBe(1);
  await expect(page).toHaveURL(new RegExp(`conversationId=${conversationId}`));
  expect(bootstraps).toHaveLength(1);
});

test("client Meri entry does not bootstrap on route load", async ({
  page,
}, testInfo) => {
  const { bootstraps, unexpected, pageErrors, consoleErrors } =
    await setup(page);
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto(`/meri-lazy-entry.html?clientId=${clientId}`);
  await expect(
    page.getByRole("button", { name: "Start conversation" }),
  ).toBeVisible();
  await page.waitForTimeout(400);
  expect(bootstraps).toHaveLength(0);
  expect(unexpected).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("desktop-client-before-start.png"),
  });
  await page.getByRole("button", { name: "Start conversation" }).click();
  await expect.poll(() => bootstraps.length).toBe(1);
  expect(bootstraps[0]).toMatchObject({ clientId });
  await expect(page).toHaveURL(new RegExp(`conversationId=${conversationId}`));
});
