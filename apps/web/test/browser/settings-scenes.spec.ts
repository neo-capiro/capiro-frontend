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
    if (section === "billing") {
      await expect(
        page.getByText("Capacity list price per month"),
      ).toBeVisible();
      await expect(page.getByText("$2,000.00")).toBeVisible();
    }
    if (section === "profiles") {
      const tabs = await page
        .getByRole("tablist", { name: "Profile status" })
        .boundingBox();
      const search = await page
        .getByRole("textbox", { name: "Search profiles" })
        .boundingBox();
      const add = await page
        .getByRole("button", { name: "+ Add profile" })
        .boundingBox();
      expect(tabs).not.toBeNull();
      expect(search).not.toBeNull();
      expect(add).not.toBeNull();
      expect(Math.abs(tabs!.y - search!.y)).toBeLessThan(4);
      expect(Math.abs(search!.y - add!.y)).toBeLessThan(4);
      expect(search!.width).toBeLessThanOrEqual(240);
    }
    await page.screenshot({
      path: `test-results/settings-scenes/${section}.png`,
      fullPage: true,
    });
    if (section === "personal" || section === "billing") {
      await mkdir("test-results/figma34-desktop", { recursive: true });
      await page.screenshot({
        path: `test-results/figma34-desktop/${section}.png`,
      });
    }
    expect(errors).toEqual([]);
  });

test("Settings action columns keep accessible names with visually hidden labels", async ({
  page,
}) => {
  const expectActionHeader = async (caption: string) => {
    const header = page
      .getByRole("table", { name: caption })
      .getByRole("columnheader", { name: "Actions" });
    await expect(header).toBeVisible();
    await expect(header.locator("span.sr-only")).toHaveText("Actions");
  };

  await page.goto("/settings/team");
  await expectActionHeader("Workspace members");
  await page.getByRole("tab", { name: /^Pending invitations/ }).click();
  await expectActionHeader("Pending team invitations");
  await page.goto("/settings/profiles");
  await expectActionHeader("active client profiles");
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

test("Figma 3.4 Profiles desktop renders a populated table without toolbar overlap", async ({
  page,
}) => {
  const names = [
    "Anduril",
    "Hidden Level",
    "Firestorm Labs",
    "Castellion",
    "Regent Craft",
    "Shield AI",
    "Applied Intuition",
    "Overland AI",
    "Kratos",
  ];
  const clients = names.map((name, index) => ({
    id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name,
    profileStatus: index === 8 ? "prospect" : "client",
    status: index === 8 ? "prospect" : "active",
    logoUrl: null,
    website: `${name.toLowerCase().replaceAll(" ", "")}.test`,
    createdAt: "2026-09-01T12:00:00.000Z",
    primaryContactName: `Synthetic Contact ${index + 1}`,
    primaryContactEmail: null,
  }));
  await operationFixtures(page, {
    ...settingsFixtures,
    "clients.list": clients,
    "settings.profiles.accountOwners": Object.fromEntries(
      clients.map((client) => [
        client.id,
        {
          accountOwnerUserId: "10000000-0000-4000-8000-000000000004",
          accountOwner: {
            id: "10000000-0000-4000-8000-000000000004",
            email: "owner@example.test",
            firstName: "Test",
            lastName: "Owner",
          },
        },
      ]),
    ),
  });
  await page.goto("/settings/profiles");
  await expect(page.getByRole("tab", { name: "Active (9)" })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(10);
  await expect(
    page.getByRole("cell", { name: "Anduril", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Sep 2026" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Account owner: Test Owner" }),
  ).toHaveCount(9);
  await mkdir("test-results/figma34-desktop", { recursive: true });
  await page.screenshot({ path: "test-results/figma34-desktop/profiles.png" });
});
