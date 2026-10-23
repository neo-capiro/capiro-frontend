import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { WorkspaceDraftDocument } from "../../src/shared/capiro/operations/workspace-documents";
import type { PlannerTask } from "../../src/shared/capiro/operations/planner-schemas";

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
  let draftResult: WorkspaceDraftDocument = { ...draft, status: "draft" },
    taskResult = { ...task } as PlannerTask;
  let release: (() => void) | undefined;
  let sourceGate: Promise<void> | undefined,
    clientGate: Promise<void> | undefined;
  let writeGate: Promise<void> | undefined;
  let attachmentGate: Promise<void> | undefined;
  let attachmentFails = false;
  let attachmentCompleted = 0;
  let showAttachment = false;
  const attachment = {
    id: id(6),
    taskId: id(5),
    fileName: "synthetic.txt",
    sizeBytes: 9,
    uploadedBy: id(2),
    archived: false,
    createdAt: date,
  };
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
    if (request.method() === "GET" && url.pathname === "/api/capiro/me.read")
      return route.fulfill({
        json: {
          user: {
            id: id(actor),
            clerkUserId: "synthetic-user",
            email: "synthetic@example.test",
          },
          tenant: { id: id(tenant), name: "Synthetic tenant" },
          role: "standard_user",
        },
      });
    if (
      request.method() === "GET" &&
      url.pathname === "/api/capiro/workspace.clients"
    )
      return route.fulfill({
        json: {
          items: [3, 8].map((n) => ({
            id: id(n),
            name: n === 3 ? "Synthetic client" : "Other synthetic client",
            mono: "SC",
            description: null,
            objectiveCount: 0,
            officeCount: 0,
            hasLogo: false,
          })),
          nextCursor: null,
          sources: [],
        },
      });
    if (
      request.method() === "GET" &&
      [
        "/api/capiro/planner.task.events",
        "/api/capiro/planner.task.attachments",
      ].includes(url.pathname)
    )
      return route.fulfill({
        json:
          showAttachment && url.pathname.endsWith("attachments")
            ? [attachment]
            : [],
      });
    if (
      request.method() === "GET" &&
      url.pathname === "/api/capiro/planner.tasks"
    )
      return route.fulfill({ json: { items: [], nextCursor: null } });
    if (
      writeGate &&
      request.method() === "PATCH" &&
      [
        "/api/capiro/planner.task.update",
        "/api/capiro/workspace.draft.update",
      ].includes(url.pathname)
    ) {
      await writeGate;
      return route.fulfill({
        status: 503,
        json: { message: "Synthetic unknown save" },
      });
    }
    if (
      attachmentGate &&
      ((request.method() === "POST" &&
        url.pathname === "/api/capiro/planner.task.attachment.upload") ||
        (request.method() === "PATCH" &&
          url.pathname === "/api/capiro/planner.task.attachment.archive"))
    ) {
      if (request.method() === "POST")
        expect(request.headers()["content-type"]).toContain(
          "multipart/form-data",
        );
      else
        expect(request.postDataJSON()).toEqual({
          params: { taskId: id(5), id: id(6) },
          body: { archived: true },
        });
      await attachmentGate;
      await route.fulfill(
        attachmentFails
          ? { status: 503, json: { message: "Synthetic unknown attachment" } }
          : {
              json: attachment,
            },
      );
      attachmentCompleted += 1;
      return;
    }
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
    attachmentCompleted: () => attachmentCompleted,
    showAttachment: () => {
      showAttachment = true;
    },
    deny: () => {
      denied = true;
    },
    draft: (change: Partial<WorkspaceDraftDocument>) => {
      draftResult = { ...draftResult, ...change };
    },
    task: (change: Partial<PlannerTask>) => {
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
    holdWrite: () => {
      writeGate = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    holdAttachment: (fails: boolean) => {
      attachmentFails = fails;
      attachmentGate = new Promise<void>((resolve) => {
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
    net.draft(change);
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

for (const mobile of [false, true])
  test(`synthetic Planner source ${mobile ? "phone" : "desktop"}: keyboard handoff uses saved task and fresh receiver read`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const net = await network(page);
    await page.goto("/meri-entry.html?source=task");
    const action = page.getByRole("button", { name: "Ask Meri", exact: true });
    await expect(action).toBeEnabled();
    await expect(action).toHaveCount(1);
    await action.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `work/meri-source-task-${mobile ? "phone" : "desktop"}.png`,
    });
    net.task({ name: "Fresh receiver task title" });
    await action.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      new RegExp(`/meri\\?clientId=${id(3)}&entry=[0-9a-f-]{36}$`),
    );
    await expect(
      page.getByRole("region", { name: "Selected item", exact: true }),
    ).toContainText("Fresh receiver task title");
    expect(
      net.calls.filter((call) => call.endsWith("planner.task")),
    ).toHaveLength(2);
    expect(net.calls.every((call) => call.startsWith("GET "))).toBe(true);
    expect(net.unexpected).toEqual([]);
  });

test("synthetic Planner source: dirty, pending and failed save fence handoff", async ({
  page,
}) => {
  const net = await network(page);
  net.task({ access: "editor" });
  await page.goto("/meri-entry.html?source=task");
  const action = page.getByRole("button", { name: "Ask Meri", exact: true });
  await expect(action).toBeEnabled();
  const name = page.getByLabel("Task name", { exact: true });
  await name.fill("Unsaved task title");
  await expect(action).toBeDisabled();
  await name.fill(task.name);
  await expect(action).toBeEnabled();
  net.holdWrite();
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(action).toBeDisabled();
  net.release();
  await expect(page.getByRole("alert")).toContainText("Synthetic unknown save");
  await expect(action).toBeDisabled();
  expect(net.calls.filter((call) => !call.startsWith("GET "))).toEqual([
    "PATCH /api/capiro/planner.task.update",
  ]);
  expect(net.unexpected).toEqual([]);
});

for (const [label, change] of [
  ["archived", { archived: true }],
  ["unassigned client", { clientId: null }],
] as const)
  test(`synthetic Planner source: ${label} cannot hand off`, async ({
    page,
  }) => {
    const net = await network(page);
    net.task(change);
    await page.goto("/meri-entry.html?source=task");
    await expect(
      page.getByRole("button", { name: "Ask Meri", exact: true }),
    ).toBeDisabled();
    expect(net.calls.every((call) => call.startsWith("GET "))).toBe(true);
    expect(net.unexpected).toEqual([]);
  });

test("synthetic Workspace source: dirty and uncertain save fence handoff", async ({
  page,
}) => {
  const net = await network(page);
  await page.goto("/meri-entry.html?source=draft");
  const action = page.getByRole("button", { name: "Ask Meri", exact: true });
  await expect(action).toBeEnabled();
  const name = page.getByLabel("Document title", { exact: true });
  await name.fill("Unsaved draft title");
  await expect(action).toBeDisabled();
  await name.fill(draft.docTitle);
  await expect(action).toBeEnabled();
  await page.screenshot({ path: "work/meri-source-workspace.png" });
  net.holdWrite();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(action).toBeDisabled();
  net.release();
  await expect(page.getByRole("alert")).toContainText("Synthetic unknown save");
  await expect(action).toBeDisabled();
  expect(net.calls.filter((call) => !call.startsWith("GET "))).toEqual([
    "PATCH /api/capiro/workspace.draft.update",
  ]);
  expect(net.unexpected).toEqual([]);
});

for (const fails of [false, true])
  test(`synthetic Planner attachment: pending then ${fails ? "unknown remains held" : "saved releases handoff"}`, async ({
    page,
  }) => {
    const net = await network(page);
    net.task({ access: "editor" });
    await page.goto("/meri-entry.html?source=task");
    const action = page.getByRole("button", { name: "Ask Meri", exact: true });
    await expect(action).toBeEnabled();
    net.holdAttachment(fails);
    await page.getByLabel("Task attachment file").setInputFiles({
      name: "synthetic.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("synthetic"),
    });
    await expect(action).toBeDisabled();
    net.release();
    if (fails) {
      await expect(page.getByRole("alert")).toContainText(
        "Synthetic unknown attachment",
      );
      await expect(action).toBeDisabled();
    } else await expect(action).toBeEnabled();
    expect(net.calls.filter((call) => !call.startsWith("GET "))).toEqual([
      "POST /api/capiro/planner.task.attachment.upload",
    ]);
    expect(net.unexpected).toEqual([]);
  });

test("synthetic Planner attachment: late old-account failure cannot fence replacement task", async ({
  page,
}) => {
  const net = await network(page);
  net.task({ access: "editor" });
  await page.goto("/meri-entry.html?source=task");
  const action = page.getByRole("button", { name: "Ask Meri", exact: true });
  await expect(action).toBeEnabled();
  net.holdAttachment(true);
  await page.getByLabel("Task attachment file").setInputFiles({
    name: "synthetic.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("synthetic"),
  });
  await expect(action).toBeDisabled();
  net.replaceIdentity(9, 8);
  net.task({ ownerId: id(9), name: "Replacement account task" });
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "replacement-user",
          sessionId: "replacement-session",
          orgId: "replacement-org",
        },
      }),
    ),
  );
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "Replacement account task",
  );
  await expect(action).toBeEnabled();
  net.release();
  await expect.poll(net.attachmentCompleted).toBe(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(action).toBeEnabled();
  expect(net.unexpected).toEqual([]);
});

