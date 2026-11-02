import { test, expect, type Page } from "@playwright/test";
import { USER_PREFERENCE_DEFAULTS } from "@capiro/meri-client/user-preferences";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { listResponse, run } from "../../tests/meri-runs-fixtures";

for (const width of [1440, 390]) {
  test(`presentation Updates disclosures preserve required/read state at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1040 });
    const fixture = await fixtures(page, false, true, true);
    const readWrites: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes("/api/meri/notifications")
      )
        readWrites.push(request.url());
    });
    await page.goto("/meri-notifications.html");
    const memory = page.locator('li[data-source="memory-review"]');
    await expect(
      memory.getByRole("heading", { name: "Memory review update" }),
    ).toBeVisible();
    await expect(
      memory.getByText("Memory review · Required notice · Unread"),
    ).toBeVisible();
    await expect(memory.locator("time")).toHaveAttribute(
      "datetime",
      "2026-10-27T10:00:00.000Z",
    );
    await expect(memory.locator("time")).toContainText("UTC");
    const runRow = page.locator('li[data-source="run-approval"]');
    await expect(runRow.getByText(/Read status not tracked/)).toBeVisible();
    await expect(runRow.getByText(/current approval authority/)).toBeVisible();
    await expect(
      runRow.getByRole("button", { name: "Mark read", exact: true }),
    ).toHaveCount(0);
    const before = { ...fixture.counts };
    await memory.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(memory.locator("details")).toHaveAttribute("open", "");
    await expect(
      memory.getByText("user:synthetic-key:learning-signal", { exact: true }),
    ).toBeVisible();
    expect(fixture.counts).toEqual(before);
    expect(fixture.saves()).toBe(0);
    expect(readWrites).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`updates-${width}.png`),
      fullPage: true,
    });
  });
}

async function fixtures(
  page: Page,
  holdFirst = false,
  waitingRun = false,
  machineTitle = false,
) {
  await onlyLocalRequests(page);
  const counts = { memory: 0, runs: 0, preferences: 0 };
  let account = "A";
  let revision = 1;
  let preferences = USER_PREFERENCE_DEFAULTS;
  let saves = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const actor = () =>
    account === "A"
      ? testIdentity.user.id
      : "10000000-0000-4000-8000-000000000002";
  await operationFixtures(page, {
    "me.read": () => ({
      ...testIdentity,
      user: { ...testIdentity.user, id: actor() },
    }),
  });
  const document = () => ({
    owner: { tenantId: testIdentity.tenant.id, actorId: actor() },
    revision,
    preferences,
    modelCatalog: {
      defaultSelection: { provider: "bedrock", modelId: "m-1", effort: null },
      models: [
        {
          provider: "bedrock",
          modelId: "m-1",
          label: "Synthetic",
          efforts: [null],
          available: true,
          unavailableReason: null,
        },
      ],
    },
  });
  await page.route("**/api/settings/user/read", (route) => {
    counts.preferences += 1;
    return route.fulfill({ json: document() });
  });
  await page.route("**/api/settings/user/save", (route) => {
    const request = route.request().postDataJSON();
    expect(request.expectedRevision).toBe(revision);
    saves += 1;
    preferences = request.preferences;
    revision += 1;
    return route.fulfill({ json: document() });
  });
  await page.route("**/api/conversations/runs/list", (route) => {
    counts.runs += 1;
    const request = route.request().postDataJSON();
    expect(request.status).toBe("all");
    return route.fulfill({
      json: {
        ...listResponse,
        status: request.status,
        scope: request.scope,
        runs: waitingRun ? [{ ...run, state: "waiting-for-approval" }] : [],
      },
    });
  });
  await page.route("**/api/meri/notifications?*", async (route) => {
    const ordinal = ++counts.memory;
    const requestedAccount = account;
    if (holdFirst && ordinal === 1) await held;
    await route
      .fulfill({
        json: {
          schemaVersion: "meri.memory-notifications/1",
          enabled: true,
          items: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              reviewRequestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              candidateId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              clientId: null,
              eventType: "review_assigned",
              title: machineTitle
                ? "user:synthetic-key:learning-signal"
                : `Account ${requestedAccount} assignment`,
              readAt: null,
              createdAt: "2026-10-27T10:00:00.000Z",
            },
          ],
          nextCursor: null,
        },
      })
      .catch(() => undefined);
  });
  return {
    counts,
    release,
    saves: () => saves,
    changeAccount: () => {
      account = "B";
    },
  };
}

test("mounted Updates host settles and preference refresh never refetches its feeds", async ({
  page,
}) => {
  const fixture = await fixtures(page);
  await page.goto("/meri-notifications.html");
  await expect(
    page.getByRole("heading", { name: "Account A assignment", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load current preferences", exact: true }),
  ).toBeEnabled();
  expect(fixture.counts).toEqual({ memory: 1, runs: 1, preferences: 1 });
  await page
    .getByRole("button", { name: "Load current preferences", exact: true })
    .click();
  await expect.poll(() => fixture.counts.preferences).toBe(2);
  await expect(
    page.getByRole("button", { name: "Load current preferences", exact: true }),
  ).toBeEnabled();
  expect(fixture.counts.memory).toBe(1);
  expect(fixture.counts.runs).toBe(1);
  await page
    .getByRole("button", { name: "Refresh updates", exact: true })
    .click();
  await expect.poll(() => fixture.counts.memory).toBe(2);
  await expect.poll(() => fixture.counts.runs).toBe(2);
});

test("mounted account replacement discards a late old-account feed", async ({
  page,
}) => {
  const fixture = await fixtures(page, true);
  await page.goto("/meri-notifications.html");
  await expect.poll(() => fixture.counts.memory).toBe(1);
  fixture.changeAccount();
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "second-test-user",
          sessionId: "second-test-session",
        },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Account B assignment", exact: true }),
  ).toBeVisible();
  fixture.release();
  await expect(
    page.getByRole("heading", { name: "Account A assignment", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Account B assignment", exact: true }),
  ).toBeVisible();
});

test("development strict-effect reattachment still produces a usable current feed", async ({
  page,
}) => {
  const fixture = await fixtures(page);
  await page.goto("/meri-notifications.html?strict=1");
  await expect(
    page.getByRole("heading", { name: "Account A assignment", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load current preferences", exact: true }),
  ).toBeEnabled();
  expect(fixture.counts.memory).toBeLessThanOrEqual(2);
  expect(fixture.counts.runs).toBeLessThanOrEqual(2);
});

test("saved approval preference hides only the optional waiting-run notice", async ({
  page,
}) => {
  const fixture = await fixtures(page, false, true);
  await page.goto("/meri-notifications.html");
  await expect(
    page.getByRole("heading", {
      name: "Run waiting for approval",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/does not establish that you can approve/),
  ).toBeVisible();
  const toggle = page.getByRole("button", {
    name: "Approval requests",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(
    page.getByText(
      "Save accepted. Read back current preferences to confirm the stored revision.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check current preferences", exact: true })
    .click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("heading", {
      name: "Run waiting for approval",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Account A assignment", exact: true }),
  ).toBeVisible();
  expect(fixture.saves()).toBe(1);
  expect(fixture.counts.runs).toBe(1);
  expect(fixture.counts.memory).toBe(1);
});
