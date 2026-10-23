import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Synthetic data and closed network only; service authorization and SDK input are separate gates.
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const date = "2026-10-23T00:00:00.000Z";
const draft = {
  id: id(4),
  tenantId: id(1),
  ownerId: id(2),
  docTitle: "Synthetic draft title",
  clientId: id(3),
  client: "Synthetic client",
  prospectId: null,
  product: null,
  industry: null,
  status: "draft",
  createdAt: date,
  updatedAt: date,
  documents: [],
  config: {},
};
const task = {
  id: id(5),
  ownerId: id(2),
  name: "Synthetic task title",
  description: "",
  clientId: id(3),
  status: "todo",
  priority: "none",
  subtype: "task",
  approval: "pending",
  startOn: null,
  dueOn: null,
  assigneeId: null,
  parentId: null,
  dependencies: [],
  collaborators: [],
  tags: [],
  memberships: [],
  customValues: {},
  estimateMinutes: 0,
  recurrence: null,
  meetingId: null,
  version: 1,
  archived: false,
  completedAt: null,
  createdAt: date,
  updatedAt: date,
  access: "viewer",
  actualMinutes: 0,
};

async function network(page: Page) {
  const unexpected: string[] = [],
    calls: string[] = [];
  let actor = 2,
    tenant = 1,
    denied = false;
  let draftResult = { ...draft },
    taskResult = { ...task };
  let release: (() => void) | undefined;
  let sourceGate: Promise<void> | undefined,
    clientGate: Promise<void> | undefined;
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:5191") {
      unexpected.push(request.url());
      return route.abort();
    }
    if (request.isNavigationRequest() && url.pathname === "/meri")
      return route.fulfill({
        contentType: "text/html",
        body: readFileSync(
          new URL("./meri-entry.html", import.meta.url),
          "utf8",
        ),
      });
    if (!url.pathname.startsWith("/api/")) return route.continue();
    calls.push(`${request.method()} ${url.pathname}`);
    if (request.method() === "GET" && url.pathname === "/api/backend/core/me")
      return route.fulfill({
        json: {
          user: { id: id(actor), email: "synthetic@example.test" },
          tenant: { id: id(tenant), name: "Synthetic tenant" },
          role: "standard_user",
        },
      });
    if (
      request.method() === "GET" &&
      url.pathname === "/api/backend/core/clients"
    )
      return route.fulfill({
        json: [
          {
            id: id(3),
            name: "Synthetic client",
            status: "active",
            profileStatus: "ACTIVE",
          },
        ],
      });
    if (
      request.method() === "GET" &&
      url.pathname === `/api/backend/core/clients/${id(3)}`
    ) {
      await clientGate;
      return route.fulfill({
        json: {
          id: id(3),
          name: "Synthetic client",
          status: "active",
          profileStatus: "ACTIVE",
        },
      });
    }
    if (
      request.method() === "GET" &&
      ["/api/capiro/workspace.draft", "/api/capiro/planner.task"].includes(
        url.pathname,
      )
    ) {
      const workspace = url.pathname.endsWith("workspace.draft");
      expect(JSON.parse(url.searchParams.get("input")!)).toEqual({
        params: { id: id(workspace ? 4 : 5) },
      });
      await sourceGate;
      return route.fulfill(
        denied
          ? { status: 403, json: { message: "Synthetic denied read" } }
          : { json: workspace ? draftResult : taskResult },
      );
    }
    unexpected.push(`${request.method()} ${url.pathname}`);
    return route.abort();
  });
  return {
    calls,
    unexpected,
    deny: () => {
      denied = true;
    },
    draft: (change: Partial<typeof draft>) => {
      draftResult = { ...draftResult, ...change };
    },
    task: (change: Partial<typeof task>) => {
      taskResult = { ...taskResult, ...change };
    },
    holdSource: () => {
      sourceGate = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    holdClient: () => {
      clientGate = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    release: () => {
      release?.();
      sourceGate = undefined;
      clientGate = undefined;
    },
    replaceIdentity: (nextActor: number, nextTenant = 1) => {
      actor = nextActor;
      tenant = nextTenant;
    },
  };
}
async function open(page: Page, kind: "draft" | "task") {
  await page.goto("/meri-entry.html");
  await page
    .getByRole("button", { name: `Ask about synthetic ${kind}` })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/meri\\?clientId=${id(3)}&entry=[0-9a-f-]{36}$`),
  );
}

test("synthetic draft entry: fresh read before title, reload rechecks, keyboard source return, no submit", async ({
  page,
}) => {
  const net = await network(page);
  net.holdSource();
  await open(page, "draft");
  await expect(
    page.getByRole("heading", { name: "Checking selected item" }),
  ).toBeVisible();
  await expect(page.getByText(draft.docTitle, { exact: true })).toHaveCount(0);
  net.release();
  const selected = page.getByRole("region", {
    name: "Selected item",
    exact: true,
  });
  await expect(selected).toContainText(draft.docTitle);
  await expect(
    selected.getByRole("button", { name: "Ask Meri unavailable" }),
  ).toBeDisabled();
  net.draft({ docTitle: "Freshly read synthetic title" });
  net.holdSource();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Checking selected item" }),
  ).toBeVisible();
  await expect(page.getByText(draft.docTitle, { exact: true })).toHaveCount(0);
  net.release();
  await expect(selected).toContainText("Freshly read synthetic title");
  expect(
    (
      await selected
        .getByRole("button", { name: "Recheck access" })
        .boundingBox()
    )?.height,
  ).toBeCloseTo(36, 3);
  expect(
    (
      await selected
        .getByRole("button", { name: "Ask Meri unavailable" })
        .boundingBox()
    )?.height,
  ).toBeCloseTo(36, 3);
  await selected.screenshot({ path: "work/meri-entry-synthetic-draft.png" });
  const link = selected.getByRole("link", { name: "Open workspace draft" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`/modules/workspace\\?clientId=${id(3)}&draftId=${id(4)}$`),
  );
  expect(
    net.calls.filter((call) => call.endsWith("workspace.draft")),
  ).toHaveLength(2);
  expect(net.calls.every((call) => call.startsWith("GET "))).toBe(true);
  expect(net.unexpected).toEqual([]);
});

test("synthetic task entry: denied recheck removes title and retires reload without another source request", async ({
  page,
}) => {
  const net = await network(page);
  await open(page, "task");
  await expect(
    page.getByRole("region", { name: "Selected item", exact: true }),
  ).toContainText(task.name);
  await expect(
    page.getByRole("link", { name: "Open planner task" }),
  ).toHaveAttribute("href", `/modules/planner?clientId=${id(3)}&task=${id(5)}`);
  net.deny();
  net.holdSource();
  await page.getByRole("button", { name: "Recheck access" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(task.name, { exact: true })).toHaveCount(0);
  net.release();
  await expect(page.getByRole("alert")).toContainText(
    "Selected item unavailable",
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Selected item unavailable",
  );
  expect(
    net.calls.filter((call) => call.endsWith("planner.task")),
  ).toHaveLength(2);
  expect(net.unexpected).toEqual([]);
});

for (const [label, change] of [
  ["wrong object", { id: id(8) }],
  ["wrong client", { clientId: id(8) }],
  ["wrong tenant", { tenantId: id(8) }],
  ["prospect", { prospectId: id(8) }],
  ["missing client", { clientId: undefined }],
  ["held association", { clientAssociation: "held" }],
] as const)
  test(`synthetic draft rejects ${label} without displaying content`, async ({
    page,
  }) => {
    const net = await network(page);
    net.draft(change as Partial<typeof draft>);
    await open(page, "draft");
    await expect(page.getByRole("alert")).toContainText(
      "Selected item unavailable",
    );
    await expect(page.getByText(draft.docTitle, { exact: true })).toHaveCount(
      0,
    );
    expect(net.unexpected).toEqual([]);
  });

for (const [label, change] of [
  ["wrong object", { id: id(8) }],
  ["wrong client", { clientId: id(8) }],
  ["archived", { archived: true }],
] as const)
  test(`synthetic task rejects ${label} without displaying content`, async ({
    page,
  }) => {
    const net = await network(page);
    net.task(change);
    await open(page, "task");
    await expect(page.getByRole("alert")).toContainText(
      "Selected item unavailable",
    );
    await expect(page.getByText(task.name, { exact: true })).toHaveCount(0);
    expect(net.unexpected).toEqual([]);
  });

test("synthetic confirmed scope switch retires entry; transient client loading preserves it", async ({
  page,
}) => {
  const net = await network(page);
  net.holdClient();
  await open(page, "draft");
  await expect(page.getByText("Selected client: Synthetic client")).toHaveCount(
    0,
  );
  net.release();
  await expect(
    page.getByRole("region", { name: "Selected item", exact: true }),
  ).toContainText(draft.docTitle);
  await page.getByRole("button", { name: "Switch to General" }).click();
  await expect(
    page.getByRole("region", { name: "Selected item", exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("alert")).toContainText(
    "Selected item unavailable",
  );
  expect(
    net.calls.filter((call) => call.endsWith("workspace.draft")),
  ).toHaveLength(1);
  expect(net.unexpected).toEqual([]);
});

test("synthetic actor/tenant replacement hides and aborts pending source, and old link cannot recover", async ({
  page,
}) => {
  const net = await network(page);
  net.holdSource();
  await open(page, "draft");
  await expect(
    page.getByRole("heading", { name: "Checking selected item" }),
  ).toBeVisible();
  net.replaceIdentity(9, 8);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "other-synthetic-user",
          sessionId: "other-synthetic-session",
          orgId: "other-synthetic-org",
        },
      }),
    ),
  );
  net.release();
  await expect(page.getByRole("alert")).toContainText(
    "Selected item unavailable",
  );
  await expect(page.getByText(draft.docTitle, { exact: true })).toHaveCount(0);
  expect(
    net.calls.filter((call) => call.endsWith("workspace.draft")),
  ).toHaveLength(1);
  expect(net.unexpected).toEqual([]);
});

test("synthetic entity expiry removes its visible title without sending or recovering another item", async ({
  page,
}) => {
  await page.clock.install();
  const net = await network(page);
  await open(page, "draft");
  await expect(
    page.getByRole("region", { name: "Selected item", exact: true }),
  ).toContainText(draft.docTitle);
  await page.clock.fastForward(300_001);
  await expect(page.getByRole("alert")).toContainText(
    "Selected item unavailable",
  );
  await expect(page.getByText(draft.docTitle, { exact: true })).toHaveCount(0);
  expect(
    net.calls.filter((call) => call.endsWith("workspace.draft")),
  ).toHaveLength(1);
  expect(net.calls.every((call) => call.startsWith("GET "))).toBe(true);
  expect(net.unexpected).toEqual([]);
});
