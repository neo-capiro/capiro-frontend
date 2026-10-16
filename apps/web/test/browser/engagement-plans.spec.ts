import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  engagementPlanCreateBody,
  engagementPlanWaveCreateBody,
  engagementPlanWavePatchBody,
  engagementPlanPatchBody,
} from "../../src/shared/capiro/operations/engagement-plans";
import {
  clientId,
  manualPlan,
  now,
  openPlan,
  otherId,
  planFixture,
  planId,
  planList,
  planVersion,
  rawSnapshot,
  waveId,
} from "./engagement-plans-fixtures";

test.use({ viewport: { width: 1440, height: 1040 } });

test("Engagement plans preserve original create payload on explicit reconciliation and use the current version for a new wave", async ({
  page,
}, info) => {
  const { state } = await planFixture(page, []);
  const creates: unknown[] = [];
  await page.route("**/api/capiro/engagement.plans.create", async (route) => {
    const input = route.request().postDataJSON();
    const body = engagementPlanCreateBody.parse(input.body);
    creates.push(input);
    if (creates.length === 1) {
      state.plans = [{ ...manualPlan(1), title: body.title, waves: [] }];
      return route.fulfill({
        status: 503,
        json: { message: "Synthetic lost create response" },
      });
    }
    state.plans = [planVersion(state.plans[0]!, 3)];
    await route.fulfill({
      json: {
        receipt: {
          operation: "create_plan",
          planId,
          clientId,
          planVersion: 1,
          requestId: body.requestId,
        },
        reconciled: true,
        aggregate: state.plans[0],
      },
    });
  });
  let waveInput: unknown;
  await page.route(
    "**/api/capiro/engagement.plans.wave.create",
    async (route) => {
      waveInput = route.request().postDataJSON();
      const body = engagementPlanWaveCreateBody.parse(
        (waveInput as { body: unknown }).body,
      );
      const plan = state.plans[0]!;
      state.plans = [
        planVersion(plan, 4, {
          waves: [{ ...manualPlan(4).waves[0]!, title: body.title }],
        }),
      ];
      await route.fulfill({
        json: {
          receipt: {
            operation: "create_wave",
            planId,
            clientId,
            waveId,
            planVersion: 4,
            requestId: body.requestId,
          },
          reconciled: false,
          aggregate: state.plans[0],
        },
      });
    },
  );
  await page.goto(`/modules/engagement?view=plan&clientId=${clientId}`);
  await page
    .getByRole("button", { name: "+ New engagement plan", exact: true })
    .click();
  const create = page.getByRole("dialog", {
    name: "New engagement plan",
    exact: true,
  });
  await create
    .getByLabel("Plan title", { exact: true })
    .fill("Synthetic created plan");
  await create
    .getByRole("button", { name: "Create draft plan", exact: true })
    .click();
  await expect(create.getByText(/Creation is unconfirmed/)).toBeVisible();
  await expect(create.getByLabel("Plan title", { exact: true })).toBeDisabled();
  expect(creates).toHaveLength(1);
  await create
    .getByRole("button", { name: "Reconcile original creation", exact: true })
    .click();
  await expect(create).toHaveCount(0);
  expect(creates[1]).toEqual(creates[0]);
  const detail = page.getByRole("region", {
    name: "Selected engagement plan",
    exact: true,
  });
  await expect(detail.getByText("Version 3", { exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "+ Add wave", exact: true }).click();
  const wave = page.getByRole("dialog", { name: "Add wave", exact: true });
  await wave
    .getByLabel("Wave title", { exact: true })
    .fill("Synthetic new wave");
  await wave.getByRole("button", { name: "Create wave", exact: true }).click();
  await expect(wave).toHaveCount(0);
  await expect(
    detail.getByRole("heading", { name: "Synthetic new wave", exact: true }),
  ).toBeVisible();
  expect(
    (waveInput as { body: { expectedPlanVersion: number } }).body
      .expectedPlanVersion,
  ).toBe(3);
  await page.screenshot({
    path: info.outputPath("manual-engagement-plan.png"),
    fullPage: true,
  });
});

test("Engagement plans retain a conflicted title draft and reload before using a fresh CAS version", async ({
  page,
}) => {
  const second = {
    ...manualPlan(),
    id: otherId,
    title: "Synthetic other plan",
    waves: [],
  };
  const { state } = await planFixture(page, [manualPlan(), second]);
  const versions: number[] = [];
  let releaseFirst: () => void = () => {};
  const firstResponse = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  await page.route("**/api/capiro/engagement.plans.update", async (route) => {
    const body = engagementPlanPatchBody.parse(
      route.request().postDataJSON().body,
    );
    versions.push(body.expectedPlanVersion);
    if (versions.length === 1) {
      await firstResponse;
      state.plans = [
        planVersion(state.plans[0]!, 4, {
          title: "Synthetic concurrent title",
        }),
      ];
      return route.fulfill({
        status: 409,
        json: { message: "Synthetic version conflict" },
      });
    }
    state.plans = [planVersion(state.plans[0]!, 5, { title: body.title })];
    await route.fulfill({ json: state.plans[0] });
  });
  await openPlan(page);
  const detail = page.getByRole("region", {
    name: "Selected engagement plan",
    exact: true,
  });
  await detail
    .getByLabel("Plan title", { exact: true })
    .fill("Synthetic local draft");
  await detail.getByRole("button", { name: "Save title", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Synthetic other plan", exact: true }),
  ).toBeDisabled();
  releaseFirst();
  await expect(page.getByRole("alert")).toContainText(
    "Reload the current plan",
  );
  await expect(detail.getByLabel("Plan title", { exact: true })).toHaveValue(
    "Synthetic local draft",
  );
  await expect(
    page.getByText("Plan title confirmed from the current plan response.", {
      exact: true,
    }),
  ).toHaveCount(0);
  expect(versions).toEqual([3]);
  await detail
    .getByRole("button", { name: "Reload current plan", exact: true })
    .click();
  await expect(detail.getByLabel("Plan title", { exact: true })).toHaveValue(
    "Synthetic concurrent title",
  );
  await detail
    .getByLabel("Plan title", { exact: true })
    .fill("Synthetic final title");
  await detail.getByRole("button", { name: "Save title", exact: true }).click();
  await expect(
    detail.getByRole("heading", { name: "Synthetic final title", exact: true }),
  ).toBeVisible();
  expect(versions).toEqual([3, 4]);
});

test("Engagement plans refuse a wrong-client list and mismatched current detail", async ({
  page,
}) => {
  await planFixture(page);
  const foreign = {
    ...manualPlan(),
    clientId: otherId,
    waves: manualPlan().waves.map((wave) => ({ ...wave, clientId: otherId })),
  };
  const foreignList = planList([foreign]);
  foreignList.summaries[0]!.clientId = otherId;
  await page.route("**/api/capiro/engagement.plans.list?*", (route) =>
    route.fulfill({ json: foreignList }),
  );
  await page.goto(`/modules/engagement?view=plan&clientId=${clientId}`);
  await expect(page.getByRole("alert")).toContainText(
    "did not match the selected client",
  );
  await expect(
    page.getByRole("button", { name: "Synthetic manual plan", exact: true }),
  ).toHaveCount(0);
  await page.route("**/api/capiro/engagement.plans.list?*", (route) =>
    route.fulfill({ json: planList([manualPlan()]) }),
  );
  await page.getByRole("button", { name: "Reload plans", exact: true }).click();
  await page.route("**/api/capiro/engagement.plans.detail?*", (route) =>
    route.fulfill({ json: foreign }),
  );
  await page
    .getByRole("button", { name: "Synthetic manual plan", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "did not match this selected plan and client",
  );
  await expect(
    page.getByRole("region", { name: "Selected engagement plan", exact: true }),
  ).toHaveCount(0);
  const cursors: (string | undefined)[] = [];
  await page.route("**/api/capiro/engagement.plans.list?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input") ?? "{}",
    ) as { query?: { cursor?: string } };
    cursors.push(input.query?.cursor);
    if (input.query?.cursor)
      return route.fulfill({
        status: 409,
        json: { message: "Synthetic permitted scope changed" },
      });
    const first = planList([manualPlan()]);
    first.summaries[0]!.totalPlans = 2;
    first.summaries[0]!.draftPlans = 2;
    return route.fulfill({
      json: {
        ...first,
        pagination: { hasMore: true, nextCursor: "synthetic-opaque-cursor" },
        completeness: { ...first.completeness, page: "partial" },
      },
    });
  });
  await page.goto(`/modules/engagement?view=plan&clientId=${clientId}`);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic permitted scope changed",
  );
  await page
    .getByRole("button", { name: "Restart from first page", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Synthetic manual plan", exact: true }),
  ).toBeVisible();
  expect(cursors).toEqual([undefined, "synthetic-opaque-cursor", undefined]);
});

