import { test, expect } from "@playwright/test";
import { clientId, json } from "./fixtures";
import {
  coreTargeting,
  intelTargeting,
  watchlistIdentity,
  watchlistPath,
  installCurrentWatchlist,
  openCurrentWatchlist,
  watchlistDialog,
  settleWatchlist,
  refreshWatchlist,
  heldWatchlistWrite,
} from "./watchlist-current-fixtures";

for (const source of [
  "targeting",
  "taxonomy",
  "jurisdictions",
  "client",
] as const)
  test(`failed ${source} refresh withholds retained targeting fields and save`, async ({
    page,
  }) => {
    const fixture = await installCurrentWatchlist(page);
    const dialog = await openCurrentWatchlist(page);
    await dialog
      .getByLabel("Topic name", { exact: true })
      .fill("Unsaved local edit");
    const path =
      source === "targeting"
        ? `**/${watchlistPath("intelligence")}`
        : source === "taxonomy"
          ? "**/tracker/issue-areas"
          : source === "jurisdictions"
            ? "**/legiwatch/bills/corpus-metadata"
            : `**/api/backend/core/clients/${clientId}`;
    await page.route(path, (route) =>
      json(route, { message: `Current ${source} denied` }, 403),
    );
    await refreshWatchlist(page, source);
    await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      dialog.getByRole("button", { name: "Save targeting", exact: true }),
    ).toHaveCount(0);
    expect(fixture.writes).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });

test("invalidated targeting is withheld before a replacement GET", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page);
  const dialog = await openCurrentWatchlist(page);
  await page.evaluate(() => window.__watchlistCurrent!.invalidate("targeting"));
  await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("Core retained identity failure cannot leave shared targeting editable", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page, "core");
  const dialog = await openCurrentWatchlist(page, "core");
  await page.route("**/api/backend/core/me", (route) =>
    json(route, { message: "Current session denied" }, 403),
  );
  await refreshWatchlist(page, "identity");
  await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Save targeting", exact: true }),
  ).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("an exact current client is required even when a default watchlist exists", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page);
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    json(route, {
      id: "10000000-0000-4000-8000-000000000009",
      name: "Another client",
      status: "ACTIVE",
      profileStatus: "ACTIVE",
    }),
  );
  await page.goto("/watchlist-current.html");
  await settleWatchlist(page);
  await expect(
    watchlistDialog(page).getByLabel("Topic name", { exact: true }),
  ).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("replacement actor cannot reuse the previous actor's retained watchlist", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page);
  const dialog = await openCurrentWatchlist(page);
  const initialReads = fixture.reads.targeting;
  await page.route(`**/${watchlistPath("intelligence")}`, (route) =>
    json(route, { message: "Replacement actor denied" }, 403),
  );
  await page.evaluate(
    (identity) => window.__watchlistCurrent!.identity(identity),
    {
      ...watchlistIdentity,
      user: {
        ...watchlistIdentity.user,
        id: "replacement-user",
        clerkUserId: "user_replacement",
      },
    },
  );
  await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveCount(0);
  expect(fixture.reads.targeting).toBe(initialReads);
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

