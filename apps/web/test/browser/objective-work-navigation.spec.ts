import { test, expect, type Page } from "@playwright/test";
import { operationFixtures, testIdentity } from "./fixtures";
import { installFixtures, json, objective } from "../../tests/browser/fixtures";
import {
  binding,
  boundStrategy,
  boundTask,
  boundWorkspace,
  strategyId,
  taskId,
  draft,
  version,
  clientId,
  strategySummary,
} from "../../tests/objective-work-fixtures";
const origin = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
const cases = [
  {
    kind: "strategy",
    label: "Strategy",
    id: strategyId,
    service: "strategy",
    path: `strategies/${strategyId}`,
    operation: "strategies.objectiveDestination",
    value: boundStrategy,
    module: "strategies",
    title: boundStrategy.strategy.title,
  },
  {
    kind: "planner_task",
    label: "Planner task",
    id: taskId,
    service: "strategy",
    path: `planner/tasks/${taskId}`,
    operation: "planner.objectiveDestination",
    value: boundTask,
    module: "planner",
    title: boundTask.task.name,
  },
  {
    kind: "workspace_saved_revision",
    label: "Workspace saved revision",
    id: draft.id,
    service: "workspace",
    path: `drafts/${draft.id}/versions/${version.id}`,
    operation: "workspace.objectiveDestination",
    value: boundWorkspace,
    module: "workspace",
    title: boundWorkspace.contentSkeleton.subject,
  },
];
async function lists(page: Page) {
  await page.route("**/api/backend/strategy/strategies", (r) =>
    json(r, [strategySummary]),
  );
  await page.route("**/api/backend/strategy/planner/tasks?*", (r) =>
    json(r, { items: [boundTask.task], nextCursor: null }),
  );
  await page.route("**/api/backend/workspace/drafts?*", (r) =>
    json(r, { drafts: [draft] }),
  );
  await page.route(
    `**/api/backend/workspace/drafts/${draft.id}/versions`,
    (r) => json(r, [version]),
  );
}
async function select(page: Page, item: (typeof cases)[number]) {
  await page
    .getByRole("button", { name: "Choose existing resources", exact: true })
    .click();
  await page
    .getByLabel("Resource type", { exact: true })
    .selectOption(item.kind);
  await page
    .getByLabel(`Existing ${item.label}`, { exact: true })
    .selectOption(item.id);
  if (item.kind === "workspace_saved_revision")
    await page
      .getByLabel("Saved Workspace version", { exact: true })
      .selectOption(version.id);
}
for (const item of cases)
  test(`${item.module} Portfolio handoff resolves exact saved Objective then resolves again at destination`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    await lists(page);
    const queries: Record<string, string>[] = [];
    let destinationReads = 0;
    await operationFixtures(page, {
      "me.read": testIdentity,
      [item.operation]: () => {
        destinationReads++;
        return item.value;
      },
    });
    await page.route(
      `**/api/backend/${item.service}/${item.path}/objective-destination?*`,
      (r) => {
        queries.push(
          Object.fromEntries(new URL(r.request().url()).searchParams),
        );
        return json(r, item.value);
      },
    );
    await page.goto(origin);
    await select(page, item);
    await page
      .getByRole("button", {
        name: `Open Objective-bound ${item.label}`,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/modules/${item.module}\\?`));
    await expect(
      page.getByRole("heading", { name: item.title, exact: true }),
    ).toBeVisible();
    expect(queries).toEqual([
      { clientId, objectiveId: binding.objectiveId, objectiveVersion: "1" },
    ]);
    expect(destinationReads).toBe(1);
    expect(unexpected).toEqual([]);
  });
test("saved Workspace selection is explicit and never opens the current working draft automatically", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const unexpected = await installFixtures(page);
  await lists(page);
  let reads = 0;
  await page.route(
    `**/api/backend/workspace/drafts/${draft.id}/versions/*/objective-destination?*`,
    (r) => {
      reads++;
      return json(
        r,
        { message: "Saved revision is not eligible for this Objective" },
        404,
      );
    },
  );
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Choose existing resources", exact: true })
    .click();
  await page
    .getByLabel("Resource type", { exact: true })
    .selectOption("workspace_saved_revision");
  await page
    .getByLabel("Existing Workspace saved revision", { exact: true })
    .selectOption(draft.id);
  const open = page.getByRole("button", {
    name: "Open Objective-bound Workspace saved revision",
    exact: true,
  });
  await expect(open).toBeDisabled();
  expect(reads).toBe(0);
  await page
    .getByLabel("Saved Workspace version", { exact: true })
    .selectOption(version.id);
  await page.getByLabel("Saved Workspace version", { exact: true }).focus();
  await expect(
    page.getByLabel("Saved Workspace version", { exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("saved-workspace-picker-mobile.png"),
    fullPage: true,
  });
  expect(reads).toBe(0);
  await open.click();
  await expect(page.getByRole("alert")).toContainText("not eligible");
  expect(new URL(page.url()).pathname).toBe(
    `/portfolio/${clientId}/objectives`,
  );
  expect(reads).toBe(1);
  expect(unexpected).toEqual([]);
});
test("unsaved edits and close interrupt Strategy resolution without late navigation", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await lists(page);
  let release!: () => void,
    reads = 0;
  const held = new Promise<void>((r) => (release = r));
  await page.route(
    `**/api/backend/strategy/strategies/${strategyId}/objective-destination?*`,
    async (r) => {
      reads++;
      await held;
      await json(r, boundStrategy).catch(() => {});
    },
  );
  await page.goto(origin);
  await page.getByLabel(/^Outcome/).fill("Unsaved edit");
  await expect(
    page.getByRole("button", {
      name: "Choose existing resources",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel(/^Outcome/).fill(objective.outcome);
  await select(page, cases[0]!);
  await page
    .getByRole("button", { name: "Open Objective-bound Strategy", exact: true })
    .click();
  await expect.poll(() => reads).toBe(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  release();
  expect(new URL(page.url()).pathname).toBe(
    `/portfolio/${clientId}/objectives`,
  );
  expect(unexpected).toEqual([]);
});
