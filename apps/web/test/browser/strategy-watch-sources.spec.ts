import { expect, type Route } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { client, clientId, setup } from "./next-modules-fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

const id = "51000000-0000-4000-8000-000000000001";
const head = "61000000-0000-4000-8000-000000000001";
const nextHead = "61000000-0000-4000-8000-000000000002";
const finding = {
  code: "cited-source-stale",
  severity: "warning",
  nodeIds: [id],
  category: "context",
  title: "Cited source needs review",
  message: "Cited source evidence changed or is no longer available.",
  impact: "These steps still cite an older or unavailable source.",
  suggestion: "Review the current source before revising these steps.",
  whyCompared: [
    "saved fact citation",
    "current document revision and fact state",
  ],
  sortRank: 4,
};
const snapshot = {
  strategyId: id,
  headVersionId: head,
  mission: null,
  pendingCount: 0,
  proposals: [],
  sourceFindings: [finding],
  lastRecheck: null,
};
const strategy = {
  id,
  clientId,
  title: "Synthetic cited-source strategy",
  type: "appropriations",
  ownerUserId: null,
  goal: "Review the current source",
  meriContext: null,
  targetDate: null,
  lastEditedAt: "2026-10-15T12:00:00Z",
  nodes: [],
};

test("Watch reads and explicit checks stay truthful across drift, uncertainty and reload at desktop/narrow", async ({
  page,
}, info) => {
  let response: object = snapshot;
  let reads = 0;
  let held: Route | undefined;
  const checks: unknown[] = [];
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/capiro/"))
      writes.push(
        decodeURIComponent(new URL(request.url()).pathname.split("/").pop()!),
      );
  });
  await setup(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "strategies.detail": strategy,
    "strategies.calendars": {
      congress: [],
      ppbeLanes: [],
      ppbeCurrentPhases: [],
      source: {},
    },
    "strategies.watch.state": () => {
      reads++;
      return response;
    },
  });
  await page.route("**/api/capiro/strategies.watch.revalidate", (route) => {
    checks.push(route.request().postDataJSON());
    held = route;
  });
  await page.goto(`/modules/strategies?clientId=${clientId}&strategy=${id}`);
  const panel = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Watch review", exact: true }),
    })
    .last();
  const check = panel.getByRole("button", { name: "Check now", exact: true });
  const refresh = panel.getByRole("button", {
    name: "Refresh review",
    exact: true,
  });
  await expect(
    panel.getByRole("heading", { name: finding.title, exact: true }),
  ).toBeVisible();
  await expect(panel).toContainText(head);
  await expect(panel).toContainText("0 pending proposals");
  expect(checks).toHaveLength(0);
  await panel.screenshot({
    path: info.outputPath("watch-sources-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toContainText(finding.message);
  const box = await panel.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(
    await panel.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await panel.screenshot({ path: info.outputPath("watch-sources-narrow.png") });
  await check.click();
  await expect(
    panel.getByRole("button", { name: "Checking…", exact: true }),
  ).toBeDisabled();
  await expect(refresh).toBeDisabled();
  await expect(
    panel.getByRole("heading", { name: finding.title, exact: true }),
  ).toHaveCount(0);
  await expect.poll(() => !!held).toBe(true);
  await held!.fulfill({
    json: {
      ...snapshot,
      headVersionId: nextHead,
      lastRecheck: {
        state: "failed",
        elapsedMs: 10,
        unchanged: [],
        updated: [],
        dropped: [],
      },
    },
  });
  await expect(panel).toContainText("This snapshot is not a completed check.");
  await expect(panel).toContainText(nextHead);
  await expect(panel).not.toContainText(head);
  expect(checks).toEqual([
    { params: { strategyId: id }, query: { force: "true" } },
  ]);
  expect(reads).toBe(1);
  response = { ...snapshot, sourceFindings: undefined };
  await refresh.click();
  await expect(panel).toContainText("Cited-source advisories are unavailable");
  await expect(panel).not.toContainText("No cited-source advisory");
  response = { ...snapshot, strategyId: nextHead };
  await refresh.click();
  await expect(panel).toContainText(
    "does not match the requested strategy and revision",
  );
  await expect(check).toBeDisabled();
  await expect(
    panel.getByRole("heading", { name: finding.title, exact: true }),
  ).toHaveCount(0);
  response = { ...snapshot, sourceFindings: [] };
  await refresh.click();
  await expect(panel).toContainText(
    "No cited-source advisory was reported for this snapshot.",
  );
  held = undefined;
  await check.click();
  await expect.poll(() => !!held).toBe(true);
  await held!.fulfill({
    status: 503,
    json: { message: "Synthetic check unavailable" },
  });
  await expect(panel).toContainText("The check result is not confirmed.");
  await expect(check).toBeDisabled();
  expect(reads).toBe(4);
  expect(checks).toHaveLength(2);
  response = snapshot;
  await refresh.click();
  await expect(
    panel.getByRole("heading", { name: finding.title, exact: true }),
  ).toBeVisible();
  await expect(panel).not.toContainText("The check result is not confirmed.");
  await page.reload();
  await expect(
    panel.getByRole("heading", { name: finding.title, exact: true }),
  ).toBeVisible();
  expect(checks).toHaveLength(2);
  expect(writes).toEqual([
    "strategies.watch.revalidate",
    "strategies.watch.revalidate",
  ]);
});
