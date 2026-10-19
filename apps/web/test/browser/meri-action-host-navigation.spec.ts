import { test, expect } from "@playwright/test";
import {
  actionHostFixture,
  actionUrl,
  actionContext,
  actionClock,
  actionClient,
  wire,
  connectActionHost,
  selectAction,
  reviewAction,
  expectActionIsolation,
} from "./meri-action-host-fixtures";

for (const state of ["unknown", "in-flight"] as const) {
  test(`Meri ${state} preparation stays fenced across cross-mode Back/Forward and reconnect`, async ({
    page,
  }) => {
    const fixture = await actionHostFixture(page);
    fixture.use("query");
    fixture.use("draft");
    fixture.use("prepare-unknown");
    await page.goto(actionUrl());
    await connectActionHost(page);
    await selectAction(page);
    await reviewAction(page);
    const pending =
      state === "in-flight"
        ? fixture.hold("prepare", { json: wire("prepare").response })
        : null;
    await page
      .getByRole("button", { name: "Prepare approval proposal", exact: true })
      .click();
    if (pending) {
      await pending.entered;
      await expect(page.getByRole("status")).toContainText(
        "Request in progress: prepare",
      );
    } else {
      await expect(
        page.getByRole("heading", { name: "Outcome uncertain", exact: true }),
      ).toBeVisible();
    }
    expect(fixture.calls("prepare")).toHaveLength(1);
    await page
      .getByRole("navigation", { name: "Product modes" })
      .getByRole("link", { name: "Modules", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/modules\\?clientId=${actionContext.clientId}$`),
    );
    await expect(
      page.getByRole("heading", {
        name: "Everything in Capiro, across the whole firm",
      }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(actionUrl());
    await expect(
      page.getByRole("button", { name: "Connect action service" }),
    ).toBeEnabled();
    await expect(page.getByLabel("Task title", { exact: true })).toHaveCount(0);
    expect(fixture.calls("session")).toHaveLength(1);
    await connectActionHost(page);
    await page
      .getByRole("button", { name: "Find recommendations", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Outcome uncertain", exact: true }),
    ).toBeVisible();
    expect(fixture.calls("query")).toHaveLength(1);
    expect(fixture.calls("prepare")).toHaveLength(1);
    if (pending) await pending.release();
    await expect(
      page.getByRole("region", { name: "Immutable approval proposal" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Task creation confirmed" }),
    ).toHaveCount(0);
    await page.goForward();
    await expect(
      page.getByRole("heading", {
        name: "Everything in Capiro, across the whole firm",
      }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("button", { name: "Connect action service" }),
    ).toBeEnabled();
    await connectActionHost(page);
    await page
      .getByRole("button", { name: "Find recommendations", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Outcome uncertain", exact: true }),
    ).toBeVisible();
    expect(fixture.calls("session")).toHaveLength(3);
    expect(fixture.calls("query")).toHaveLength(1);
    expect(fixture.calls("draft")).toHaveLength(1);
    expect(fixture.calls("prepare")).toHaveLength(1);
    expect(fixture.calls("execute")).toHaveLength(0);
    expectActionIsolation(fixture);
  });
}

test("same-client verification refetch hides actions while retaining the private draft for a current success", async ({
  page,
}) => {
  const fixture = await actionHostFixture(page);
  fixture.use("query");
  await page.goto(actionUrl());
  await connectActionHost(page);
  await selectAction(page);
  await page
    .getByLabel("Task title", { exact: true })
    .fill("Synthetic draft retained for this same client");
  const before = fixture.actions().length;
  const held = fixture.hold("client", { json: actionClient });
  // Browser reconnect refreshes the stale canonical selected-client query.
  // No direct query-cache access, private refetch callback, or timer sleep.
  await page.clock.setSystemTime(new Date(actionClock + 31_000));
  await page.evaluate(() => {
    dispatchEvent(new Event("offline"));
    dispatchEvent(new Event("online"));
  });
  await held.entered;
  await expect(page.getByLabel("Task title", { exact: true })).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Review draft", exact: true }),
  ).toBeHidden();
  expect(fixture.actions()).toHaveLength(before);
  await held.release();
  await expect(page.getByLabel("Task title", { exact: true })).toHaveValue(
    "Synthetic draft retained for this same client",
  );
  await expect(page.getByLabel("Task title", { exact: true })).toBeEditable();
  await expect(
    page.getByRole("button", { name: "Review draft", exact: true }),
  ).toBeEnabled();
  expect(fixture.calls("client")).toHaveLength(2);
  expect(fixture.calls("session")).toHaveLength(1);
  expect(fixture.calls("query")).toHaveLength(1);
  expect(fixture.calls("draft")).toHaveLength(0);
  expectActionIsolation(fixture);
});