test("Engagement plans record an explicit review and preserve stale review through archive and restore", async ({
  page,
}) => {
  const { state } = await planFixture(page);
  const actions: unknown[] = [];
  await page.route("**/api/capiro/engagement.plans.review", async (route) => {
    const body = route.request().postDataJSON().body as {
      expectedPlanVersion: number;
      reviewDueAt: string;
    };
    actions.push(body);
    state.plans = [
      planVersion(state.plans[0]!, 4, {
        reviewedPlanVersion: 4,
        reviewedAt: now,
        reviewedByUserId: manualPlan().createdByUserId,
        reviewDueAt: new Date(body.reviewDueAt).toISOString(),
        review: {
          status: "current",
          reason: "review_current",
          checkedAt: now,
          meaning: "explicitly_reviewed_version",
        },
      }),
    ];
    await route.fulfill({ json: state.plans[0] });
  });
  await page.route("**/api/capiro/engagement.plans.update", async (route) => {
    const body = engagementPlanPatchBody.parse(
      route.request().postDataJSON().body,
    );
    actions.push(body);
    state.plans = [
      planVersion(state.plans[0]!, state.plans[0]!.version + 1, {
        lifecycle: body.action === "archive" ? "archived" : "draft",
        review: {
          status: "stale",
          reason: "plan_changed",
          checkedAt: now,
          meaning: "explicitly_reviewed_version",
        },
      }),
    ];
    await route.fulfill({ json: state.plans[0] });
  });
  await openPlan(page);
  const detail = page.getByRole("region", {
    name: "Selected engagement plan",
    exact: true,
  });
  await detail
    .getByLabel("Future review deadline (ISO timestamp with offset)")
    .fill("2050-12-01T12:00:00Z");
  await detail
    .getByRole("button", { name: "Record review", exact: true })
    .click();
  await expect(detail.getByText("current", { exact: true })).toBeVisible();
  await detail
    .getByRole("button", { name: "Archive plan", exact: true })
    .click();
  await expect(
    detail.getByRole("button", { name: "Save title", exact: true }),
  ).toBeDisabled();
  await expect(
    detail.getByRole("button", { name: "+ Add wave", exact: true }),
  ).toBeDisabled();
  await detail
    .getByRole("button", { name: "Restore to draft", exact: true })
    .click();
  await expect(detail.getByText("draft", { exact: true })).toBeVisible();
  await expect(detail.getByText("stale", { exact: true })).toBeVisible();
  expect(actions).toEqual([
    { expectedPlanVersion: 3, reviewDueAt: "2050-12-01T12:00:00Z" },
    { expectedPlanVersion: 4, action: "archive" },
    { expectedPlanVersion: 5, action: "restore" },
  ]);
});

