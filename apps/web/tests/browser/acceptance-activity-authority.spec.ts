import { expect, test, type Page } from "@playwright/test";
import {
  activityAction,
  activityPath,
  activityReview,
  activityWrite,
  chooseActivityPin,
  filterActivityOutAndBack,
  installAcceptanceActivity,
} from "./acceptance-activity-fixtures";

const snapshot = (page: Page) =>
  page.evaluate(() => window.__acceptanceActivityAuthority!.snapshot());

async function expectSettled(page: Page) {
  await expect
    .poll(async () => {
      const state = await snapshot(page);
      return [state.pendingMutations, state.pendingQueries];
    })
    .toEqual([0, 0]);
}

for (const boundary of ["actor", "tenant"] as const)
  test(`a dispatched activity write cannot invalidate the replacement ${boundary}'s feed`, async ({
    page,
  }) => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fixture = await installAcceptanceActivity(page, {
      status: 503,
      held,
    });
    await page.goto("/__test/acceptance-activity-authority");
    await expect(activityAction(page)).toBeEnabled();
    await chooseActivityPin(page);
    await expect.poll(() => fixture.writes.length).toBe(1);
    await expect
      .poll(async () => (await snapshot(page)).pendingMutations)
      .toBe(1);
    const before = await snapshot(page);
    const readsBefore = fixture.reads.length;
    try {
      await page.evaluate(
        (value) => window.__acceptanceActivityAuthority!.replaceIdentity(value),
        boundary,
      );
      await expect(
        page.getByRole("status", { name: "Synthetic activity actor" }),
      ).toHaveText(
        boundary === "actor"
          ? "replacement-user:tenant-test"
          : "user-test:replacement-tenant",
      );
      // Aborting the obsolete request must settle the mutation. Observe the
      // actual cache lifetime before asserting absence of a late refresh.
      await expectSettled(page);
      expect((await snapshot(page)).invalidations).toBe(before.invalidations);
      expect(fixture.reads.length).toBe(readsBefore);
      await expect(activityAction(page)).toBeEnabled();
      await expect(activityReview(page)).toHaveCount(0);
      expect(fixture.writes).toEqual([activityWrite(true)]);
    } finally {
      release();
    }
    await page.evaluate(() =>
      window.__acceptanceActivityAuthority!.replaceIdentity("restore"),
    );
    await expect(activityReview(page)).toBeVisible();
    expect(fixture.writes).toEqual([activityWrite(true)]);
    expect(
      fixture.reads.every((path) => path === `${activityPath}?limit=500`),
    ).toBe(true);
    expect(fixture.unexpected).toEqual([]);
  });

test("same-actor filtering still refreshes a dispatched activity write without replay", async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fixture = await installAcceptanceActivity(page, { status: 503, held });
  await page.goto("/__test/acceptance-activity-authority");
  await expect(activityAction(page)).toBeEnabled();
  await chooseActivityPin(page);
  await expect.poll(() => fixture.writes.length).toBe(1);
  await expect
    .poll(async () => (await snapshot(page)).pendingMutations)
    .toBe(1);
  const before = await snapshot(page);
  const readsBefore = fixture.reads.length;
  try {
    await filterActivityOutAndBack(page);
    await expectSettled(page);
    expect((await snapshot(page)).invalidations).toBeGreaterThan(
      before.invalidations,
    );
    expect(fixture.reads.length).toBeGreaterThan(readsBefore);
    await expect(activityReview(page)).toBeVisible();
    await activityAction(page).click();
    await expect(
      page.getByRole("menuitem", { name: "Pin note", exact: true }),
    ).toHaveAttribute("data-disabled", "");
    await page.keyboard.press("Escape");
    expect(fixture.writes).toEqual([activityWrite(true)]);
  } finally {
    release();
  }
  expect(
    fixture.reads.every((path) => path === `${activityPath}?limit=500`),
  ).toBe(true);
  expect(fixture.unexpected).toEqual([]);
});