test("synthetic Planner attachment archive shares pending and failure fence", async ({
  page,
}) => {
  const net = await network(page);
  net.task({ access: "editor" });
  net.showAttachment();
  await page.goto("/meri-entry.html?source=task");
  const action = page.getByRole("button", { name: "Ask Meri", exact: true });
  await expect(action).toBeEnabled();
  net.holdAttachment(true);
  await page
    .getByRole("button", { name: "Archive", exact: true })
    .first()
    .click();
  await expect(action).toBeDisabled();
  net.release();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic unknown attachment",
  );
  await expect(action).toBeDisabled();
  expect(net.calls.filter((call) => !call.startsWith("GET "))).toEqual([
    "PATCH /api/capiro/planner.task.attachment.archive",
  ]);
  expect(net.unexpected).toEqual([]);
});

test("synthetic entry allowlist actively rejects an unregistered read", async ({
  page,
}) => {
  const net = await network(page);
  await page.goto("/meri-entry.html");
  const outcome = await page.evaluate(() =>
    fetch("/api/capiro/unknown.synthetic").then(
      () => "unexpected success",
      () => "refused",
    ),
  );
  expect(outcome).toBe("refused");
  expect(net.unexpected).toEqual(["GET /api/capiro/unknown.synthetic"]);
});

