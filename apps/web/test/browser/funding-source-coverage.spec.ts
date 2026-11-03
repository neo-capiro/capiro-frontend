import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { setup } from "./next-modules-fixtures";
import {
  fundingPage,
  fundingRecord,
} from "../../tests/funding-calendar-fixtures";

test("DIBBS and SBIR filters preserve source keys and explain incomplete coverage", async ({
  page,
}) => {
  const dibbs = fundingRecord("synthetic-bid", "dibbs");
  const sbir = {
    ...fundingRecord("synthetic-topic", "sbir_sttr"),
    summary: "Synthetic research topic seeking quantum sensing proposals.",
  };
  const requestedSources: (string | undefined)[] = [];
  await setup(page, {
    "intelligence.funding.search": (input: unknown) => {
      const source = (input as { query: { source?: string } }).query.source;
      requestedSources.push(source);
      return fundingPage(
        [dibbs, sbir].filter((row) => !source || row.source === source),
        {
          catalogComplete: false,
          counts: { active: null, grants: null, contracts: null, closed: null },
          freshness: [
            {
              source: "dibbs",
              state: "initial_partial",
              lastSyncedAt: null,
              lastSuccessAt: null,
              latestAttemptAt: "2026-11-03T09:00:00Z",
              recordCount: 253,
            },
            {
              source: "sbir_sttr",
              state: "stale",
              lastSyncedAt: "2026-10-22T01:21:16.466Z",
              lastSuccessAt: "2026-10-22T01:21:16.466Z",
              latestAttemptAt: "2026-11-03T09:00:00Z",
              recordCount: 343,
            },
          ],
        },
      );
    },
  });
  await page.goto("/modules/intelligence?view=funding");
  await expect(
    page.getByText(
      /DIBBS · Initial sync incomplete · No successful update yet/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      /SBIR\/STTR · Update overdue · Last successful update Oct 22, 2026, 01:21 UTC/,
    ),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Source", exact: true })
    .selectOption({ label: "DIBBS" });
  await expect.poll(() => requestedSources.at(-1)).toBe("dibbs");
  await expect(
    page.getByRole("button", { name: new RegExp(dibbs.title) }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: new RegExp(sbir.title) }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Source", exact: true })
    .selectOption({ label: "SBIR/STTR" });
  await expect.poll(() => requestedSources.at(-1)).toBe("sbir_sttr");
  await page.getByRole("button", { name: new RegExp(sbir.title) }).click();
  await expect(page.getByText(sbir.summary, { exact: true })).toBeVisible();
  await expect(
    page.getByText("Freshness unavailable", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/funding-source-coverage.png",
    fullPage: true,
  });
});
