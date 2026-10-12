import { test, expect, type Page } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import {
  trackerActor,
  trackerClientId,
  trackerIdentity,
  trackerPreferences,
} from "../tracker-preference-fixtures";
import { preferenceValues } from "../../src/features/portfolio/bill-tracker/alert-preferences/contracts";
import { alertClient } from "../alert-channel-fixtures";

const routePattern = "**/intelligence/tracker/watchlists/*/alert-prefs";
const dialogFor = (page: Page) =>
  page.getByRole("dialog", { name: "My bill alerts", exact: true });
async function install(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route("**/core/me", (route) => json(route, trackerIdentity));
  // The current client preflight now consumes the same two explicit synthetic
  // clients already used by the preserved client-lifetime assertion below.
  await page.route(
    /\/core\/clients\/10000000-0000-4000-8000-00000000000[12]$/,
    (route) =>
      json(route, {
        ...alertClient,
        id: new URL(route.request().url()).pathname.split("/").at(-1),
      }),
  );
  return unexpected;
}
async function event(page: Page, name: string, detail?: unknown) {
  await page.evaluate(
    ({ name, detail }) =>
      window.dispatchEvent(new CustomEvent(name, { detail })),
    { name, detail },
  );
}
async function open(page: Page) {
  await page.goto("/tracker-boundary.html");
  await expect(
    dialogFor(page).getByLabel("Email address", { exact: true }),
  ).toHaveValue(trackerPreferences.emailAddress!);
  return dialogFor(page);
}

