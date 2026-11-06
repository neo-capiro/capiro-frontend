import { test, expect, type Locator } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import { installCurrentWatchlist } from "./watchlist-current-fixtures";
import { syntheticClient } from "../legiwatch-impact-fixtures";
import { trackerIdentity } from "../tracker-preference-fixtures";

async function receivesPointer(dialog: Locator) {
  return dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return element.contains(
      document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + 30),
    );
  });
}

for (const fail of [false, true])
  test(`opening an aged tracker preserves the drawer during identity revalidation${fail ? " and clears it on refusal" : ""}`, async ({
    page,
  }) => {
    await installFixtures(page);
    let reads = 0;
    let release!: () => void;
    await page.route("**/api/backend/core/me", async (route) => {
      if (++reads > 1)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      return json(
        route,
        fail && reads > 1
          ? { message: "Synthetic identity refused" }
          : trackerIdentity,
        fail && reads > 1 ? 403 : 200,
      );
    });
    await page.goto(`/modules/legiwatch?clientId=${syntheticClient}`);
    await expect(
      page.getByRole("button", { name: "H.R. 1", exact: true }),
    ).toBeVisible();
    await page.clock.install();
    await page.clock.fastForward(31_000);
    await page.getByRole("button", { name: "H.R. 1", exact: true }).click();
    await expect.poll(() => reads).toBe(2);
    const drawer = page.getByRole("dialog", { name: "H.R. 1", exact: true });
    await expect(drawer).toBeVisible();
    release();
    if (fail) {
      await expect(drawer).toHaveCount(0);
      await expect(
        page.getByText("Domestic component requirement", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /Update impact|Save client context/ }),
      ).toHaveCount(0);
    } else {
      await expect(
        drawer.getByText("Domestic component requirement", { exact: true }),
      ).toBeVisible();
      await expect(
        drawer.getByRole("button", { name: "Update impact", exact: true }),
      ).toBeEnabled();
    }
  });

test("module bill search remains clickable above its backdrop", async ({
  page,
}) => {
  await installFixtures(page);
  await page.route("**/tracker/bill-search?**", (route) =>
    json(route, [
      {
        billId: "synthetic-search",
        displayNum: "S. 20",
        title: "Synthetic search result",
        stage: "introduced",
        probability: 0.17,
        jurisdiction: "US",
      },
    ]),
  );
  await page.route("**/legiwatch/bills/corpus-metadata", (route) =>
    json(route, { jurisdictions: [{ key: "US", count: 1 }] }),
  );
  await page.goto(`/modules/legiwatch?clientId=${syntheticClient}`);
  await page.getByRole("button", { name: "Track bill", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Track a bill",
    exact: true,
  });
  await expect.poll(() => receivesPointer(dialog)).toBe(true);
  await dialog
    .getByRole("textbox", { name: "Bill number or title" })
    .fill("SPACEPORT");
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await expect(dialog.getByRole("radio", { name: /S. 20/ })).toBeVisible();
  await dialog.getByRole("radio", { name: /S. 20/ }).check();
  await expect(
    dialog.getByRole("button", { name: "Track selected bill" }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Track bill", exact: true }),
  ).toBeFocused();
});

test("module Configure and nested personal alerts remain above their backdrops", async ({
  page,
}) => {
  await installFixtures(page);
  await installCurrentWatchlist(page, "intelligence");
  await page.goto(`/modules/legiwatch?clientId=${syntheticClient}`);
  await page.getByRole("button", { name: "Configure", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Configure Bill Tracker",
    exact: true,
  });
  await expect.poll(() => receivesPointer(dialog)).toBe(true);
  await dialog.getByRole("button", { name: "My alert preferences" }).click();
  const personal = page.getByRole("dialog", {
    name: "My bill alerts",
    exact: true,
  });
  await expect.poll(() => receivesPointer(personal)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(personal).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("tracker search preserves typed text and client scope in both views", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await installFixtures(page);
  await page.goto(
    `/modules/legiwatch?clientId=${syntheticClient}&view=legiwatch`,
  );
  const search = page.getByRole("textbox", { name: "Search tracked bills" });
  await search.pressSequentially("SPACEPORT");
  await expect(search).toHaveValue("SPACEPORT");
  await expect(page).toHaveURL(/q=SPACEPORT/);
  await page.getByRole("button", { name: "Board view", exact: true }).click();
  await expect(page).toHaveURL(/view=legiwatch/);
  await expect(page).toHaveURL(new RegExp(`clientId=${syntheticClient}`));
  await expect(search).toHaveValue("SPACEPORT");
  await page.goto(`/portfolio/${syntheticClient}/bills?keep=scope`);
  await page.getByRole("button", { name: "Board view", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/portfolio/${syntheticClient}/bills\\?keep=scope&view=board`),
  );
  await expect(
    page.getByRole("combobox", { name: "Client", exact: true }),
  ).toHaveCount(0);
});

test("module board lanes are keyboard scrollable and preserve the tracker route", async ({
  page,
}) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `/modules/legiwatch?clientId=${syntheticClient}&view=legiwatch`,
  );
  await page.getByRole("button", { name: "Board view", exact: true }).click();
  await expect(page).toHaveURL(/view=legiwatch/);
  await expect(page).toHaveURL(/trackerView=board/);
  const board = page.getByRole("region", { name: "Tracked bills by stage" });
  await board.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => board.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(
    board.getByRole("heading", { name: "Stage unavailable" }),
  ).toBeAttached();
});
