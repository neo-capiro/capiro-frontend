import { expect, test, type Page } from "@playwright/test";
import { setupConversation } from "./meri-conversation-fixtures";
import {
  listResponse,
  detailResponse,
  run,
} from "../../tests/meri-runs-fixtures";
import { recordedUsage } from "../../tests/meri-current-read-fixtures";

test.setTimeout(60_000);
const estimate = 0.26785095;
const displayRun = {
  ...run,
  usage: { ...run.usage, sdkEstimateUsd: estimate },
};
async function runsFixture(page: Page) {
  await setupConversation(page);
  const reads: {
    scope: { kind: string };
    status: string;
    cursor: string | null;
  }[] = [];
  await page.route("**/api/conversations/runs/list", (route) => {
    const request = route.request().postDataJSON();
    reads.push(request);
    return route.fulfill({
      json: {
        ...listResponse,
        scope: request.scope,
        status: request.status,
        runs: request.status === "active" ? [] : [displayRun],
      },
    });
  });
  await page.route("**/api/conversations/runs/detail", (route) =>
    route.fulfill({ json: { ...detailResponse, run: displayRun } }),
  );
  await page.route("**/api/conversations/usage", (route) =>
    route.fulfill({ json: recordedUsage() }),
  );
  return reads;
}

for (const width of [1440, 390]) {
  test(`Runs ${width}: scope keyboard, truthful summary and exact disclosure`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const reads = await runsFixture(page);
    await page.goto("/meri/runs?navigation-audit=1");
    const list = page.getByRole("region", {
      name: "Recorded runs",
      exact: true,
    });
    await expect(list).toContainText("$0.27 USD");
    await expect(list).not.toContainText(String(estimate));
    await expect(
      page.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Next page" }),
    ).toBeDisabled();
    await page.screenshot({
      path: info.outputPath(`runs-list-${width}.png`),
      fullPage: true,
    });
    const scope = page.getByRole("combobox", { name: "Run scope" });
    await scope.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect.poll(() => reads.at(-1)?.scope.kind).toBe("all");
    await expect(scope).toBeFocused();
    await page.getByRole("tab", { name: "Active", exact: true }).click();
    await expect(
      page.getByText("No matching runs returned", { exact: true }),
    ).toBeVisible();
    expect(reads.at(-1)).toMatchObject({
      scope: { kind: "all" },
      status: "active",
      cursor: null,
    });
    await page.getByRole("tab", { name: "All", exact: true }).click();
    const href = await list
      .getByRole("link", { name: /^Run started/ })
      .getAttribute("href");
    await page.goto(`${href}&navigation-audit=1`);
    const record = page.getByRole("region", {
      name: "Run record",
      exact: true,
    });
    await expect(
      record.getByRole("heading", { level: 2, name: /^Run started/ }),
    ).toBeVisible();
    await expect(
      record.getByRole("term").filter({ hasText: "SDK estimate · USD" }),
    ).toHaveCount(1);
    const disclosure = record.locator("summary");
    await expect(record.locator("details")).not.toHaveAttribute("open");
    await disclosure.focus();
    await page.keyboard.press("Enter");
    await expect(
      record.getByText(`Recorded SDK estimate: ${estimate} USD`, {
        exact: false,
      }),
    ).toBeVisible();
    await expect(record).toContainText("not a provider-billed charge");
    await page.screenshot({
      path: info.outputPath(`runs-exact-${width}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Space");
    await expect(record.locator("details")).not.toHaveAttribute("open");
    await disclosure.click();
    await expect(record.locator("details")).toHaveAttribute("open", "");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

const itemId = "10000000-0000-4000-8000-000000000007";
const revision = "2026-11-02T09:00:00.123456Z";
const anchor = { kind: "item", id: itemId, revision };
const history = {
  schemaVersion: 1,
  anchor,
  availability: "available",
  entries: [
    {
      id: itemId,
      revision,
      createdAt: revision,
      title: "user:synthetic:briefing-preference",
      status: "current",
      content: {
        availability: "available",
        text: "Synthetic historical preference text.",
      },
    },
  ],
  nextCursor: null,
};

for (const width of [1440, 390]) {
  test(`Memory ${width}: contextual history and evidence failure replace prior content`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await setupConversation(page);
    await page.addInitScript(() =>
      sessionStorage.setItem("memory-owner-review-enabled", "true"),
    );
    await page.route("**/api/memory/owner/candidates?*", (route) =>
      route.fulfill({ json: { version: 1, candidates: [], nextCursor: null } }),
    );
    await page.route("**/api/memory/owner/items?*", (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          ownerReadsVersion: 1,
          items: [
            {
              id: itemId,
              title: "Briefing preference",
              value: "Synthetic current preference.",
              scope: "user_private",
              clientId: null,
              updatedAt: revision,
            },
          ],
          nextCursor: null,
        },
      }),
    );
    await page.route(
      `**/api/memory/owner/items/${itemId}/versions?*`,
      (route) => route.fulfill({ json: history }),
    );
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      `**/api/memory/owner/items/${itemId}/evidence?*`,
      async (route) => {
        await held;
        await route.fulfill({ status: 503, json: {} });
      },
    );
    await page.goto("/meri/memory");
    const panel = page.getByRole("region", {
      name: "Memory history and evidence",
    });
    await expect(
      panel.getByRole("heading", { name: "History for Briefing preference" }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "History", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      panel.getByRole("heading", { name: "Current version", exact: true }),
    ).toBeVisible();
    await expect(panel.locator("time")).toHaveText("Nov 2, 2026, 9:00 AM UTC");
    await expect(panel.locator("time")).toHaveAttribute("datetime", revision);
    await expect(panel).not.toContainText("user:synthetic");
    await panel.screenshot({
      path: info.outputPath(`memory-history-${width}.png`),
    });
    await panel.getByRole("button", { name: "View evidence" }).click();
    await expect(panel).toContainText("Loading evidence");
    await expect(panel).not.toContainText(
      "Synthetic historical preference text.",
    );
    await expect(
      panel.getByRole("button", { name: "History", exact: true }),
    ).toBeDisabled();
    release();
    await expect(
      panel.getByRole("heading", { name: "Evidence unavailable" }),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "View evidence" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(panel).not.toContainText(
      "Synthetic historical preference text.",
    );
    await panel.screenshot({
      path: info.outputPath(`memory-unavailable-${width}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
