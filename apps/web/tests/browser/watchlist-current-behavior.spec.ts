import { test, expect } from "@playwright/test";
import { clientId, json, client } from "./fixtures";
import {
  installCurrentWatchlist,
  openCurrentWatchlist,
  watchlistPath,
  watchlistDialog,
  watchlistIdentity,
  coreTargeting,
  intelTargeting,
  refreshWatchlist,
  settleWatchlist,
  heldWatchlistWrite,
} from "./watchlist-current-fixtures";

test("current Core standard users preserve the native tag fields and refresh only their board after explicit save", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page, "core");
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      ...watchlistIdentity,
      role: "standard_user",
      user: { id: "current-user", email: "current@example.test" },
    }),
  );
  const dialog = await openCurrentWatchlist(page, "core");
  await page.evaluate(() => window.__watchlistCurrent!.seedBoards());
  await dialog
    .getByLabel("Topic name", { exact: true })
    .fill("Edited Core topic");
  await expect(dialog.getByLabel("State coverage")).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(fixture.writes).toEqual([
    {
      ...coreTargeting,
      tags: [{ ...coreTargeting.tags[0], tag: "Edited Core topic" }],
    },
  ]);
  const snapshots = await page.evaluate(() =>
    window.__watchlistCurrent!.snapshots(),
  );
  expect(
    snapshots.find((entry) =>
      String(JSON.stringify(entry.data)).includes("current board"),
    )?.invalidated,
  ).toBe(true);
  expect(
    snapshots.find((entry) =>
      String(JSON.stringify(entry.data)).includes("other board"),
    )?.invalidated,
  ).toBe(false);
  expect(fixture.unexpected).toEqual([]);
});

test("an Intel cold watchlist uses expectedVersion zero and requires an explicit save for profile suggestions", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page);
  fixture.state.record = {
    ...intelTargeting,
    version: 0,
    suggestedIssueAreas: ["Health"],
    suggestedJurisdictions: ["NY"],
  };
  const dialog = await openCurrentWatchlist(page);
  expect(fixture.writes).toEqual([]);
  await expect(
    dialog.getByRole("checkbox", { name: "Health", exact: true }),
  ).not.toBeChecked();
  await dialog.getByRole("button", { name: "Use suggestions" }).click();
  await expect(
    dialog.getByRole("checkbox", { name: "Health", exact: true }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("checkbox", { name: "NY", exact: true }),
  ).toBeChecked();
  expect(fixture.writes).toEqual([]);
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(fixture.writes).toHaveLength(1);
  expect(fixture.writes[0]).toMatchObject({
    expectedVersion: 0,
    issueAreas: ["Defense", "Health"],
    jurisdictions: ["VA", "NY"],
  });
  expect(fixture.unexpected).toEqual([]);
});

