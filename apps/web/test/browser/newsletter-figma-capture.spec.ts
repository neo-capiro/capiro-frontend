import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

const dir =
  process.env.CAPIRO_FIGMA_CAPTURE_DIR ??
  "C:/ProgramData/Hermes/cache/scratch/fe-newsletter";

test("capture the newsletter workflow steps at frame size", async ({
  page,
}) => {
  mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1040 });
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "me.read": testIdentity,
    "workspace.clients": { items: [] },
    "workspace.comments": [],
    "workspace.document-templates": [],
  });
  await page.goto("/modules/workspace?view=newsletter");
  await page.getByRole("heading", { name: "Select a template" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-design-node="1064:260850"]')).toHaveCSS(
    "width",
    "1160px",
  );
  await page.screenshot({ path: join(dir, "01-template.png") });

  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Apply", exact: true })
    .click();
  await page.getByRole("heading", { name: "Newsletter settings" }).waitFor();
  await expect(
    page.getByRole("tablist", { name: "Preview width" }),
  ).toBeVisible();
  await page.screenshot({ path: join(dir, "02-builder.png") });

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByRole("heading", { name: "Newsletter review" }).waitFor();
  await expect(
    page.getByRole("tablist", { name: "Comment status" }),
  ).toBeVisible();
  await page.screenshot({ path: join(dir, "03-review.png") });
});

test("template filters and review tabs remain keyboard operable without writes", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "me.read": testIdentity,
    "workspace.clients": { items: [] },
    "workspace.comments": [],
    "workspace.document-templates": [],
  });
  await page.goto("/modules/workspace?view=newsletter");
  const categories = page.getByRole("tablist", {
    name: "Newsletter template categories",
  });
  await categories.getByRole("tab", { name: "All templates" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    categories.getByRole("tab", { name: "Basic layouts" }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "One-column update" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekly newsletter" }),
  ).toHaveCount(0);
  await page.keyboard.press("Home");
  await expect(
    categories.getByRole("tab", { name: "All templates" }),
  ).toBeFocused();
  await categories.getByRole("tab", { name: "Drafts", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open Workspace" }),
  ).toHaveAttribute("href", "/modules/workspace");
  await expect(
    page.getByRole("textbox", { name: "Search newsletter templates" }),
  ).toHaveCount(0);
  await categories
    .getByRole("tab", { name: "Saved templates", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open Templates" }),
  ).toHaveAttribute("href", "/modules/workspace?view=templates");
  await categories.getByRole("tab", { name: "All templates" }).click();
  await page
    .getByRole("textbox", { name: "Search newsletter templates" })
    .fill("no matching template");
  await expect(
    page.getByText("No starting points match these filters."),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search newsletter templates" })
    .fill("Weekly");
  await expect(
    page.getByRole("heading", { name: "Weekly newsletter" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "One-column update" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  const workflow = page.locator('[data-design-node="1064:260936"]');
  await expect(
    workflow.getByRole("link", { name: "Modules", exact: true }),
  ).toHaveCount(0);
  await workflow
    .getByRole("button", { name: "Workspace", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Leave this newsletter?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("Synthetic subject to review");
  await page
    .getByRole("textbox", { name: "Preview text", exact: true })
    .fill("Synthetic preheader to review");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByText("SUBJECT Synthetic subject to review", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("PREVIEW Synthetic preheader to review", { exact: true }),
  ).toBeVisible();
  const comments = page.getByRole("tablist", { name: "Comment status" });
  await comments.getByRole("tab", { name: "Open · 0" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    comments.getByRole("tab", { name: "Resolved · 0" }),
  ).toBeFocused();
  await expect(
    comments.getByRole("tab", { name: "Resolved · 0" }),
  ).toHaveAttribute("aria-selected", "true");
  expect(writes).toEqual([]);
});

test("basic newsletter template, builder and review fit a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "me.read": testIdentity,
    "workspace.clients": { items: [] },
    "workspace.comments": [],
    "workspace.document-templates": [],
  });
  await page.goto("/modules/workspace?view=newsletter");
  await page.getByRole("heading", { name: "Select a template" }).waitFor();
  const expectFit = async () => {
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.viewport);
  };
  await expectFit();
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Apply", exact: true })
    .click();
  await page.getByRole("heading", { name: "Newsletter settings" }).waitFor();
  await expectFit();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByRole("heading", { name: "Newsletter review" }).waitFor();
  await expectFit();
});
