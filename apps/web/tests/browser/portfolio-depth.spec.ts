import { test, expect, type Page } from "@playwright/test";
import { capability, capabilityId, clientId, json } from "./fixtures";
import { installCapabilityBoundary } from "./capability-boundary-fixtures";

const proposalId = "60000000-0000-4000-8000-000000000001";
const termId = "60000000-0000-4000-8000-000000000002";
const evidence = [
  {
    title: "Synthetic company source",
    excerpt: "Synthetic fixture passage, not a real-world claim.",
    observedAt: "2026-01-01T00:00:00Z",
    sourceType: "company",
    url: "https://example.test/evidence",
  },
];
async function installDepth(page: Page) {
  const unexpected = await installCapabilityBoundary(page);
  let proposal = {
    id: proposalId,
    kind: "alignment",
    capabilityId,
    status: "proposed",
    version: 1,
    evidence,
    payload: {
      targetType: "tag",
      value: "synthetic sensing",
      rationale: "Synthetic supported relevance",
      score: 90,
    },
  };
  let dismissed = false;
  const term = {
    id: termId,
    capabilityId,
    kind: "keyword",
    value: "synthetic sensing",
    evidence,
    approvedAt: "2026-01-01T00:00:00Z",
  };
  const source = {
    id: "bill:synthetic",
    capabilityId,
    itemKind: "bill",
    itemId: "synthetic",
    status: "active",
    termIds: [termId],
    title: "Synthetic tracked source",
    url: "https://example.test/bill",
    occurredAt: "2026-01-01T00:00:00Z",
    dateKind: "published",
    explanation: "Matches approved term: synthetic sensing",
  };
  const depth = () => ({
    capabilities: [capability],
    proposals: [proposal],
    terms: proposal.status === "approved" ? [term] : [],
    tracking: [],
    relationships: [],
    supports: [],
    memberView: { fields: [], gaps: ["cost"] },
    sectorAnchors: [
      {
        id: "60000000-0000-4000-8000-000000000003",
        kind: "sector_anchor",
        capabilityId,
        status: "proposed",
        version: 1,
        evidence,
        payload: {
          sector: "defense",
          pe: "0000000T",
          maturity: { current: "Test readiness", steps: ["Test readiness"] },
        },
      },
    ],
    businessUnits: [],
  });
  await page.route(`**/clients/${clientId}/portfolio/depth`, (route) =>
    json(route, depth()),
  );
  await page.route(
    `**/clients/${clientId}/capabilities/${capabilityId}/alignment/${proposalId}/review`,
    async (route) => {
      const command = route.request().postDataJSON();
      expect(command.expectedVersion).toBe(proposal.version);
      proposal = {
        ...proposal,
        status:
          command.action === "approve"
            ? "approved"
            : command.action === "reject"
              ? "rejected"
              : "proposed",
        version: proposal.version + 1,
      };
      await json(route, proposal);
    },
  );
  await page.route(
    `**/clients/${clientId}/capabilities/${capabilityId}/tracking`,
    async (route) => {
      if (route.request().method() === "POST") {
        const command = route.request().postDataJSON();
        dismissed = command.action === "dismiss";
        await json(route, {
          ...source,
          status: dismissed ? "dismissed" : "active",
        });
      } else
        await json(route, {
          items:
            proposal.status === "approved"
              ? [{ ...source, status: dismissed ? "dismissed" : "active" }]
              : [],
          pending:
            proposal.status === "approved"
              ? []
              : [
                  {
                    ...source,
                    status: "pending",
                    termIds: [proposalId],
                    explanation: "Waiting on approval: synthetic sensing",
                  },
                ],
          terms: proposal.status === "approved" ? [term] : [],
          clientTrackingPreserved: true,
          sourceStatus: "ready",
          gaps: [],
          truncated: false,
        });
    },
  );
  await page.route("**/client-account-owners/options", (route) =>
    json(route, []),
  );
  return unexpected;
}
test("approval activates sourced tracking and remembers dismissal and restoration", async ({
  page,
}) => {
  const unexpected = await installDepth(page);
  await page.goto("/portfolio-depth.html");
  await expect(
    page.getByRole("heading", { name: "synthetic sensing", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Verification view").selectOption("tracking");
  await expect(
    page.getByText(
      "Approve a keyword, tag or program line to start capability tracking.",
    ),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "View", exact: true })
    .selectOption("pending");
  await expect(
    page.getByText("Excluded from the active feed until its term is approved."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Not relevant" })).toHaveCount(
    0,
  );
  await page.getByLabel("Verification view").selectOption("alignment");
  await page.getByRole("button", { name: "Approve term", exact: true }).click();
  await expect(
    page.getByText(/Approved · Source and review retained/),
  ).toBeVisible();
  await page.getByLabel("Verification view").selectOption("tracking");
  await expect(
    page.getByRole("heading", { name: "Synthetic tracked source" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not relevant" }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic tracked source" }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "View", exact: true })
    .selectOption("dismissed");
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await page
    .getByRole("combobox", { name: "View", exact: true })
    .selectOption("active");
  await expect(page.getByRole("link", { name: "Open source" })).toHaveAttribute(
    "href",
    "https://example.test/bill",
  );
  expect(unexpected).toEqual([]);
});
test("rejection survives reload and is explicitly restored", async ({
  page,
}) => {
  await installDepth(page);
  await page.goto("/portfolio-depth.html");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("Rejection is remembered until you restore this proposal."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Approve term", exact: true }),
  ).toBeVisible();
});
test("all location states remain readable on narrow screens with occupancy separate", async ({
  page,
}) => {
  await installDepth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/portfolio-depth.html");
  await page.getByLabel("Verification view").selectOption("locations");
  for (const state of [
    "Resolved",
    "Needs address",
    "Ambiguous",
    "Source unavailable",
    "International",
    "Boundary changed",
    "Unconfirmed site",
  ])
    await expect(page.getByText(state, { exact: true }).first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("case gaps stay explicit and relationship failures do not display cached sources", async ({
  page,
}) => {
  await installDepth(page);
  await page.goto("/portfolio-depth.html");
  await page.getByLabel("Verification view").selectOption("case");
  await expect(page.getByText("Evidence missing", { exact: true })).toHaveCount(
    12,
  );
  await page.route(`**/clients/${clientId}/portfolio/depth`, (route) =>
    json(route, { message: "Synthetic access restriction" }, 403),
  );
  await page.reload();
  await page.getByLabel("Verification view").selectOption("offices");
  await expect(
    page.getByText("You do not have permission for this operation.").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve relationship" }),
  ).toHaveCount(0);
  await expect(page.getByText("Synthetic company source")).toHaveCount(0);
});

test("a denied source refresh removes previously visible sector evidence", async ({
  page,
}) => {
  await installDepth(page);
  await page.goto("/portfolio-depth.html");
  await page.getByLabel("Verification view").selectOption("sectors");
  await expect(
    page.getByRole("heading", { name: "PE 0000000T" }),
  ).toBeVisible();
  await page
    .getByText("Sources and supporting evidence · 1", { exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /Synthetic company source/ }),
  ).toBeVisible();
  await page.route(`**/clients/${clientId}/portfolio/depth`, (route) =>
    json(route, { message: "Synthetic access restriction" }, 403),
  );
  await page.getByRole("button", { name: "Refresh verification data" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "You do not have permission for this operation.",
  );
  await expect(page.getByRole("heading", { name: "PE 0000000T" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: /Synthetic company source/ }),
  ).toHaveCount(0);
  await expect(page.getByText("No sourced sector anchor yet.")).toHaveCount(0);
});
