import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "./runtime-observed-test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { client, clientId } from "./next-modules-fixtures";
import { blankTemplate } from "../../src/features/modules/workspace/templates/template-model";

const templateId = "71000000-0000-4000-8000-000000000001";
const v1 = "72000000-0000-4000-8000-000000000001";
const v2 = "72000000-0000-4000-8000-000000000002";
const id = (n: number) =>
  `73000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const date = "2026-10-25T10:00:00.000Z";
const url = `/modules/workspace?clientId=${clientId}&view=templates`;
const capture = process.env.CAPIRO_TEMPLATE_CAPTURE_DIR;
async function screenshot(page: Page, name: string) {
  if (!capture) return;
  mkdirSync(capture, { recursive: true });
  await page
    .getByRole("dialog")
    .screenshot({ path: join(capture, name + ".png") });
}
async function fixture(page: Page) {
  await onlyLocalRequests(page);
  if (process.env.CAPIRO_BROWSER_TEST_DEV === "1")
    await page.route("**/Geist-Variable.woff2*", (route) =>
      route.fulfill({
        path: fileURLToPath(
          new URL(
            "../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
            import.meta.url,
          ),
        ),
        contentType: "font/woff2",
      }),
    );
  const capabilities = {
    canUse: true,
    canDuplicate: true,
    canInspect: true,
    canEdit: true,
    canCreateVersion: true,
    canPublish: true,
    canArchive: true,
    canRestore: false,
  };
  const template = {
    id: templateId,
    name: "Synthetic campaign template",
    description: "Reusable campaign defaults",
    campaignType: "Briefing",
    ownerUserId: "test-user",
    clientId: null,
    scope: "private",
    status: "active",
    currentDraftVersionId: v2,
    publishedVersionId: v1,
    createdAt: date,
    updatedAt: date,
    archivedAt: null,
    draftVersionNumber: 2,
    publishedVersionNumber: 1,
    usageCount: 1,
    lastUsedAt: date,
    capabilities,
    previewSummary: null,
  };
  const before = blankTemplate(),
    after = blankTemplate();
  before.strategy.tone = "Neutral";
  after.strategy.tone = "Direct and respectful";
  before.strategy.length = "short";
  after.strategy.length = "medium";
  after.goal.ask = { mode: "explicit", text: "Request a briefing" };
  const version = (
    vid: string,
    n: number,
    spec: ReturnType<typeof blankTemplate>,
  ) => ({
    id: vid,
    templateId,
    versionNumber: n,
    lifecycle: n === 1 ? "published" : "draft",
    contentHash: String(n).repeat(64),
    sourceSessionId: n === 1 ? id(1) : null,
    createdByUserId: "test-user",
    createdAt: date,
    publishedAt: n === 1 ? date : null,
    spec,
  });
  const calls: Array<{ key: string; input: unknown }> = [];
  const campaigns = Array.from({ length: 103 }, (_, i) => ({
    id: id(i + 1),
    title: `Campaign ${i + 1}`,
    status: "active",
    currentStateVersion: 1,
    createdAt: date,
    updatedAt: date,
    archivedAt: null,
    topic: `Topic ${i + 1}`,
    goal: null,
    targetCount: 0,
    recordStatus: null,
    sentAt: null,
  }));
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "workspace.clients": { items: [client] },
    "workspace.templates": [template],
    "workspace.template": () => {
      calls.push({ key: "detail", input: {} });
      return {
        template,
        versions: [version(v1, 1, before), version(v2, 2, after)],
        capabilities,
      };
    },
    "engagement.sessions": (input) => {
      calls.push({ key: "sessions", input });
      const q = (
        input as { query: { offset: number; limit: number; search?: string } }
      ).query;
      return campaigns
        .filter(
          (row) =>
            !q.search ||
            `${row.title} ${row.topic}`
              .toLowerCase()
              .includes(q.search.toLowerCase()),
        )
        .slice(q.offset, q.offset + q.limit);
    },
    "workspace.template.provenance": null,
    "workspace.template.from-campaign": (input) => {
      calls.push({ key: "write", input });
      return { template, version: version(v2, 2, after), published: false };
    },
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ json: client }),
  );
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: template.name, exact: true }),
  ).toBeVisible();
  return { calls };
}
async function picker(page: Page) {
  await page.getByRole("button", { name: "More template actions" }).click();
  await page
    .getByRole("menuitem", { name: "Save campaign as template" })
    .click();
  await expect(
    page.getByLabel("Source campaign", { exact: true }),
  ).toBeVisible();
}
async function choose(page: Page, label: string) {
  await page.getByLabel("Source campaign", { exact: true }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}
test("campaign picker reaches beyond100 with explicit pages and never saves during browsing", async ({
  page,
}) => {
  const f = await fixture(page);
  await picker(page);
  await choose(page, "Campaign 1");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 3", { exact: true })).toBeVisible();
  await choose(page, "Campaign 103");
  await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  await page.getByLabel("Template name", { exact: true }).fill("Beyond100");
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Keep this reusable approach" }),
  ).toBeVisible();
  expect((await dialog.boundingBox())?.width).toBe(580);
  expect(f.calls.filter((c) => c.key === "write")).toHaveLength(0);
  expect(
    f.calls
      .filter((c) => c.key === "sessions")
      .map((c) => (c.input as { query: { offset: number } }).query.offset),
  ).toEqual([0, 50, 100]);
  await screenshot(page, "campaign-page3-desktop");
  await page
    .getByRole("button", { name: "Save private draft", exact: true })
    .click();
  await expect
    .poll(() => f.calls.filter((c) => c.key === "write").length)
    .toBe(1);
  expect(f.calls.find((c) => c.key === "write")?.input).toMatchObject({
    body: { sessionId: id(103), name: "Beyond100" },
  });
});
test("server search and close/reopen clear stale selection and retain read refusal without exposing previous rows", async ({
  page,
}) => {
  const f = await fixture(page);
  await picker(page);
  await choose(page, "Campaign 1");
  await page.getByLabel("Template name", { exact: true }).fill("Unsent name");
  await page.getByLabel("Search campaigns", { exact: true }).fill("Topic 49");
  await expect(
    page.getByRole("button", { name: "Save private draft" }),
  ).toBeDisabled();
  await choose(page, "Campaign 49");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await picker(page);
  await expect(
    page.getByRole("button", { name: "Save private draft" }),
  ).toBeDisabled();
  await page.route("**/api/capiro/engagement.sessions?**", (route) =>
    route.fulfill({
      status: 403,
      json: { message: "Campaign access unavailable" },
    }),
  );
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Campaign access unavailable",
  );
  await expect(page.getByLabel("Source campaign", { exact: true })).toHaveCount(
    0,
  );
  expect(f.calls.filter((c) => c.key === "write")).toHaveLength(0);
});
test("version comparison uses the selected saved versions and supports narrow keyboard inspection without mutations", async ({
  page,
}) => {
  const f = await fixture(page);
  await page
    .getByRole("button", { name: "Actions for Synthetic campaign template" })
    .click();
  await page
    .getByRole("menuitem", { name: "Version history", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Compare", exact: true }).click();
  const comparison = dialog.getByRole("region", { name: "Template version 2" });
  await expect(comparison).toContainText("v1 → v2");
  await expect(comparison).toContainText("Neutral");
  await expect(comparison).toContainText("Direct and respectful");
  await screenshot(page, "history-compare-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await comparison.getByText("Saved version details", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(comparison).toContainText("2".repeat(64));
  await expect(comparison).toContainText("No source campaign recorded");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await comparison.getByText("Saved version details", { exact: true }).click();
  await screenshot(page, "history-compare-narrow");
  await dialog.getByRole("button", { name: "View", exact: true }).click();
  await expect(
    dialog.getByRole("region", { name: "Template version 1" }),
  ).toBeVisible();
  await expect(comparison).toHaveCount(0);
  expect(f.calls.filter((c) => c.key === "write")).toHaveLength(0);
});
