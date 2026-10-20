import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { setup } from "./next-modules-fixtures";

const bill = {
  id: "synthetic-bill",
  title: "Synthetic appropriations bill",
  billType: "hr",
  billNumber: 42,
  congress: 119,
  summary: "Bill-only details",
};
const notice = {
  id: "synthetic-notice",
  title: "Synthetic agency notice",
  agency: "Synthetic agency",
  commentEndDate: "2026-11-01",
  summary: "Notice-only details",
};

test("Comment Deadlines clears the prior dataset selection while preserving search and bill filters", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await setup(page, {
    "intelligence.explorer.bills": { rows: [bill], total: 50 },
    "intelligence.explorer.bill-facets": {
      congresses: [119],
      subjects: [],
      chambers: [],
      parties: [],
      policyAreas: [],
    },
    "intelligence.explorer.federal-register": (input) => {
      requests.push((input as { query: Record<string, unknown> }).query);
      return { rows: [notice], total: 1 };
    },
    "intelligence.explorer.awards": { rows: [], total: 0 },
  });
  await page.goto("/modules/intelligence");
  await page.getByLabel("Search records", { exact: true }).fill("Synthetic");
  await page.getByLabel("Congress", { exact: true }).selectOption("119");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("button", { name: /HR 42.*Synthetic appropriations bill/ })
    .click();
  await expect(
    page.getByText("Bill-only details", { exact: true }),
  ).toBeVisible();
  for (let pass = 0; pass < 2; pass++) {
    await page
      .getByRole("button", { name: "Comment Deadlines", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: notice.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Bill-only details", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Save to LegiWatch", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Search records", { exact: true }),
    ).toHaveValue("Synthetic");
    expect(requests.at(-1)).toEqual({
      q: "Synthetic",
      page: 1,
      pageSize: 25,
      sort: "comment-close",
    });
    await page.getByRole("button", { name: notice.title, exact: true }).click();
    await expect(
      page.getByText("Notice-only details", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Congress Bills", exact: true })
      .click();
    await expect(
      page.getByText("Notice-only details", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Congress", { exact: true })).toHaveValue(
      "119",
    );
    await page
      .getByRole("button", { name: /HR 42.*Synthetic appropriations bill/ })
      .click();
  }
  await page
    .getByRole("tab", { name: "Federal Spending", exact: true })
    .click();
  await expect(
    page.getByText("Bill-only details", { exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await expect(
    page.getByRole("button", { name: /HR 42.*Synthetic appropriations bill/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Bill-only details", { exact: true }),
  ).toHaveCount(0);
  await page.goForward();
  await expect(
    page.getByRole("button", { name: "DoD Awards", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
