import { test, expect } from "@playwright/test";
import { installFixtures, json, prospect, prospectId } from "./fixtures";

const catalog = {
  version: "portfolio-3.1",
  createStage: "identified",
  legacyMapping: "pending",
  allowLegacyTransitions: false,
  stages: [
    { value: "identified", label: "Identified" },
    { value: "initiated", label: "Initiated" },
    { value: "engaged", label: "Engaged" },
    { value: "proposal", label: "Proposal" },
    { value: "negotiation", label: "Negotiation" },
    { value: "closed_won", label: "Closed won" },
    { value: "closed_lost", label: "Closed lost" },
  ],
};
const entry = (
  suffix: string,
  kind: string,
  body: string,
  createdAt: string,
) => ({
  id: `71000000-0000-4000-8000-00000000000${suffix}`,
  kind,
  body,
  createdAt,
  actorUserId: null,
});

test("overview uses Figma stage geometry, separates notes and filters actual activity", async ({
  page,
}, testInfo) => {
  const unexpected = await installFixtures(page);
  await page.route("**/business-development/prospect-stages", (route) =>
    json(route, catalog),
  );
  const rows = [
    entry("1", "note", "An earlier firm note", "2026-10-09T12:00:00Z"),
    entry("2", "stage", "Stage changed to Proposal", "2026-10-10T12:00:00Z"),
    entry("3", "note", "A newer firm note", "2026-10-11T12:00:00Z"),
  ];
  await page.route(
    `**/business-development/prospects/${prospectId}/history`,
    (route) => json(route, rows),
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  const progress = page.getByRole("list", { name: "Pipeline stage order" });
  await expect(progress.getByRole("listitem")).toHaveCount(6);
  await expect(progress.locator('[aria-current="step"]')).toContainText(
    "Proposal",
  );
  await expect(progress).not.toContainText("since");
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('img[src*="411-64863"]')).every(
      (image) =>
        image instanceof HTMLImageElement &&
        image.complete &&
        image.naturalWidth > 0,
    ),
  );
  expect(
    await progress.locator("img").evaluateAll((images) =>
      images.map((image) => {
        const box = image.getBoundingClientRect();
        return [box.width, box.height];
      }),
    ),
  ).toEqual(Array.from({ length: 6 }, () => [14, 14]));
  const notes = page.getByRole("region", { name: "Prospect notes" });
  await expect(notes).toContainText("Shared with your firm");
  await expect(notes.getByRole("listitem").first()).toHaveText(
    "A newer firm note",
  );
  await expect(notes).not.toContainText("Stage changed");
  const activity = page.getByRole("region", { name: "Prospect activity" });
  await expect(activity.getByRole("listitem").first()).toContainText(
    "A newer firm note",
  );
  await activity.getByRole("button", { name: "Stage", exact: true }).click();
  await expect(activity.getByRole("listitem")).toHaveCount(1);
  await expect(activity.getByRole("listitem")).toContainText(
    "Stage changed to Proposal",
  );
  await activity.getByRole("button", { name: "All", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("prospect-overview-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(progress).toBeVisible();
  expect(
    await progress.getByRole("listitem").evaluateAll((items) =>
      items.every((item) => {
        const label = item.querySelector(":scope > span");
        if (!label) return false;
        const text = document.createRange();
        text.selectNodeContents(label);
        const box = text.getBoundingClientRect();
        return (
          box.height <= 20 &&
          box.right <= item.getBoundingClientRect().right + 1
        );
      }),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("prospect-overview-mobile.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
});

test("one saved note refreshes both Notes and Activity without creating a private-note claim", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const rows: ReturnType<typeof entry>[] = [];
  let writes = 0;
  await page.route(
    `**/business-development/prospects/${prospectId}/history`,
    (route) => json(route, rows),
  );
  await page.route(
    `**/business-development/prospects/${prospectId}/notes`,
    (route) => {
      writes++;
      expect(route.request().postDataJSON()).toEqual({
        body: "Reviewed prospect update",
      });
      rows.push(
        entry("1", "note", "Reviewed prospect update", "2026-10-11T12:00:00Z"),
      );
      return json(route, rows);
    },
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  await page.getByRole("button", { name: "Add note" }).click();
  const dialog = page.getByRole("dialog", { name: "Add prospect note" });
  await expect(dialog).toContainText("firm's prospect history");
  await dialog
    .getByLabel("Note", { exact: true })
    .fill("Reviewed prospect update");
  await dialog.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("region", { name: "Prospect notes" }),
  ).toContainText("Reviewed prospect update");
  await expect(
    page.getByRole("region", { name: "Prospect activity" }),
  ).toContainText("Reviewed prospect update");
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a failed refresh removes cached activity and notes until authorized recovery", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let revoked = false;
  await page.route(
    `**/business-development/prospects/${prospectId}/history`,
    (route) =>
      revoked
        ? json(route, { message: "Access removed" }, 403)
        : json(route, [
            entry(
              "1",
              "note",
              "Previously accessible note",
              "2026-10-11T12:00:00Z",
            ),
          ]),
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  const activity = page.getByRole("region", { name: "Prospect activity" });
  await expect(activity).toContainText("Previously accessible note");
  revoked = true;
  await activity.getByRole("button", { name: "Refresh activity" }).click();
  await expect(activity.getByRole("alert")).toContainText("permission");
  await expect(page.getByText("Previously accessible note")).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("a mismatched prospect response cannot become the displayed company", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route(`**/business-development/prospects/${prospectId}`, (route) =>
    json(route, {
      ...prospect,
      id: "70000000-0000-4000-8000-000000000009",
      displayName: "Wrong prospect response",
    }),
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  await expect(page.getByRole("alert")).toContainText("unexpected response");
  await expect(page.getByText("Wrong prospect response")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit details" })).toHaveCount(
    0,
  );
  expect(unexpected).toEqual([]);
});