for (const [label, change] of [
  ["held association", { clientAssociation: "held" }],
  ["missing client", { clientId: null }],
] as const)
  test(`synthetic Workspace source: ${label} cannot hand off`, async ({
    page,
  }) => {
    const net = await network(page);
    net.draft(change);
    await page.goto("/meri-entry.html?source=draft");
    await expect(
      page.getByRole("button", { name: "Ask Meri", exact: true }),
    ).toBeDisabled();
    expect(net.calls.every((call) => call.startsWith("GET "))).toBe(true);
    expect(net.unexpected).toEqual([]);
  });

test("synthetic newsletter source: saved identity only, edits held and receiver denial retires context", async ({
  page,
}) => {
  const net = await network(page);
  net.draft({ product: "Newsletter" });
  await page.goto("/meri-entry.html?source=draft");
  const action = page.getByRole("button", { name: "Ask Meri", exact: true });
  await expect(action).toBeEnabled();
  await expect(
    page.getByRole("combobox", { name: "Client", exact: true }),
  ).toBeDisabled();
  await action.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "work/meri-source-newsletter.png" });
  await page
    .getByLabel("Document name", { exact: true })
    .fill("Unsaved newsletter title");
  await expect(action).toBeDisabled();
  await page.reload();
  await expect(action).toBeEnabled();
  net.deny();
  await action.click();
  await expect(page.getByRole("alert")).toContainText(
    "Selected item unavailable",
  );
  await expect(page.getByText(draft.docTitle, { exact: true })).toHaveCount(0);
  expect(net.calls.every((call) => call.startsWith("GET "))).toBe(true);
  expect(net.unexpected).toEqual([]);
});
