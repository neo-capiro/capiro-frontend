import { expect, test, type Page, type Route } from "@playwright/test";
import { onlyLocalRequests, testIdentity } from "../browser/fixtures";
import {
  usageOverviewFixture,
  usageOverviewFixtureMixedCompletedAccounting,
  usageOverviewFixtureWithoutSuccessfulJobs,
} from "../../tests/meri-usage-overview-fixtures";

/**
 * Effect-driven mounted-host regression for the whole-job read. The page mounts the production
 * `ApplicationBoundary` -> `UsageOverviewHost` -> `useCurrentRead` -> `createUsageOverviewClient`
 * chain and the published /2 receivers bundled from the source stage; only identity HTTP, client
 * HTTP and the tenant-usage read HTTP are supplied here. This is local source qualification on a
 * loopback host, not deployed acceptance.
 */
const clientId = "33333333-3333-4333-8333-333333333333";
const readPath = "/api/conversations/usage-overview";
const harnessPath = `/settings/usage-overview-host.html?clientId=${clientId}`;
const syntheticClient = {
  id: clientId,
  name: "Synthetic Client",
  profileStatus: "active",
  status: "active",
};
type Read = { path: string; schemaVersion: unknown };

/** The external boundaries only: identity, client scope and the tenant-usage read. */
async function boundaries(
  page: Page,
  options: {
    identity?: (call: number) => unknown;
    read: (call: number, route: Route) => Promise<void> | void;
  },
) {
  const reads: Read[] = [];
  let identityCalls = 0;
  // The account is read through both the Core proxy and the Capiro procedure endpoint.
  const identity = async (route: Route) => {
    identityCalls += 1;
    await route.fulfill({
      json: (options.identity ?? (() => testIdentity))(identityCalls),
    });
  };
  await page.route("**/api/backend/core/me", identity);
  await page.route("**/api/capiro/me.read*", identity);
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ json: syntheticClient }),
  );
  await page.route(`**${readPath}`, async (route) => {
    const body = route.request().postDataBuffer();
    reads.push({
      path: new URL(route.request().url()).pathname,
      schemaVersion: body
        ? JSON.parse(body.toString("utf8")).schemaVersion
        : undefined,
    });
    await options.read(reads.length, route);
  });
  return reads;
}

/** The published facts as rendered, so assertions read the received numbers, not the view model. */
const shownFacts = (page: Page) =>
  page.evaluate(() =>
    Object.fromEntries(
      Array.from(document.querySelectorAll("dl div")).map((row) => [
        row.querySelector("dt")?.textContent ?? "",
        row.querySelector("dd")?.textContent ?? "",
      ]),
    ),
  );

