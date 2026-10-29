import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { settingsFixtures } from "./settings-fixtures";
import {
  reviewCandidate,
  reviewDate,
  reviewReceipt,
} from "../../tests/analyst-link-fixtures";
import type {
  LinkReviewAttempt,
  LinkReviewKind,
  LinkReviewReceipt,
} from "../../src/shared/capiro/operations/settings-admin/analyst-links";

async function fixture(page: Page, kind: LinkReviewKind) {
  await onlyLocalRequests(page);
  const state = {
    candidate: reviewCandidate(kind),
    writes: [] as LinkReviewAttempt[],
    lost: false,
    mismatch: false,
    refused: false,
    role: "capiro_admin",
    receipts: new Map<string, LinkReviewReceipt>(),
  };
  const handlers = {
    ...settingsFixtures,
    "me.read": () => ({ ...testIdentity, role: state.role }),
    "settings.hq.impersonation.active": { session: null },
    "settings.analyst.links.list": (raw: unknown) => {
      const input = raw as {
        query: { status: string; page: number; limit: number };
      };
      const { source, ...candidate } = state.candidate;
      const data =
        candidate.reviewStatus === input.query.status
          ? [
              {
                ...candidate,
                source: {
                  id: source.id,
                  title: "heading" in source ? source.heading : source.title,
                },
              },
            ]
          : [];
      return {
        schemaVersion: 1,
        kind,
        data,
        page: input.query.page,
        limit: 25,
        total: data.length,
        counts: { [candidate.reviewStatus]: 1 },
        observedAt: reviewDate,
      };
    },
    "settings.analyst.links.detail": () => ({
      schemaVersion: 1,
      candidate: state.candidate,
      lastReview:
        [...state.receipts.values()].find((r) => r.status !== "refused") ??
        null,
      observedAt: reviewDate,
    }),
  };
  await operationFixtures(page, handlers);
  await page.route(
    "**/api/capiro/settings.analyst.links.decide",
    async (route) => {
      const { params, body } = route.request().postDataJSON();
      const attempt = {
        kind: params.kind,
        candidateId: params.id,
        command: body,
      } as LinkReviewAttempt;
      state.writes.push(attempt);
      const existing = state.receipts.get(body.requestId);
      const receipt =
        existing ?? reviewReceipt(attempt, testIdentity.user.id, state.refused);
      state.receipts.set(body.requestId, receipt);
      if (receipt.status !== "refused")
        state.candidate = {
          ...state.candidate,
          reviewStatus: receipt.status,
          version: receipt.resultingVersion,
        };
      if (state.lost) return route.abort("connectionreset");
      return route.fulfill({
        json: {
          schemaVersion: 1,
          replayed: !!existing,
          receipt: state.mismatch
            ? { ...receipt, expectedVersion: "c".repeat(64) }
            : receipt,
        },
      });
    },
  );
  return state;
}
async function open(page: Page, kind: LinkReviewKind) {
  await page.goto("/settings/hq-analyst");
  await page
    .getByRole("tab", {
      name: kind === "sam" ? "SAM" : "Provision links (0)",
      exact: true,
    })
    .click();
}
async function inspect(page: Page) {
  await page.getByRole("button", { name: "Inspect evidence" }).click();
  await expect(page.getByLabel("Candidate evidence")).toBeVisible();
  await expect(page.getByLabel("Decision reason")).toBeEnabled();
  await page.getByLabel("Decision reason").fill("Synthetic evidence reviewed");
}
test("another tab recovers the reserved decision before it can send a different one", async ({
  page,
  context,
}) => {
  const first = await fixture(page, "sam");
  first.lost = true;
  await open(page, "sam");
  await inspect(page);
  const other = await context.newPage();
  const second = await fixture(other, "sam");
  await open(other, "sam");
  await inspect(other);
  await page.getByRole("button", { name: "Accept relationship" }).click();
  await expect(
    page.getByText("Original review outcome needs recovery"),
  ).toBeVisible();
  await other.getByRole("button", { name: "Reject relationship" }).click();
  await expect(
    other.getByText("Original review outcome needs recovery"),
  ).toBeVisible();
  expect(second.writes).toHaveLength(0);
  await other
    .getByRole("button", { name: "Recover original decision" })
    .click();
  await expect(
    other.getByText("Relationship accepted", { exact: true }),
  ).toBeVisible();
  expect(second.writes[0]).toEqual(first.writes[0]);
  await other.close();
});
test("revoked HQ authority stops a decision before dispatch", async ({
  page,
}) => {
  const state = await fixture(page, "provision");
  await open(page, "provision");
  await inspect(page);
  state.role = "user_admin";
  await page.getByRole("button", { name: "Accept relationship" }).click();
  await expect(
    page.getByText("Current HQ reviewer access is required.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Decision reason")).toBeDisabled();
  expect(state.writes).toHaveLength(0);
});
for (const kind of ["provision", "sam"] as const)
  test(
    kind + " review shows evidence, saves exact decision and refreshes status",
    async ({ page }) => {
      const state = await fixture(page, kind);
      await open(page, kind);
      await inspect(page);
      await expect(page.getByLabel("Candidate evidence")).toContainText(
        kind === "sam" ? "Original type: Presolicitation" : "FY 2027",
      );
      await page.getByRole("button", { name: "Accept relationship" }).click();
      await expect(
        page.getByText("Relationship accepted", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Last decision: accepted")).toBeVisible();
      expect(state.writes).toHaveLength(1);
      expect(state.writes[0]!.command.expectedVersion).toBe("a".repeat(64));
      await page.getByLabel("Review status").selectOption("accepted");
      await expect(
        page.getByRole("button", { name: "Inspect evidence" }),
      ).toHaveCount(1);
    },
  );
test("lost response survives reload and recovers the same request without a second effect", async ({
  page,
}) => {
  const state = await fixture(page, "sam");
  state.lost = true;
  await open(page, "sam");
  await inspect(page);
  await page.getByRole("button", { name: "Reject relationship" }).click();
  await expect(
    page.getByText("Original review outcome needs recovery"),
  ).toBeVisible();
  state.lost = false;
  await open(page, "sam");
  await page.getByRole("button", { name: "Recover original decision" }).click();
  await expect(
    page.getByText("Relationship rejected", { exact: true }),
  ).toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(state.writes[1]).toEqual(state.writes[0]);
  expect(state.receipts.size).toBe(1);
});
test("stale refusal refreshes evidence and mismatched receipts retain recovery", async ({
  page,
}) => {
  const state = await fixture(page, "provision");
  state.refused = true;
  await open(page, "provision");
  await inspect(page);
  await page.getByRole("button", { name: "Accept relationship" }).click();
  await expect(
    page.getByText("Review was not applied", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Decision reason")).toBeEnabled();
  state.refused = false;
  state.mismatch = true;
  await page.getByLabel("Decision reason").fill("New evidence reviewed");
  await page.getByRole("button", { name: "Accept relationship" }).click();
  await expect(
    page.getByText("Original review outcome needs recovery"),
  ).toBeVisible();
  await expect(
    page.getByText("Relationship accepted", { exact: true }),
  ).toHaveCount(0);
  state.mismatch = false;
  await page.getByRole("button", { name: "Recover original decision" }).click();
  await expect(
    page.getByText("Relationship accepted", { exact: true }),
  ).toBeVisible();
  expect(state.receipts.size).toBe(2);
});
