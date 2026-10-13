import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import {
  activityAction,
  activityPath,
  activityReview,
  activityTimeline,
  activityWrite,
  chooseActivityPin,
  filterActivityOutAndBack,
  installAcceptanceActivity,
} from "./acceptance-activity-fixtures";

const uncertainResponses = [
  { name: "503 without an observed change", status: 503, applied: false },
  { name: "503 after the synthetic change", status: 503, applied: true },
  {
    name: "wrong-client receipt",
    status: 200,
    receiptOverride: { clientId: "other-client" },
  },
  {
    name: "wrong-tenant receipt",
    status: 200,
    receiptOverride: { tenantId: "other-tenant" },
  },
  {
    name: "wrong-activity receipt",
    status: 200,
    receiptOverride: { id: "90000000-0000-4000-8000-000000000099" },
  },
];

for (const response of uncertainResponses)
  test(`activity filtering retains uncertainty after ${response.name} until deliberate review`, async ({
    page,
  }) => {
    const fixture = await installAcceptanceActivity(page, response);
    await page.goto(`/portfolio/${clientId}`);
    await expect(activityAction(page)).toBeEnabled();
    await chooseActivityPin(page);
    await expect(activityReview(page)).toBeVisible();
    expect(fixture.writes).toEqual([activityWrite(true)]);

    await filterActivityOutAndBack(page);
    // Filtering is a local view change, not a new write intent or read review.
    await expect(activityReview(page)).toBeVisible();
    await activityAction(page).click();
    const pin = page.getByRole("menuitem", {
      name: response.applied ? "Unpin note" : "Pin note",
      exact: true,
    });
    await expect(pin).toHaveAttribute("data-disabled", "");
    await page.keyboard.press("Escape");
    expect(fixture.writes).toEqual([activityWrite(true)]);

    const readsBeforeReview = fixture.reads.length;
    await activityReview(page).click();
    await expect(
      activityTimeline(page).getByText("Latest saved activity", {
        exact: true,
      }),
    ).toBeVisible();
    expect(fixture.reads.length).toBeGreaterThan(readsBeforeReview);
    expect(fixture.writes).toEqual([activityWrite(true)]);
    await chooseActivityPin(page, !response.applied);
    await expect(activityAction(page)).toBeEnabled();
    await expect
      .poll(() => fixture.writes)
      .toEqual([activityWrite(true), activityWrite(!response.applied)]);
    await expect(
      activityTimeline(page).getByText("★ Pinned", { exact: true }),
    ).toHaveCount(response.applied ? 0 : 1);
    await expect(activityReview(page)).toHaveCount(0);
    expect(
      fixture.reads.every((path) => path === `${activityPath}?limit=500`),
    ).toBe(true);
    expect(fixture.unexpected).toEqual([]);
  });

test("activity definite refusal remains retryable after filtering", async ({
  page,
}) => {
  const fixture = await installAcceptanceActivity(page, { status: 400 });
  await page.goto(`/portfolio/${clientId}`);
  await expect(activityAction(page)).toBeEnabled();
  await chooseActivityPin(page);
  await expect(activityTimeline(page).getByRole("alert")).toContainText(
    "Synthetic first activity response",
  );
  await expect(activityReview(page)).toHaveCount(0);
  await filterActivityOutAndBack(page);
  expect(fixture.writes).toEqual([activityWrite(true)]);
  await chooseActivityPin(page);
  await expect(
    activityTimeline(page).getByText("★ Pinned", { exact: true }),
  ).toBeVisible();
  expect(fixture.writes).toEqual([activityWrite(true), activityWrite(true)]);
  expect(fixture.unexpected).toEqual([]);
});

test("activity dispatched pending write stays fenced through filtering and uncertain completion", async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fixture = await installAcceptanceActivity(page, { status: 503, held });
  await page.goto(`/portfolio/${clientId}`);
  await expect(activityAction(page)).toBeEnabled();
  await chooseActivityPin(page);
  await expect.poll(() => fixture.writes.length).toBe(1);
  try {
    await expect(activityAction(page)).toBeDisabled();
    await filterActivityOutAndBack(page);
    // A cancelled response can become unknown; neither state permits dispatch.
    await expect
      .poll(
        async () =>
          (await activityAction(page).isDisabled()) ||
          (await activityReview(page).isVisible()),
      )
      .toBe(true);
    if (await activityAction(page).isEnabled()) {
      await activityAction(page).click();
      await expect(
        page.getByRole("menuitem", { name: "Pin note", exact: true }),
      ).toHaveAttribute("data-disabled", "");
      await page.keyboard.press("Escape");
    }
    expect(fixture.writes).toEqual([activityWrite(true)]);
  } finally {
    release();
  }
  await expect(activityReview(page)).toBeVisible();
  expect(fixture.writes).toEqual([activityWrite(true)]);
  expect(fixture.unexpected).toEqual([]);
});

test("activity readonly actor cannot acquire write eligibility by filtering", async ({
  page,
}) => {
  const fixture = await installAcceptanceActivity(page, { status: 503 });
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: { id: "readonly-user", email: "readonly@example.test" },
      tenant: { id: "tenant-test", name: "Synthetic tenant" },
      role: "basic_user",
    }),
  );
  await page.goto(`/portfolio/${clientId}`);
  await expect(activityAction(page)).toBeDisabled();
  await filterActivityOutAndBack(page);
  await expect(activityAction(page)).toBeDisabled();
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("activity expired preflight cannot dispatch a write after filter reappearance", async ({
  page,
}) => {
  const fixture = await installAcceptanceActivity(page, { status: 503 });
  await page.goto(`/portfolio/${clientId}`);
  await expect(activityAction(page)).toBeEnabled();
  await filterActivityOutAndBack(page);
  await page.route(`**${activityPath}?limit=500`, (route) =>
    json(route, { message: "Synthetic expired session" }, 401),
  );
  await chooseActivityPin(page);
  await expect(
    page.getByRole("heading", { name: "Your session expired", exact: true }),
  ).toBeVisible();
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});
