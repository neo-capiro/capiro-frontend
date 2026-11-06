import { test, expect, type Page } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import { trackerIdentity } from "../tracker-preference-fixtures";
import {
  impactRow,
  impactPage,
  impactDetail,
  syntheticClient,
  otherSyntheticClient,
} from "../legiwatch-impact-fixtures";

const bill = impactRow({
  displayNum: "HB 1",
  title: "Synthetic original measure",
  latestActionText: "Original committee action",
});
async function install(page: Page, current: () => typeof bill = () => bill) {
  const unexpected = await installFixtures(page);
  await page.route("**/core/me", (route) => json(route, trackerIdentity));
  await page.route("**/api/capiro/legiwatch.impact?**", (route) =>
    json(route, impactDetail(current())),
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
  test(`failed tracker refresh ${status} removes stale rows, counts and selected details`, async ({
    page,
  }) => {
    const unexpected = await install(page);
    let failed = false;
    await page.route("**/api/capiro/legiwatch.tracker?**", (route) =>
      json(
        route,
        failed
          ? { message: "Synthetic tracker access failure" }
          : impactPage([bill]),
        failed ? status : 200,
      ),
    );
    const drawer = await openBill(page);
    failed = true;
    await refresh(page);
    await expect(drawer).not.toBeVisible();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "HB 1", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Showing 1 of 1 tracked entries.")).toHaveCount(
      0,
    );
    await expect(
      page.getByText("No tracked bills match this view."),
    ).toHaveCount(0);
    failed = false;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "HB 1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "HB 1", exact: true }),
    ).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });
test("an open detail follows the latest successful record instead of a copied selection", async ({
  page,
}) => {
  let current = bill;
  const unexpected = await install(page, () => current);
  await page.route("**/api/capiro/legiwatch.tracker?**", (route) =>
    json(route, impactPage([current])),
  );
  const drawer = await openBill(page);
  current = {
    ...bill,
    title: "Updated synthetic measure",
    latestActionText: "Updated committee action",
  };
  await refresh(page);
  await expect(
    drawer.getByText("Updated committee action", { exact: true }),
  ).toBeVisible();
  await expect(drawer).toContainText("Updated synthetic measure");
  await expect(
    drawer.getByText("Original committee action", { exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});
test("a removed selected bill closes details and does not reopen when it returns", async ({
  page,
}) => {
  const unexpected = await install(page);
  let rows = [bill];
  await page.route("**/api/capiro/legiwatch.tracker?**", (route) =>
    json(route, impactPage(rows)),
  );
  const drawer = await openBill(page);
  rows = [];
  await refresh(page);
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByText("No tracked bills match this view."),
  ).toBeVisible();
  rows = [bill];
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
  test(`a late tracker read cannot populate a changed ${transition} context`, async ({
    page,
  }) => {
    const unexpected = await install(page);
    let release: (() => void) | undefined,
      completed = false,
      reads = 0;
    await page.route("**/api/capiro/legiwatch.tracker?**", async (route) => {
      const input = JSON.parse(
        new URL(route.request().url()).searchParams.get("input") ?? "{}",
      );
      reads++;
      if (reads === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        await json(route, impactPage([bill]));
        completed = true;
        return;
      }
      return json(
        route,
        impactPage([
          impactRow({
            clientId: input.query?.clientId ?? syntheticClient,
            displayNum: "HB 2",
            title: "Current context measure",
          }),
        ]),
      );
    });
    await page.goto("/tracker-boundary.html?mode=board");
    await expect.poll(() => reads).toBe(1);
    if (transition === "client")
      await page.evaluate(
        (clientId) =>
          window.dispatchEvent(
            new CustomEvent("tracker-test-client", { detail: clientId }),
          ),
        otherSyntheticClient,
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
    await expect(
      page.getByRole("button", { name: "HB 1", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Current context measure", { exact: true }),
    ).toBeVisible();
    expect(reads).toBe(2);
    expect(unexpected).toEqual([]);
  });
test("identity invalidation conceals selected tracker data before any new response", async ({
  page,
}) => {
  const unexpected = await install(page);
  await page.route("**/api/capiro/legiwatch.tracker?**", (route) =>
    json(route, impactPage([bill])),
  );
  const drawer = await openBill(page);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("tracker-test-invalidate-identity")),
  );
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "HB 1", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Showing 1 of 1 tracked entries.")).toHaveCount(
    0,
  );
  expect(unexpected).toEqual([]);
});

test("a pending context write cannot restore a drawer after identity invalidation", async ({
  page,
}) => {
  await install(page);
  await page.route("**/api/capiro/legiwatch.tracker?**", (route) =>
    json(route, impactPage([bill])),
  );
  let release!: () => void;
  let writing = false;
  await page.route("**/api/capiro/legiwatch.bill.context", async (route) => {
    writing = true;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await json(route, impactDetail({ ...bill, note: "Late saved context" }));
  });
  const drawer = await openBill(page);
  await drawer.getByRole("tab", { name: "Position and notes" }).click();
  await drawer.getByLabel("Analyst note").fill("Late saved context");
  await drawer.getByRole("button", { name: "Save client context" }).click();
  await expect.poll(() => writing).toBe(true);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("tracker-test-invalidate-identity")),
  );
  await expect(drawer).toHaveCount(0);
  release();
  await expect(
    page.getByText("Late saved context", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "HB 1", exact: true }),
  ).toHaveCount(0);
});

test("empty trackers use the canonical owner and close dialogs when that owner changes", async ({
  page,
}) => {
  await install(page);
  let owner: "core" | "intelligence" = "intelligence";
  await page.route("**/api/capiro/legiwatch.tracker?**", (route) =>
    json(route, { ...impactPage([]), trackerBackend: owner }),
  );
  await page.goto("/tracker-boundary.html?mode=board&backend=core");
  await page.getByRole("button", { name: "Track bill", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Track a bill",
    exact: true,
  });
  await expect(
    dialog.getByRole("group", { name: "Jurisdictions" }),
  ).toBeVisible();
  owner = "core";
  await refresh(page);
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Track bill", exact: true }).click();
  await expect(dialog).toContainText("Federal bills in the current Congress.");
  await expect(
    dialog.getByRole("group", { name: "Jurisdictions" }),
  ).toHaveCount(0);
});
