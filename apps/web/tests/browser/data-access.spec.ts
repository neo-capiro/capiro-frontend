import { test, expect } from "@playwright/test";
import { installFixtures, clientId } from "./fixtures";
import { serveMeri } from "./discoverability-fixtures";

test("General shows installed sources only, one Capiro data row, plain labels, and flags the mailbox source until a mailbox is connected", async ({
  page,
}) => {
  await installFixtures(page);
  const calls = await serveMeri(page);
  await page.goto("/data-access.html");
  const sources = page.getByRole("table", { name: "Sources for General" });
  await expect(sources).toBeVisible();
  const rows = sources.locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText("Action items complete");
  await expect(rows.nth(0)).toContainText("Needs a selected client");
  await expect(rows.nth(1)).toContainText("Capiro data (SQL)");
  await expect(rows.nth(1)).toContainText("Available");
  await expect(rows.nth(1)).toContainText(
    "Records carry as-of time and a source version.",
  );
  await expect(rows.nth(2)).toContainText("Mail");
  await expect(rows.nth(2)).toContainText("Connector not connected");
  await expect(rows.nth(3)).toContainText("Public reports");
  await expect(rows.nth(3)).toContainText("Off by policy");
  await expect(rows.nth(3)).toContainText(
    "No description is published for this source yet.",
  );
  const text = await page.getByRole("main").innerText();
  for (const mechanic of [
    "capiro-data",
    "v5",
    "asOf",
    "Not installed",
    "registry",
    "policy resolution",
    "Core",
    "describe",
    "SQL relations",
    "composed",
  ])
    expect(text, mechanic).not.toContain(mechanic);
  await expect(
    page.getByText("1 of 4 sources are readable for General"),
  ).toBeVisible();
  const clientTables = page
    .getByRole("table", { name: "Client record data tables" })
    .locator("tbody tr")
    .first();
  await expect(clientTables).toContainText("Client people");
  await expect(clientTables).toContainText("Needs a selected client");
  await expect(
    page
      .getByRole("table", { name: "Public data tables" })
      .locator("tbody tr")
      .first(),
  ).toContainText("Congress bills");
  await expect(page.getByRole("link", { name: "Connections" })).toHaveAttribute(
    "href",
    "/settings/preferences?page=connections",
  );
  await expect(
    page.getByRole("link", { name: "Connected services" }),
  ).toHaveAttribute("href", "/settings/preferences?page=connected-services");
  // Read-only: no control changes a setting or connects anything.
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("switch")).toHaveCount(0);
  expect(
    calls
      .filter((call) => call.path === "/api/data-access/read")
      .map((call) => call.body),
  ).toEqual([{ clientId: null }]);
});

test("a selected client is named in the request; a mailbox connection of any status makes the mail source available", async ({
  page,
}) => {
  await installFixtures(page);
  const calls = await serveMeri(page, { connections: "mailbox" });
  await page.goto(`/data-access.html?clientId=${clientId}`);
  const sources = page.getByRole("table", {
    name: "Sources for Test Aerospace",
  });
  await expect(sources).toBeVisible();
  await expect(sources.locator("tbody tr").nth(0)).toContainText("Available");
  await expect(sources.locator("tbody tr").nth(2)).toContainText("Mail");
  await expect(sources.locator("tbody tr").nth(2)).toContainText("Available");
  await expect(
    page.getByText("3 of 4 sources are readable for Test Aerospace"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("table", { name: "Client record data tables" })
      .locator("tbody tr")
      .first(),
  ).toContainText("Available");
  expect(
    calls
      .filter((call) => call.path === "/api/data-access/read")
      .map((call) => call.body),
  ).toEqual([{ clientId }]);
});

test("when the connections read fails the mail source says so instead of claiming a missing connector", async ({
  page,
}) => {
  await installFixtures(page);
  await serveMeri(page, { connections: "error" });
  await page.goto("/data-access.html");
  const sources = page.getByRole("table", { name: "Sources for General" });
  await expect(sources.locator("tbody tr").nth(2)).toContainText(
    "Could not check your connections",
  );
  await expect(page.getByText("Connector not connected")).toHaveCount(0);
});

test("an answer for another client is refused by the receiver and shown as unavailable, never as coverage", async ({
  page,
}) => {
  await installFixtures(page);
  await serveMeri(page, {
    dataAccess: () => ({
      schemaVersion: "meri.data-access/1",
      checkedAt: "2026-11-01T12:00:00.000Z",
      clientId,
      generalReads: true,
      families: [],
      relations: [],
    }),
  });
  await page.goto("/data-access.html");
  await expect(
    page.getByRole("note", { name: "Data access" }).last(),
  ).toContainText("Data access could not be read right now.");
  await expect(page.getByRole("table")).toHaveCount(0);
});
