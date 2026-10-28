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
  await page.route("**/api/backend/core/me", async (route) => {
    identityCalls += 1;
    await route.fulfill({
      json: (options.identity ?? (() => testIdentity))(identityCalls),
    });
  });
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
