import { expect, test, type Page } from "@playwright/test";
import {
  client,
  clientId,
  objective,
  objectiveId,
  installFixtures,
  json,
} from "./fixtures";

async function refresh(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(new Event("objective-current-read-refresh")),
  );
}
async function currentFixture(page: Page) {
  const unexpected = await installFixtures(page);
  const state = { status: 200, records: [objective], reads: 0 };
  await page.route(`**/core/clients/${clientId}/objectives`, (route) => {
    state.reads++;
    return json(
      route,
      state.status === 200
        ? state.records
        : { message: "Synthetic current objectives unavailable" },
      state.status,
    );
  });
  return { state, unexpected };
}

for (const status of [403, 503]) {
  test(`cached list is hidden after ${status} on a stale remount`, async ({
    page,
  }, testInfo) => {
    const { state, unexpected } = await currentFixture(page);
    await page.clock.install();
    await page.goto(`/portfolio/${clientId}/objectives`);
    await expect(
      page.getByRole("button", { name: "Test outcome", exact: true }),
    ).toBeVisible();
    await page.clock.fastForward(31000);
    state.status = status;
    await page.getByRole("link", { name: "Capabilities", exact: true }).click();
    await page.getByRole("link", { name: "Objectives", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("Test outcome", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByText("Test minimum win", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "New objective", exact: true }),
    ).toBeDisabled();
    expect(state.reads).toBeGreaterThan(1);
    await page.screenshot({
      path: testInfo.outputPath(`objectives-current-error-${status}.png`),
      fullPage: true,
    });
    expect(unexpected).toEqual([]);
  });

  test(`failed list ${status} preserves filters and restores only a successful current read`, async ({
    page,
  }) => {
    const { state, unexpected } = await currentFixture(page);
    await page.goto("/objective-current-read.html");
    await expect(
      page.getByRole("button", { name: "Test outcome", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Objective status").selectOption("draft");
    state.status = status;
    await refresh(page);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByLabel("Objective status")).toHaveCount(0);
    await expect(page.getByText("No objectives match this status")).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "New objective", exact: true }),
    ).toBeDisabled();
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      `**/core/clients/${clientId}/objectives`,
      async (route) => {
        await waiting;
        return json(route, [
          { ...objective, outcome: "Current recovered outcome" },
        ]);
      },
    );
    await page
      .getByRole("alert")
      .getByRole("button", { name: "Retry" })
      .click();
    await expect(page.getByRole("article")).toHaveCount(0);
    release();
    await expect(
      page.getByRole("button", {
        name: "Current recovered outcome",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New objective", exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel("Objective status")).toHaveValue("draft");
    await expect(page.getByText("Test outcome", { exact: true })).toHaveCount(
      0,
    );
    await page.getByLabel("Objective status").selectOption("ready");
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(
      page.getByText("No objectives match this status"),
    ).toBeVisible();
    await page.getByLabel("Objective status").selectOption("draft");
    await expect(
      page.getByRole("button", {
        name: "Current recovered outcome",
        exact: true,
      }),
    ).toBeVisible();
    expect(unexpected).toEqual([]);
  });

  test(`failed summary ${status} hides retained content and creation entry until recovery`, async ({
    page,
  }) => {
    const { state, unexpected } = await currentFixture(page);
    await page.goto("/objective-current-read.html?summary=1");
    await expect(
      page.getByRole("link", { name: /Test outcome/ }),
    ).toBeVisible();
    state.status = status;
    await refresh(page);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("Test outcome", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: "New objective", exact: true }),
    ).toHaveCount(0);
    state.status = 200;
    state.records = [{ ...objective, outcome: "Refreshed summary" }];
    await page
      .getByRole("alert")
      .getByRole("button", { name: "Retry" })
      .click();
    await expect(
      page.getByRole("link", { name: /Refreshed summary/ }),
    ).toBeVisible();
    const viewAll = page.getByRole("link", { name: "View all", exact: true });
    await expect(viewAll).toHaveAttribute(
      "href",
      `/portfolio/${clientId}/objectives`,
    );
    await page.goto((await viewAll.getAttribute("href"))!);
    await expect(
      page.getByRole("button", { name: "Refreshed summary", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New objective", exact: true }),
    ).toBeEnabled();
    expect(unexpected).toEqual([]);
  });

  test(`failed read ${status} closes the selected editor and does not restore its stale draft`, async ({
    page,
  }) => {
    const { state, unexpected } = await currentFixture(page);
    await page.goto(`/objective-current-read.html?objective=${objectiveId}`);
    const editor = page.getByRole("dialog", { name: "Edit objective" });
    await expect(editor).toBeVisible();
    await editor
      .getByLabel("Outcome", { exact: true })
      .fill("Stale unsaved editor");
    state.status = status;
    await refresh(page);
    await expect(editor).toHaveCount(0);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).not.toHaveURL(/objective=/);
    state.status = 200;
    state.records = [{ ...objective, outcome: "Recovered editor source" }];
    await page
      .getByRole("alert")
      .getByRole("button", { name: "Retry" })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Recovered editor source",
        exact: true,
      }),
    ).toBeVisible();
    await expect(editor).toHaveCount(0);
    await page
      .getByRole("button", { name: "Recovered editor source", exact: true })
      .click();
    await expect(editor.getByLabel("Outcome", { exact: true })).toHaveValue(
      "Recovered editor source",
    );
    expect(unexpected).toEqual([]);
  });
}

