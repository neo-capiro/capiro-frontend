import { test, expect, type Page } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import { trackerIdentity } from "../tracker-preference-fixtures";

const bill = {
  billId: "tx-2025-hb1",
  displayNum: "HB 1",
  title: "Synthetic original measure",
  stage: "committee",
  passageProbability: 0.17,
  matchedTags: ["Synthetic topic"],
  changeChip: null,
  terminalRisk: true,
  unread: false,
  hearingCount: 0,
  lastHearingSessionId: null,
  canonicalStatus: "In committee",
  latestActionText: "Original committee action",
  jurisdiction: "TX",
};
function board(cards = [bill]) {
  return {
    columns: [{ id: "committee", label: "In committee", cards }],
    total: cards.length,
    nextCursor: null,
    hasMore: false,
    withheld: 0,
  };
}
async function install(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route("**/core/me", (route) => json(route, trackerIdentity));
  await page.route("**/intelligence/clients/*/bills/*/hearings", (route) =>
    json(route, { count: 0, hearings: [] }),
  );
  return unexpected;
}
async function refresh(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(new Event("tracker-test-refresh-board")),
  );
}
async function openBill(page: Page) {
  await page.goto("/tracker-boundary.html?mode=board");
  await page.getByRole("button", { name: "HB 1", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "HB 1", exact: true });
  await expect(
    drawer.getByText("Original committee action", { exact: true }),
  ).toBeVisible();
  return drawer;
}

for (const status of [403, 503])
  test(`failed board refresh ${status} removes stale rows, counts and selected Updates`, async ({
    page,
  }) => {
    const unexpected = await install(page);
    let failed = false;
    await page.route("**/intelligence/clients/*/tracker/board*", (route) =>
      json(
        route,
        failed ? { message: "Synthetic board access failure" } : board(),
        failed ? status : 200,
      ),
    );
    const drawer = await openBill(page);
    failed = true;
    await refresh(page);
    await expect(drawer).not.toBeVisible();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByRole("cell", {
        name: "Synthetic original measure Terminal risk",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "HB 1", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("1 tracked bills", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("— tracked bills", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/No tracked bills yet/)).toHaveCount(0);
    failed = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "HB 1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "HB 1", exact: true }),
    ).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });

test("an open Updates view follows the latest successful record instead of a copied selection", async ({
  page,
}) => {
  const unexpected = await install(page);
  let current = bill;
  await page.route("**/intelligence/clients/*/tracker/board*", (route) =>
    json(route, board([current])),
  );
  const drawer = await openBill(page);
  current = {
    ...bill,
    title: "Updated synthetic measure",
    latestActionText: "Updated committee action",
    passageProbability: 0.42,
  };
  await refresh(page);
  await expect(
    drawer.getByText("Updated committee action", { exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByText("Updated synthetic measure", { exact: true }),
  ).toBeVisible();
  await expect(drawer.getByText("42% estimate", { exact: true })).toBeVisible();
  await expect(
    drawer.getByText("Original committee action", { exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("a removed selected bill closes Updates and does not reopen when that bill returns", async ({
  page,
}) => {
  const unexpected = await install(page);
  let cards = [bill];
  await page.route("**/intelligence/clients/*/tracker/board*", (route) =>
    json(route, board(cards)),
  );
  const drawer = await openBill(page);
  cards = [];
  await refresh(page);
  await expect(drawer).not.toBeVisible();
  await expect(page.getByText(/No tracked bills yet/)).toBeVisible();
  cards = [bill];
  await refresh(page);
  await expect(
    page.getByRole("button", { name: "HB 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "HB 1", exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

for (const transition of ["client", "actor"])
  test(`a late board read cannot populate a changed ${transition} context`, async ({
    page,
  }) => {
    const unexpected = await install(page);
    let release: (() => void) | undefined;
    let completed = false;
    let reads = 0;
    await page.route(
      "**/intelligence/clients/*/tracker/board*",
      async (route) => {
        reads++;
        if (reads === 1) {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          await json(route, board());
          completed = true;
          return;
        }
        return json(
          route,
          board([
            { ...bill, displayNum: "HB 2", title: "Current context measure" },
          ]),
        );
      },
    );
    await page.goto("/tracker-boundary.html?mode=board");
    await expect.poll(() => reads).toBe(1);
    if (transition === "client")
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("tracker-test-client", {
            detail: "10000000-0000-4000-8000-000000000002",
          }),
        ),
      );
    else
      await page.evaluate(
        (identity) =>
          window.dispatchEvent(
            new CustomEvent("tracker-test-identity", {
              detail: {
                ...identity,
                user: {
                  ...identity.user,
                  id: "another-user",
                  clerkUserId: "user_another",
                },
              },
            }),
          ),
        trackerIdentity,
      );
    await expect(
      page.getByRole("button", { name: "HB 2", exact: true }),
    ).toBeVisible();
    release?.();
    await expect.poll(() => completed).toBe(true);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(
      page.getByRole("button", { name: "HB 1", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("cell", {
        name: "Current context measure Terminal risk",
        exact: true,
      }),
    ).toBeVisible();
    expect(reads).toBe(2);
    expect(unexpected).toEqual([]);
  });

test("identity invalidation conceals selected board data before any new response", async ({
  page,
}) => {
  const unexpected = await install(page);
  await page.route("**/intelligence/clients/*/tracker/board*", (route) =>
    json(route, board()),
  );
  const drawer = await openBill(page);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("tracker-test-invalidate-identity")),
  );
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: "Synthetic original measure Terminal risk",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByText("1 tracked bills", { exact: true })).toHaveCount(
    0,
  );
  expect(unexpected).toEqual([]);
});
