import { test, expect } from "@playwright/test";
import { parseMemoryReviewDetail } from "@capiro/shared/memory-review";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

const id = (n: number) =>
  `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function review() {
  const revision = {
    candidateId: id(1),
    reviewRequestId: id(2),
    revisionNumber: 2,
    predecessorCandidateId: id(3),
    supersededById: null,
    title: "user:synthetic-key:learning-signal",
    status: "approved",
    submittedBy: { userId: testIdentity.user.id, name: "Synthetic author" },
    assignedReviewer: {
      userId: testIdentity.user.id,
      name: "Synthetic reviewer",
    },
    decidedBy: { userId: testIdentity.user.id, name: "Synthetic reviewer" },
    createdAt: "2026-11-01T10:00:00.000Z",
    decidedAt: "2026-11-01T11:00:00.000Z",
  };
  return parseMemoryReviewDetail({
    ...revision,
    candidateKind: "standard",
    scope: "firm",
    client: null,
    rootCandidateId: id(3),
    blockedReason: null,
    nextAction: "none",
    capabilities: {
      open: true,
      approve: false,
      reject: false,
      requestChanges: false,
      revise: false,
      reassign: false,
      withdraw: false,
    },
    proposal: {
      key: "synthetic",
      value: "Synthetic proposed content for this historical review.",
      canonicalItem: null,
    },
    feedbackReason: "Synthetic recorded feedback",
    eligibleReviewers: [],
    timeline: [
      {
        ...revision,
        candidateId: id(3),
        reviewRequestId: id(4),
        revisionNumber: 1,
        title: "Earlier public label",
        status: "superseded",
        predecessorCandidateId: null,
        supersededById: id(1),
      },
      revision,
    ],
    controllingMemory: null,
    activeMemoryUnchanged: false,
  });
}

for (const width of [1440, 390]) {
  test(`presentation review preserves historical facts and disabled decisions at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1040 });
    await onlyLocalRequests(page);
    let reads = 0;
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/"))
        writes.push(request.url());
    });
    await operationFixtures(page, {
      "me.read": testIdentity,
      "memory.review.request": () => {
        reads++;
        return review();
      },
    });
    await page.goto(`/__test/presentation-audit?reviewId=${id(2)}`);
    const panel = page.getByRole("region", {
      name: "Memory review",
      exact: true,
    });
    await expect(
      panel.getByRole("heading", { name: "Memory review", exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByText("Firm memory · Revision 2 · Approved"),
    ).toBeVisible();
    await expect(
      panel.getByText("Revision 1: Earlier public label · Superseded"),
    ).toBeVisible();
    await expect(
      panel.getByText("Revision 2 · Approved", { exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByText(/No decision is currently permitted/),
    ).toBeVisible();
    await expect(
      panel.getByText("Review feedback: Synthetic recorded feedback"),
    ).toBeVisible();
    await expect(
      panel.getByText(/Active memory remains unchanged/),
    ).toHaveCount(0);
    const record = panel.getByRole("button", { name: "Record decision" });
    await expect(record).toBeDisabled();
    const summary = panel.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(panel.locator("details")).toHaveAttribute("open", "");
    await expect(
      panel
        .locator("dd")
        .filter({ hasText: "user:synthetic-key:learning-signal" })
        .first(),
    ).toBeVisible();
    await panel.getByRole("checkbox").check();
    await expect(record).toBeDisabled();
    expect(reads).toBe(1);
    expect(writes).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`review-${width}.png`),
      fullPage: true,
    });
  });

  test(`presentation bounded zero keeps warnings visible and details inert at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1040 });
    await onlyLocalRequests(page);
    await operationFixtures(page, { "me.read": testIdentity });
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/"))
        writes.push(request.url());
    });
    await page.goto("/__test/presentation-audit");
    const panel = page.getByRole("region", {
      name: "Returned recommendations",
    });
    await expect(
      panel.getByRole("heading", {
        name: "No recommendations returned on this page",
      }),
    ).toBeVisible();
    const coverage = panel.getByLabel("Recommendation coverage");
    await expect(coverage.getByText(/Coverage is limited/)).toBeVisible();
    await expect(coverage.getByText(/Freshness is unknown/)).toBeVisible();
    await expect(
      coverage.getByText("Source action_items_complete: partial."),
    ).toBeVisible();
    await expect(coverage.getByText(/Only page 1 was checked/)).toBeVisible();
    await expect(panel.getByRole("button")).toHaveCount(0);
    const summary = panel.locator("summary");
    await summary.focus();
    await page.keyboard.press("Space");
    await expect(panel.locator("details")).toHaveAttribute("open", "");
    await expect(
      panel.locator("details").getByText(/Enumeration: unknown/),
    ).toBeVisible();
    await expect(
      panel.locator("details").getByText(/Evidence ready: false/),
    ).toBeVisible();
    expect(writes).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`actions-${width}.png`),
      fullPage: true,
    });
  });
}
