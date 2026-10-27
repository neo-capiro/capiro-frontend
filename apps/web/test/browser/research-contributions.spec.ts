import { expect, test, type Page } from "@playwright/test";
import { ids, timestamp } from "./research-sharing-fixture";
const basis = {
  requestEdition: "FY2027 request",
  fundingFiscalYear: 2027,
  stage: "requested",
  metric: "funding",
  unit: "usd_millions",
  currency: "USD",
  priceBasis: "constant FY2024",
  knownAt: timestamp,
};
const contribution = {
  contributionId: "contribution-1",
  memberId: "member-1",
  targetKind: "program_element",
  targetId: "0601102A",
  label: "Included subject",
  basis,
  value: "9007199254740993.123456",
  disposition: "included",
  sourceDisposition: "observed",
  reason: "Qualified source contribution",
  sourceObservationId: "observation-1",
  sourceRevisionIds: ["revision-1"],
  evidence: [
    {
      page: 12,
      table: "Funding",
      row: "0601102A",
      cell: "FY2027",
      quote: "Exact retained cell",
    },
  ],
  dedupKey: "fact-1",
  overlapsContributionId: null,
};
const analytics = {
  portfolioId: ids.portfolio,
  portfolioRevision: 1,
  calculationVersion: "research-portfolio-analytics-v2",
  availability: "partial",
  totals: [
    { basis, value: contribution.value, contributionCount: 1 },
    {
      basis: { ...basis, priceBasis: "current" },
      value: "12",
      contributionCount: 1,
    },
  ],
  contributions: [
    contribution,
    {
      ...contribution,
      contributionId: "contribution-2",
      targetId: "overlap",
      label: "Parent overlap",
      disposition: "overlap",
      reason: "Already represented by the included child",
      overlapsContributionId: "contribution-1",
    },
    {
      ...contribution,
      contributionId: "contribution-3",
      targetId: "withheld",
      label: "Withheld subject",
      basis: null,
      value: null,
      disposition: "withheld",
      sourceDisposition: "withheld",
      sourceObservationId: null,
      sourceRevisionIds: [],
      evidence: [],
      reason: "Evidence is withheld",
    },
  ],
  coverage: {
    eligibleMembers: 3,
    supportedMembers: 2,
    includedContributions: 1,
    excludedContributions: 0,
    overlapContributions: 1,
    unavailableMembers: 1,
  },
  limitations: ["The result is partial."],
  observedAt: timestamp,
  readAt: timestamp,
};
const forEvidence = {
  sourceRevisionId: "immutable-revision-for",
  locator: { page: 12, table: "Funding", row: "PE 0601102A", cell: "FY2027" },
  quote: "Supported exactly here.",
  stance: "for",
};
const againstEvidence = {
  sourceRevisionId: "immutable-revision-against",
  locator: { section: "3.2", span: { start: 9, end: 22 } },
  quote: "Counter evidence.",
  stance: "against",
};
const review = {
  id: "30000000-0000-4000-8000-000000000001",
  portfolioId: ids.portfolio,
  targetKind: "member",
  targetId: contribution.targetId,
  trigger: "source_changed",
  assigneeUserId: null,
  reason: "Source revision changed",
  evidenceFor: [forEvidence],
  evidenceAgainst: [againstEvidence],
  revision: 4,
  status: "open",
  updatedAt: timestamp,
};
async function reads(page: Page, overrides: Record<string, unknown> = {}) {
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    if (route.request().method() !== "GET")
      writes.push(route.request().postDataJSON());
    const data: Record<string, unknown> = {
      "research.analytics": analytics,
      "research.reviews": [review],
      "research.reviews.notes": [],
      "settings.tenantMembers": [],
      "research.reviews.decide": {
        portfolioId: ids.portfolio,
        actorUserId: "owner",
        occurredAt: timestamp,
        outcomes: [
          {
            reviewId: review.id,
            status: "decided",
            revision: 5,
            message: null,
          },
        ],
      },
      ...overrides,
    };
    await route.fulfill({ json: data[key] ?? {} });
  });
  return writes;
}
test("analytics retains exact decimal values, separates price bases, and drills into contribution disposition and captured evidence", async ({
  page,
}) => {
  await reads(page);
  await page.goto("/research-contributions.html");
  const totals = page.getByRole("table", {
    name: "Compatible research portfolio totals",
  });
  await expect(
    totals.getByText(contribution.value, { exact: true }),
  ).toBeVisible();
  await expect(
    totals.getByRole("button", { name: /constant FY2024/ }),
  ).toHaveCount(1);
  await expect(
    totals.getByRole("button", { name: / · current · / }),
  ).toHaveCount(1);
  await totals.getByRole("button", { name: /constant FY2024/ }).click();
  await expect(page.getByRole("status")).toContainText("Showing 2 of 3");
  await page
    .getByRole("combobox", { name: "Disposition", exact: true })
    .selectOption("overlap");
  const ledger = page.getByRole("table", {
    name: "Recorded research portfolio contributions",
  });
  await expect(ledger).toContainText("Parent overlap");
  await expect(ledger).not.toContainText("Included subject");
  await ledger.getByText("Contribution details", { exact: true }).click();
  await expect(ledger).toContainText("revision-1");
  await expect(ledger).toContainText("Exact retained cell");
  await page
    .getByRole("button", { name: "Clear contribution filters" })
    .click();
  await page
    .getByRole("combobox", { name: "Disposition", exact: true })
    .selectOption("withheld");
  await expect(ledger).toContainText("No value recorded");
  await expect(ledger).toContainText("Evidence is withheld");
});
test("review requires an explicit evidence selection and sends only the exact recorded arrays with their source revisions and locators", async ({
  page,
}) => {
  const writes = await reads(page);
  await page.goto("/research-contributions.html?view=reviews");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page
    .getByLabel("Reason", { exact: true })
    .fill("The cited evidence supports this decision.");
  await expect(
    page.getByRole("button", { name: "Save decision", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Use supporting evidence 1", { exact: true }).check();
  await page.getByLabel("Use opposing evidence 1", { exact: true }).check();
  await page
    .getByText("Exact recorded location", { exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "immutable-revision-for",
  );
  await expect(page.getByRole("dialog")).toContainText("PE 0601102A");
  await page.getByLabel("Use opposing evidence 1", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Save decision", exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({
    params: { id: ids.portfolio, reviewId: review.id },
    body: {
      expectedRevision: 4,
      expectedPortfolioRevision: 1,
      decisionType: "include",
      evidenceFor: [forEvidence],
      evidenceAgainst: [],
    },
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("foreign analytics and review projections expose no received subject or source content", async ({
  page,
}) => {
  await reads(page, {
    "research.analytics": { ...analytics, portfolioId: ids.client },
    "research.reviews": [{ ...review, portfolioId: ids.client }],
  });
  await page.goto("/research-contributions.html");
  await expect(
    page.getByText("These analytics do not match the selected portfolio."),
  ).toBeVisible();
  await expect(page.getByText("Included subject", { exact: true })).toHaveCount(
    0,
  );
  await page.goto("/research-contributions.html?view=reviews");
  await expect(
    page.getByText("These reviews do not match the selected portfolio."),
  ).toBeVisible();
  await expect(page.getByText(review.targetId, { exact: true })).toHaveCount(0);
});

test("oversized canonical evidence is refused before dispatch and reducing the selection preserves every selected byte", async ({
  page,
}) => {
  const evidence = Array.from({ length: 34 }, (_, index) => ({
    ...forEvidence,
    sourceRevisionId: `revision-${index}`,
    quote: "界".repeat(10000),
  }));
  const writes = await reads(page, {
    "research.reviews": [
      { ...review, evidenceFor: evidence, evidenceAgainst: [] },
    ],
  });
  await page.goto("/research-contributions.html?view=reviews");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page
    .getByLabel("Reason", { exact: true })
    .fill("Use the exact selected evidence.");
  for (let index = 0; index < 34; index++)
    await page
      .getByLabel(`Use supporting evidence ${index + 1}`, { exact: true })
      .check();
  await expect(page.getByRole("alert")).toContainText("1 MB decision limit");
  await expect(
    page.getByRole("button", { name: "Save decision", exact: true }),
  ).toBeDisabled();
  expect(writes).toHaveLength(0);
  await page
    .getByLabel("Use supporting evidence 34", { exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Save decision", exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({
    body: { evidenceFor: evidence.slice(0, 33) },
  });
  expect(Buffer.byteLength(JSON.stringify(writes[0]))).toBeLessThan(1_000_000);
});

test("bulk review decisions preserve each selected revision and evidence and display mixed row outcomes", async ({
  page,
}) => {
  const rows = [
    review,
    {
      ...review,
      id: "30000000-0000-4000-8000-000000000002",
      targetId: "second-subject",
      revision: 7,
    },
    {
      ...review,
      id: "30000000-0000-4000-8000-000000000003",
      targetId: "third-subject",
      revision: 9,
    },
  ];
  const writes = await reads(page, {
    "research.reviews": rows,
    "research.reviews.bulk": {
      portfolioId: ids.portfolio,
      actorUserId: "owner",
      occurredAt: timestamp,
      outcomes: [
        {
          reviewId: rows[0]!.id,
          status: "decided",
          revision: 5,
          decisionId: "immutable-decision-1",
          message: null,
        },
        {
          reviewId: rows[1]!.id,
          status: "conflict",
          revision: 8,
          message: "This review changed.",
        },
        {
          reviewId: rows[2]!.id,
          status: "failed",
          revision: 9,
          message: "This review is cancelled.",
        },
      ],
    },
  });
  await page.goto("/research-contributions.html?view=reviews");
  for (const row of rows)
    await page
      .getByLabel(`Select review ${row.targetId}`, { exact: true })
      .check();
  await page
    .getByLabel("Reason for selected reviews", { exact: true })
    .fill("The selected citations support inclusion.");
  const apply = page.getByRole("button", {
    name: "Apply selected decisions",
    exact: true,
  });
  await expect(apply).toBeDisabled();
  for (const row of rows) {
    const details = page.locator("details").filter({
      has: page.getByText(
        `Evidence for ${row.targetId} · revision ${row.revision}`,
        { exact: true },
      ),
    });
    await details.locator("summary").first().click();
    await details
      .getByLabel("Use supporting evidence 1", { exact: true })
      .check();
  }
  await apply.click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({
    params: { id: ids.portfolio },
    body: {
      expectedRevision: 1,
      items: rows.map((row) => ({
        reviewId: row.id,
        expectedRevision: row.revision,
        decisionType: "include",
        reason: "The selected citations support inclusion.",
        evidenceFor: [forEvidence],
        evidenceAgainst: [],
      })),
    },
  });
  await expect(page.getByRole("status")).toContainText(
    "1 decided · 2 other outcomes",
  );
  const outcomes = page.getByRole("table", { name: "Bulk decision outcomes" });
  await expect(
    outcomes.getByRole("row").filter({ hasText: rows[0]!.id }),
  ).toContainText("immutable-decision-1");
  await expect(
    outcomes.getByRole("row").filter({ hasText: rows[1]!.id }),
  ).toContainText("conflict");
  await expect(
    outcomes.getByRole("row").filter({ hasText: rows[2]!.id }),
  ).toContainText("failed");
  await expect(
    outcomes.getByText("No decision recorded", { exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Read latest review queue", exact: true })
    .click();
  await expect(
    page.getByLabel(`Select review ${review.targetId}`, { exact: true }),
  ).not.toBeChecked();
});

test("bulk review lost acknowledgement retains its exact request through a queue read and retries only on explicit check", async ({
  page,
}) => {
  const writes: unknown[] = [];
  await reads(page);
  await page.route("**/api/capiro/research.reviews.bulk", async (route) => {
    writes.push(route.request().postDataJSON());
    if (writes.length === 1)
      await route.fulfill({
        status: 503,
        json: { message: "The result was not received." },
      });
    else
      await route.fulfill({
        json: {
          portfolioId: ids.portfolio,
          actorUserId: "owner",
          occurredAt: timestamp,
          outcomes: [
            {
              reviewId: review.id,
              status: "decided",
              revision: 5,
              decisionId: "immutable-decision-replayed",
              message: null,
            },
          ],
        },
      });
  });
  await page.goto("/research-contributions.html?view=reviews");
  await page
    .getByLabel(`Select review ${review.targetId}`, { exact: true })
    .check();
  await page.getByLabel("Bulk decision", { exact: true }).selectOption("defer");
  await page
    .getByLabel("Reason for selected reviews", { exact: true })
    .fill("Await the next source revision.");
  await page
    .getByRole("button", { name: "Apply selected decisions", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "The outcome is unconfirmed",
  );
  await expect(
    page.getByLabel("Reason for selected reviews", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Team", exact: true }).click();
  const retry = page.getByRole("button", {
    name: "Check same bulk request",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  expect(writes).toHaveLength(1);
  await retry.click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toEqual(writes[0]);
  await expect(page.getByRole("status")).toContainText(
    "1 decided · 0 other outcomes",
  );
  await expect(
    page.getByRole("table", { name: "Bulk decision outcomes" }),
  ).toContainText("immutable-decision-replayed");
});
