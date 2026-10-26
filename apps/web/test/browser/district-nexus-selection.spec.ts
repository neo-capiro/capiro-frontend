import { expect, type Page } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  clientId,
  otherClientId,
  navigate,
  setup,
} from "./next-modules-fixtures";
import { boundaryFixture } from "../../tests/facility-map-fixtures";
import type { DistrictSummary } from "../../src/shared/capiro/operations/intelligence-defense";

const path = "/modules/intelligence?view=district-nexus";
const district = (key: "CA-01" | "VA-08", name: string): DistrictSummary => ({
  districtKey: key,
  state: key.slice(0, 2),
  districtCode: key.slice(3),
  name,
  status: "C",
  awarded: {
    contractObligations: 120,
    grantObligations: null,
    grantOutlays: 0,
  },
  opportunities: {
    opportunityEstimatedFunding: null,
    opportunityAwardCeiling: null,
  },
  clientCount: 1,
  score: null,
  coveragePercent: 12,
  employeeCount: null,
  employeesUnreported: true,
  warnings: [],
});
const california = district("CA-01", "Synthetic California district");
const virginia = district("VA-08", "Synthetic Virginia district");
const response = (districts: DistrictSummary[]) => ({
  districts,
  freshness: [],
  warnings: [],
  generatedAt: "2026-10-16T12:00:00Z",
});
type MapInput = {
  query?: { view?: string; state?: string; clientId?: string };
};
async function install(page: Page) {
  const writes: string[] = [];
  await setup(page, {
    "intelligence.district.map": (input: unknown) => {
      const query = (input as MapInput).query;
      expect(query?.view).toBe("current");
      if (query?.clientId === otherClientId)
        return response([
          {
            ...california,
            name: "Replacement client district",
            employeeCount: 777,
            warnings: [
              { code: "synthetic", message: "Replacement client warning" },
            ],
          },
        ]);
      return response(
        query?.state === "VA" ? [virginia] : [california, virginia],
      );
    },
    "intelligence.district.boundaries": boundaryFixture,
  });
  await page.route("**/api/capiro/*", (route) => {
    if (route.request().method() !== "GET") {
      writes.push(`${route.request().method()} ${route.request().url()}`);
      return route.fulfill({
        status: 500,
        json: { message: "Unexpected synthetic write" },
      });
    }
    return route.fallback();
  });
  return writes;
}

test.use({ viewport: { width: 1440, height: 1040 } });

test("District Nexus never retains an old side pane after a state-filter response replaces the map", async ({
  page,
}) => {
  const writes = await install(page);
  let waiting = false,
    release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/capiro/intelligence.district.map?*",
    async (route) => {
      expect(route.request().method()).toBe("GET");
      const input = JSON.parse(
        new URL(route.request().url()).searchParams.get("input") ?? "{}",
      ) as MapInput;
      if (input.query?.state !== "VA") return route.fallback();
      waiting = true;
      await pending;
      return route.fulfill({ json: response([virginia]) });
    },
  );
  await page.goto(path);
  await page.getByRole("button", { name: "CA-01", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: california.name!, exact: true }),
  ).toBeVisible();
  try {
    await page.getByRole("combobox", { name: "State", exact: true }).click();
    await page.getByRole("option", { name: "VA", exact: true }).click();
    await expect.poll(() => waiting).toBe(true);
    await expect(page.getByRole("status")).toContainText("Loading");
    await expect(
      page.getByRole("heading", { name: california.name!, exact: true }),
    ).toHaveCount(0);
    release();
    await expect(
      page.getByRole("button", { name: "VA-08", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "CA-01", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: california.name!, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: virginia.name!, exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "VA-08", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: virginia.name!, exact: true }),
    ).toBeVisible();
    // Figma 1064:241658 has no "Clear all"; the State select's "All states"
    // option is the reset, and it must still require a fresh selection.
    await page.getByRole("combobox", { name: "State", exact: true }).click();
    await page.getByRole("option", { name: "All states", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "State", exact: true }),
    ).toContainText("All states");
    await expect(
      page.getByRole("button", { name: "CA-01", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: virginia.name!, exact: true }),
    ).toHaveCount(0);
    expect(writes).toEqual([]);
  } finally {
    release();
  }
});

test("District Nexus scopes a repeated district key to the current client and selects current returned values", async ({
  page,
}) => {
  const writes = await install(page);
  await page.goto(`${path}&clientId=${clientId}`);
  await page.getByRole("button", { name: "CA-01", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: california.name!, exact: true }),
  ).toBeVisible();
  await navigate(page, `${path}&clientId=${otherClientId}`);
  await expect(
    page.getByRole("button", { name: "CA-01", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: california.name!, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Replacement client district",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "CA-01", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Replacement client district",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Replacement client warning", { exact: true }),
  ).toBeVisible();
  const panel = page.locator("section", {
    has: page.getByRole("heading", {
      name: "Replacement client district",
      exact: true,
    }),
  });
  await expect(panel.getByText("777+", { exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test("a refused District Nexus filter is an error rather than an empty map and resetting the State filter requires a fresh selection", async ({
  page,
}) => {
  const writes = await install(page);
  await page.route("**/api/capiro/intelligence.district.map?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input") ?? "{}",
    ) as MapInput;
    return input.query?.state === "VA"
      ? route.fulfill({
          status: 403,
          json: { message: "Synthetic district scope refusal" },
        })
      : route.fallback();
  });
  await page.goto(path);
  await page.getByRole("button", { name: "CA-01", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: california.name!, exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "State", exact: true }).click();
  await page.getByRole("option", { name: "VA", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic district scope refusal",
  );
  await expect(
    page.getByRole("heading", { name: "Districts · 0", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: california.name!, exact: true }),
  ).toHaveCount(0);
  await page.getByRole("combobox", { name: "State", exact: true }).click();
  await page.getByRole("option", { name: "All states", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "CA-01", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: california.name!, exact: true }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
});
