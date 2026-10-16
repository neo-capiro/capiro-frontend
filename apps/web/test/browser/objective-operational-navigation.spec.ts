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
  setup,
} from "./next-modules-fixtures";
import { test } from "./runtime-observed-test";
import { selectedMeetingFixture } from "./selected-meeting-desktop-fixtures";

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
const currentFixtures = {
  ...moduleRouteFixtures,
  "clients.list": [client, otherClient],
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
const meetingUrl = (id: string) =>
  `/modules/engagement?clientId=${clientId}&view=meetings&meeting=${id}`;

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

test("current meeting link opens actual Prep even when the meeting list does not contain it", async ({
  page,
}) => {
  const { current, prep } = selectedMeetingFixture();
  const reads: unknown[] = [];
  await setup(page, {
    ...currentFixtures,
    "engagement.meetings": [],
    "engagement.meeting": (input) => {
      reads.push(input);
      return current;
    },
  });
  await page.goto(meetingUrl(current.id));
  const detail = page.getByRole("region", {
    name: "Selected meeting",
    exact: true,
  });
  await expect(
    detail.getByRole("heading", { name: current.subject, exact: true }),
  ).toBeVisible();
  await expect(
    detail.getByRole("tab", { name: "Prep", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(detail.getByText(prep.summary, { exact: true })).toBeVisible();
  await expect(
    detail.getByRole("link", { name: "Join meeting", exact: true }),
  ).toHaveAttribute("href", current.joinLink!);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(reads.length).toBeGreaterThanOrEqual(2);
  expect(
    reads.every(
      (input) =>
        JSON.stringify(input) ===
        JSON.stringify({ params: { id: current.id } }),
    ),
  ).toBe(true);
});

test("current Strategy and meeting links refuse foreign IDs and foreign client receipts", async ({
  page,
}) => {
  const { current, second } = selectedMeetingFixture();
  let strategyResponse = secondStrategy;
  let meetingResponse = second;
  await setup(page, {
    ...currentFixtures,
    "strategies.detail": () => strategyResponse,
    "engagement.meeting": () => meetingResponse,
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
    await test.step(`Meeting ${fault} mismatch`, async () => {
      meetingResponse =
        fault === "id"
          ? second
          : {
              ...current,
              client: { id: otherClientId, name: otherClient.name },
            };
      await page.goto(meetingUrl(current.id));
      await expect(page.getByRole("alert")).toContainText(
        "This meeting is unavailable in the selected client scope.",
      );
      await expect(
        page.getByRole("region", { name: "Selected meeting", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Join meeting", exact: true }),
      ).toHaveCount(0);
    });
  }
});

test("current project link refuses missing, foreign, archived and duplicate bootstrap targets without a catalog fallback", async ({
  page,
}) => {
  let projects: (typeof project)[] = [];
  let taskReads = 0;
  await setup(page, {
    ...currentFixtures,
    "planner.bootstrap": () => ({ ...bootstrap, projects }),
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
      await page.goto(projectUrl(project.id));
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

test("replacing a current Strategy or meeting URL suppresses the held previous target", async ({
  page,
}) => {
  const { current, second } = selectedMeetingFixture();
  await setup(page, currentFixtures);
  for (const kind of ["Strategy", "meeting"] as const) {
    await test.step(kind, async () => {
      const first = kind === "Strategy" ? strategy : current;
      const replacement = kind === "Strategy" ? secondStrategy : second;
      const firstTitle = "title" in first ? first.title : first.subject;
      const replacementTitle =
        "title" in replacement ? replacement.title : replacement.subject;
      const url = kind === "Strategy" ? strategyUrl : meetingUrl;
      const entered = deferred();
      const release = deferred();
      const finished = deferred();
      const routePattern =
        kind === "Strategy"
          ? "**/api/capiro/strategies.detail?*"
          : "**/api/capiro/engagement.meeting?*";
      const handler = async (route: Route) => {
        const input = JSON.parse(
          new URL(route.request().url()).searchParams.get("input")!,
        );
        if (input.params.id !== first.id) {
          await route.fulfill({ json: replacement });
          return;
        }
        entered.resolve();
        await release.promise;
        // The old owner aborts its read on replacement; fulfilling that canceled
        // request may reject, as in the existing current-meeting stale case.
        await route.fulfill({ json: first }).catch(() => {});
        finished.resolve();
      };
      await page.route(routePattern, handler);
      try {
        await page.goto(url(first.id));
        await entered.promise;
        await navigate(page, url(replacement.id));
        await expect(
          page.getByRole("heading", { name: replacementTitle, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: firstTitle, exact: true }),
        ).toHaveCount(0);
        release.resolve();
        await finished.promise;
        await settleReplacedRead(page);
        await expect(page).toHaveURL(
          new RegExp(
            `${kind === "Strategy" ? "strategy" : "meeting"}=${replacement.id}`,
          ),
        );
        await expect(
          page.getByRole("heading", { name: replacementTitle, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: firstTitle, exact: true }),
        ).toHaveCount(0);
        if (kind === "meeting")
          await expect(
            page.getByRole("link", { name: "Join meeting", exact: true }),
          ).toHaveAttribute("href", second.joinLink!);
      } finally {
        release.resolve();
        await page.unroute(routePattern, handler);
      }
    });
  }
});
