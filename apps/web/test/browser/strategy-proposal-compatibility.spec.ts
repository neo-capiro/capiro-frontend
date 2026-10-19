import {
  expect,
  test,
  type Page,
  type Route,
  type Locator,
} from "@playwright/test";
import { operationFixtures, onlyLocalRequests } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { strategyChangeSet } from "../../src/shared/capiro/operations/strategy-change-set";

const id = "51000000-0000-4000-8000-000000000001";
const otherId = "51000000-0000-4000-8000-000000000002";
const recognized = {
  op: "update",
  nodeId: id,
  title: "Synthetic selective change",
  sources: [{ section: "Synthetic original", ref: "fixture/original" }],
};
const originalOps = [
  {
    op: "synthetic-unrecognized",
    title: "Opaque audit entry",
    nested: { preserved: [1, null] },
  },
  { op: "remove", nodeId: id, title: "Synthetic removable change" },
  recognized,
];
function proposal(extra: Record<string, unknown> = {}) {
  return strategyChangeSet.parse({
    id,
    strategyId: id,
    summary: "Synthetic mixed queue proposal",
    ops: originalOps,
    risk: "low",
    status: "proposed",
    strategyVersionId: id,
    appliedVersionId: null,
    createdAt: "2026-10-14T12:00:00Z",
    appliedAt: null,
    approvedAt: null,
    ...extra,
  });
}
const detail = {
  id,
  clientId: id,
  title: "Synthetic strategy",
  type: "regulatory",
  ownerUserId: null,
  goal: null,
  meriContext: null,
  targetDate: null,
  lastEditedAt: "2026-10-14T12:00:00Z",
  nodes: [],
};
type Write = { key: string; input: unknown };
async function fixture(page: Page, rows = [proposal()]) {
  const state = {
    rows,
    writes: [] as Write[],
    pageErrors: [] as string[],
    external: [] as string[],
  };
  page.on("pageerror", (error) => state.pageErrors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      state.external.push(request.url());
  });
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "strategies.firm-review": [],
    "strategies.proposals": () => state.rows,
    "strategies.proposal.approve": (input) => {
      state.writes.push({ key: "approve", input });
      state.rows = [
        proposal({
          status: "approved",
          approvedOps: [recognized],
          approvedAt: "2026-10-14T12:10:00Z",
        }),
        ...state.rows.slice(1),
      ];
      return state.rows[0];
    },
    "strategies.proposal.reject": (input) => {
      state.writes.push({ key: "reject", input });
      const rejected = strategyChangeSet.parse({
        ...state.rows[0]!,
        status: "rejected",
      });
      state.rows = [rejected, ...state.rows.slice(1)];
      return rejected;
    },
    "strategies.proposal.apply": (input) => {
      state.writes.push({ key: "apply", input });
      state.rows = [
        {
          ...state.rows[0]!,
          status: "applied",
          appliedAt: "2026-10-14T12:20:00Z",
        },
        ...state.rows.slice(1),
      ];
      return detail;
    },
    "strategies.proposal.undo": (input) => {
      state.writes.push({ key: "undo", input });
      state.rows = [
        { ...state.rows[0]!, status: "undone" },
        ...state.rows.slice(1),
      ];
      return detail;
    },
  });
  return state;
}
function button(scope: Page | Locator, name: string) {
  return scope.getByRole("button", { name, exact: true });
}
function review(page: Page) {
  return page.getByRole("dialog", {
    name: "Review proposed changes",
    exact: true,
    includeHidden: true,
  });
}
async function openFirstReview(page: Page) {
  await page.goto("/modules/strategies?view=review");
  await button(page, "Review change details").first().click();
  await expect(review(page)).toBeVisible();
}
async function refresh(page: Page, kind: string) {
  await page.evaluate(
    (detail) =>
      dispatchEvent(new CustomEvent("test:proposal-refresh", { detail })),
    kind,
  );
}
function expectIsolated(state: Awaited<ReturnType<typeof fixture>>) {
  expect(state.external).toEqual([]);
  expect(state.pageErrors).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`desktop ${colorScheme}: mixed queue preserves unsupported audit and compact approval/apply indexes`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme });
    const state = await fixture(page, [
      proposal(),
      proposal({
        id: otherId,
        summary: "Synthetic opaque-only queue entry",
        ops: [
          { title: "Missing discriminator" },
          { op: 17 },
          null,
          "Stored text",
          [],
          { op: "add", title: 4 },
          { op: "update", sources: [{ section: null }] },
        ],
      }),
    ]);
    await page.goto("/modules/strategies?view=review");
    await expect(
      page.getByText("Synthetic opaque-only queue entry", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Unsupported change");
    await expect(
      page.getByText("Unsupported change", { exact: true }).first(),
    ).toBeVisible();
    await button(page, "Review change details").first().click();
    const modal = review(page);
    await expect(modal.getByRole("checkbox")).toHaveCount(3);
    await expect(modal.getByRole("checkbox").nth(0)).toBeDisabled();
    await expect(modal.getByRole("checkbox").nth(0)).not.toBeChecked();
    await expect(modal.getByRole("checkbox").nth(1)).toBeChecked();
    await expect(modal.getByRole("checkbox").nth(2)).toBeChecked();
    await modal.getByRole("checkbox").nth(1).uncheck();
    await button(modal, "Approve selected").click();
    await button(page, "Confirm decision").click();
    await expect(modal).toHaveCount(0);
    expect(state.writes).toEqual([
      { key: "approve", input: { params: { id }, body: { opIndexes: [2] } } },
    ]);
    await expect(
      page.getByText("Synthetic opaque-only queue entry", { exact: true }),
    ).toBeVisible();
    await button(page, "Review change details").first().click();
    await expect(modal.getByRole("checkbox")).toHaveCount(1);
    await expect(modal.getByRole("checkbox").nth(0)).toBeChecked();
    await expect(modal).toContainText("Original stored details");
    await expect(modal).toContainText("Opaque audit entry");
    await expect(modal).toContainText("Synthetic removable change");
    await expect(modal).toContainText("fixture/original");
    await page.screenshot({
      path: info.outputPath(`strategy-compatibility-${colorScheme}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await button(modal, "Apply 1 changes").click();
    await button(page, "Confirm decision").click();
    await expect(modal).toHaveCount(0);
    expect(state.writes[1]).toEqual({
      key: "apply",
      input: { params: { id }, body: { opIndexes: [0] } },
    });
    await button(page, "Undo applied changes").click();
    await expect(button(modal, "Approve selected")).toBeDisabled();
    await expect(modal.getByRole("button", { name: /^Apply / })).toBeDisabled();
    await button(modal, "Undo applied changes").click();
    await button(page, "Confirm decision").click();
    await expect(modal).toHaveCount(0);
    expect(state.writes.map((write) => write.key)).toEqual([
      "approve",
      "apply",
      "undo",
    ]);
    expectIsolated(state);
  });
}

test("unsupported-only proposal remains readable and rejectable without executable selection", async ({
  page,
}) => {
  const state = await fixture(page, [
    proposal({ ops: [originalOps[0], null, "Stored opaque primitive"] }),
  ]);
  await openFirstReview(page);
  const modal = review(page);
  await expect(modal.getByRole("checkbox")).toHaveCount(3);
  for (const checkbox of await modal.getByRole("checkbox").all()) {
    await expect(checkbox).toBeDisabled();
    await expect(checkbox).not.toBeChecked();
  }
  await expect(modal).toContainText(
    "This stored operation cannot be selected or applied.",
  );
  await expect(modal).toContainText("Stored opaque primitive");
  await expect(button(modal, "Approve selected")).toBeDisabled();
  await expect(modal.getByRole("button", { name: /^Apply / })).toBeDisabled();
  await button(modal, "Reject change set").click();
  await button(page, "Confirm decision").click();
  await expect(modal).toHaveCount(0);
  expect(state.writes).toEqual([{ key: "reject", input: { params: { id } } }]);
  expectIsolated(state);
});

test("approved-only opaque entry retains its exact application index and raw audit", async ({
  page,
}) => {
  const opaque = {
    op: "synthetic-approved-opaque",
    title: "Only approved audit",
    approvedProof: { stored: "approved-index-zero" },
  };
  const state = await fixture(page, [
    proposal({ status: "approved", approvedOps: [opaque, recognized] }),
  ]);
  await openFirstReview(page);
  const modal = review(page);
  await expect(modal.getByRole("checkbox")).toHaveCount(2);
  await expect(modal.getByRole("checkbox").nth(0)).toBeDisabled();
  await expect(modal.getByRole("checkbox").nth(0)).not.toBeChecked();
  await expect(modal.getByRole("checkbox").nth(1)).toBeChecked();
  await expect(button(modal, "Approve selected")).toBeDisabled();
  await expect(button(modal, "Reject change set")).toBeEnabled();
  const audit = modal.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Stored application selection details",
      exact: true,
    }),
  });
  await expect(audit).toBeVisible();
  await audit.locator("summary").filter({ hasText: "Operation 1" }).click();
  await expect(audit.locator("pre").first()).toHaveText(
    JSON.stringify(opaque, null, 2),
  );
  await expect(audit.locator("pre").first()).toBeVisible();
  const original = modal.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Original change details",
      exact: true,
    }),
  });
  await expect(original).toContainText("Opaque audit entry");
  await expect(original).toContainText("Synthetic removable change");
  await button(modal, "Apply 1 changes").click();
  await button(page, "Confirm decision").click();
  await expect(modal).toHaveCount(0);
  expect(state.writes).toEqual([
    { key: "apply", input: { params: { id }, body: { opIndexes: [1] } } },
  ]);
  expectIsolated(state);
});

test("stale409 stays visible with both dialogs and never retries the mutation", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.route("**/api/capiro/strategies.proposal.apply", (route) => {
    state.writes.push({ key: "apply", input: route.request().postDataJSON() });
    return route.fulfill({
      status: 409,
      json: { message: "Synthetic pinned plan changed. Reload the proposal." },
    });
  });
  await openFirstReview(page);
  await button(review(page), "Apply 2 changes").click();
  await button(page, "Confirm decision").click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic pinned plan changed. Reload the proposal.",
  );
  await expect(review(page)).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Apply selected changes?", exact: true }),
  ).toBeVisible();
  expect(state.writes).toHaveLength(1);
  await button(page, "Back to review").click();
  await expect(review(page)).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expectIsolated(state);
});

test("synchronous duplicate confirmation sends one pending request", async ({
  page,
}) => {
  const state = await fixture(page);
  let held: Route | undefined;
  await page.route("**/api/capiro/strategies.proposal.apply", (route) => {
    state.writes.push({ key: "apply", input: route.request().postDataJSON() });
    held = route;
  });
  await page.goto("/__test/strategy-proposal-refresh");
  await button(review(page), "Apply 2 changes").click();
  await button(page, "Confirm decision").evaluate(
    (button: HTMLButtonElement) => {
      button.click();
      button.click();
    },
  );
  await expect.poll(() => Boolean(held)).toBe(true);
  await expect(button(page, "Saving…")).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  await held!.fulfill({ json: detail });
  await expect(page.getByTestId("proposal-saved")).toHaveText(
    "Saved callbacks: 1",
  );
  await expect(page.getByTestId("proposal-closed")).toHaveText(
    "Closed callbacks: 1",
  );
  expect(state.writes).toHaveLength(1);
  expectIsolated(state);
});

for (const kind of [
  "content",
  "status",
  "pin",
  "approved-empty",
  "unavailable",
]) {
  test(`same-ID ${kind} refresh invalidates selection and confirmation`, async ({
    page,
  }) => {
    const state = await fixture(page);
    await page.goto("/__test/strategy-proposal-refresh");
    await review(page).getByRole("checkbox").nth(1).uncheck();
    await button(review(page), "Approve selected").click();
    await expect(button(page, "Confirm decision")).toBeVisible();
    await refresh(page, kind);
    await expect(button(page, "Confirm decision")).toHaveCount(0);
    await expect(review(page)).toContainText(
      "The stored proposal changed. Review the current operations before confirming.",
    );
    for (const checkbox of await review(page).getByRole("checkbox").all())
      await expect(checkbox).not.toBeChecked();
    if (kind === "approved-empty")
      await expect(review(page).getByRole("checkbox")).toHaveCount(0);
    await expect(button(review(page), "Approve selected")).toBeDisabled();
    await expect(
      review(page).getByRole("button", { name: /^Apply / }),
    ).toBeDisabled();
    expect(state.writes).toEqual([]);
    expectIsolated(state);
  });
}

test("refresh during a pending request retires old completion callbacks and selection", async ({
  page,
}) => {
  const state = await fixture(page);
  let held: Route | undefined;
  let settled = false;
  page.on("requestfinished", (request) => {
    if (request.url().endsWith("strategies.proposal.apply")) settled = true;
  });
  page.on("requestfailed", (request) => {
    if (request.url().endsWith("strategies.proposal.apply")) settled = true;
  });
  await page.route("**/api/capiro/strategies.proposal.apply", (route) => {
    state.writes.push({ key: "apply", input: route.request().postDataJSON() });
    held = route;
  });
  await page.goto("/__test/strategy-proposal-refresh");
  await button(review(page), "Apply 2 changes").click();
  await button(page, "Confirm decision").click();
  await expect.poll(() => Boolean(held)).toBe(true);
  await refresh(page, "content");
  await expect(button(page, "Confirm decision")).toHaveCount(0);
  await expect(review(page)).toContainText("Replacement recognized step");
  await held!.fulfill({ json: detail }).catch(() => {});
  await expect.poll(() => settled).toBe(true);
  await expect(page.getByTestId("proposal-saved")).toHaveText(
    "Saved callbacks: 0",
  );
  await expect(page.getByTestId("proposal-closed")).toHaveText(
    "Closed callbacks: 0",
  );
  await expect(review(page)).toBeVisible();
  for (const checkbox of await review(page).getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked();
  expect(state.writes).toHaveLength(1);
  expectIsolated(state);
});

for (const status of ["rejected", "undone", "stale", "superseded"]) {
  test(`${status} review preserves audit but denies approve/apply/reject/undo`, async ({
    page,
  }) => {
    const state = await fixture(page);
    await page.goto(`/__test/strategy-proposal-refresh?status=${status}`);
    await expect(review(page)).toContainText("Original stored details");
    for (const name of ["Approve selected", "Reject change set"])
      await expect(
        review(page).getByRole("button", { name, exact: true }),
      ).toBeDisabled();
    await expect(
      review(page).getByRole("button", { name: /^Apply / }),
    ).toBeDisabled();
    await expect(button(review(page), "Undo applied changes")).toHaveCount(0);
    expect(state.writes).toEqual([]);
    expectIsolated(state);
  });
}
