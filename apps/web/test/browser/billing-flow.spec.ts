import { expect, test, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { settingsFixtures } from "./settings-fixtures";

const portalUrl = "https://billing.stripe.com/p/session/synthetic-test";
const checkoutUrl = "https://checkout.stripe.com/c/pay/synthetic-test";
const initialSummary = settingsFixtures["settings.billing.summary"];

async function billingFixture(
  page: Page,
  overrides: Partial<typeof initialSummary> = {},
) {
  await onlyLocalRequests(page);
  const current = { summary: { ...initialSummary, ...overrides } };
  const writes: { operation: string; input: unknown }[] = [];
  await operationFixtures(page, {
    ...settingsFixtures,
    "settings.billing.summary": () => current.summary,
    "settings.billing.state": {
      ...settingsFixtures["settings.billing.state"],
      status: current.summary.status,
      billingEnabled: current.summary.billingEnabled,
    },
    "settings.billing.portal": (input) => {
      writes.push({ operation: "portal", input });
      return { url: portalUrl };
    },
    "settings.billing.checkout": (input) => {
      writes.push({ operation: "checkout", input });
      return { url: checkoutUrl };
    },
  });
  // Hosted destinations are synthetic documents, never provider requests.
  for (const url of [portalUrl, checkoutUrl])
    await page.route(url, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "Synthetic hosted flow",
      }),
    );
  await page.goto("/settings/billing");
  await expect(page.getByRole("heading", { name: "Your plan" })).toBeVisible();
  return { current, writes };
}

