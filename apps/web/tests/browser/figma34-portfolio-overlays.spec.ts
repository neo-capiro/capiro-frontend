import { expect, test } from "@playwright/test";
import { clientId, installFixtures } from "./fixtures";
import { installRemoval } from "./overview-removal-fixtures";

test("Add profile chooser desktop frame", async ({ page }, info) => {
  const unexpected = await installFixtures(page);
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  const chooser = page.getByRole("dialog", {
    name: "Add profile",
    exact: true,
  });
  await expect(
    chooser.getByRole("button", { name: /Manual entry/ }),
  ).toBeVisible();
  const bounds = await chooser.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.x - 440)).toBeLessThanOrEqual(3);
  expect(Math.abs(bounds!.y - 211)).toBeLessThanOrEqual(3);
  expect(Math.abs(bounds!.width - 560)).toBeLessThanOrEqual(3);
  await page.screenshot({ path: info.outputPath("add-profile-1440x1040.png") });
  expect(unexpected).toEqual([]);
});

test("Quick log global chooser and inline client form desktop frames", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(request.method());
  });
  await page.goto("/portfolio?log=1");
  const global = page.getByRole("dialog", { name: "Quick log", exact: true });
  await expect(global.getByRole("combobox", { name: "Client" })).toBeVisible();
  const globalBounds = await global.boundingBox();
  expect(globalBounds).not.toBeNull();
  expect(Math.abs(globalBounds!.x - 400)).toBeLessThanOrEqual(3);
  expect(Math.abs(globalBounds!.y - 50)).toBeLessThanOrEqual(3);
  expect(Math.abs(globalBounds!.width - 640)).toBeLessThanOrEqual(3);
  await page.screenshot({
    path: info.outputPath("quick-log-global-1440x1040.png"),
  });
  await global.getByRole("combobox", { name: "Client" }).selectOption(clientId);
  await global.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/portfolio\?log=1$/);
  await expect(
    page.getByRole("region", { name: "Portfolio profiles" }),
  ).toBeVisible();
  const client = page.getByRole("dialog", { name: "Quick log", exact: true });
  await expect(
    client.getByRole("combobox", { name: "Activity type" }),
  ).toBeVisible();
  const clientBounds = await client.boundingBox();
  expect(clientBounds).not.toBeNull();
  expect(Math.abs(clientBounds!.x - 400)).toBeLessThanOrEqual(3);
  expect(Math.abs(clientBounds!.y - 50)).toBeLessThanOrEqual(3);
  expect(Math.abs(clientBounds!.width - 640)).toBeLessThanOrEqual(3);
  await page.screenshot({
    path: info.outputPath("quick-log-inline-global-client-1440x1040.png"),
  });
  await client.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(client).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("log")).toBe(false);
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("global Quick log keeps its verified Undo after saving above the index", async ({
  page,
}, info) => {
  const { state, unexpected } = await installRemoval(page);
  await page.goto("/portfolio?log=1");
  const chooser = page.getByRole("dialog", { name: "Quick log", exact: true });
  await chooser
    .getByRole("combobox", { name: "Client" })
    .selectOption(clientId);
  await chooser.getByRole("button", { name: "Continue" }).click();
  const form = page.getByRole("dialog", { name: "Quick log", exact: true });
  await form.getByLabel("Title", { exact: true }).fill("Synthetic quick note");
  await form
    .getByLabel("Details", { exact: true })
    .fill("Saved from Portfolio");
  await form
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await expect(form).toHaveCount(0);
  const result = page.getByRole("complementary", { name: "Quick log result" });
  await expect(result).toContainText("Logged to Test Aerospace");
  expect(new URL(page.url()).searchParams.has("log")).toBe(false);
  expect(state.posts).toBe(1);
  await page.screenshot({
    path: info.outputPath("quick-log-saved-1440x1040.png"),
  });
  await result.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(result).toContainText("Quick log removed");
  expect(state.deletes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});
