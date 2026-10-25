import { expect, test, type Page, type Route } from "@playwright/test";
import { setupConversation } from "./meri-conversation-fixtures";

const itemId = "10000000-0000-4000-8000-000000000007";
const candidateId = "20000000-0000-4000-8000-000000000007";
const updatedAt = "2026-10-21T12:00:00.123456Z";
const item = {
  id: itemId,
  title: "Synthetic communication preference",
  value: "Original synthetic memory",
  scope: "user_private",
  clientId: null,
  updatedAt,
};

/** Figma 05.04 card action for the synthetic item. */
const proposeCorrection = (page: Page) =>
  page
    .getByRole("article", { name: item.title, exact: true })
    .getByRole("button", { name: "Propose a correction", exact: true })
    .click();
async function memoryFixture(page: Page, enabled = true) {
  const fixture = await setupConversation(page);
  if (enabled)
    await page.addInitScript(() =>
      sessionStorage.setItem("memory-owner-review-enabled", "true"),
    );
  const reads: string[] = [];
  await page.route("**/api/memory/owner/candidates?*", (route) => {
    reads.push(route.request().url());
    return route.fulfill({
      json: { version: 1, candidates: [], nextCursor: null },
    });
  });
  await page.route("**/api/memory/owner/items?*", (route) => {
    reads.push(route.request().url());
    return route.fulfill({
      json: { schemaVersion: 1, items: [item], nextCursor: null },
    });
  });
  return { ...fixture, reads };
}

test("disabled owner review makes no memory request", async ({ page }) => {
  const fixture = await memoryFixture(page, false);
  await page.goto("/meri/memory");
  await expect(
    page.getByRole("heading", {
      name: "Personal memory review unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Personal memory review", exact: true })
      .getByRole("status"),
  ).toHaveText("Not enabled or not configured for this workspace.");
  await expect(page.getByLabel("Corrected text")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Submit correction for review",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(fixture.reads).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("pending correction freezes its captured draft and confirms review without changing active memory", async ({
  page,
}) => {
  const fixture = await memoryFixture(page);
  let pending: Route | undefined;
  const writes: unknown[] = [];
  await page.route(
    `**/api/memory/owner/items/${itemId}/corrections`,
    (route) => {
      writes.push(route.request().postDataJSON());
      pending = route;
    },
  );
  await page.goto("/meri/memory");
  await proposeCorrection(page);
  const draft = page.getByRole("textbox", {
    name: "Corrected text",
    exact: true,
  });
  await draft.fill("Proposed synthetic correction");
  await page
    .getByRole("button", { name: "Submit correction for review" })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(draft).toBeDisabled();
  await expect(draft).toHaveValue("Proposed synthetic correction");
  await expect(
    page.getByRole("button", { name: "Refresh current memory" }),
  ).toBeDisabled();
  expect(writes).toEqual([
    {
      newContent: "Proposed synthetic correction",
      expectedUpdatedAt: updatedAt,
    },
  ]);
  await pending!.fulfill({
    json: { status: "pending_review", candidateId, activeItemUnchanged: true },
  });
  await expect(
    page.getByText("Correction submitted for review.", { exact: false }),
  ).toBeVisible();
  await expect(draft).toHaveCount(0);
  await proposeCorrection(page);
  await expect(draft).toHaveValue(item.value);
  expect(writes).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

test("uncertain correction keeps its draft and prevents resubmission after reload", async ({
  page,
}) => {
  const fixture = await memoryFixture(page);
  let writes = 0;
  await page.route(
    `**/api/memory/owner/items/${itemId}/corrections`,
    (route) => {
      writes++;
      return route.fulfill({
        status: 503,
        json: { error: { outcome: "UNKNOWN" } },
      });
    },
  );
  await page.goto("/meri/memory");
  await proposeCorrection(page);
  await page.getByLabel("Corrected text").fill("Held synthetic correction");
  await page
    .getByRole("button", { name: "Submit correction for review" })
    .click();
  await expect(
    page.getByText("The correction outcome is uncertain.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Corrected text")).toHaveValue(
    "Held synthetic correction",
  );
  await expect(
    page.getByRole("button", { name: "Submit correction for review" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Correction outcome needs verification",
    }),
  ).toBeVisible();
  await proposeCorrection(page);
  await page.getByLabel("Corrected text").fill("Another attempted correction");
  await expect(
    page.getByRole("button", { name: "Submit correction for review" }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  expect(fixture.unexpected).toEqual([]);
});