test("failed current read clears delete confirmation and new-objective input", async ({
  page,
}) => {
  const { state, unexpected } = await currentFixture(page);
  await page.goto("/objective-current-read.html");
  await page
    .getByRole("button", { name: "Delete Test outcome", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Delete objective" }),
  ).toBeVisible();
  state.status = 403;
  await refresh(page);
  await expect(
    page.getByRole("dialog", { name: "Delete objective" }),
  ).toHaveCount(0);
  state.status = 200;
  await page.getByRole("alert").getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByRole("button", { name: "Test outcome", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Delete objective" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "New objective", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Outcome", exact: true })
    .fill("Unsaved new objective");
  state.status = 503;
  await refresh(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Outcome", exact: true }),
  ).toHaveCount(0);
  await expect(page).not.toHaveURL(/new=/);
  expect(unexpected).toEqual([]);
});

test("client replacement rejects a late former-client read and recovers the new client", async ({
  page,
}) => {
  const { unexpected } = await currentFixture(page);
  const nextClient = "10000000-0000-4000-8000-000000000002";
  await page.route(`**/core/clients/${nextClient}`, (route) =>
    json(route, { ...client, id: nextClient, name: "Other current client" }),
  );
  await page.route(
    `**/core/clients/${nextClient}/advocacy-matters**`,
    (route) => json(route, []),
  );
  let allowed = false;
  await page.route(`**/core/clients/${nextClient}/objectives`, (route) =>
    json(
      route,
      allowed
        ? [
            {
              ...objective,
              clientId: nextClient,
              outcome: "New client outcome",
            },
          ]
        : { message: "Synthetic new client denial" },
      allowed ? 200 : 403,
    ),
  );
  await page.goto("/objective-current-read.html");
  await expect(
    page.getByRole("button", { name: "Test outcome", exact: true }),
  ).toBeVisible();
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let offered = false;
  let held = false;
  await page.route(`**/core/clients/${clientId}/objectives`, async (route) => {
    held = true;
    await waiting;
    await json(route, [objective]);
    offered = true;
  });
  await refresh(page);
  await expect.poll(() => held).toBe(true);
  await page.evaluate(
    (id) =>
      window.dispatchEvent(
        new CustomEvent("objective-current-read-client", { detail: id }),
      ),
    nextClient,
  );
  await expect(page.getByRole("alert")).toBeVisible();
  release();
  await expect.poll(() => offered).toBe(true);
  await expect(page.getByText("Test outcome", { exact: true })).toHaveCount(0);
  allowed = true;
  await page.getByRole("alert").getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByRole("button", { name: "New client outcome", exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("replacement data provider cannot receive the former session's cached editor", async ({
  page,
}) => {
  const { unexpected } = await currentFixture(page);
  await page.goto(`/objective-current-read.html?objective=${objectiveId}`);
  const editor = page.getByRole("dialog", { name: "Edit objective" });
  await expect(editor).toBeVisible();
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  let offered = false;
  await page.route(`**/core/clients/${clientId}/objectives`, async (route) => {
    if (!held) {
      held = true;
      await waiting;
      await json(route, [objective]);
      offered = true;
    } else await json(route, []);
  });
  await refresh(page);
  await expect.poll(() => held).toBe(true);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("objective-current-read-session")),
  );
  await expect(
    page.getByText("No current objectives", { exact: true }),
  ).toBeVisible();
  release();
  await expect.poll(() => offered).toBe(true);
  await expect(editor).toHaveCount(0);
  await expect(page.getByText("Test outcome", { exact: true })).toHaveCount(0);
  expect(unexpected).toEqual([]);
});
