import { test, expect } from "@playwright/test";
import {
  holdCalendarSyncResponse,
  installCalendarSyncFixtures,
  syncMicrosoftId,
} from "./calendar-sync-fixtures";
async function open(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Open calendar sync", exact: true })
    .click();
  return page.getByRole("dialog");
}
test("explicit Microsoft calendar-only completion with truthful processing receipt", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page);
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account", exact: true })
    .selectOption(syncMicrosoftId);
  expect(state.writes).toHaveLength(0);
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .click();
  await expect(dialog.getByLabel("Calendar sync result")).toContainText(
    "3 scanned · 2 matched",
  );
  await expect(dialog).toContainText("not newly created meetings");
  expect(state.writes).toEqual([
    {
      url: `/api/backend/core/engagement/integrations/microsoft/${syncMicrosoftId}/calendar-commands`,
      method: "POST",
      body: expect.any(String),
    },
  ]);
  expect(state.unexpected).toEqual([]);
});
test("reviewed window and partial progress continue using the same saved request", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page, { hasMore: true });
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account", exact: true })
    .selectOption(syncMicrosoftId);
  await dialog.getByRole("checkbox").check();
  await expect(dialog).toContainText(
    "2026-10-01T00:00:00Z → 2026-11-01T00:00:00Z",
  );
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .click();
  await expect(dialog).toContainText("Calendar import is pending");
  await expect(dialog).toContainText("12 pages");
  const original = JSON.parse(state.writes[0]!.body!);
  expect(original.range).toEqual({
    from: "2026-10-01T00:00:00.000Z",
    to: "2026-11-01T00:00:00.000Z",
  });
  expect(state.writes).toHaveLength(1);
  state.pending = false;
  await dialog.getByRole("button", { name: "Continue saved import" }).click();
  await expect(dialog).toContainText("Calendar sync completed");
  expect(JSON.parse(state.writes[1]!.body!)).toEqual(original);
  await dialog.getByRole("button", { name: "Review another sync" }).click();
  await expect(
    dialog.getByRole("combobox", { name: "Connected account" }),
  ).toBeVisible();
  expect(state.commandReads).toBe(1);
  expect(state.writes).toHaveLength(2);
});
test("Google does not offer the Microsoft range and excludes mail", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page);
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account", exact: true })
    .selectOption({ label: "Google · google@example.test" });
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  await expect(dialog).toContainText(
    "does not select the displayed date range",
  );
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .click();
  await expect(dialog.getByLabel("Calendar sync result")).toBeVisible();
  expect(state.writes[0]?.url).toContain("/google/");
  expect(JSON.parse(state.writes[0]!.body!).range).toBeNull();
});
test("unknown result survives close, route remount and returning to the initiating actor", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page, {
    responseStatus: 400,
  });
  await page.goto("/__test/calendar-sync");
  let dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account", exact: true })
    .selectOption(syncMicrosoftId);
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .click();
  await expect(dialog).toContainText("Sync outcome unknown");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Unmount sync" }).click();
  dialog = await open(page);
  await expect(dialog).toContainText("new request stays");
  await expect(
    dialog.getByRole("button", { name: "Import calendar meetings" }),
  ).toHaveCount(0);
  await page.evaluate(() => window.__syncActor?.(true));
  await expect(dialog).not.toContainText("new request stays");
  await page.evaluate(() => window.__syncActor?.(false));
  await expect(dialog).toContainText("new request stays");
  expect(state.writes).toHaveLength(1);
});
test("Cancel stops waiting and cannot erase the dispatched fence", async ({
  page,
}, testInfo) => {
  const response = holdCalendarSyncResponse();
  const state = await installCalendarSyncFixtures(page, {
    responseGate: response.promise,
  });
  try {
    await page.goto("/__test/calendar-sync");
    let dialog = await open(page);
    await dialog
      .getByRole("combobox", { name: "Connected account", exact: true })
      .selectOption(syncMicrosoftId);
    await dialog
      .getByRole("button", { name: "Import calendar meetings" })
      .click();
    await expect(dialog).toHaveAccessibleName("Syncing calendar");
    await expect(dialog).toContainText("does not cancel the calendar import");
    await page.screenshot({
      path: testInfo.outputPath("calendar-sync-desktop-light.png"),
    });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    dialog = await open(page);
    await expect(dialog).toContainText("new request stays");
    expect(state.writes).toHaveLength(1);
  } finally {
    response.release();
  }
});
test("identity invalidation during preflight prevents POST", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page, {
    preflightDelay: 350,
  });
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account", exact: true })
    .selectOption(syncMicrosoftId);
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .click();
  await expect.poll(() => state.reads).toBeGreaterThan(1);
  await page.evaluate(() => window.__syncInvalidate?.());
  await expect(dialog.getByRole("alert")).toContainText(
    "session or permissions changed",
  );
  expect(state.writes).toEqual([]);
});
test("identity invalidation after dispatch freezes rather than accepting late success", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page, { delay: 400 });
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account", exact: true })
    .selectOption(syncMicrosoftId);
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .click();
  await expect.poll(() => state.writes.length).toBe(1);
  await page.evaluate(() => window.__syncInvalidate?.());
  await expect(dialog).toContainText("Sync outcome unknown");
  await expect(dialog.getByLabel("Calendar sync result")).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
});
test("disabled runtime and unavailable connection cannot start sync", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page, { enabled: false });
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await expect(
    dialog.getByRole("button", { name: "Import calendar meetings" }),
  ).toBeDisabled();
  await expect(dialog).toContainText("enabled external actions");
  expect(state.writes).toEqual([]);
});
test("mobile dark pending matches dialog geometry and keyboard closure", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  const response = holdCalendarSyncResponse();
  const state = await installCalendarSyncFixtures(page, {
    responseGate: response.promise,
  });
  try {
    await page.goto("/__test/calendar-sync");
    const dialog = await open(page);
    await dialog
      .getByRole("combobox", { name: "Connected account", exact: true })
      .selectOption(syncMicrosoftId);
    await dialog
      .getByRole("button", { name: "Import calendar meetings" })
      .click();
    await expect(dialog).toHaveAccessibleName("Syncing calendar");
    await expect(dialog).toHaveCSS("padding", "16px");
    await expect(dialog).toHaveCSS("background-color", "rgb(27, 27, 27)");
    expect((await dialog.boundingBox())?.width).toBe(358);
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await document.fonts.load('14px "Geist Test"')).length,
        ),
      )
      .toBeGreaterThan(0);
    await page.screenshot({
      path: testInfo.outputPath("calendar-sync-mobile-dark.png"),
    });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    expect(state.writes).toHaveLength(1);
  } finally {
    response.release();
  }
});