test("ordinary Intel users reach personal preferences from Configure and save a complete body", async ({
  page,
}) => {
  const unexpected = await install(page);
  await page.route("**/tracker/issue-areas", (route) =>
    json(route, { issueAreas: ["Defense"] }),
  );
  await page.route("**/legiwatch/bills/corpus-metadata", (route) =>
    json(route, { jurisdictions: [{ key: "US", count: 1 }] }),
  );
  await page.route(`**/tracker/watchlists/${trackerClientId}`, (route) =>
    json(route, {
      clientId: trackerClientId,
      issueAreas: [],
      jurisdictions: [],
      topics: [],
      version: 1,
    }),
  );
  let writes = 0;
  let record = trackerPreferences;
  await page.route(routePattern, async (route) => {
    if (route.request().method() === "GET") return json(route, record);
    expect(route.request().method()).toBe("PUT");
    writes++;
    const body = route.request().postDataJSON();
    expect(body).toEqual({
      ...preferenceValues(trackerPreferences),
      materiality: "high",
    });
    expect(body).not.toHaveProperty("smsPhoneVerified");
    expect(body).not.toHaveProperty("userId");
    record = { ...record, ...body };
    return json(route, record);
  });
  await page.goto(`/portfolio/${trackerClientId}/bills`);
  await page.getByRole("button", { name: "Configure", exact: true }).click();
  const targeting = page.getByRole("dialog", {
    name: "Configure Bill Tracker",
  });
  await expect(
    targeting.getByRole("button", { name: "Save targeting" }),
  ).toHaveCount(0);
  await targeting.getByRole("button", { name: "My alert preferences" }).click();
  const dialog = dialogFor(page);
  await expect(dialog.getByLabel("Email address", { exact: true })).toHaveValue(
    "analyst@example.test",
  );
  await dialog.getByLabel("Minimum importance").selectOption("high");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Minimum importance")).toHaveValue("high");
  await expect(
    dialog.getByRole("button", { name: "Save preferences", exact: true }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a missing returned Clerk user ID refuses preference reads and writes", async ({
  page,
}) => {
  const unexpected = await install(page);
  await page.route("**/core/me", (route) =>
    json(route, {
      ...trackerIdentity,
      user: { id: trackerActor.userId, email: "analyst@example.test" },
    }),
  );
  let calls = 0;
  await page.route(routePattern, (route) => {
    calls++;
    return json(route, trackerPreferences);
  });
  await page.goto("/tracker-boundary.html");
  await expect(
    dialogFor(page).getByText(
      /current account cannot edit personal bill alerts/,
    ),
  ).toBeVisible();
  await expect(
    dialogFor(page).getByRole("button", { name: "Save preferences" }),
  ).toHaveCount(0);
  expect(calls).toBe(0);
  expect(unexpected).toEqual([]);
});

for (const [name, change] of [
  ["client", { clientId: "another-client" }],
  ["database user instead of Clerk owner", { userId: trackerActor.userId }],
  ["tenant", { tenantId: "another-tenant" }],
] as const)
  test(`a mismatched ${name} read cannot become an editable preference record`, async ({
    page,
  }) => {
    const unexpected = await install(page);
    await page.route(routePattern, (route) =>
      json(route, { ...trackerPreferences, ...change }),
    );
    await page.goto("/tracker-boundary.html");
    await expect(dialogFor(page).getByRole("alert")).toContainText(
      "unexpected response",
    );
    await expect(
      dialogFor(page).getByLabel("Email address", { exact: true }),
    ).toHaveCount(0);
    await expect(
      dialogFor(page).getByRole("button", { name: "Save preferences" }),
    ).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });

for (const status of [403, 404])
  test(`a preference read refusal ${status} remains on the selected Intel owner`, async ({
    page,
  }) => {
    const unexpected = await install(page);
    let calls = 0;
    await page.route(routePattern, (route) => {
      calls++;
      return json(
        route,
        { message: "Intel tracker owner is unavailable." },
        status,
      );
    });
    await page.goto("/tracker-boundary.html");
    await expect(dialogFor(page).getByRole("alert")).toBeVisible();
    await expect(
      dialogFor(page).getByRole("button", { name: "Save preferences" }),
    ).toHaveCount(0);
    expect(calls).toBe(1);
    expect(unexpected).toEqual([]);
  });

test("a failed refresh conceals the saved form while retaining the local draft for a successful recheck", async ({
  page,
}) => {
  const unexpected = await install(page);
  let status = 200;
  await page.route(routePattern, (route) =>
    json(
      route,
      status === 200
        ? trackerPreferences
        : { message: "Preferences access changed" },
      status,
    ),
  );
  const dialog = await open(page);
  await dialog
    .getByLabel("Email address", { exact: true })
    .fill("local-edit@example.test");
  status = 403;
  await event(page, "tracker-test-refresh-preferences");
  await expect(dialog.getByLabel("Email address", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    dialog.getByRole("button", { name: "Save preferences", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByText(/Local edits are retained until you reload/),
  ).toBeVisible();
  status = 200;
  await event(page, "tracker-test-refresh-preferences");
  await expect(dialog.getByLabel("Email address", { exact: true })).toHaveValue(
    "local-edit@example.test",
  );
  expect(unexpected).toEqual([]);
});

test("an unconfirmed PUT is never replayed and requires an explicit saved read", async ({
  page,
}) => {
  const unexpected = await install(page);
  let writes = 0;
  let reads = 0;
  let record = trackerPreferences;
  await page.route(routePattern, (route) => {
    if (route.request().method() === "GET") {
      reads++;
      return json(route, record);
    }
    writes++;
    record = { ...record, ...route.request().postDataJSON() };
    return writes === 1
      ? json(route, { message: "Synthetic lost receipt" }, 502)
      : json(route, record);
  });
  const dialog = await open(page);
  await dialog.getByLabel("Email cadence").selectOption("weekly");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText(/The save could not be confirmed/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save preferences", exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByLabel("Email cadence")).toHaveValue("weekly");
  expect(writes).toBe(1);
  expect(reads).toBe(1);
  await dialog
    .getByRole("button", { name: "Reload saved preferences", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Discard edits and reload" })
    .click();
  await expect(dialog.getByText(/The save could not be confirmed/)).toHaveCount(
    0,
  );
  await expect(dialog.getByLabel("Email cadence")).toHaveValue("weekly");
  await dialog.getByLabel("Minimum importance").selectOption("high");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toBeVisible();
  expect(reads).toBe(2);
  expect(writes).toBe(2);
  expect(unexpected).toEqual([]);
});

test("a mismatched save receipt is unconfirmed and cannot replace the draft", async ({
  page,
}) => {
  const unexpected = await install(page);
  let writes = 0;
  await page.route(routePattern, (route) => {
    if (route.request().method() === "GET")
      return json(route, trackerPreferences);
    writes++;
    return json(route, {
      ...trackerPreferences,
      ...route.request().postDataJSON(),
      userId: trackerActor.userId,
    });
  });
  const dialog = await open(page);
  await dialog.getByLabel("Minimum importance").selectOption("high");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText(/The save could not be confirmed/),
  ).toBeVisible();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toHaveCount(0);
  await expect(dialog.getByLabel("Minimum importance")).toHaveValue("high");
  await expect(
    dialog.getByRole("button", { name: "Save preferences", exact: true }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a native preference write refusal retains edits and cannot claim or replay a save", async ({
  page,
}) => {
  const unexpected = await install(page);
  let writes = 0;
  await page.route(routePattern, (route) => {
    if (route.request().method() === "GET")
      return json(route, trackerPreferences);
    writes++;
    return json(
      route,
      { message: "Synthetic personal alert permission refused" },
      403,
    );
  });
  const dialog = await open(page);
  await dialog.getByLabel("Email cadence").selectOption("weekly");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "do not have permission",
  );
  await expect(dialog.getByLabel("Email cadence")).toHaveValue("weekly");
  await expect(
    dialog.getByRole("button", { name: "Save preferences", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toHaveCount(0);
  await expect(dialog.getByText(/The save could not be confirmed/)).toHaveCount(
    0,
  );
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a refreshed saved preference cannot be overwritten by an older full-replacement draft", async ({
  page,
}) => {
  const unexpected = await install(page);
  let record = trackerPreferences;
  let writes = 0;
  await page.route(routePattern, (route) => {
    if (route.request().method() === "GET") return json(route, record);
    writes++;
    const body = route.request().postDataJSON();
    expect(body.smsCadence).toBe("daily");
    expect(body.materiality).toBe("high");
    record = { ...record, ...body };
    return json(route, record);
  });
  const dialog = await open(page);
  await dialog.getByLabel("Minimum importance").selectOption("high");
  record = { ...record, smsCadence: "daily" };
  await event(page, "tracker-test-refresh-preferences");
  await expect(
    dialog.getByText(/Reload saved preferences before saving again/),
  ).toBeVisible();
  await expect(dialog.getByLabel("Minimum importance")).toHaveValue("high");
  await expect(
    dialog.getByRole("button", { name: "Save preferences", exact: true }),
  ).toBeDisabled();
  expect(writes).toBe(0);
  await dialog
    .getByRole("button", { name: "Reload saved preferences", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Discard edits and reload" })
    .click();
  await expect(dialog.getByLabel("SMS cadence")).toHaveValue("daily");
  await dialog.getByLabel("Minimum importance").selectOption("high");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a concurrent saved read prevents a late PUT receipt from replacing the newer receipt", async ({
  page,
}) => {
  const unexpected = await install(page);
  let record = trackerPreferences;
  let writes = 0;
  let release: (() => void) | undefined;
  let completed = false;
  await page.route(routePattern, async (route) => {
    if (route.request().method() === "GET") return json(route, record);
    writes++;
    const body = route.request().postDataJSON();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await json(route, { ...trackerPreferences, ...body });
    completed = true;
  });
  const dialog = await open(page);
  await dialog.getByLabel("Minimum importance").selectOption("high");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect.poll(() => writes).toBe(1);
  record = { ...record, smsCadence: "daily" };
  await event(page, "tracker-test-refresh-preferences");
  await expect(
    dialog.getByText(/Reload saved preferences before saving again/),
  ).toBeVisible();
  release?.();
  await expect.poll(() => completed).toBe(true);
  await expect(
    dialog.getByText(/The save could not be confirmed/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save preferences", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Reload saved preferences", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Discard edits and reload" })
    .click();
  await expect(dialog.getByLabel("SMS cadence")).toHaveValue("daily");
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a phone change clears the visible verification claim and only a server receipt may restore it", async ({
  page,
}) => {
  const unexpected = await install(page);
  await page.route(routePattern, (route) => {
    if (route.request().method() === "GET")
      return json(route, trackerPreferences);
    const body = route.request().postDataJSON();
    expect(body.smsPhone).toBe("+12025550124");
    expect(body).not.toHaveProperty("smsPhoneVerified");
    return json(route, {
      ...trackerPreferences,
      ...body,
      smsPhoneVerified: false,
    });
  });
  const dialog = await open(page);
  await expect(
    dialog.getByText("Phone verification confirmed by the service."),
  ).toBeVisible();
  await dialog.getByLabel("Phone number", { exact: true }).fill("+12025550124");
  await expect(
    dialog.getByText("Phone verification required before SMS delivery."),
  ).toBeVisible();
  await dialog.getByLabel("SMS alerts", { exact: true }).check();
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Phone verification required before SMS delivery."),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

for (const transition of [
  "actor",
  "clerk",
  "role",
  "invalidate",
  "client",
  "unmount",
] as const) {
  test(`a late preference receipt after ${transition} change cannot publish into the new view`, async ({
    page,
  }) => {
    const unexpected = await install(page);
    let release: (() => void) | undefined;
    let completed = false;
    let currentIdentity = trackerIdentity;
    let currentClient = trackerClientId;
    let writes = 0;
    await page.route(routePattern, async (route) => {
      if (route.request().method() === "GET")
        return json(route, {
          ...trackerPreferences,
          clientId: currentClient,
          userId: currentIdentity.user.clerkUserId,
          tenantId: currentIdentity.tenant.id,
        });
      writes++;
      const body = route.request().postDataJSON();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await json(route, { ...trackerPreferences, ...body });
      completed = true;
    });
    const dialog = await open(page);
    await dialog.getByLabel("Minimum importance").selectOption("high");
    await dialog
      .getByRole("button", { name: "Save preferences", exact: true })
      .click();
    await expect.poll(() => writes).toBe(1);
    if (transition === "actor" || transition === "clerk") {
      currentIdentity = {
        ...trackerIdentity,
        user: {
          ...trackerIdentity.user,
          id:
            transition === "actor"
              ? "another-database-user"
              : trackerActor.userId,
          clerkUserId: "user_another_tracker",
        },
      };
      await event(page, "tracker-test-identity", currentIdentity);
    } else if (transition === "role") {
      await event(page, "tracker-test-identity", {
        ...trackerIdentity,
        role: "client_portal_user",
      });
    } else if (transition === "client") {
      currentClient = "10000000-0000-4000-8000-000000000002";
      await event(page, "tracker-test-client", currentClient);
    } else
      await event(
        page,
        transition === "unmount"
          ? "tracker-test-unmount"
          : "tracker-test-invalidate-identity",
      );
    if (["actor", "clerk", "client"].includes(transition))
      await expect(
        dialogFor(page).getByLabel("Minimum importance"),
      ).toHaveValue("medium");
    else
      await expect(
        page.getByLabel("Email address", { exact: true }),
      ).toHaveCount(0);
    release?.();
    await expect.poll(() => completed).toBe(true);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(
      page.getByText("Preferences saved.", { exact: true }),
    ).toHaveCount(0);
    if (["actor", "clerk", "client"].includes(transition))
      await expect(
        dialogFor(page).getByLabel("Minimum importance"),
      ).toHaveValue("medium");
    expect(writes).toBe(1);
    expect(unexpected).toEqual([]);
  });
}

test("Core Configure does not expose or request the Intel personal-preference contract", async ({
  page,
}) => {
  const unexpected = await install(page);
  await page.route(
    `**/core/intelligence/clients/${trackerClientId}/tracker/board*`,
    (route) => json(route, { columns: [], total: 0 }),
  );
  await page.route("**/core/intelligence/issue-areas", (route) =>
    json(route, { issueAreas: [] }),
  );
  await page.route(
    `**/core/intelligence/clients/${trackerClientId}/tracker/watchlist`,
    (route) => json(route, { message: "Synthetic targeting unavailable" }, 404),
  );
  let prefCalls = 0;
  await page.route(routePattern, (route) => {
    prefCalls++;
    return json(route, trackerPreferences);
  });
  await page.goto("/tracker-boundary.html?mode=board&backend=core");
  await page.getByRole("button", { name: "Configure", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "My alert preferences" }),
  ).toHaveCount(0);
  expect(prefCalls).toBe(0);
  expect(unexpected).toEqual([]);
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "phone", width: 390, height: 1440 },
]) {
  test(`the ${viewport.name} preference form follows the new Figma structure and remains keyboard accessible`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const unexpected = await install(page);
    await page.route(routePattern, (route) =>
      json(route, {
        ...trackerPreferences,
        smsPhone: null,
        smsPhoneVerified: false,
      }),
    );
    const dialog = await open(page);
    await page.evaluate(() => document.fonts.ready);
    const bounds = await dialog.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(viewport.width - 32);
    expect(bounds!.x).toBeGreaterThanOrEqual(15);
    expect(
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    const email = await dialog
      .getByLabel("Email address", { exact: true })
      .boundingBox();
    const sms = await dialog
      .getByLabel("Phone number", { exact: true })
      .boundingBox();
    if (viewport.name === "desktop")
      expect(Math.abs(email!.y - sms!.y)).toBeLessThan(2);
    else expect(sms!.y).toBeGreaterThan(email!.y + email!.height);
    await dialog.getByLabel("Minimum importance").focus();
    await expect(dialog.getByLabel("Minimum importance")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByLabel("Jurisdictions")).toBeFocused();
    await dialog.screenshot({
      path: testInfo.outputPath(`tracker-preferences-${viewport.name}.png`),
    });
    if (viewport.name === "phone") {
      await page.setViewportSize({ width: 390, height: 844 });
      await dialog
        .getByRole("button", { name: "Cancel", exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        dialog.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeInViewport();
    }
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    expect(unexpected).toEqual([]);
  });
}