test("Engagement plans edit date-only wave context and submit the complete current reorder set", async ({
  page,
}) => {
  const original = manualPlan();
  original.waves.push({
    ...original.waves[0]!,
    id: otherId,
    title: "Synthetic second wave",
    position: 1,
  });
  const second = {
    ...manualPlan(),
    id: otherId,
    title: "Synthetic other plan",
    waves: [],
  };
  const { state } = await planFixture(page, [original, second]);
  const writes: unknown[] = [];
  await page.route(
    "**/api/capiro/engagement.plans.wave.update",
    async (route) => {
      const input = route.request().postDataJSON();
      writes.push(input);
      const body = engagementPlanWavePatchBody.parse(input.body);
      state.plans = [
        planVersion(state.plans[0]!, 4, {
          waves: state.plans[0]!.waves.map((wave) =>
            wave.id === input.params.waveId
              ? {
                  ...wave,
                  title: body.title!,
                  formatLabel: body.formatLabel!,
                  window: body.window!,
                }
              : wave,
          ),
        }),
        second,
      ];
      await route.fulfill({
        status: 500,
        json: { message: "Synthetic wave response lost" },
      });
    },
  );
  await page.route(
    "**/api/capiro/engagement.plans.wave.reorder",
    async (route) => {
      const input = route.request().postDataJSON();
      writes.push(input);
      const ids = input.body.waveIds as string[];
      state.plans = [
        planVersion(state.plans[0]!, 5, {
          waves: state.plans[0]!.waves.map((wave) => ({
            ...wave,
            position: ids.indexOf(wave.id),
          })),
        }),
      ];
      await route.fulfill({ json: state.plans[0] });
    },
  );
  await openPlan(page);
  const wave = page.getByRole("article", {
    name: "Synthetic discovery wave",
    exact: true,
  });
  await wave.getByRole("button", { name: "Edit wave", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit wave", exact: true });
  await dialog
    .getByLabel("Wave title", { exact: true })
    .fill("Synthetic edited wave");
  await dialog.getByLabel("Start date", { exact: true }).fill("2050-11-01");
  await dialog
    .getByLabel("End date (exclusive)", { exact: true })
    .fill("2050-11-04");
  await dialog
    .getByLabel("IANA timezone", { exact: true })
    .fill("America/New_York");
  await dialog.getByRole("button", { name: "Save wave", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Save wave", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByText(/Closing does not replay or clear the uncertain write/),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  await dialog
    .getByRole("button", { name: "Close editor for read-back", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Synthetic other plan", exact: true }),
  ).toBeDisabled();
  let reads = 0;
  await page.route("**/api/capiro/engagement.plans.detail?*", (route) => {
    reads += 1;
    return route.fulfill({ json: reads === 1 ? second : state.plans[0] });
  });
  await page
    .getByRole("button", { name: "Reload current plan", exact: true })
    .click();
  await expect(
    page.getByText(
      "The response did not match this selected plan and client. Reload to confirm access.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Synthetic other plan", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      /The outcome is unconfirmed. No write will be replayed automatically/,
    ),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Synthetic edited wave", exact: true }),
  ).toContainText("2050-11-01 to 2050-11-04");
  await expect(
    page.getByRole("button", { name: "Synthetic other plan", exact: true }),
  ).toBeEnabled();
  expect(writes).toHaveLength(1);
  await page
    .getByRole("button", {
      name: "Move Synthetic edited wave down",
      exact: true,
    })
    .click();
  await expect(page.getByText("Version 5", { exact: true })).toBeVisible();
  expect(writes).toEqual([
    {
      params: { planId, waveId },
      body: {
        title: "Synthetic edited wave",
        formatLabel: "Call or video",
        window: {
          startDate: "2050-11-01",
          endDateExclusive: "2050-11-04",
          timeZone: "America/New_York",
        },
        expectedPlanVersion: 3,
      },
    },
    {
      params: { planId },
      body: { expectedPlanVersion: 4, waveIds: [otherId, waveId] },
    },
  ]);
});

test("Engagement plans keep raw history separate and do not invent office selection or recommendations", async ({
  page,
}) => {
  await planFixture(page);
  await page.route("**/api/capiro/engagement.plans.history?*", (route) =>
    route.fulfill({
      json: {
        planId,
        clientId,
        planVersion: 3,
        items: [
          {
            version: 2,
            operation: "edit_plan",
            actorUserId: manualPlan().createdByUserId,
            createdAt: now,
            snapshot: rawSnapshot(manualPlan(2)),
          },
        ],
        pagination: { hasMore: false, beforeVersion: null },
        completeness: "complete",
      },
    }),
  );
  await openPlan(page);
  await page.getByRole("button", { name: "View history", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Version 2: edit plan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /availability is checked now, not at the historical revision date/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find a window", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("combobox", { name: /office/i })).toHaveCount(0);
  await expect(
    page.getByText("No office references are recorded.", { exact: false }),
  ).toBeVisible();
  await page.goto("/modules/engagement?view=plan");
  await expect(
    page.getByRole("button", { name: "+ New engagement plan", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/not a zero-plan client catalog/)).toBeVisible();
});