test("actual actor change while dispatched hides late receipt and preserves original actor fence", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page, { delay: 500 });
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account", exact: true })
    .selectOption(syncMicrosoftId);
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .click();
  await expect.poll(() => state.writes.length).toBe(1);
  await page.evaluate(() => window.__syncActor?.(true));
  await expect(dialog.getByLabel("Calendar sync result")).toHaveCount(0);
  await page.evaluate(() => window.__syncActor?.(false));
  await expect(dialog).toContainText("Sync outcome unknown");
  expect(state.writes).toHaveLength(1);
});

test("rapid duplicate consent does not dispatch a second provider request", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page, {
    preflightDelay: 300,
  });
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account", exact: true })
    .selectOption(syncMicrosoftId);
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .dblclick();
  await expect(dialog.getByLabel("Calendar sync result")).toBeVisible();
  expect(state.writes).toHaveLength(1);
});

test("disconnected accounts are honestly unavailable without reconnect controls", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page, {
    status: "needs_configuration",
  });
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await expect(dialog).toContainText(
    "No connected Microsoft or Google calendar is available",
  );
  await expect(
    dialog.getByRole("button", { name: "Import calendar meetings" }),
  ).toBeDisabled();
  await expect(dialog.getByRole("link")).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("identity invalidation while idle immediately disables consent with no request", async ({
  page,
}) => {
  const state = await installCalendarSyncFixtures(page);
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account", exact: true })
    .selectOption(syncMicrosoftId);
  await expect(
    dialog.getByRole("button", { name: "Import calendar meetings" }),
  ).toBeEnabled();
  await page.evaluate(() => window.__syncInvalidate?.());
  await expect(
    dialog.getByRole("button", { name: "Import calendar meetings" }),
  ).toBeDisabled();
  expect(state.writes).toEqual([]);
});

test("hard reload hydrates without POST and checks a lost acknowledgement while external actions are disabled", async ({
  page,
}) => {
  const options = { responseStatus: 400, enabled: true };
  const state = await installCalendarSyncFixtures(page, options);
  await page.goto("/__test/calendar-sync");
  let dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account" })
    .selectOption(syncMicrosoftId);
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .click();
  await expect(dialog).toContainText("Sync outcome unknown");
  const original = JSON.parse(state.writes[0]!.body!);
  options.enabled = false;
  await page.reload();
  dialog = await open(page);
  await expect(dialog).toContainText("Sync outcome unknown");
  expect(state.writes).toHaveLength(1);
  expect(state.commandReads).toBe(0);
  await expect(
    dialog.getByRole("button", { name: "Continue saved import" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Check saved outcome" }).click();
  await expect(dialog).toContainText("Calendar sync completed");
  expect(state.receipts.has(original.requestId)).toBe(true);
  expect(state.writes).toHaveLength(1);
  expect(state.commandReads).toBe(1);
  await dialog.getByRole("button", { name: "Review another sync" }).click();
  await expect(
    dialog.getByRole("button", { name: "Import calendar meetings" }),
  ).toBeDisabled();
});

test("a previously displayed receipt is hidden immediately when identity is invalidated", async ({
  page,
}) => {
  await installCalendarSyncFixtures(page);
  await page.goto("/__test/calendar-sync");
  const dialog = await open(page);
  await dialog
    .getByRole("combobox", { name: "Connected account" })
    .selectOption(syncMicrosoftId);
  await dialog
    .getByRole("button", { name: "Import calendar meetings" })
    .click();
  await expect(dialog.getByLabel("Calendar sync result")).toBeVisible();
  await page.evaluate(() => window.__syncInvalidate?.());
  await expect(dialog.getByLabel("Calendar sync result")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Review another sync" }),
  ).toBeDisabled();
});
