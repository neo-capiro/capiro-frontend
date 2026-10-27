import { expect, test } from "@playwright/test";
import { dashboard, timestamp } from "./research-sharing-fixture";

test("fifth wrong PIN refreshes availability and shows the plain unavailable page", async ({
  page,
}) => {
  let failures = 0;
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    if (key.endsWith("pin")) {
      failures += 1;
      await route.fulfill({ status: 401, json: { message: "Unavailable" } });
    } else if (key.endsWith("availability")) {
      await route.fulfill({ json: { available: failures < 5 } });
    } else throw new Error(`Unexpected operation ${key}`);
  });
  await page.goto("/research-sharing.html?mode=public");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByLabel("PIN", { exact: true }).fill("999999");
    await page.getByRole("button", { name: "Open dashboard" }).click();
    if (attempt < 4)
      await expect(
        page.getByText(
          "That PIN did not open this link. Check it and try again.",
        ),
      ).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: "Link not available", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("PIN", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(dashboard.portfolioName, { exact: true }),
  ).toHaveCount(0);
  expect(failures).toBe(5);
});

test("an unlocked recipient loses a rotated session on recheck and session expiry clears content", async ({
  page,
  context,
}) => {
  const now = Date.parse(timestamp);
  await page.clock.install({ time: new Date(now) });
  let rotated = false;
  let sessions = 0;
  const apiRequests: string[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    apiRequests.push(key);
    if (key.endsWith("availability"))
      await route.fulfill({ json: { available: true } });
    else if (key.endsWith("pin")) {
      const pin = route.request().postDataJSON().body.pin;
      if (rotated && pin !== "654321")
        await route.fulfill({ status: 401, json: { message: "Unavailable" } });
      else {
        sessions += 1;
        await route.fulfill({
          json: {
            viewToken: `synthetic-session-${sessions}`,
            expiresAt: new Date(now + 30 * 60_000).toISOString(),
          },
        });
      }
    } else if (key.endsWith("dashboard")) {
      const token = route.request().postDataJSON().body.viewToken;
      if (rotated && token === "synthetic-session-1")
        await route.fulfill({ status: 401, json: { message: "Unavailable" } });
      else await route.fulfill({ json: dashboard });
    } else throw new Error(`Unexpected operation ${key}`);
  });
  await page.goto("/research-sharing.html?mode=public");
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: dashboard.portfolioName }),
  ).toBeVisible();
  rotated = true;
  await page.clock.fastForward(15_000);
  await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: dashboard.portfolioName }),
  ).toHaveCount(0);
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(
    page.getByText("That PIN did not open this link. Check it and try again."),
  ).toBeVisible();
  await page.getByLabel("PIN", { exact: true }).fill("654321");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: dashboard.portfolioName }),
  ).toBeVisible();
  await page.clock.fastForward(30 * 60_000);
  await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: dashboard.portfolioName }),
  ).toHaveCount(0);
  expect(
    apiRequests.every((key) => key.startsWith("public-research-share.")),
  ).toBe(true);
  expect(await context.cookies()).toEqual([]);
});

test("a response arriving after viewing expiry cannot restore content", async ({
  page,
}) => {
  const now = Date.parse(timestamp);
  await page.clock.install({ time: new Date(now) });
  let release: (() => void) | undefined;
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    if (key.endsWith("availability"))
      await route.fulfill({ json: { available: true } });
    else if (key.endsWith("pin"))
      await route.fulfill({
        json: {
          viewToken: "synthetic-session",
          expiresAt: new Date(now + 30_000).toISOString(),
        },
      });
    else {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({ json: dashboard }).catch(() => undefined);
    }
  });
  await page.goto("/research-sharing.html?mode=public");
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.clock.fastForward(30_001);
  await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();
  release!();
  await expect(
    page.getByRole("heading", { name: dashboard.portfolioName }),
  ).toHaveCount(0);
});
