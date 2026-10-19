import { expect, type Page, type Route } from "@playwright/test";
import { project as projectSchema } from "../../src/shared/capiro/operations/planner-core-schemas";
import { strategyDetail } from "../../src/shared/capiro/operations/strategies-schemas";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  bootstrap,
  client,
  clientId,
  navigate,
  nextTask,
  otherClient,
  otherClientId,
  setup as setupModules,
} from "./next-modules-fixtures";
import { test } from "./runtime-observed-test";

test.use({ viewport: { width: 1440, height: 1040 } });

const strategy = strategyDetail.parse({
  id: "50000000-0000-4000-8000-000000000001",
  clientId,
  title: "Synthetic linked current Strategy",
  type: "regulatory",
  ownerUserId: null,
  goal: "Review the current permitted working timeline.",
  meriContext: null,
  targetDate: null,
  lastEditedAt: "2026-10-16T12:00:00Z",
  nodes: [],
});
const secondStrategy = {
  ...strategy,
  id: "50000000-0000-4000-8000-000000000002",
  title: "Synthetic replacement current Strategy",
};
const project = projectSchema.parse({
  id: "60000000-0000-4000-8000-000000000001",
  name: "Synthetic linked current project",
  description: "Current permitted project work.",
  color: "#123456",
  privacy: "private",
  defaultView: "list",
  sections: [],
  fields: [],
  members: [],
  startOn: null,
  dueOn: null,
  health: "on_track",
  clientId,
  ownerId: "test-user",
  version: 1,
  archived: false,
  createdAt: "2026-10-08T12:00:00Z",
  updatedAt: "2026-10-08T12:00:00Z",
  access: "admin",
});
const projectTask = {
  ...nextTask,
  name: "Synthetic linked project task",
  clientId,
  memberships: [{ projectId: project.id, sectionId: null, position: 0 }],
};
// Core stores lifecycle status separately from the uppercase profile status.
const activeClient = { ...client, status: "active" };
const activeOtherClient = { ...otherClient, status: "active" };
async function setup(
  page: Page,
  overrides: Parameters<typeof setupModules>[1] = {},
) {
  await setupModules(page, overrides);
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: route.request().url().endsWith(otherClientId)
        ? activeOtherClient
        : activeClient,
    }),
  );
}
const currentFixtures = {
  ...moduleRouteFixtures,
  "clients.list": [activeClient, activeOtherClient],
  "strategies.calendars": {
    congress: [],
    ppbeLanes: [],
    ppbeCurrentPhases: [],
    source: {},
  },
};
const strategyUrl = (id: string) =>
  `/modules/strategies?clientId=${clientId}&strategy=${id}`;
const projectUrl = (id: string) =>
  `/modules/planner?clientId=${clientId}&view=projects&project=${id}`;

test("current Strategy link opens the real working timeline after its exact current read", async ({
  page,
}) => {
  const reads: unknown[] = [];
  await setup(page, {
    ...currentFixtures,
    "strategies.detail": (input) => {
      reads.push(input);
      return strategy;
    },
  });
  await page.goto(strategyUrl(strategy.id));
  await expect(
    page.getByRole("heading", { name: strategy.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Working timeline/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add step", exact: true }),
  ).toHaveCount(2);
  await expect(page.getByLabel("Fiscal horizon")).toBeVisible();
  expect(reads).toContainEqual({ params: { id: strategy.id } });
});

test("current project link opens its real task workspace with the exact project query", async ({
  page,
}) => {
  const reads: unknown[] = [];
  await setup(page, {
    ...currentFixtures,
    "planner.bootstrap": { ...bootstrap, projects: [project] },
    "planner.tasks": (input) => {
      reads.push(input);
      return { items: [projectTask], nextCursor: null };
    },
  });
  await page.goto(projectUrl(project.id));
  await expect(
    page.getByRole("heading", { name: project.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: projectTask.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "List", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Back to Projects", exact: true }),
  ).toBeVisible();
  expect(reads).toContainEqual({ query: { projectId: project.id } });
});

test("current Strategy link refuses foreign IDs and foreign client receipts", async ({
  page,
}) => {
  let strategyResponse = secondStrategy;
  await setup(page, {
    ...currentFixtures,
    "strategies.detail": () => strategyResponse,
  });
  for (const fault of ["id", "client"] as const) {
    await test.step(`Strategy ${fault} mismatch`, async () => {
      strategyResponse =
        fault === "id"
          ? secondStrategy
          : { ...strategy, clientId: otherClientId };
      await page.goto(strategyUrl(strategy.id));
      await expect(page.getByRole("alert")).toContainText(
        "This Strategy is unavailable in the selected client scope.",
      );
      await expect(
        page.getByRole("heading", { name: /Working timeline/ }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          name: strategyResponse.title,
          exact: true,
        }),
      ).toHaveCount(0);
    });
  }
});

test("current project link refuses missing, foreign, archived and duplicate bootstrap targets without a catalog fallback", async ({
  page,
}) => {
  let projects: (typeof project)[] = [];
  let taskReads = 0;
  let bootstrapReads = 0;
  await setup(page, {
    ...currentFixtures,
    "planner.bootstrap": () => {
      bootstrapReads++;
      return { ...bootstrap, projects };
    },
    "planner.tasks": () => {
      taskReads++;
      return { items: [projectTask], nextCursor: null };
    },
  });
  for (const [fault, records] of [
    ["missing", []],
    ["foreign client", [{ ...project, clientId: otherClientId }]],
    ["archived", [{ ...project, archived: true }]],
    ["duplicate", [project, { ...project }]],
  ] as const) {
    await test.step(fault, async () => {
      projects = [...records];
      const previousBootstrapReads = bootstrapReads;
      await page.goto(projectUrl(project.id));
      await expect
        .poll(() => bootstrapReads)
        .toBeGreaterThan(previousBootstrapReads);
      await expect(page.getByRole("alert")).toContainText(
        "This project is unavailable in the selected client scope.",
      );
      await expect(
        page.getByRole("heading", { name: project.name, exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: projectTask.name, exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("tablist", { name: "Planner sections", exact: true }),
      ).toHaveCount(0);
      expect(taskReads).toBe(0);
    });
  }
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function settleReplacedRead(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test("replacing a current Strategy URL suppresses the held previous target", async ({
  page,
}) => {
  await setup(page, currentFixtures);
  const entered = deferred();
  const release = deferred();
  const finished = deferred();
  const routePattern = "**/api/capiro/strategies.detail?*";
  const handler = async (route: Route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    if (input.params.id !== strategy.id) {
      await route.fulfill({ json: secondStrategy });
      return;
    }
    entered.resolve();
    await release.promise;
    await route.fulfill({ json: strategy }).catch(() => {});
    finished.resolve();
  };
  await page.route(routePattern, handler);
  try {
    await page.goto(strategyUrl(strategy.id));
    await entered.promise;
    await navigate(page, strategyUrl(secondStrategy.id));
    await expect(
      page.getByRole("heading", { name: secondStrategy.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: strategy.title, exact: true }),
    ).toHaveCount(0);
    release.resolve();
    await finished.promise;
    await settleReplacedRead(page);
    await expect(page).toHaveURL(new RegExp(`strategy=${secondStrategy.id}`));
    await expect(
      page.getByRole("heading", { name: secondStrategy.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: strategy.title, exact: true }),
    ).toHaveCount(0);
  } finally {
    release.resolve();
    await page.unroute(routePattern, handler);
  }
});