test("the mounted host reads meri.usage-overview/2 and renders the received whole-job facts", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  const reads = await boundaries(page, {
    // The mixed accounting body is receiver-valid and has more completed attempts than completed
    // attempts with recorded usage, so this case also proves the recorded count in the real table.
    read: (_call, route) =>
      route.fulfill({ json: usageOverviewFixtureMixedCompletedAccounting() }),
  });
  await page.goto(harnessPath);
  await expect(page.getByRole("list", { name: "Usage summary" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Whole jobs · This month · UTC" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh usage", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Today · UTC" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "This week · Monday UTC" }),
  ).toBeVisible();
  await expect(page.getByText("$1.50 known recorded this month")).toBeVisible();
  await expect.poll(() => reads.length).toBe(1);
  expect(reads).toEqual([
    { path: readPath, schemaVersion: "meri.usage-overview/2" },
  ]);
  expect(await shownFacts(page)).toMatchObject({
    "Successful jobs": "3 jobs · 5 attempts · $0.45 known SDK estimate",
    "Partial jobs": "1 jobs · 2 attempts · $0.12 known SDK estimate",
    "Failed jobs": "1 jobs · 1 attempts · $0.00 known SDK estimate",
    "Cancelled jobs": "0 jobs · 0 attempts · $0.00 known SDK estimate",
    "Unclosed jobs": "1 jobs · 1 attempts · $0.03 known SDK estimate",
    "Jobs with usable accounting": "5 recorded · 1 without usable accounting",
    "Continuations outside this month": "1 excluded and counted",
    "Cost per successful job": "$0.15",
    "Monthly admission cap": "$100.00",
    "Maximum SDK turns per attempt": "12",
  });
  // The recorded completed count in the real table is the received canonical count, never a
  // re-subtracted or negative one.
  await expect(
    page.getByRole("cell", {
      name: "5 total · 1 completed with recorded usage",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: "3 total · 0 completed with recorded usage",
    }),
  ).toBeVisible();
  // Copy keeps the canonical window edge in plain words and names every unclosed cause.
  await expect(
    page.getByText(
      /revision created after the window is not read, so a job whose continuation falls outside the window is reported from the revisions inside it only/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      /1 child receipts are unsettled, 1 successor continuations are unresolved, or 1 revisions still need their completion proof/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/whole-job-lineage-at-root-revision-window/),
  ).toHaveCount(0);
  await expect(page.getByText(/sdk_usage\.parentRunId/)).toHaveCount(0);
  // The whole-jobs block is laid out inside the harness viewport rather than clipped by it, and the
  // scroll position it leaves behind is what the recorded visual artifact shows.
  const wholeJobsHeading = page.getByRole("heading", {
    name: "Whole jobs · This month · UTC",
  });
  await wholeJobsHeading.scrollIntoViewIfNeeded();
  const wholeJobsBox = await wholeJobsHeading.boundingBox();
  expect(wholeJobsBox?.width ?? 0).toBeGreaterThan(0);
  expect(
    (wholeJobsBox?.x ?? 0) + (wholeJobsBox?.width ?? 0),
  ).toBeLessThanOrEqual(1440);
});

test("Refresh runs the same read again through the host and replaces the shown facts", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  const reads = await boundaries(page, {
    read: (call, route) =>
      route.fulfill({
        json:
          call === 1
            ? usageOverviewFixture()
            : usageOverviewFixtureWithoutSuccessfulJobs(),
      }),
  });
  await page.goto(harnessPath);
  await expect(page.getByText("$0.15")).toBeVisible();
  await page
    .getByRole("button", { name: "Refresh usage", exact: true })
    .click();
  await expect(
    page.getByText("0 jobs · 0 attempts · $0.00 known SDK estimate").first(),
  ).toBeVisible();
  await expect(page.getByText("$0.15")).toHaveCount(0);
  await expect(
    page.getByText("3 jobs · 5 attempts · $0.45 known SDK estimate"),
  ).toHaveCount(0);
  expect(reads.map((read) => read.schemaVersion)).toEqual([
    "meri.usage-overview/2",
    "meri.usage-overview/2",
  ]);
  expect(await shownFacts(page)).toMatchObject({
    "Cost per successful job": "Unavailable",
    "Successful jobs": "0 jobs · 0 attempts · $0.00 known SDK estimate",
    "Jobs with usable accounting": "0 recorded · 0 without usable accounting",
    "Monthly admission cap": "$100.00",
  });
});

