import { expect, test } from "@playwright/test";
import { client, installFixtures, json, prospect } from "./fixtures";

const stages = [
  "identified",
  "initiated",
  "engaged",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

const records = [
  [
    "Northline Robotics",
    "identified",
    "Ground autonomy",
    "Pittsburgh, PA",
    "Meri found 3 matching FY27 budget lines",
    "user-jc",
  ],
  [
    "Halcyon Space",
    "identified",
    "Space sensing",
    "Boulder, CO",
    "Named in SDA report language",
    "user-nm",
  ],
  [
    "Cobalt Aerospace",
    "initiated",
    "Propulsion",
    "Phoenix, AZ",
    "Intro call Oct 8",
    "user-nm",
  ],
  [
    "Meridian Autonomy",
    "initiated",
    "Maritime",
    "Norfolk, VA",
    "Awaiting reply",
    "user-ar",
  ],
  [
    "Kratos",
    "proposal",
    "Defense",
    "San Diego, CA",
    "Revised proposal due Oct 12",
    "user-jc",
  ],
  [
    "Epoch Power",
    "negotiation",
    "Energy storage",
    "Austin, TX",
    "Terms review Oct 12",
    "user-jc",
  ],
] as const;

test("Portfolio pipeline matches the desktop overlay geometry with source-backed prospect cards", async ({
  page,
}, testInfo) => {
  const unexpected = await installFixtures(page);
  await page.route("**/api/backend/core/clients", (route) =>
    json(
      route,
      Array.from({ length: 8 }, (_, index) => ({
        ...client,
        id: `10000000-0000-4000-8000-${String(index + 11).padStart(12, "0")}`,
        name: `Example Client ${index + 1}`,
      })),
    ),
  );
  await page.route("**/business-development/prospect-stages", (route) =>
    json(route, {
      version: "portfolio-3.1",
      createStage: "identified",
      legacyMapping: "pending",
      allowLegacyTransitions: false,
      stages: stages.map((value) => ({
        value,
        label: value.replaceAll("_", " "),
      })),
    }),
  );
  await page.route("**/client-account-owners/options", (route) =>
    json(route, [
      {
        id: "user-jc",
        firstName: "Jordan",
        lastName: "Case",
        email: "jordan@example.test",
      },
      {
        id: "user-nm",
        firstName: "Nora",
        lastName: "Meyer",
        email: "nora@example.test",
      },
      {
        id: "user-ar",
        firstName: "Ari",
        lastName: "Rivera",
        email: "ari@example.test",
      },
    ]),
  );
  await page.route("**/business-development/prospects**", (route) =>
    json(route, {
      prospects: records.map(
        (
          [
            displayName,
            stage,
            serviceHypothesis,
            geography,
            nextAction,
            ownerUserId,
          ],
          index,
        ) => ({
          ...prospect,
          id: `70000000-0000-4000-8000-${String(index + 11).padStart(12, "0")}`,
          displayName,
          stage,
          serviceHypothesis,
          geography,
          nextAction,
          ownerUserId,
        }),
      ),
      counts: {
        visible: 6,
        total: 8,
        active: 6,
        dismissed: 2,
        byStage: {
          identified: 2,
          initiated: 2,
          engaged: 0,
          proposal: 1,
          negotiation: 1,
          closed_won: 0,
          closed_lost: 0,
        },
      },
    }),
  );

  await page.goto("/portfolio?type=PROSPECT&pipeline=1");
  const dialog = page.getByRole("dialog", { name: "Pipeline" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Weighted pipeline and win rate unavailable"),
  ).toBeVisible();
  await expect(dialog).not.toContainText("$1.1M");
  await expect(dialog.getByText("Archived · 2")).toBeVisible();
  const board = dialog.getByRole("region", { name: "Pipeline stages" });
  const columns = board.locator("section");
  await expect(columns).toHaveCount(7);
  await expect(columns.nth(0)).toContainText("Northline Robotics");
  await expect(columns.nth(2)).toContainText("No prospects");
  await expect(columns.nth(4)).toContainText("Epoch Power");

  const modal = await dialog.boundingBox();
  const header = await dialog.locator(":scope > header").boundingBox();
  const footer = await dialog.locator(":scope > footer").boundingBox();
  const first = await columns.first().boundingBox();
  const second = await columns.nth(1).boundingBox();
  const card = await columns.first().locator("article").first().boundingBox();
  expect(modal).not.toBeNull();
  expect(header).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(card).not.toBeNull();
  expect(Math.abs(modal!.x - 80)).toBeLessThanOrEqual(2);
  expect(Math.abs(modal!.y - 110)).toBeLessThanOrEqual(2);
  expect(Math.abs(modal!.width - 1280)).toBeLessThanOrEqual(2);
  expect(Math.abs(modal!.height - 554)).toBeLessThanOrEqual(2);
  expect(Math.abs(header!.height - 84)).toBeLessThanOrEqual(1);
  expect(Math.abs(footer!.height - 50)).toBeLessThanOrEqual(1);
  expect(Math.abs(first!.x - 109)).toBeLessThanOrEqual(2);
  expect(Math.abs(first!.y - 217)).toBeLessThanOrEqual(2);
  expect(Math.abs(first!.width - 240)).toBeLessThanOrEqual(1);
  expect(Math.abs(second!.x - first!.x - 252)).toBeLessThanOrEqual(1);
  expect(Math.abs(card!.x - 117)).toBeLessThanOrEqual(2);
  expect(Math.abs(card!.y - 277)).toBeLessThanOrEqual(2);

  await dialog
    .getByRole("button", { name: "Close", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).blur());
  await page.screenshot({ path: testInfo.outputPath("pipeline-desktop.png") });
  await columns
    .first()
    .getByRole("button", { name: "Change stage" })
    .first()
    .click();
  const stageEditor = page.getByRole("dialog", {
    name: "Change prospect stage",
  });
  await expect(stageEditor).toBeVisible();
  await stageEditor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    columns.nth(3).getByRole("button", {
      name: "Add prospect to Proposal unavailable",
    }),
  ).toBeDisabled();
  await columns.first().getByRole("link", { name: "Add prospect" }).click();
  await expect(page).toHaveURL("/portfolio/prospects?new=1");
  await expect(
    page.getByRole("dialog", { name: "Add prospect" }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
