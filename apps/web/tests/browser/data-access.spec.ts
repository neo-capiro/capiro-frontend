import { test, expect } from "@playwright/test";
import { installFixtures, clientId } from "./fixtures";
import { serveMeri } from "./discoverability-fixtures";

test("General shows every read family with Meri's state, flags the mailbox family until a mailbox is connected, and lists SQL relations", async ({
  page,
}) => {
  await installFixtures(page);
  const calls = await serveMeri(page);
  await page.goto("/data-access.html");
  const families = page.getByRole("table", {
    name: "Read families for General",
  });
  await expect(families).toBeVisible();
  const rows = families.locator("tbody tr");
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(0)).toContainText("Action items complete");
  await expect(rows.nth(0)).toContainText("Needs a selected client");
  await expect(rows.nth(1)).toContainText("Capiro data v5");
  await expect(rows.nth(1)).toContainText("Available");
  await expect(rows.nth(2)).toContainText("Not installed");
  await expect(rows.nth(3)).toContainText("Mail");
  await expect(rows.nth(3)).toContainText("Connector not connected");
  await expect(rows.nth(4)).toContainText("Off by policy");
  await expect(rows.nth(4)).toContainText(
    "No model-facing description is published for this family.",
  );
  await expect(
    page.getByText("1 of 5 sources are readable for General"),
  ).toBeVisible();
  const clientRelations = page.getByRole("table", {
    name: "Client record SQL relations",
  });
  await expect(clientRelations.locator("tbody tr").first()).toContainText(
    "Needs a selected client",
  );
  await expect(
    page
      .getByRole("table", { name: "Public SQL relations" })
      .locator("tbody tr")
      .first(),
  ).toContainText("Available");
  await expect(page.getByRole("link", { name: "Connections" })).toHaveAttribute(
    "href",
    "/settings/preferences?page=connections",
  );
  await expect(
    page.getByRole("link", { name: "Connected services" }),
  ).toHaveAttribute("href", "/settings/preferences?page=connected-services");
  // Read-only: no control changes policy or connects anything.
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("switch")).toHaveCount(0);
  expect(
    calls
      .filter((call) => call.path === "/api/data-access/read")
      .map((call) => call.body),
  ).toEqual([{ clientId: null }]);
});

test("a selected client is named in the request and the mail family reads as available with a connected mailbox", async ({
  page,
}) => {
  await installFixtures(page);
  const calls = await serveMeri(page, { mailboxConnected: true });
  await page.goto(`/data-access.html?clientId=${clientId}`);
  const families = page.getByRole("table", {
    name: "Read families for Test Aerospace",
  });
  await expect(families).toBeVisible();
  await expect(families.locator("tbody tr").nth(0)).toContainText("Available");
  await expect(families.locator("tbody tr").nth(3)).toContainText("Available");
  await expect(
    page.getByText("3 of 5 sources are readable for Test Aerospace"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("table", { name: "Client record SQL relations" })
      .locator("tbody tr")
      .first(),
  ).toContainText("Available");
  expect(
    calls
      .filter((call) => call.path === "/api/data-access/read")
      .map((call) => call.body),
  ).toEqual([{ clientId }]);
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