test("a confirmed limits save keeps the editor usable and re-reads the admission ledger", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  const model = (monthly: number, perQuery: number, maxTurns: number) => ({
    monthlyCapMicroUsd: monthly * 1_000_000,
    maxBudgetMicroUsd: perQuery * 1_000_000,
    maxTurns,
  });
  const settings = (revision: number, limits: ReturnType<typeof model>) => ({
    revision,
    defaultTimezone: "UTC",
    capabilityStatus: "resolved",
    effectiveCapabilities: {},
    capabilityPolicy: {},
    model: limits,
  });
  const usage = (revision: number, limits: ReturnType<typeof model>) => {
    const body = usageOverviewFixture();
    const spent = 31_750_000;
    return {
      ...body,
      policy: { status: "configured", revision, ...limits },
      monthlyAdmission: {
        ...body.monthlyAdmission,
        knownChargeMicroUsd: spent,
        remainingKnownMicroUsd: limits.monthlyCapMicroUsd - spent,
        reached: false,
      },
    };
  };
  const before = model(60, 2, 20),
    after = model(1000, 50, 500);
  await boundaries(page, {
    read: (call, route) =>
      route.fulfill({ json: call === 1 ? usage(2, before) : usage(3, after) }),
  });
  const saves: unknown[] = [];
  await page.route("**/api/settings/tenant/read", (route) =>
    route.fulfill({ json: settings(2, before) }),
  );
  await page.route("**/api/settings/tenant/save", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    saves.push(body);
    await route.fulfill(
      body.expectedRevision === 2
        ? { json: settings(3, body.settings.model) }
        : {
            status: 409,
            json: { error: { code: "SETTINGS_REVISION_CONFLICT" } },
          },
    );
  });
  await page.goto(`${harnessPath}&editor`);
  await expect(
    page.getByText("$31.75 known recorded this month · $28.25 remaining"),
  ).toBeVisible();
  const monthly = page.getByLabel("Monthly model budget (USD)"),
    perQuery = page.getByLabel("Per-query model budget (USD)"),
    turns = page.getByLabel("Maximum turns per query"),
    save = page.getByRole("button", { name: "Save workspace limits" });
  await expect(page.getByText("Saved revision 2.")).toBeVisible();
  await monthly.fill("1000");
  await perQuery.fill("50");
  await turns.fill("500");
  await save.click();
  await expect(page.getByText("Saved revision 3.")).toBeVisible();
  await expect(
    page.getByText("Workspace limits saved as revision 3."),
  ).toBeVisible();
  // The editor stays usable at the saved values and the ledger now reports the saved cap.
  for (const field of [monthly, perQuery, turns])
    await expect(field).toBeEnabled();
  await expect(save).toBeEnabled();
  await expect(monthly).toHaveValue("1000");
  await expect(turns).toHaveValue("500");
  await expect(perQuery).toHaveValue("50");
  // The editor replaces the read-only policy list; the re-read ledger reports the saved cap.
  await expect(
    page.getByText("$31.75 known recorded this month · $968.25 remaining"),
  ).toBeVisible();
  expect(saves).toEqual([
    {
      expectedRevision: 2,
      settings: { defaultTimezone: "UTC", capabilityPolicy: {}, model: after },
    },
  ]);
});

test("a denied read withholds every total and retires the read", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  const reads = await boundaries(page, {
    read: (_call, route) =>
      route.fulfill({
        status: 403,
        json: { error: { code: "ACCESS_DENIED" } },
      }),
  });
  await page.goto(harnessPath);
  // The denial is stated in the area notice and in the state message body.
  await expect(
    page
      .getByText(
        "Usage access changed or was denied. Reload this page to verify current access.",
      )
      .first(),
  ).toBeVisible();
  await expect(page.getByText("Cost per successful job")).toHaveCount(0);
  await expect(page.getByText("$0.15")).toHaveCount(0);
  await expect(page.getByText("Whole jobs · This month · UTC")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Refresh usage", exact: true }),
  ).toHaveCount(0);
  expect(reads).toHaveLength(1);
});

test("a pending answer after account retirement cannot republish the former totals", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  const settled: string[] = [];
  const reads = await boundaries(page, {
    identity: (call) =>
      call === 1
        ? testIdentity
        : {
            ...testIdentity,
            tenant: {
              ...testIdentity.tenant,
              id: "20000000-0000-4000-8000-0000000000ff",
            },
          },
    read: async (call, route) => {
      if (call === 1) {
        await released;
        try {
          await route.fulfill({ json: usageOverviewFixture() });
          settled.push("delivered");
        } catch {
          settled.push("retired");
        }
        return;
      }
      await route.fulfill({
        json: usageOverviewFixtureWithoutSuccessfulJobs(),
      });
    },
  });
  await page.goto(harnessPath);
  await expect
    .poll(() => reads.length, { message: "first bounded read" })
    .toBe(1);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "second-user",
          sessionId: "second-session",
          orgId: "test-org",
        },
      }),
    ),
  );
  await expect
    .poll(() => reads.length, { message: "successor read after retirement" })
    .toBe(2);
  await expect(
    page.getByText("0 recorded · 0 without usable accounting"),
  ).toBeVisible();
  release();
  await expect.poll(() => settled.length).toBe(1);
  expect(await shownFacts(page)).toMatchObject({
    "Cost per successful job": "Unavailable",
    "Successful jobs": "0 jobs · 0 attempts · $0.00 known SDK estimate",
  });
  await expect(page.getByText("$0.15")).toHaveCount(0);
  await expect(
    page.getByText("3 jobs · 5 attempts · $0.45 known SDK estimate"),
  ).toHaveCount(0);
  await expect(page.getByText("1 excluded and counted")).toHaveCount(0);
});