for (const status of [
  "active",
  "past_due",
  "trialing",
  "canceled",
  "none",
  "comped",
]) {
  test(`${status} subscriber adds profiles through the portal, never checkout`, async ({
    page,
  }, testInfo) => {
    const { writes } = await billingFixture(page, { status });
    if (status === "active")
      await page.screenshot({
        path: testInfo.outputPath("billing-existing-subscription.png"),
        fullPage: true,
      });
    await page
      .getByRole("button", { name: "Add profiles", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(portalUrl);
    expect(writes).toEqual([{ operation: "portal", input: {} }]);
  });
}

for (const status of ["none", "trialing"]) {
  test(`${status} non-subscriber can review a new subscription`, async ({
    page,
  }) => {
    const { writes } = await billingFixture(page, {
      status,
      hasSubscription: false,
    });
    await page
      .getByRole("button", { name: "Start subscription", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Start subscription" });
    await dialog.getByLabel("Total profiles", { exact: true }).fill("15");
    await dialog
      .getByLabel("Access or promotion code (optional)")
      .fill("SYNTHETIC");
    await dialog.getByRole("button", { name: "Review checkout" }).click();
    await expect(page).toHaveURL(checkoutUrl);
    expect(writes).toEqual([
      {
        operation: "checkout",
        input: { body: { quantity: 15, promoCode: "SYNTHETIC" } },
      },
    ]);
  });
}

for (const status of ["active", "past_due", "canceled", "comped"]) {
  test(`${status} without a subscription does not infer checkout eligibility`, async ({
    page,
  }) => {
    const { writes } = await billingFixture(page, {
      status,
      hasSubscription: false,
    });
    await expect(
      page.getByRole("button", { name: "Add profiles", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByText("Profile changes are unavailable for this billing state."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start subscription" }),
    ).toHaveCount(0);
    expect(writes).toEqual([]);
  });
}

test("disabled billing cannot open either hosted flow", async ({ page }) => {
  const { writes } = await billingFixture(page, { billingEnabled: false });
  await expect(
    page.getByRole("button", { name: "Add profiles", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Update", exact: true }),
  ).toBeDisabled();
  expect(writes).toEqual([]);
});

test("checkout closes when a fresh summary reports an existing subscription", async ({
  page,
}) => {
  const { current, writes } = await billingFixture(page, {
    status: "none",
    hasSubscription: false,
  });
  await page
    .getByRole("button", { name: "Start subscription", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Start subscription" });
  await dialog.getByLabel("Total profiles", { exact: true }).fill("17");
  current.summary = {
    ...current.summary,
    status: "active",
    hasSubscription: true,
  };
  await dialog.getByRole("button", { name: "Review checkout" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText(
    "Refresh billing before continuing",
  );
  expect(writes).toEqual([]);
});

for (const read of ["summary", "state"]) {
  test(`failed current ${read} prevents checkout from a previously opened form`, async ({
    page,
  }) => {
    const { writes } = await billingFixture(page, {
      status: "none",
      hasSubscription: false,
    });
    await page
      .getByRole("button", { name: "Start subscription", exact: true })
      .click();
    let reads = 0;
    await page.route(`**/api/capiro/settings.billing.${read}?*`, (route) => {
      reads++;
      return route.fulfill({
        status: 503,
        json: { message: `Synthetic ${read} unavailable` },
      });
    });
    const dialog = page.getByRole("dialog", { name: "Start subscription" });
    await dialog.getByLabel("Total profiles", { exact: true }).fill("17");
    await dialog.getByRole("button", { name: "Review checkout" }).click();
    await expect(dialog.getByRole("alert")).toContainText(
      `Synthetic ${read} unavailable`,
    );
    await expect(
      dialog.getByLabel("Total profiles", { exact: true }),
    ).toHaveValue("17");
    await expect(
      dialog.getByRole("button", { name: "Review checkout" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("heading", { name: "Your plan", includeHidden: true }),
    ).toBeVisible();
    expect(reads).toBe(1);
    expect(writes).toEqual([]);
  });
}

for (const flow of ["portal", "checkout", "cancel"] as const) {
  test(`${flow} canonical 403 withholds cached billing and closes review before reload completes`, async ({
    page,
  }) => {
    const { current, writes } = await billingFixture(
      page,
      flow === "checkout" ? { status: "none", hasSubscription: false } : {},
    );
    if (flow !== "portal")
      await page
        .getByRole("button", {
          name: flow === "checkout" ? "Start subscription" : "Cancel plan",
          exact: true,
        })
        .click();
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    let denied = true;
    await page.route(
      "**/api/capiro/settings.billing.summary?*",
      async (route) => {
        reads++;
        if (reads === 2) await waiting;
        await route.fulfill(
          denied
            ? {
                status: 403,
                json: { message: "Synthetic billing access denied" },
              }
            : { json: current.summary },
        );
      },
    );
    try {
      await page
        .getByRole("button", {
          name:
            flow === "portal"
              ? "Add profiles"
              : flow === "checkout"
                ? "Review checkout"
                : "Open billing portal",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", { name: "Your plan", includeHidden: true }),
      ).toHaveCount(0);
      await expect(page.getByText("1 of 10 used", { exact: true })).toHaveCount(
        0,
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: /^(Add profiles|Start subscription|Update|View and download invoices|Cancel plan)$/,
        }),
      ).toHaveCount(0);
      await expect.poll(() => reads).toBe(2);
      expect(writes).toEqual([]);
    } finally {
      release();
    }
    await expect(
      page.getByRole("button", { name: "Try again", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("alert").first()).toContainText(
      "Synthetic billing access denied",
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    expect(reads).toBe(2);
    expect(writes).toEqual([]);
    // A later explicit read can recover access, but must not reopen or replay either review.
    denied = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Your plan" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(reads).toBe(3);
    expect(writes).toEqual([]);
    await expect(page).toHaveURL(/\/settings\/billing$/);
  });
}

test("canceling checkout review leaves the plan intact without revalidation or a provider request", async ({
  page,
}) => {
  const { writes } = await billingFixture(page, {
    status: "none",
    hasSubscription: false,
  });
  let reads = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/capiro/settings.billing.")) reads++;
  });
  await page
    .getByRole("button", { name: "Start subscription", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your plan" })).toBeVisible();
  expect(reads).toBe(0);
  expect(writes).toEqual([]);
});

test("an existing-subscriber action rechecks that a subscription still exists", async ({
  page,
}) => {
  const { current, writes } = await billingFixture(page);
  current.summary = {
    ...current.summary,
    status: "none",
    hasSubscription: false,
  };
  await page.getByRole("button", { name: "Add profiles", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Refresh billing before continuing",
  );
  expect(writes).toEqual([]);
});

for (const flow of ["portal", "checkout"] as const) {
  test(`${flow} rejects a receipt for the other hosted flow`, async ({
    page,
  }) => {
    await billingFixture(
      page,
      flow === "checkout" ? { status: "none", hasSubscription: false } : {},
    );
    await page.route(`**/api/capiro/settings.billing.${flow}`, (route) =>
      route.fulfill({
        json: { url: flow === "portal" ? checkoutUrl : portalUrl },
      }),
    );
    if (flow === "checkout") {
      await page
        .getByRole("button", { name: "Start subscription", exact: true })
        .click();
      await page.getByRole("button", { name: "Review checkout" }).click();
    } else
      await page
        .getByRole("button", { name: "Add profiles", exact: true })
        .click();
    await expect(page.getByRole("alert").last()).toContainText(
      "unexpected billing destination",
    );
    await expect(page).toHaveURL(/\/settings\/billing$/);
  });
}

for (const flow of ["portal", "checkout"] as const) {
  test(`repeated clicks while summary revalidation is pending dispatch one ${flow} request`, async ({
    page,
  }) => {
    const { current, writes } = await billingFixture(
      page,
      flow === "checkout" ? { status: "none", hasSubscription: false } : {},
    );
    if (flow === "checkout")
      await page
        .getByRole("button", { name: "Start subscription", exact: true })
        .click();
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    await page.route(
      "**/api/capiro/settings.billing.summary?*",
      async (route) => {
        reads++;
        await waiting;
        await route.fulfill({ json: current.summary });
      },
    );
    const button = page.getByRole("button", {
      name: flow === "portal" ? "Add profiles" : "Review checkout",
      exact: true,
    });
    await button.evaluate((element: HTMLButtonElement) => {
      element.click();
      element.click();
    });
    await expect(button).toBeDisabled();
    await expect.poll(() => reads).toBe(1);
    expect(writes).toEqual([]);
    release();
    await expect(page).toHaveURL(flow === "portal" ? portalUrl : checkoutUrl);
    expect(writes).toEqual([
      {
        operation: flow,
        input: flow === "portal" ? {} : { body: { quantity: 10 } },
      },
    ]);
  });
}

test("session replacement discards a pending hosted receipt", async ({
  page,
}) => {
  await billingFixture(page);
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let dispatched = 0;
  let offered = false;
  await page.route("**/api/capiro/settings.billing.portal", async (route) => {
    dispatched++;
    await waiting;
    await route.fulfill({ json: { url: portalUrl } });
    offered = true;
  });
  await page.getByRole("button", { name: "Add profiles", exact: true }).click();
  await expect.poll(() => dispatched).toBe(1);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { sessionId: "replacement-session" },
      }),
    ),
  );
  await expect(
    page.getByRole("button", { name: "Add profiles", exact: true }),
  ).toBeEnabled();
  release();
  await expect.poll(() => offered).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByRole("heading", { name: "Your plan" })).toBeVisible();
  await expect(page).toHaveURL(/\/settings\/billing$/);
  await expect(page.getByText("Opening billing portal…")).toHaveCount(0);
});

test("contradictory current reads and failed initial summary expose no billing action", async ({
  page,
}) => {
  const { writes } = await billingFixture(page, {
    status: "none",
    hasSubscription: false,
  });
  await page.route("**/api/capiro/settings.billing.state?*", (route) =>
    route.fulfill({
      json: { ...settingsFixtures["settings.billing.state"], status: "active" },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Add profiles", exact: true }),
  ).toBeDisabled();
  await page.route("**/api/capiro/settings.billing.summary?*", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Synthetic billing read failed" },
    }),
  );
  await page.reload();
  await expect(page.getByText("Synthetic billing read failed")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Add profiles|Start subscription|Review checkout/,
    }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
});

test("session replacement during revalidation prevents dispatch from the old form", async ({
  page,
}) => {
  const { current, writes } = await billingFixture(page, {
    status: "none",
    hasSubscription: false,
  });
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  let offered = false;
  await page.route(
    "**/api/capiro/settings.billing.summary?*",
    async (route) => {
      if (!held) {
        held = true;
        await waiting;
        await route.fulfill({ json: current.summary });
        offered = true;
      } else await route.fulfill({ json: current.summary });
    },
  );
  await page
    .getByRole("button", { name: "Start subscription", exact: true })
    .click();
  await page.getByRole("button", { name: "Review checkout" }).click();
  await expect.poll(() => held).toBe(true);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { sessionId: "another-session" },
      }),
    ),
  );
  await expect(
    page.getByRole("button", { name: "Start subscription", exact: true }),
  ).toBeEnabled();
  release();
  await expect.poll(() => offered).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(writes).toEqual([]);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
