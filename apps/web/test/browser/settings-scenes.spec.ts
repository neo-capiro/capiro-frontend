import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { settingsFixtures } from "./settings-fixtures";

const routes = [
  ["personal", "Personal"],
  ["contact-info", "Contact info"],
  ["branding", "Branding"],
  ["team", "Team"],
  ["integrations", "Integrations"],
  ["memory", "Memory"],
  ["meri-preferences", "Preferences"],
  ["billing", "Billing"],
  ["ai-usage", "AI usage and spend"],
  ["profiles", "Profiles"],
  ["intelligence-mappings", "Intelligence mappings"],
  ["hq-tenants", "Tenants"],
  ["hq-customers", "Customers"],
  ["hq-ai-keys", "Tenants"],
  ["hq-broadcasts", "Broadcasts"],
  ["hq-personnel", "Tenants"],
  ["hq-reconciliation", "PE reconciliation"],
  ["hq-matches", "PE match queue"],
  ["hq-analyst", "Analyst Console"],
];
test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
  await operationFixtures(page, settingsFixtures);
});

for (const [section, title] of routes)
  test(`Settings ${section} renders compatible responses without runtime failures`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mkdir("test-results/settings-scenes", { recursive: true });
    await page.goto(`/settings/${section}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Loading…", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByText("Settings section unavailable")).toHaveCount(0);
    if (section === "personal") {
      const cards = page.locator('[data-design-target="411:67666"]');
      await expect(cards).toHaveCSS("display", "flex");
      await expect(cards).toHaveCSS("row-gap", "20px");
      await expect(page.getByTitle("Email signature preview")).toHaveCount(0);
    }
    await page.screenshot({
      path: `test-results/settings-scenes/${section}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });

test("All analyst queues and Meri preference screens are reachable with explicit unavailable contracts", async ({
  page,
}) => {
  await page.goto("/settings/hq-analyst");
  for (const name of [
    "Program matches (0)",
    "Alias manager",
    "Person candidates (0)",
    "Merge candidates (0)",
    "Quarantine (0)",
    "Audit log",
    "Provision links (0)",
    "SAM",
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByText("Loading…", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  await expect(page.getByText("SAM review unavailable")).toBeVisible();
  await page.goto("/settings/meri-preferences");
  for (const name of [
    "Connections",
    "Usage and limits",
    "Skills and templates",
    "Workspace updates",
    "Privacy and retention",
    "Help and shortcuts",
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(
      page.getByText("Meri preferences connection unavailable"),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
});

test("Settings dialogs trap focus and Escape closes an unsent invitation", async ({
  page,
}) => {
  await page.goto("/settings/team");
  await page.getByRole("button", { name: /Add team member/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByLabel("Email", { exact: true })
    .fill("draft@example.test");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Add team member/ }),
  ).toBeFocused();
});
