import { expect, test, type Page } from "@playwright/test";
const records = Array.from({ length: 51 }, (_, index) => ({
  id: String(index + 1),
  title: `Synthetic record ${index + 1}`,
  summary: `Synthetic detail ${index + 1}`,
}));
async function reads(page: Page) {
  const calls: { key: string; query: Record<string, unknown> }[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const url = new URL(route.request().url());
    const key = url.pathname.split("/").at(-1)!;
    const input = JSON.parse(url.searchParams.get("input") || "{}");
    const query = input.query ?? {};
    calls.push({ key, query });
    let result: unknown;
    if (key === "intelligence.explorer.bill-facets")
      result = {
        congresses: [119],
        chambers: ["House"],
        parties: ["I"],
        subjects: ["Synthetic"],
        policyAreas: [],
      };
    else if (key.startsWith("intelligence.explorer."))
      result = {
        total: records.length,
        rows: records.slice(
          ((query.page || 1) - 1) * (query.pageSize || 25),
          (query.page || 1) * (query.pageSize || 25),
        ),
      };
    else if (key === "intelligence.defense.list")
      result = {
        total: 1,
        page: 1,
        limit: 25,
        data: [
          {
            peCode: "PE-SYNTHETIC",
            title: "Synthetic program",
            service: "Army",
            budgetActivity: null,
            appropriationType: null,
            status: null,
            lastSyncedAt: "2026-10-27T00:00:00Z",
          },
        ],
      };
    else if (key === "intelligence.defense.detail")
      result = {
        peCode: "PE-SYNTHETIC",
        title: "Synthetic program",
        description: "Synthetic narrative",
        service: "Army",
        budgetActivity: null,
        lastSyncedAt: "2026-10-27T00:00:00Z",
        currentUserIsWatching: false,
        years: [],
      };
    else result = [];
    await route.fulfill({ json: result });
  });
  return calls;
}

test("Explorer dataset, filter, page and detail survive refresh and browser Back/Forward", async ({
  page,
}) => {
  const calls = await reads(page);
  await page.goto("/intelligence-location.html?clientId=synthetic-scope");
  await page.getByLabel("Congress", { exact: true }).selectOption("119");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("button", { name: /Synthetic record 26$/ }).click();
  await expect(
    page.getByText("Synthetic detail 26", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Synthetic detail 26", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Congress", { exact: true })).toHaveValue("119");
  await page.goBack();
  await expect(
    page.getByText("Synthetic detail 26", { exact: true }),
  ).toHaveCount(0);
  await page.goForward();
  await expect(
    page.getByText("Synthetic detail 26", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "News Feed", exact: true }).click();
  await expect(page).toHaveURL(/dataset=news/);
  expect(new URL(page.url()).searchParams.get("clientId")).toBe(
    "synthetic-scope",
  );
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  expect(
    calls.some(
      (call) =>
        call.query.page === 2 &&
        (call.query.congress as string[])?.[0] === "119",
    ),
  ).toBe(true);
});

test("selected, visible page and all exports have distinct honest row counts", async ({
  page,
}) => {
  const calls = await reads(page);
  await page.goto("/intelligence-location.html?dataset=news");
  await page
    .getByRole("checkbox", {
      name: "Select Synthetic record 1 for export",
      exact: true,
    })
    .check();
  for (const [label, filename] of [
    ["Export selected (1)", "news-selected-1.csv"],
    ["Export this page (25)", "news-page-25.csv"],
    ["Export all matches (51)", "news-all-51.csv"],
  ]) {
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: label, exact: true }).click();
    expect((await downloaded).suggestedFilename()).toBe(filename);
  }
  expect(calls.filter((call) => call.query.pageSize === 200)).toHaveLength(1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export selected (0)" }),
  ).toBeDisabled();
});

test("program selection and its five-tab dossier use URL navigation", async ({
  page,
}) => {
  await reads(page);
  await page.goto(
    "/intelligence-location.html?view=defense&clientId=synthetic-scope",
  );
  await page
    .getByRole("button", { name: /PE-SYNTHETIC Synthetic program/ })
    .click();
  await page.getByRole("button", { name: "Open line profile" }).click();
  await page.getByRole("tab", { name: "Funding and lifecycle" }).click();
  await expect(page).toHaveURL(/peTab=funding/);
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Funding and lifecycle" }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goBack();
  await expect(
    page.getByRole("tab", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await expect(
    page.getByRole("tab", { name: "Funding and lifecycle" }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Back to defense budget" }).click();
  expect(new URL(page.url()).searchParams.has("peCode")).toBe(false);
  expect(new URL(page.url()).searchParams.get("clientId")).toBe(
    "synthetic-scope",
  );
});
