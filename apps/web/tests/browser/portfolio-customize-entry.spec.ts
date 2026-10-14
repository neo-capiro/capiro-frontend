import { test, expect, type Page } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";
import { layoutActor } from "./portfolio-layout-fixtures";

const secondId = "10000000-0000-4000-8000-000000000002";
const clients = [
  client,
  { ...client, id: secondId, name: "Alpha Energy", sectorTag: "ENERGY" },
];
const endpoint = "**/api/backend/core/me/portfolio-layout";
const initialOrder = [secondId, clientId];
async function fixtures(page: Page, unavailable = false) {
  const unexpected = await installFixtures(page);
  await page.route("**/core/me", (route) =>
    json(route, {
      user: { id: layoutActor.userId, email: "layout@example.test" },
      tenant: { id: layoutActor.tenantId, name: "Synthetic tenant" },
      role: "standard_user",
    }),
  );
  await page.route("**/core/clients", (route) => json(route, clients));
  const writes: unknown[] = [];
  let order = initialOrder.map((id) => `client:${id}`);
  let version = 1;
  await page.route(endpoint, (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      writes.push(body);
      order = body.order;
      version++;
    }
    return unavailable
      ? json(route, { message: "Saved order unavailable" }, 404)
      : json(route, {
          ...layoutActor,
          contractVersion: 1,
          version,
          updatedAt: "2026-10-11T00:00:00.000Z",
          order,
        });
  });
  return { writes, unexpected };
}
const positions = (page: Page) =>
  page
    .locator("[data-client-id]")
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute("data-client-id")),
    );

for (const query of [
  "view=list&sort=name",
  "sort=recent&q=Aerospace",
  "view=list&q=No+matching+profile&owner=missing-owner&status=ACTIVE",
]) {
  test(`Customize opens the full saved catalog from ${query} and restores the current view`, async ({
    page,
  }, info) => {
    const { writes, unexpected } = await fixtures(page);
    await page.goto(`/portfolio?${query}`);
    await expect(
      page.getByRole("heading", { name: "Portfolio 2", exact: true }),
    ).toBeVisible();
    const before = page.url();
    const trigger = page.getByRole("button", {
      name: "Customize",
      exact: true,
    });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const later = page.getByRole("button", {
      name: "Move Alpha Energy later",
      exact: true,
    });
    await expect(later).toBeVisible();
    await expect(later).toBeEnabled();
    await expect.poll(() => positions(page)).toEqual(initialOrder);
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Customizing all 2 profiles" }),
    ).toBeVisible();
    await expect(page).toHaveURL(before);
    await expect(page.getByLabel("Search profiles")).toBeDisabled();
    await later.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => positions(page)).toEqual([clientId, secondId]);
    await expect(
      page.getByRole("button", { name: "Done customizing" }),
    ).toBeDisabled();
    await page.screenshot({
      path: info.outputPath("customize-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancel reorder" }).click();
    await expect.poll(() => positions(page)).toEqual(initialOrder);
    await page.getByRole("button", { name: "Done customizing" }).click();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(before);
    await expect(page.getByLabel("Search profiles")).toHaveValue(
      new URL(before).searchParams.get("q") ?? "",
    );
    await expect(page.getByLabel("Search profiles")).toBeEnabled();
    if (query.includes("No+matching"))
      await expect(
        page.getByRole("heading", { name: "No profiles found" }),
      ).toBeVisible();
    else if (query.includes("view=list"))
      await expect(
        page.getByRole("table", { name: "Portfolio profiles" }),
      ).toBeVisible();
    else await expect(page.getByRole("article")).toHaveCount(1);
    expect(writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}

test("unavailable saved ordering is explained after Customize from a filtered list and remains read-only", async ({
  page,
}, info) => {
  const { writes, unexpected } = await fixtures(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/portfolio?view=list&q=Aerospace");
  const before = page.url();
  const trigger = page.getByRole("button", { name: "Customize", exact: true });
  await trigger.click();
  await expect(
    page.getByText(
      "Saved profile ordering is unavailable in this environment.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(
    page.getByRole("button", {
      name: "Move Test Aerospace later",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save order", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("customize-unavailable-mobile-dark.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Done customizing" }).click();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(before);
  await expect(
    page.getByRole("table", { name: "Portfolio profiles" }),
  ).toBeVisible();
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("saving from a filtered mobile list writes the complete catalog once and restores the filtered list", async ({
  page,
}, info) => {
  const { writes, unexpected } = await fixtures(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "PUT") await pending;
    await route.fallback();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(
    "/portfolio?view=list&sort=name&q=Aerospace&sector=Aerospace",
  );
  const before = page.url();
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  const move = page.getByRole("button", {
    name: "Move Test Aerospace earlier",
    exact: true,
  });
  await move.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => positions(page)).toEqual([clientId, secondId]);
  await page.getByRole("button", { name: "Save order", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saving…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Done customizing" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("navigation", { name: "Profile type", includeHidden: true }),
  ).toHaveAttribute("inert", "");
  await expect(page).toHaveURL(before);
  release();
  await expect(
    page.getByRole("button", { name: "Save order", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Profile order saved.", { exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([
    {
      contractVersion: 1,
      expectedVersion: 1,
      order: [clientId, secondId].map((id) => `client:${id}`),
    },
  ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("customize-saved-mobile-dark.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Done customizing" }).click();
  await expect(
    page.getByRole("button", { name: "Customize", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("table", { name: "Portfolio profiles" }).getByRole("row"),
  ).toHaveCount(2);
  await expect(page).toHaveURL(before);
  await page.reload();
  await expect(
    page.getByRole("table", { name: "Portfolio profiles" }).getByRole("row"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect.poll(() => positions(page)).toEqual([clientId, secondId]);
  expect(writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

for (const state of ["empty", "failed"] as const) {
  test(`an ${state} catalog allows leaving Customize without reading or writing a layout`, async ({
    page,
  }) => {
    const { writes, unexpected } = await fixtures(page);
    let layoutReads = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("me/portfolio-layout")) layoutReads++;
    });
    await page.route("**/core/clients", (route) =>
      state === "empty"
        ? json(route, [])
        : json(route, { message: "Synthetic catalog unavailable" }, 503),
    );
    await page.goto("/portfolio?view=list&q=kept");
    if (state === "empty")
      await expect(
        page.getByRole("heading", { name: "No profiles yet" }),
      ).toBeVisible();
    else
      await expect(page.getByRole("alert")).toContainText(
        "Synthetic catalog unavailable",
      );
    const trigger = page.getByRole("button", {
      name: "Customize",
      exact: true,
    });
    await trigger.click();
    await page.getByRole("button", { name: "Done customizing" }).click();
    await expect(trigger).toBeFocused();
    await expect(page.getByLabel("Search profiles")).toBeEnabled();
    await expect(page.getByLabel("Search profiles")).toHaveValue("kept");
    expect(layoutReads).toBe(0);
    expect(writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}
