import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
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
} from "../../tests/objective-work-fixtures";

const cases: {
  module: string;
  ids: Record<string, string>;
  operation: string;
  value: typeof boundStrategy | typeof boundTask | typeof boundWorkspace;
  title: string;
}[] = [
  {
    module: "strategies",
    ids: { strategyId },
    operation: "strategies.objectiveDestination",
    value: boundStrategy,
    title: boundStrategy.strategy.title,
  },
  {
    module: "planner",
    ids: { taskId },
    operation: "planner.objectiveDestination",
    value: boundTask,
    title: boundTask.task.name,
  },
  {
    module: "workspace",
    ids: { draftId: draft.id, versionId: version.id },
    operation: "workspace.objectiveDestination",
    value: boundWorkspace,
    title: boundWorkspace.contentSkeleton.subject,
  },
];
const path = (item: (typeof cases)[number], versionNumber = 1) =>
  `/modules/${item.module}?${new URLSearchParams({ ...item.ids, clientId, objectiveId: binding.objectiveId, objectiveVersion: String(versionNumber) })}`;
async function setup(page: Page) {
  await onlyLocalRequests(page);
  await page.route("**/api/backend/core/clients/*", (r) =>
    r.fulfill({
      json: {
        id: new URL(r.request().url()).pathname.split("/").pop(),
        name: "Synthetic client",
        status: "ACTIVE",
        profileStatus: "ACTIVE",
      },
    }),
  );
}
test.beforeEach(async ({ page }) => setup(page));
for (const item of cases) {
  test(`${item.module} rechecks the owner on open, reload, history and explicit review without ordinary reads or writes`, async ({
    page,
  }, info) => {
    const calls: { key: string; method: string }[] = [];
    let reads = 0;
    page.on("request", (r) => {
      if (r.url().includes("/api/capiro/"))
        calls.push({
          key: new URL(r.url()).pathname.split("/").pop()!,
          method: r.method(),
        });
    });
    await operationFixtures(page, {
      "me.read": testIdentity,
      [item.operation]: () => {
        reads++;
        return item.value;
      },
    });
    await page.goto(path(item));
    await expect(
      page.getByRole("heading", { name: item.title, exact: true }),
    ).toBeVisible();
    await page
      .getByText("Objective and resource details", { exact: true })
      .click();
    await expect(page.getByText(/immutable revision/)).toContainText(
      binding.objectiveRevisionId,
    );
    if (item.module === "workspace") {
      await expect(
        page.getByText(boundWorkspace.contentSkeleton.body, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: draft.docTitle }),
      ).toHaveCount(0);
    }
    await page.screenshot({
      path: info.outputPath(`${item.module}-desktop.png`),
      fullPage: true,
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: item.title, exact: true }),
    ).toBeVisible();
    expect(reads).toBe(2);
    await page
      .getByRole("navigation", { name: "Product modes" })
      .getByRole("link", { name: "Meri", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Meri", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: item.title, exact: true }),
    ).toBeVisible();
    expect(reads).toBe(3);
    await page.goForward();
    await expect(
      page.getByRole("heading", { name: "Meri", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: item.title, exact: true }),
    ).toBeVisible();
    expect(reads).toBe(4);
    await page.setViewportSize({ width: 390, height: 844 });
    const recheck = page.getByRole("button", {
      name: "Recheck current Objective destination",
    });
    await recheck.focus();
    await expect(recheck).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => reads).toBe(5);
    await expect(
      page.getByRole("heading", { name: item.title, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`${item.module}-mobile.png`),
      fullPage: true,
    });
    expect(
      calls.every(
        (c) =>
          c.method === "GET" && ["me.read", item.operation].includes(c.key),
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", {
        name: /Save|Generate|New strategy|Add time|Stage newsletter/i,
      }),
    ).toHaveCount(0);
  });
  for (const status of [404, 409, 503])
    test(`${item.module} owner${status} removes the prior observation with no fallback or automatic retry`, async ({
      page,
    }) => {
      let calls = 0;
      await operationFixtures(page, {
        "me.read": testIdentity,
        [item.operation]: item.value,
      });
      await page.goto(path(item));
      await expect(
        page.getByRole("heading", { name: item.title, exact: true }),
      ).toBeVisible();
      await page.route(`**/api/capiro/${item.operation}?*`, (r) => {
        calls++;
        return r.fulfill({
          status,
          json: {
            message:
              status === 409
                ? "OBJECTIVE_VERSION_CONFLICT"
                : "Current destination unavailable",
          },
        });
      });
      await page
        .getByRole("button", { name: "Recheck current Objective destination" })
        .click();
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: item.title, exact: true }),
      ).toHaveCount(0);
      expect(calls).toBe(1);
    });
  test(`${item.module} refuses changed and malformed bindings before exposing resource content`, async ({
    page,
  }) => {
    let reads = 0;
    await operationFixtures(page, {
      "me.read": testIdentity,
      [item.operation]: () => {
        reads++;
        return {
          ...item.value,
          destination: { ...item.value.destination, objectiveVersion: 2 },
        };
      },
    });
    await page.goto(path(item));
    await expect(page.getByRole("alert")).toContainText("does not match");
    await expect(
      page.getByRole("heading", { name: item.title, exact: true }),
    ).toHaveCount(0);
    for (const suffix of ["&objectiveVersion=1", "&actorId=me"]) {
      await page.goto(path(item) + suffix);
      await expect(page.getByRole("alert")).toContainText("exact client");
    }
    expect(reads).toBe(1);
  });
}
test("replacement query and session scope hide old or late Strategy observations", async ({
  page,
}) => {
  const item = cases[0]!;
  let release!: () => void,
    held = false;
  const gate = new Promise<void>((r) => (release = r));
  await operationFixtures(page, { "me.read": testIdentity });
  await page.route(`**/api/capiro/${item.operation}?*`, async (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    if (input.query.objectiveVersion === 1) {
      held = true;
      await gate;
    }
    await route
      .fulfill({
        json: {
          ...boundStrategy,
          destination: { ...boundStrategy.destination, ...input.query },
          strategy: {
            ...boundStrategy.strategy,
            title: `Synthetic version ${input.query.objectiveVersion}`,
            clientId: input.query.clientId,
          },
        },
      })
      .catch(() => {});
  });
  await page.goto(path(item));
  await expect.poll(() => held).toBe(true);
  await page.evaluate(
    (next) => {
      history.pushState({}, "", next);
      dispatchEvent(new PopStateEvent("popstate"));
    },
    path(item, 2),
  );
  await expect(
    page.getByRole("heading", { name: "Synthetic version 2" }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("heading", { name: "Synthetic version 1" }),
  ).toHaveCount(0);
  await page.route(`**/api/capiro/${item.operation}?*`, (r) =>
    r.fulfill({
      status: 404,
      json: { message: "Replacement scope has no destination" },
    }),
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { orgId: "replacement-org", sessionId: "replacement-session" },
      }),
    ),
  );
  await expect(page.getByRole("alert")).toContainText("Replacement scope");
  await expect(
    page.getByRole("heading", { name: "Synthetic version 2" }),
  ).toHaveCount(0);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: null, sessionId: null, orgId: null },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to Capiro" }),
  ).toBeVisible();
});
test("Planner401 expires the shared session without replay or retained task content", async ({
  page,
}) => {
  const item = cases[1]!;
  let reads = 0;
  await operationFixtures(page, {
    "me.read": testIdentity,
    [item.operation]: item.value,
  });
  await page.goto(path(item));
  await expect(
    page.getByRole("heading", { name: item.title, exact: true }),
  ).toBeVisible();
  await page.route(`**/api/capiro/${item.operation}?*`, (r) => {
    reads++;
    return r.fulfill({ status: 401, json: { message: "Expired" } });
  });
  await page
    .getByRole("button", { name: "Recheck current Objective destination" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: item.title, exact: true }),
  ).toHaveCount(0);
  expect(reads).toBe(1);
});

test("a changed Workspace client hint clears the saved snapshot and rechecks its owner", async ({
  page,
}) => {
  const item = cases[2]!;
  let reads = 0;
  await operationFixtures(page, {
    "me.read": testIdentity,
    [item.operation]: () => {
      reads++;
      return boundWorkspace;
    },
  });
  await page.goto(path(item));
  await expect(
    page.getByText(boundWorkspace.contentSkeleton.body, { exact: true }),
  ).toBeVisible();
  const replacement = "10000000-0000-4000-8000-000000000002";
  await page.evaluate(
    (next) => {
      history.pushState({}, "", next);
      dispatchEvent(new PopStateEvent("popstate"));
    },
    path(item).replace(clientId, replacement),
  );
  await expect(page.getByRole("alert")).toContainText("does not match");
  await expect(
    page.getByText(boundWorkspace.contentSkeleton.body, { exact: true }),
  ).toHaveCount(0);
  expect(reads).toBe(2);
});
