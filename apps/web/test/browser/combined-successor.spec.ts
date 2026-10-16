import { test, expect, type Page } from "@playwright/test";
import { operationFixtures, testIdentity } from "./fixtures";
import { json, objective } from "../../tests/browser/fixtures";
import {
  boundTask,
  boundWorkspace,
  clientId,
  taskId,
  draft,
  version,
  binding as objectiveBinding,
} from "../../tests/objective-work-fixtures";
import {
  boundDirectory,
  savedTarget,
  targetId,
} from "../../tests/directory-objective-fixtures";
import {
  setupConversation,
  connect,
  runFor,
  context,
  contextFor,
  nextBinding,
  event,
  binding as conversationBinding,
  reply,
  sse,
  status,
} from "./meri-conversation-fixtures";
import {
  acceptNext,
  installCurrentRun,
  installHistory,
  installReservation,
} from "./meri-history-fixtures";
const origin = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
const occurrence = `planner:${taskId}:due`;
const objectiveQuery = {
  clientId,
  objectiveId: objectiveBinding.objectiveId,
  objectiveVersion: objectiveBinding.objectiveVersion,
};
const resources = [
  {
    kind: "directory_target",
    label: "Saved Directory target",
    id: targetId,
    path: "/modules/directory",
    title: "Saved Directory target",
    endpoint: `core/clients/${clientId}/targets/${targetId}`,
    receipt: boundDirectory,
  },
  {
    kind: "planner_occurrence",
    label: "Calendar Planner occurrence",
    id: occurrence,
    path: "/calendar",
    title: boundTask.task.name,
    endpoint: `strategy/planner/tasks/${taskId}`,
    receipt: boundTask,
  },
  {
    kind: "workspace_saved_revision",
    label: "Workspace saved revision",
    id: draft.id,
    path: "/modules/workspace",
    title: boundWorkspace.contentSkeleton.subject,
    endpoint: `workspace/drafts/${draft.id}/versions/${version.id}`,
    receipt: boundWorkspace,
  },
] as const;
async function fixture(page: Page, contexts?: object[]) {
  const state = await setupConversation(page, undefined, contexts);
  const queries: { path: string; query: Record<string, string> }[] = [];
  const commands: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/") && request.method() !== "GET") {
      if (
        ![
          "/api/action-followthrough/session",
          "/api/conversations/history",
          "/api/conversations/submit",
          "/api/conversations/events",
          "/api/conversations/list",
          "/api/conversations/transcript",
          "/api/conversations/next-turn",
        ].includes(path)
      )
        state.unexpected.push(`Unexpected write: ${path}`);
      commands.push(path);
    }
  });
  await operationFixtures(page, {
    "me.read": testIdentity,
    "directory.objectiveDestination": (input) => {
      expect(input).toEqual({
        params: { clientId, targetId },
        query: objectiveQuery,
      });
      return boundDirectory;
    },
    "planner.objectiveDestination": (input) => {
      expect(input).toEqual({ params: { id: taskId }, query: objectiveQuery });
      return boundTask;
    },
    "workspace.objectiveDestination": (input) => {
      expect(input).toEqual({
        params: { draftId: draft.id, versionId: version.id },
        query: objectiveQuery,
      });
      return boundWorkspace;
    },
  });
  await page.route(`**/api/backend/core/clients/${clientId}/targets`, (r) =>
    json(r, [savedTarget]),
  );
  await page.route("**/api/backend/strategy/planner/tasks?*", (r) =>
    json(r, { items: [boundTask.task], nextCursor: null }),
  );
  await page.route("**/api/backend/workspace/drafts?scope=all", (r) =>
    json(r, { drafts: [draft] }),
  );
  await page.route(
    `**/api/backend/workspace/drafts/${draft.id}/versions`,
    (r) => json(r, [version]),
  );
  for (const resource of resources)
    await page.route(
      `**/api/backend/${resource.endpoint}/objective-destination?*`,
      (r) => {
        queries.push({
          path: resource.path,
          query: Object.fromEntries(new URL(r.request().url()).searchParams),
        });
        return json(r, resource.receipt);
      },
    );
  return { ...state, queries, commands };
}
async function select(page: Page, resource: (typeof resources)[number]) {
  await page
    .getByRole("button", { name: "Choose existing resources", exact: true })
    .click();
  const kind = page.getByLabel("Resource type", { exact: true });
  expect(
    await kind
      .locator("option")
      .evaluateAll((rows) =>
        rows.map((row) => (row as HTMLOptionElement).value),
      ),
  ).toEqual([
    "",
    "strategy",
    "planner_task",
    "directory_target",
    "planner_occurrence",
    "workspace_saved_revision",
  ]);
  await kind.selectOption(resource.kind);
  await page
    .getByLabel(`Existing ${resource.label}`, { exact: true })
    .selectOption(resource.id);
  if (resource.kind === "workspace_saved_revision")
    await page
      .getByLabel("Saved Workspace version", { exact: true })
      .selectOption(version.id);
}
async function open(page: Page, resource: (typeof resources)[number]) {
  await select(page, resource);
  await page
    .getByRole("button", {
      name: `Open Objective-bound ${resource.label}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: resource.title, exact: true }),
  ).toBeVisible();
  const url = new URL(page.url());
  expect(url.pathname).toBe(resource.path);
  expect(url.searchParams.get("clientId")).toBe(clientId);
  expect(url.searchParams.get("objectiveId")).toBe(
    objectiveBinding.objectiveId,
  );
  if (resource.kind === "planner_occurrence") {
    expect(url.searchParams.get("occurrence")).toBe(occurrence);
    expect(url.searchParams.get("taskVersion")).toBe(
      String(boundTask.task.version),
    );
  }
  if (resource.kind === "workspace_saved_revision")
    expect(url.searchParams.get("snapshotHash")).toBe(
      boundWorkspace.snapshotHash,
    );
  for (const sample of [
    "Synthetic stale label",
    "Anduril",
    "Good morning, Jordan",
  ])
    await expect(page.locator("body")).not.toContainText(sample);
}
async function returnObjective(page: Page) {
  await page
    .getByRole("link", { name: "Back to current Objective", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
function exactQueries(queries: Awaited<ReturnType<typeof fixture>>["queries"]) {
  expect(queries).toEqual(
    resources.map((resource) => ({
      path: resource.path,
      query: {
        clientId,
        objectiveId: objectiveBinding.objectiveId,
        objectiveVersion: String(objectiveBinding.objectiveVersion),
      },
    })),
  );
}
test("one Objective opens Directory, pinned Calendar and immutable Context Files without losing any resource kind", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto(origin);
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-combined-document", "retained"),
  );
  for (const resource of resources) {
    await open(page, resource);
    await expect(page.locator("html")).toHaveAttribute(
      "data-combined-document",
      "retained",
    );
    await returnObjective(page);
  }
  exactQueries(f.queries);
  expect(f.commands).toEqual([]);
  expect(f.hints).toEqual([]);
  expect(f.unexpected).toEqual([]);
});
test("unknown Meri input remains visible and scoped across all three bound destinations before explicit exact retry", async ({
  page,
}) => {
  const f = await fixture(page, [context, contextFor(nextBinding)]);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await installReservation(page, native);
  const requests: { requestId: string; prompt: string }[] = [];
  await page.route("**/api/conversations/submit", (r) => {
    const input = r.request().postDataJSON();
    requests.push(input);
    if (requests.length === 1)
      acceptNext(native, input.requestId, input.prompt);
    return requests.length === 1
      ? reply(r, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 502)
      : reply(r, {
          run: runFor("running", nextBinding),
          requestId: input.requestId,
          lastSequence: 1,
          replayed: true,
        });
  });
  await page.route("**/api/conversations/events", (r) =>
    sse(r, [
      event(1, "Second answer", nextBinding),
      status(2, "completed", nextBinding),
    ]),
  );
  await connect(page);
  await page
    .getByLabel("Meri message", { exact: true })
    .fill("Original integration request");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry same request", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Product modes", exact: true })
    .getByRole("link", { name: "Portfolio", exact: true })
    .click();
  await page.evaluate((href) => {
    history.pushState({}, "", href);
    dispatchEvent(new PopStateEvent("popstate"));
  }, origin);
  for (const resource of resources) {
    await open(page, resource);
    await returnObjective(page);
  }
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("link", { name: "Meri", exact: true })
    .click();
  await expect(
    page
      .getByRole("article", { name: "Current turn" })
      .getByText("Original integration request"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  expect(f.hints).toEqual([
    { clientId },
    {
      clientId,
      conversationId: conversationBinding.conversationId,
      runId: nextBinding.runId,
    },
    {
      clientId,
      conversationId: conversationBinding.conversationId,
      runId: nextBinding.runId,
    },
  ]);
  expect(requests).toHaveLength(1);
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(
    page
      .getByRole("article", { name: "Current turn" })
      .getByText("Completed", { exact: true }),
  ).toBeVisible();
  expect(requests).toEqual([requests[0], requests[0]]);
  exactQueries(f.queries);
  // Native list/transcript POSTs are reads and may run concurrently. Keep the strict command order.
  expect(
    f.commands.filter(
      (path) =>
        !["/api/conversations/list", "/api/conversations/transcript"].includes(
          path,
        ),
    ),
  ).toEqual([
    "/api/action-followthrough/session",
    "/api/conversations/history",
    "/api/conversations/next-turn",
    "/api/action-followthrough/session",
    "/api/conversations/submit",
    "/api/action-followthrough/session",
    "/api/conversations/submit",
    "/api/conversations/events",
  ]);
  expect(f.unexpected).toEqual([]);
});
test("settled Directory preflight cannot navigate after switching to Calendar and Context Files", async ({
  page,
}) => {
  const f = await fixture(page);
  let enter!: () => void, release!: () => void, settle!: () => void;
  const entered = new Promise<void>((r) => {
    enter = r;
  });
  const held = new Promise<void>((r) => {
    release = r;
  });
  const settled = new Promise<void>((r) => {
    settle = r;
  });
  await page.route(
    `**/api/backend/${resources[0].endpoint}/objective-destination?*`,
    async (r) => {
      enter();
      await held;
      await json(r, boundDirectory).catch(() => {});
      settle();
    },
  );
  await page.goto(origin);
  await select(page, resources[0]);
  await page
    .getByRole("button", {
      name: "Open Objective-bound Saved Directory target",
      exact: true,
    })
    .click();
  await entered;
  await page
    .getByLabel("Resource type", { exact: true })
    .selectOption("planner_occurrence");
  release();
  await settled;
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}/objectives`));
  await expect(
    page.getByRole("heading", { name: "Saved Directory target", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Existing Calendar Planner occurrence", { exact: true })
    .selectOption(occurrence);
  await page
    .getByRole("button", {
      name: "Open Objective-bound Calendar Planner occurrence",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: boundTask.task.name, exact: true }),
  ).toBeVisible();
  await returnObjective(page);
  await open(page, resources[2]);
  expect(f.commands).toEqual([]);
  expect(f.unexpected).toEqual([]);
});
