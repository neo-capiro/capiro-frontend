import { test, expect } from "@playwright/test";
import { clientId, json, prospect, prospectId } from "./fixtures";
import { prospectList, qaFixtures } from "./portfolio-qa-fixtures";

test("legacy stage requires an explicit current-stage choice and preserves its activity", async ({
  page,
}) => {
  const unexpected = await qaFixtures(page);
  let record = { ...prospect, stage: "researching" };
  const writes: unknown[] = [];
  const history = [
    {
      id: "71000000-0000-4000-8000-000000000001",
      kind: "stage",
      body: "Previous stage: Researching",
      createdAt: "2026-10-01T12:00:00Z",
      actorUserId: null,
    },
  ];
  await page.route(
    `**/business-development/prospects/${prospectId}`,
    (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        writes.push(body);
        record = { ...record, stage: body.stage };
        history.push({
          ...history[0]!,
          id: "71000000-0000-4000-8000-000000000002",
          body: "Stage changed to Engaged",
          createdAt: "2026-11-04T12:00:00Z",
        });
      }
      return json(route, record);
    },
  );
  await page.route(
    `**/business-development/prospects/${prospectId}/history`,
    (route) => json(route, history),
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  await page.getByRole("button", { name: "Change stage", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Change prospect stage" });
  await expect(dialog.getByLabel("New stage")).toHaveValue("researching");
  await expect(
    dialog.getByRole("button", { name: "Confirm stage" }),
  ).toBeDisabled();
  await expect(dialog).toContainText("no stage is selected automatically");
  await dialog.getByLabel("New stage").selectOption("engaged");
  await dialog.getByRole("button", { name: "Confirm stage" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Stage: Engaged" }),
  ).toBeVisible();
  const activity = page.getByRole("region", { name: "Prospect activity" });
  await expect(activity).toContainText("Previous stage: Researching");
  await expect(activity).toContainText("Stage changed to Engaged");
  expect(writes).toEqual([{ stage: "engaged" }]);
  expect(unexpected).toEqual([]);
});

test("archived lifecycle stays near the title while long activity supports paging, filters, collapse and section jumps", async ({
  page,
}, info) => {
  const unexpected = await qaFixtures(page);
  await page.route(`**/business-development/prospects/${prospectId}`, (route) =>
    json(route, { ...prospect, status: "dismissed" }),
  );
  const history = Array.from({ length: 35 }, (_, index) => ({
    id: `71000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    kind: "stage",
    body: `Synthetic audit event ${index + 1}`,
    createdAt: `2026-10-${String((index % 28) + 1).padStart(2, "0")}T12:00:00Z`,
    actorUserId: null,
  }));
  await page.route(
    `**/business-development/prospects/${prospectId}/history`,
    (route) => json(route, history),
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  const lifecycle = page.getByRole("region", { name: "Prospect lifecycle" });
  await expect(lifecycle).toContainText("Archived");
  await expect(
    lifecycle.getByRole("button", { name: "Restore prospect" }),
  ).toBeVisible();
  expect((await lifecycle.boundingBox())!.y).toBeLessThan(400);
  await page.screenshot({
    path: info.outputPath("archived-prospect-desktop.png"),
  });
  const activity = page.getByRole("region", {
    name: "Prospect activity",
    exact: true,
  });
  await expect(activity.getByRole("listitem")).toHaveCount(10);
  await expect(activity.getByRole("status")).toHaveText(
    "Showing 10 of 35 events",
  );
  await activity.screenshot({
    path: info.outputPath("prospect-activity-bounded.png"),
  });
  await activity.getByRole("button", { name: "Load more activity" }).click();
  await expect(activity.getByRole("listitem")).toHaveCount(20);
  await activity.getByRole("button", { name: "Show newest 10" }).click();
  await expect(activity.getByRole("listitem")).toHaveCount(10);
  await activity.getByLabel("Search activity").fill("event 35");
  await expect(activity.getByRole("listitem")).toHaveCount(1);
  await expect(activity.getByRole("listitem")).toContainText("event 35");
  await activity.getByLabel("Search activity").fill("");
  await activity.getByLabel("From", { exact: true }).fill("2026-10-28");
  await activity.getByLabel("Through", { exact: true }).fill("2026-10-28");
  await expect(activity.getByRole("listitem")).toHaveCount(1);
  await activity.getByLabel("From", { exact: true }).fill("");
  await activity.getByLabel("Through", { exact: true }).fill("");
  await activity.getByRole("button", { name: "View full history" }).click();
  const full = page.getByRole("dialog", { name: "Full prospect activity" });
  await expect(full.getByRole("listitem")).toHaveCount(35);
  await page.keyboard.press("Escape");
  await activity.getByRole("button", { name: "Collapse activity" }).click();
  await expect(activity.getByRole("listitem")).toHaveCount(0);
  await expect(
    activity.getByRole("button", { name: "Expand activity" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("navigation", { name: "Prospect sections" })
    .getByRole("link", { name: "Notes", exact: true })
    .click();
  await expect(page).toHaveURL(/#prospect-notes$/);
  await expect(
    page.getByRole("region", { name: "Prospect notes" }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("navigation", { name: "Prospect sections" })
    .scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("archived-prospect-mobile.png"),
  });
  expect(unexpected).toEqual([]);
});

test("converted header exposes linked client and filtered prospect return preserves list state", async ({
  page,
}, info) => {
  const unexpected = await qaFixtures(page);
  const record = {
    ...prospect,
    stage: "outreach",
    ownerUserId: "owner-test",
    linkedClientId: clientId,
    convertedAt: "2026-11-01T12:00:00Z",
  };
  await page.route("**/client-account-owners/options", (route) =>
    json(route, [
      {
        id: "owner-test",
        firstName: "Synthetic",
        lastName: "Owner",
        email: "owner@example.test",
      },
    ]),
  );
  await page.route("**/business-development/prospects?*", (route) =>
    json(route, prospectList([record])),
  );
  await page.route(`**/business-development/prospects/${prospectId}`, (route) =>
    json(route, record),
  );
  const list =
    "/portfolio/prospects?q=Test&stage=outreach&status=all&ownerId=owner-test";
  await page.goto(list);
  await page.getByRole("link", { name: /Test Prospect/ }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "← Prospects" }),
  ).toHaveAttribute("href", list);
  const lifecycle = page.getByRole("region", { name: "Prospect lifecycle" });
  await expect(lifecycle).toContainText("Converted");
  await expect(
    lifecycle.getByRole("link", { name: "Go to linked client" }),
  ).toHaveAttribute("href", `/portfolio/${clientId}`);
  await page.screenshot({
    path: info.outputPath("converted-prospect-return.png"),
  });
  await page.getByRole("link", { name: "← Prospects" }).click();
  await expect(page).toHaveURL(list);
  await expect(page.getByLabel("Search prospects")).toHaveValue("Test");
  await expect(page.getByLabel("Prospect stage")).toHaveValue("outreach");
  await expect(page.getByLabel("Prospect visibility")).toHaveValue("all");
  await expect(page.getByLabel("Prospect owner")).toHaveValue("owner-test");
  expect(unexpected).toEqual([]);
});

test("returning from a prospect restores the scrolling main container", async ({
  page,
}) => {
  const unexpected = await qaFixtures(page);
  const records = Array.from({ length: 45 }, (_, index) => ({
    ...prospect,
    id: `70000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    displayName: `Synthetic prospect ${index + 1}`,
  }));
  await page.route("**/business-development/prospects?*", (route) =>
    json(route, prospectList(records)),
  );
  await page.route(`**/business-development/prospects/${prospectId}`, (route) =>
    json(route, records[0]),
  );
  await page.goto("/portfolio/prospects?status=all");
  const main = page.getByRole("main");
  const first = page.getByRole("link", {
    name: /Synthetic prospect 1 Virginia/,
  });
  await expect(first).toBeVisible();
  await main.evaluate((node) => {
    node.scrollTop = 500;
  });
  const position = await main.evaluate((node) => node.scrollTop);
  expect(position).toBeGreaterThan(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  // Keyboard activation does not scroll the link into view before navigation.
  await first.evaluate((node) =>
    (node as HTMLElement).focus({ preventScroll: true }),
  );
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Synthetic prospect 1", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "← Prospects" }).click();
  await expect(page).toHaveURL("/portfolio/prospects?status=all");
  await expect
    .poll(() => main.evaluate((node) => node.scrollTop))
    .toBe(position);
  expect(unexpected).toEqual([]);
});