for (const interruption of [
  "identity",
  "targeting",
  "client",
  "taxonomy",
] as const)
  test(`interrupted ${interruption} cannot publish a late successful save after synchronous restore`, async ({
    page,
  }) => {
    const fixture = await installCurrentWatchlist(page);
    const dialog = await openCurrentWatchlist(page);
    await dialog
      .getByLabel("Topic name", { exact: true })
      .fill("Late saved value");
    const capturedKeys = await page.evaluate(() =>
      window
        .__watchlistCurrent!.snapshots()
        .map((entry) => JSON.stringify(entry.key)),
    );
    const held = await heldWatchlistWrite(page);
    await dialog
      .getByRole("button", { name: "Save targeting", exact: true })
      .click();
    await held.started;
    await page.evaluate(
      (source) => window.__watchlistCurrent!.invalidate(source, true),
      interruption,
    );
    const interrupted = await page.evaluate(
      (keys) =>
        window
          .__watchlistCurrent!.snapshots()
          .filter((entry) => keys.includes(JSON.stringify(entry.key))),
      capturedKeys,
    );
    held.release();
    await held.finished;
    await settleWatchlist(page);
    expect(
      await page.evaluate(
        (keys) =>
          window
            .__watchlistCurrent!.snapshots()
            .filter((entry) => keys.includes(JSON.stringify(entry.key))),
        capturedKeys,
      ),
    ).toEqual(interrupted);
    // Replacement readers may legitimately acquire new successful child keys;
    // no captured key or new key may receive the obsolete submitted value.
    expect(
      JSON.stringify(
        await page.evaluate(() => window.__watchlistCurrent!.snapshots()),
      ),
    ).not.toContain("Late saved value");
    await expect(
      page.getByRole("status", {
        name: "Synthetic Watchlist completed closes",
        includeHidden: true,
      }),
    ).toHaveText("0");
    expect(held.bodies).toHaveLength(1);
    expect(fixture.unexpected).toEqual([]);
  });

test("an unmounted editor cannot publish its late receipt or close another view", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page, "core");
  const dialog = await openCurrentWatchlist(page, "core");
  await dialog.getByLabel("Topic name", { exact: true }).fill("Late Core save");
  const held = await heldWatchlistWrite(page, "core");
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await held.started;
  await page.evaluate(() => window.__watchlistCurrent!.show(false));
  const before = await page.evaluate(() =>
    window.__watchlistCurrent!.snapshots(),
  );
  held.release();
  await held.finished;
  await settleWatchlist(page);
  expect(
    await page.evaluate(() => window.__watchlistCurrent!.snapshots()),
  ).toEqual(before);
  await expect(
    page.getByRole("status", {
      name: "Synthetic Watchlist completed closes",
      includeHidden: true,
    }),
  ).toHaveText("0");
  expect(held.bodies).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

test("Core rejects a shape-valid receipt that did not preserve the submitted full projection", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page, "core");
  const dialog = await openCurrentWatchlist(page, "core");
  await dialog
    .getByLabel("Topic name", { exact: true })
    .fill("Changed Core name");
  const held = await heldWatchlistWrite(page, "core", coreTargeting);
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await held.started;
  held.release();
  await held.finished;
  await settleWatchlist(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveValue(
    "Changed Core name",
  );
  await expect(dialog.getByRole("alert")).toContainText(
    /unconfirmed|unexpected|could not confirm/i,
  );
  await expect(
    dialog.getByRole("button", { name: "Save targeting", exact: true }),
  ).toBeDisabled();
  expect(held.bodies).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

test("Intel cannot accept a receipt whose native version did not advance", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page);
  const dialog = await openCurrentWatchlist(page);
  await dialog
    .getByLabel("Topic name", { exact: true })
    .fill("Changed Intel name");
  const held = await heldWatchlistWrite(page, "intelligence", intelTargeting);
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await held.started;
  held.release();
  await held.finished;
  await settleWatchlist(page);
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save targeting", exact: true }),
  ).toBeDisabled();
  expect(held.bodies).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

test("a lost Core acknowledgement cannot be resent by closing and reopening Configure", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page, "core");
  const dialog = await openCurrentWatchlist(page, "core");
  await dialog
    .getByLabel("Topic name", { exact: true })
    .fill("Unknown Core save");
  let writes = 0;
  await page.route(`**/${watchlistPath("core")}`, (route) => {
    if (route.request().method() === "GET") return route.fallback();
    writes++;
    return route.abort("connectionreset");
  });
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await page.evaluate(() => window.__watchlistCurrent!.show(false));
  await page.evaluate(() => window.__watchlistCurrent!.show(true));
  await settleWatchlist(page);
  const save = watchlistDialog(page).getByRole("button", {
    name: "Save targeting",
    exact: true,
  });
  await expect(save).toBeDisabled();
  expect(writes).toBe(1);
  expect(fixture.unexpected).toEqual([]);
});
