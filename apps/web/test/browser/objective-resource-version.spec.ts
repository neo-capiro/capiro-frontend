import { test, expect, type Page } from "@playwright/test";
import { operationFixtures, testIdentity } from "./fixtures";
import {
  installFixtures,
  json,
  objective,
  client,
} from "../../tests/browser/fixtures";
import {
  boundTask,
  boundWorkspace,
  binding,
  taskId,
  clientId,
  draft,
  version,
} from "../../tests/objective-work-fixtures";
const query = {
  clientId,
  objectiveId: binding.objectiveId,
  objectiveVersion: "1",
};
const occurrence = `planner:${taskId}:due`;
const calendarHref = (taskVersion = "4") =>
  `/calendar?${new URLSearchParams({ ...query, occurrence, taskVersion })}`;
const workspaceHref = (snapshotHash = boundWorkspace.snapshotHash) =>
  `/modules/workspace?${new URLSearchParams({ ...query, draftId: draft.id, versionId: version.id, snapshotHash })}`;
const endpoint = "**/api/capiro/planner.objectiveDestination?*";
const origin = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
async function fixture(page: Page) {
  const unexpected = await installFixtures(page);
  await operationFixtures(page, { "me.read": testIdentity });
  page.on("pageerror", (error) => unexpected.push(error.message));
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith("/api/") && r.method() !== "GET")
      unexpected.push("Write:" + path);
    if (path === "/api/backend/core/engagement/meetings")
      unexpected.push("Unbound calendar");
  });
  return unexpected;
}
const newerTask = {
  ...boundTask,
  destination: { ...boundTask.destination, destinationVersion: 5 },
  task: { ...boundTask.task, version: 5 },
};
async function changeLocation(page: Page, href: string) {
  await page.evaluate((next) => {
    history.pushState({}, "", next);
    dispatchEvent(new PopStateEvent("popstate"));
  }, href);
}
test("Calendar requires exact selected task version on open, retry and history return", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  let reads = 0;
  await page.route(endpoint, (r) => {
    reads++;
    return json(r, newerTask);
  });
  await page.goto(calendarHref());
  await expect(page.getByRole("alert")).toContainText("task version changed");
  await expect(
    page.getByRole("heading", { name: boundTask.task.name, exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Recheck current Calendar occurrence",
      exact: true,
    })
    .click();
  await expect.poll(() => reads).toBe(2);
  await expect(page.getByRole("alert")).toContainText("task version changed");
  await changeLocation(page, calendarHref("5"));
  await expect(
    page.getByRole("heading", { name: boundTask.task.name, exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("alert")).toContainText("task version changed");
  await expect.poll(() => reads).toBe(4);
  expect(unexpected).toEqual([]);
});
test("changed preflight version requires refreshing choices and deliberate reselection", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  let refreshed = false;
  await page.route("**/api/backend/strategy/planner/tasks?*", (r) =>
    json(r, {
      items: [refreshed ? newerTask.task : boundTask.task],
      nextCursor: null,
    }),
  );
  await page.route(
    `**/api/backend/strategy/planner/tasks/${taskId}/objective-destination?*`,
    (r) => json(r, newerTask),
  );
  await page.route(endpoint, (r) => json(r, newerTask));
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Choose existing resources", exact: true })
    .click();
  await page
    .getByLabel("Resource type", { exact: true })
    .selectOption("planner_occurrence");
  const select = page.getByLabel("Existing Calendar Planner occurrence", {
    exact: true,
  });
  await select.selectOption(occurrence);
  const open = page.getByRole("button", {
    name: "Open Objective-bound Calendar Planner occurrence",
    exact: true,
  });
  await open.click();
  await expect(page.getByRole("alert")).toContainText("task version changed");
  expect(new URL(page.url()).pathname).toBe(
    `/portfolio/${clientId}/objectives`,
  );
  refreshed = true;
  await page
    .getByRole("button", { name: "Refresh resource choices", exact: true })
    .click();
  await expect(select).toHaveValue("");
  await expect(open).toBeDisabled();
  await select.selectOption(occurrence);
  await open.click();
  await expect(
    page.getByRole("heading", { name: boundTask.task.name, exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("taskVersion")).toBe("5");
  expect(unexpected).toEqual([]);
});
test("Workspace verifies full saved snapshot and refuses changed selected hash on fresh reads", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  let changed = false;
  await page.route("**/api/capiro/workspace.objectiveDestination?*", (r) =>
    json(
      r,
      changed
        ? {
            ...boundWorkspace,
            snapshot: {
              docTitle: "Mutated snapshot",
              config: {},
              documents: [],
            },
          }
        : boundWorkspace,
    ),
  );
  await page.goto(workspaceHref());
  await expect(
    page.getByText(boundWorkspace.contentSkeleton.body, { exact: true }),
  ).toBeVisible();
  changed = true;
  await page
    .getByRole("button", {
      name: "Recheck current Objective destination",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "saved Workspace revision changed",
  );
  await expect(
    page.getByText(boundWorkspace.contentSkeleton.body, { exact: true }),
  ).toHaveCount(0);
  changed = false;
  await changeLocation(page, workspaceHref("b".repeat(64)));
  await expect(page.getByRole("alert")).toContainText(
    "saved Workspace revision changed",
  );
  await expect(
    page.getByText(boundWorkspace.contentSkeleton.body, { exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});
test("version and hash claims without exact Objective binding never mount ordinary views", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  for (const href of [
    "/calendar?taskVersion=4",
    "/modules/workspace?snapshotHash=" + boundWorkspace.snapshotHash,
  ]) {
    await page.goto(href);
    await expect(page.getByRole("alert")).toBeVisible();
  }
  expect(unexpected).toEqual([]);
});

for (const scope of ["user", "organization", "client"] as const)
  test(`late occurrence observation is discarded after ${scope} replacement`, async ({
    page,
  }) => {
    const unexpected = await fixture(page);
    const alternateClient = "10000000-0000-4000-8000-000000000002";
    await page.route(`**/api/backend/core/clients/${alternateClient}`, (r) =>
      json(r, { ...client, id: alternateClient }),
    );
    let release!: () => void,
      settle!: () => void,
      reads = 0;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const settled = new Promise<void>((resolve) => {
      settle = resolve;
    });
    await page.route(endpoint, async (r) => {
      if (++reads === 1) {
        await held;
        await json(r, boundTask).catch(() => {});
        settle();
        return;
      }
      return json(r, { message: "Replacement scope refused" }, 404);
    });
    await page.goto(calendarHref());
    await expect.poll(() => reads).toBe(1);
    if (scope === "client")
      await changeLocation(
        page,
        calendarHref().replace(clientId, alternateClient),
      );
    else
      await page.evaluate(
        (field) =>
          dispatchEvent(
            new CustomEvent("test:session", {
              detail: { [field]: "replacement" },
            }),
          ),
        scope === "user" ? "userId" : "orgId",
      );
    await expect(page.getByRole("alert")).toContainText(
      "Replacement scope refused",
    );
    release();
    await settled;
    await expect(
      page.getByRole("heading", { name: boundTask.task.name, exact: true }),
    ).toHaveCount(0);
    expect(reads).toBe(2);
    expect(unexpected).toEqual([]);
  });

test("changed schedule version remains unavailable until its exact new timed selection", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  await page.route(endpoint, (r) =>
    json(r, {
      ...newerTask,
      task: {
        ...newerTask.task,
        dueTime: "10:30",
        timeZone: "America/New_York",
      },
    }),
  );
  await page.goto(calendarHref());
  await expect(page.getByRole("alert")).toContainText("task version changed");
  await expect(page.getByText(/source timezone/)).toHaveCount(0);
  await changeLocation(page, calendarHref("5"));
  await expect(
    page.getByText(/2026-11-01T15:30:00Z.*source timezone America\/New_York/),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
