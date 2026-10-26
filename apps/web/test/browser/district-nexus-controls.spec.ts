import { expect, type Page } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { setup, clientId, otherClientId } from "./next-modules-fixtures";
import { boundaryFixture } from "../../tests/facility-map-fixtures";

const path = "/modules/intelligence?view=district-nexus";
test.use({ viewport: { width: 1440, height: 1040 } });
const row = (
  key: string,
  score: number | null,
  employees: number | null,
  money: number | null,
) => ({
  districtKey: key,
  state: key.slice(0, 2),
  districtCode: key.slice(3),
  name: `Synthetic ${key}`,
  status: "C",
  awarded: {
    contractObligations: money,
    grantObligations: null,
    grantOutlays: money,
  },
  opportunities: {
    opportunityEstimatedFunding: money,
    opportunityAwardCeiling: null,
  },
  clientCount: 1,
  score,
  coveragePercent: 80,
  employeeCount: employees,
  employeesUnreported: employees === null,
  warnings: [],
});
const response = (districts: ReturnType<typeof row>[]) => ({
  districts,
  freshness: [],
  warnings: [],
  generatedAt: "2026-10-26T12:00:00Z",
});
async function choose(page: Page, name: string, option: string) {
  await page.getByRole("combobox", { name, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
test("new filters preserve returned values, zero/null, selection and explicit client request", async ({
  page,
}, testInfo) => {
  const requests: unknown[] = [];
  await setup(page, {
    "intelligence.district.map": (input: unknown) => {
      requests.push(input);
      return response([
        row("CA-01", 35, 0, 0),
        row("VA-08", null, null, null),
        row("TX-03", 70, 100, 2000000),
      ]);
    },
    "intelligence.district.boundaries": boundaryFixture,
  });
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "Districts · 3", exact: true }),
  ).toBeVisible();
  const count = requests.length;
  const metric = (name: string) =>
    page
      .locator("div")
      .filter({
        has: page.locator("span").filter({ hasText: new RegExp(`^${name}$`) }),
      })
      .filter({ has: page.locator("strong") })
      .last();
  await expect(metric("Employees").locator("strong")).toHaveText("100");
  await expect(metric("Contracts").locator("strong")).toHaveText("$2M");
  await page.getByRole("button", { name: "VA-08", exact: true }).click();
  await choose(page, "Coverage", "Firm nexus only");
  await expect(
    page.getByRole("heading", { name: "Districts · 2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Synthetic VA-08", exact: true }),
  ).toHaveCount(0);
  await choose(page, "Coverage", "All districts");
  await expect(
    page.getByRole("heading", { name: "Synthetic VA-08", exact: true }),
  ).toHaveCount(0);
  await choose(page, "Min funding", "$1M+");
  await expect(
    page.getByRole("heading", { name: "Districts · 1", exact: true }),
  ).toBeVisible();
  await choose(page, "Min funding", "Any");
  await choose(page, "Sort districts", "Sort: Employees");
  await expect(page.locator("tbody tr").first()).toContainText("TX-03");
  expect(requests).toHaveLength(count);
  await choose(page, "Client", "Other Aerospace");
  await expect
    .poll(() => requests.at(-1))
    .toEqual({ query: { view: "current", clientId: otherClientId } });
  await expect(
    page.getByRole("combobox", { name: "Scope", exact: true }),
  ).toContainText("Other Aerospace");
  await choose(page, "Scope", "Current Aerospace");
  await expect
    .poll(() => requests.at(-1))
    .toEqual({ query: { view: "current", clientId } });
  await expect(
    page.getByRole("combobox", { name: "Client", exact: true }),
  ).toContainText("Current Aerospace");
  expect(
    await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    })),
  ).toEqual({ scroll: 1440, width: 1440 });
  await page.screenshot({
    path: testInfo.outputPath("district-nexus-metrics.png"),
    fullPage: true,
  });
});

test("all-null aggregates stay unavailable and color-by label reflects the active data", async ({
  page,
}, testInfo) => {
  await setup(page, {
    "intelligence.district.map": response([row("CA-01", null, null, null)]),
    "intelligence.district.boundaries": boundaryFixture,
  });
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "Districts · 1", exact: true }),
  ).toBeVisible();
  await expect(page.locator("strong").filter({ hasText: "–" })).toHaveCount(4);
  await choose(page, "Color by", "Coverage");
  await expect(
    page.getByText("Current official district boundaries · Coverage", {
      exact: true,
    }),
  ).toBeVisible();
  const mapDistrict = page.getByRole("button", {
    name: "CA-01, score unavailable",
    exact: true,
  });
  await expect(mapDistrict).toHaveAttribute("fill", "hsl(191 22% 70%)");
  await expect(mapDistrict).toHaveAttribute("aria-pressed", "false");
  await mapDistrict.focus();
  await page.keyboard.press("Enter");
  await expect(mapDistrict).toHaveAttribute("aria-pressed", "true");
  await expect(mapDistrict).toHaveAttribute("fill", "#0a0a0a");
  await expect(
    page.getByRole("heading", { name: "Synthetic CA-01", exact: true }),
  ).toBeVisible();
  await choose(page, "Coverage", "Firm nexus only");
  await expect(
    page.getByRole("heading", { name: "Synthetic CA-01", exact: true }),
  ).toHaveCount(0);
  await choose(page, "Coverage", "All districts");
  await expect(mapDistrict).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({
    path: testInfo.outputPath("district-nexus-coverage.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    })),
  ).toEqual({ scroll: 390, width: 390 });
  await page.screenshot({
    path: testInfo.outputPath("district-nexus-phone.png"),
    fullPage: true,
  });
});

test("state selection scopes every displayed rail even when the server returns cross-state awards", async ({
  page,
}) => {
  const requests: unknown[] = [];
  await setup(page, {
    "intelligence.district.map": (input: unknown) => {
      requests.push(input);
      // Core's facility filter can leave award evidence from other states.
      return response([
        row("CA-01", 35, 0, 0),
        row("VA-08", null, null, null),
        row("TX-03", 70, 100, 2000000),
      ]);
    },
    "intelligence.district.boundaries": boundaryFixture,
  });
  await page.goto(path);
  await page.getByRole("button", { name: "CA-01", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic CA-01", exact: true }),
  ).toBeVisible();
  await choose(page, "State", "VA");
  await expect
    .poll(() => requests.at(-1))
    .toEqual({ query: { view: "current", state: "VA" } });
  await expect(
    page.getByRole("heading", { name: "Districts · 1", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("VA-08");
  await expect(page.locator("strong").filter({ hasText: "–" })).toHaveCount(4);
  await expect(
    page.getByText("0 firm nexus · 1 states", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Synthetic CA-01", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "CA-01, score 35", exact: true }),
  ).toHaveCount(0);
  await choose(page, "State", "All states");
  await expect(
    page.getByRole("heading", { name: "Districts · 3", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Synthetic CA-01", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "CA-01, score 35", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});