test("a failed taxonomy can be refreshed without losing local edits or silently saving them", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page);
  const dialog = await openCurrentWatchlist(page);
  await dialog.getByLabel("Topic name", { exact: true }).fill("Retained edit");
  const deny = (route: import("@playwright/test").Route) =>
    json(route, { message: "Denied" }, 403);
  await page.route("**/tracker/issue-areas", deny);
  await refreshWatchlist(page, "taxonomy");
  await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveCount(0);
  await page.unroute("**/tracker/issue-areas", deny);
  await dialog.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveValue(
    "Retained edit",
  );
  await expect(
    dialog.getByRole("button", { name: "Save targeting", exact: true }),
  ).toBeEnabled();
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("a denied exact-client preflight conceals retained targeting and sends no Core PUT", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page, "core");
  const dialog = await openCurrentWatchlist(page, "core");
  await dialog
    .getByLabel("Topic name", { exact: true })
    .fill("Local denied edit");
  let preflights = 0;
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) => {
    preflights++;
    return json(route, { message: "Current client denied" }, 403);
  });
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveCount(0);
  await expect(
    dialog.getByRole("status", { name: "Current data unavailable" }),
  ).toBeVisible();
  expect(preflights).toBe(1);
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("Core detects an intervening saved change, retains the edit, and reloads only after discard confirmation", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page, "core");
  const dialog = await openCurrentWatchlist(page, "core");
  await dialog
    .getByLabel("Topic name", { exact: true })
    .fill("Unsaved local name");
  fixture.state.record = {
    ...coreTargeting,
    tags: [{ ...coreTargeting.tags[0], tag: "Other saved value" }],
  };
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Saved targeting changed",
  );
  await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveValue(
    "Unsaved local name",
  );
  expect(fixture.writes).toEqual([]);
  await dialog
    .getByRole("button", { name: "Reload saved values", exact: true })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "Reload saved targeting",
    exact: true,
  });
  await confirm
    .getByRole("button", { name: "Discard edits and reload", exact: true })
    .click();
  await expect(confirm).not.toBeVisible();
  await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveValue(
    "Other saved value",
  );
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("an unconfirmed Core save retains its draft across reopen and reload never unlocks resend", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page, "core");
  const dialog = await openCurrentWatchlist(page, "core");
  await dialog
    .getByLabel("Topic name", { exact: true })
    .fill("Unconfirmed retained draft");
  let writes = 0;
  await page.route(`**/${watchlistPath("core")}`, (route) => {
    if (route.request().method() === "GET") return route.fallback();
    writes++;
    return route.abort("connectionreset");
  });
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await expect(
    dialog.getByRole("alert", { name: "Save unconfirmed" }),
  ).toBeVisible();
  await page.evaluate(() => window.__watchlistCurrent!.show(false));
  await page.evaluate(() => window.__watchlistCurrent!.show(true));
  await expect(
    watchlistDialog(page).getByLabel("Topic name", { exact: true }),
  ).toHaveValue("Unconfirmed retained draft");
  await watchlistDialog(page)
    .getByRole("button", { name: "Reload saved values", exact: true })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "Reload saved targeting",
    exact: true,
  });
  await confirm
    .getByRole("button", { name: "Discard edits and reload", exact: true })
    .click();
  await expect(confirm).not.toBeVisible();
  await expect(
    watchlistDialog(page).getByLabel("Topic name", { exact: true }),
  ).toHaveValue("Current targeting");
  await expect(
    watchlistDialog(page).getByRole("button", {
      name: "Save targeting",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(watchlistDialog(page).getByRole("alert")).toContainText(
    "this session will not resend it",
  );
  expect(writes).toBe(1);
  expect(fixture.unexpected).toEqual([]);
});

for (const backend of ["core", "intelligence"] as const)
  test(`${backend} late PUT cannot replace another client's editor`, async ({
    page,
  }) => {
    const fixture = await installCurrentWatchlist(page, backend);
    const dialog = await openCurrentWatchlist(page, backend);
    await dialog
      .getByLabel("Topic name", { exact: true })
      .fill("Previous client draft");
    const held = await heldWatchlistWrite(page, backend);
    await dialog
      .getByRole("button", { name: "Save targeting", exact: true })
      .click();
    await held.started;
    const replacement = "10000000-0000-4000-8000-000000000009";
    await page.route(`**/${watchlistPath(backend, replacement)}`, (route) =>
      json(
        route,
        backend === "core"
          ? {
              ...coreTargeting,
              tags: [
                { ...coreTargeting.tags[0], tag: "Replacement targeting" },
              ],
            }
          : {
              ...intelTargeting,
              clientId: replacement,
              topics: [
                { ...intelTargeting.topics[0], label: "Replacement targeting" },
              ],
            },
      ),
    );
    await page.evaluate(
      (id) => window.__watchlistCurrent!.client(id),
      replacement,
    );
    await expect(
      watchlistDialog(page).getByLabel("Topic name", { exact: true }),
    ).toHaveValue("Replacement targeting");
    held.release();
    await held.finished;
    await settleWatchlist(page);
    await expect(
      watchlistDialog(page).getByLabel("Topic name", { exact: true }),
    ).toHaveValue("Replacement targeting");
    await expect(
      page.getByRole("status", {
        name: "Synthetic Watchlist completed closes",
        includeHidden: true,
      }),
    ).toHaveText("0");
    expect(
      JSON.stringify(
        await page.evaluate(() => window.__watchlistCurrent!.snapshots()),
      ),
    ).not.toContain("Previous client draft");
    expect(held.bodies).toHaveLength(1);
    expect(fixture.unexpected).toEqual([]);
  });

test("a held client preflight cannot dispatch after same-callback identity interruption and restoration", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page);
  const dialog = await openCurrentWatchlist(page);
  let began!: () => void, release!: () => void;
  const started = new Promise<void>((resolve) => {
    began = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let hold = true;
  await page.route(`**/api/backend/core/clients/${clientId}`, async (route) => {
    if (!hold) return route.fallback();
    hold = false;
    began();
    await gate;
    return json(route, { ...client, tenantId: watchlistIdentity.tenant.id });
  });
  await dialog
    .getByRole("button", { name: "Save targeting", exact: true })
    .click();
  await started;
  await page.evaluate(() =>
    window.__watchlistCurrent!.invalidate("identity", true),
  );
  release();
  await settleWatchlist(page);
  expect(fixture.writes).toEqual([]);
  await expect(
    page.getByRole("status", {
      name: "Synthetic Watchlist completed closes",
      includeHidden: true,
    }),
  ).toHaveText("0");
  expect(fixture.unexpected).toEqual([]);
});
