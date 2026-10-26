import { expect, type Page } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  client,
  clientId,
  otherClient,
  otherClientId,
  navigate,
} from "./next-modules-fixtures";
import type { HillDayDocument } from "../../src/shared/capiro/operations/workspace-schemas";
import type { OperationResponse } from "../../src/shared/capiro/contracts";
import type { workspaceExportOperations } from "../../src/shared/capiro/operations/workspace-exports";

type Receipt = OperationResponse<
  (typeof workspaceExportOperations)["workspace.hillday.export.status"]
>;
const documentId = "51000000-0000-4000-8000-000000000001";
const exportId = "52000000-0000-4000-8000-000000000001";
const differentId = "53000000-0000-4000-8000-000000000001";
const requestId = "54000000-0000-4000-8000-000000000001";
const now = Date.parse("2026-10-25T12:00:00Z");
const editorUrl = `/modules/workspace?clientId=${clientId}&view=hillday&hilldayId=${documentId}`;
const document: HillDayDocument = {
  id: documentId,
  name: "Synthetic Hill Day",
  status: "generated",
  client: { ...client, mono: "SC", hasLogo: false },
  firm: { name: "Synthetic firm" },
  owner: { id: testIdentity.user.clerkUserId, name: "Test", initials: "T" },
  timeZone: "UTC",
  lookbackDays: 30,
  updatedAt: "2026-10-25T00:00:00Z",
  createdAt: "2026-10-25T00:00:00Z",
  meetingCount: 0,
  cover: { title: "Synthetic schedule", dateline: "Saved date", facts: [] },
  firstPage: null,
  summary: [],
  summaryColumns: [],
  sections: [],
  provenance: {
    generatedAt: null,
    model: null,
    sourceCounts: [],
    corrections: [],
    failedUnits: 0,
    quality: null,
    totalSources: 0,
  },
  generation: { lastJobId: null, status: null },
};
// PR150 ExportView; the fixture binds its request UUID to the actual captured POST.
function ready(expires = now + 3_600_000): Receipt {
  return {
    exportId,
    documentId,
    requestId,
    renderInputSha256: "b".repeat(64),
    contentSha256: "c".repeat(64),
    sourceUpdatedAt: document.updatedAt,
    status: "ready",
    format: "pdf",
    pageSize: "letter",
    filename: "synthetic-schedule.pdf",
    sizeBytes: 32,
    url: `/workspace-api/hillday/files/${documentId}/${exportId}?exp=${expires}&sig=${"a".repeat(64)}`,
    expiresAt: new Date(expires).toISOString(),
    error: null,
    createdAt: "2026-10-25T11:00:00Z",
  };
}
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
type Reply = { json: unknown; status?: number };
type Options = {
  create?: Receipt;
  createGate?: Promise<void>;
  createStatus?: number;
  status?: (count: number) => Reply | Promise<Reply>;
  downloadGate?: Promise<void>;
  downloadType?: string;
};
async function fixture(page: Page, options: Options = {}) {
  await onlyLocalRequests(page);
  await page.clock.install({ time: new Date(now) });
  const calls: { key: string; method: string; input: unknown }[] = [];
  const downloads: string[] = [];
  const aborted: string[] = [];
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText.includes("ABORTED"))
      aborted.push(new URL(request.url()).pathname.split("/").pop()!);
  });
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [client, otherClient],
    "workspace.hillday.document": document,
    "workspace.hillday.quality": {
      documentId,
      score: 100,
      checks: [],
      computedAt: new Date(now).toISOString(),
    },
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: route.request().url().endsWith(otherClientId)
        ? otherClient
        : client,
    }),
  );
  let reads = 0;
  let originalRequest = requestId;
  const bind = (value: unknown) =>
    value &&
    typeof value === "object" &&
    Reflect.get(value, "requestId") === requestId
      ? { ...value, requestId: originalRequest }
      : value;
  await page.route("**/api/capiro/workspace.hillday.export*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const key = url.pathname.split("/").pop()!;
    const input: unknown =
      req.method() === "GET"
        ? JSON.parse(url.searchParams.get("input") ?? "{}")
        : req.postDataJSON();
    calls.push({ key, method: req.method(), input });
    if (key === "workspace.hillday.export") {
      originalRequest = (input as { body: { requestId: string } }).body
        .requestId;
      await options.createGate;
      await route
        .fulfill(
          options.createStatus
            ? {
                status: options.createStatus,
                json: { message: "Synthetic lost acknowledgement" },
              }
            : { json: bind(options.create ?? ready()) },
        )
        .catch(() => {});
    } else {
      originalRequest = (input as { params: { requestId: string } }).params
        .requestId;
      const reply = (await options.status?.(++reads)) ?? { json: ready() };
      await route.fulfill({ ...reply, json: bind(reply.json) }).catch(() => {});
    }
  });
  await page.route(
    "**/api/capiro/workspace.hillday.download?*",
    async (route) => {
      const input: unknown = JSON.parse(
        new URL(route.request().url()).searchParams.get("input") ?? "{}",
      );
      calls.push({ key: "workspace.hillday.download", method: "GET", input });
      await options.downloadGate;
      await route
        .fulfill({
          contentType: options.downloadType ?? "application/pdf",
          body: "%PDF-1.7\nSynthetic fixture bytes\n",
        })
        .catch(() => {});
    },
  );
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename()),
  );
  return {
    calls,
    downloads,
    aborted,
    creates: () => calls.filter((c) => c.key === "workspace.hillday.export"),
    statuses: () =>
      calls.filter((c) => c.key === "workspace.hillday.export.request"),
    binaries: () => calls.filter((c) => c.key === "workspace.hillday.download"),
  };
}
async function open(page: Page) {
  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
}
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Export saved PDF" });

test("expired known receipt renews by GET and downloads once without recreating", async ({
  page,
}) => {
  const expired = ready(now - 1);
  const state = await fixture(page, {
    create: expired,
    status: (n) => ({ json: n === 1 ? expired : ready() }),
  });
  await open(page);
  await expect(
    dialog(page).getByText("Download link expired.", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog(page).getByRole("button", { name: "Generate PDF", exact: true }),
  ).toHaveCount(0);
  await dialog(page)
    .getByRole("button", { name: "Refresh download link" })
    .click();
  await expect(
    dialog(page).getByText("Download link expires ", { exact: false }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog(page)
    .getByRole("button", { name: "Download PDF", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("hill-day-schedule.pdf");
  expect(state.creates()).toHaveLength(1);
  expect(state.statuses()).toHaveLength(3);
  expect(state.statuses().every((call) => call.method === "GET")).toBe(true);
  expect(state.statuses().map((call) => call.input)).toEqual([
    ...Array.from({ length: 3 }, () => ({
      params: {
        id: documentId,
        requestId: (
          state.creates()[0]!.input as { body: { requestId: string } }
        ).body.requestId,
      },
    })),
  ]);
  expect(state.binaries()[0]!.input).toEqual({
    params: { id: documentId, exportId },
    query: { exp: String(now + 3_600_000), sig: "a".repeat(64) },
  });
});

test("lost acknowledgement survives close and reload with original page inputs and PDF", async ({
  page,
}) => {
  const state = await fixture(page, {
    createStatus: 503,
    status: () => ({ json: { ...ready(), pageSize: "a4" } }),
  });
  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await dialog(page).getByRole("combobox").click();
  await page.getByRole("option", { name: "A4", exact: true }).click();
  await dialog(page)
    .getByRole("button", { name: "Generate PDF", exact: true })
    .click();
  await expect(
    dialog(page).getByText("Export unconfirmed", { exact: true }),
  ).toBeVisible();
  expect(state.creates()).toHaveLength(1);
  const original = state.creates()[0]!.input as {
    body: { requestId: string; pageSize: string };
  };
  expect(original.body.pageSize).toBe("a4");
  expect(original.body.requestId).toMatch(/^[a-f0-9-]{36}$/);
  await dialog(page)
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.route("**/api/capiro/workspace.hillday.document?*", (route) =>
    route.fulfill({
      json: {
        ...document,
        name: "Later saved edit",
        updatedAt: "2026-10-25T11:59:00Z",
      },
    }),
  );
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect(
    dialog(page).getByText("PDF ready", { exact: true }),
  ).toBeVisible();
  await expect(dialog(page).getByRole("combobox")).toHaveText("A4");
  await expect(
    dialog(page).getByText("synthetic-schedule.pdf", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect(
    dialog(page).getByText("PDF ready", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog(page)
    .getByRole("button", { name: "Download PDF", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("hill-day-schedule.pdf");
  expect(state.creates()).toHaveLength(1);
  expect(
    state
      .statuses()
      .every(
        (call) =>
          (call.input as { params: { requestId: string } }).params.requestId ===
          original.body.requestId,
      ),
  ).toBe(true);
  expect(state.binaries()[0]!.input).toMatchObject({
    params: { id: documentId, exportId },
  });
});

test("absent and unavailable readback never authorizes another POST", async ({
  page,
}) => {
  const state = await fixture(page, {
    createStatus: 503,
    status: (count) =>
      count === 1
        ? { json: null }
        : { status: 503, json: { message: "Synthetic unavailable read" } },
  });
  await open(page);
  await expect(dialog(page).getByRole("alert")).toContainText(
    "Synthetic lost acknowledgement",
  );
  await dialog(page)
    .getByRole("button", { name: "Check status", exact: true })
    .click();
  await expect(
    dialog(page).getByText("Export unconfirmed", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog(page).getByRole("button", { name: "Generate PDF", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "Synthetic unavailable read",
  );
  await page.clock.runFor(6000);
  expect(state.creates()).toHaveLength(1);
  expect(state.statuses()).toHaveLength(2);
});

test("two tabs share the retained command lock without a second dispatch", async ({
  page,
  context,
}) => {
  const gate = deferred();
  const first = await fixture(page, { createGate: gate.promise });
  const other = await context.newPage();
  const second = await fixture(other);
  for (const target of [page, other]) {
    await target.goto(editorUrl);
    await target
      .getByRole("button", { name: "Export PDF", exact: true })
      .click();
  }
  await dialog(page)
    .getByRole("button", { name: "Generate PDF", exact: true })
    .click();
  await expect.poll(() => first.creates().length).toBe(1);
  await dialog(other)
    .getByRole("button", { name: "Generate PDF", exact: true })
    .click();
  gate.release();
  await expect(
    dialog(page).getByText("PDF ready", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog(other).getByText("PDF ready", { exact: true }),
  ).toBeVisible();
  expect(second.creates()).toHaveLength(0);
  expect(second.statuses()[0]!.input).toEqual({
    params: {
      id: documentId,
      requestId: (first.creates()[0]!.input as { body: { requestId: string } })
        .body.requestId,
    },
  });
  await other.close();
});

test("expiry removes download admission while the dialog stays open", async ({
  page,
}) => {
  const state = await fixture(page, {
    status: () => ({ json: ready(now + 10_000) }),
  });
  await open(page);
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.clock.fastForward(10_001);
  await expect(
    dialog(page).getByText("Download link expired.", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeDisabled();
  expect(state.binaries()).toHaveLength(0);
  expect(state.creates()).toHaveLength(1);
});

test("queued receipts poll to ready; creation and status pending cannot duplicate work", async ({
  page,
}) => {
  const createGate = deferred();
  const statusGate = deferred();
  const queued: Receipt = {
    ...ready(),
    status: "queued",
    filename: null,
    sizeBytes: null,
    url: null,
    expiresAt: null,
  };
  const state = await fixture(page, {
    createGate: createGate.promise,
    create: queued,
    status: async (n) => {
      if (n === 1) await statusGate.promise;
      return { json: n === 1 ? queued : ready() };
    },
  });
  await open(page);
  await expect(
    dialog(page).getByRole("button", { name: "Generating…" }),
  ).toBeDisabled();
  createGate.release();
  await expect(dialog(page).getByText("Checking export status…")).toBeVisible();
  await expect(
    dialog(page).getByRole("button", { name: "Checking…" }),
  ).toBeDisabled();
  statusGate.release();
  await expect(dialog(page).getByText("Export in progress")).toBeVisible();
  await page.clock.runFor(2100);
  await expect(
    dialog(page).getByText("PDF ready", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(5000);
  expect(state.statuses()).toHaveLength(2);
  expect(state.creates()).toHaveLength(1);
});

test("status error hides the prior grant and only deliberate GET retry recovers", async ({
  page,
}) => {
  let denied = false;
  const state = await fixture(page, {
    status: () =>
      denied
        ? { status: 403, json: { message: "Current access denied" } }
        : { json: ready() },
  });
  await open(page);
  await expect(
    dialog(page).getByText("PDF ready", { exact: true }),
  ).toBeVisible();
  denied = true;
  await dialog(page)
    .getByRole("button", { name: "Refresh download link" })
    .click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "Current access denied",
  );
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog(page).getByText("synthetic-schedule.pdf", { exact: true }),
  ).toHaveCount(0);
  await page.clock.runFor(6000);
  expect(state.statuses()).toHaveLength(2);
  denied = false;
  await dialog(page).getByRole("button", { name: "Check status" }).click();
  await expect(
    dialog(page).getByText("PDF ready", { exact: true }),
  ).toBeVisible();
  expect(state.statuses()).toHaveLength(3);
  expect(state.creates()).toHaveLength(1);
  expect(state.binaries()).toHaveLength(0);
});

test("missing signing grant stays unavailable without recreating", async ({
  page,
}) => {
  const state = await fixture(page, {
    status: () => ({ json: { ...ready(), url: null, expiresAt: null } }),
  });
  await open(page);
  await expect(
    dialog(page).getByText("A download link is unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeDisabled();
  await dialog(page)
    .getByRole("button", { name: "Refresh download link" })
    .click();
  await expect(
    dialog(page).getByText("A download link is unavailable.", { exact: false }),
  ).toBeVisible();
  expect(state.creates()).toHaveLength(1);
  expect(state.statuses()).toHaveLength(2);
});
test("settled renderer failure remains failed without replacement", async ({
  page,
}) => {
  const failed: Receipt = {
    ...ready(),
    status: "failed",
    url: null,
    expiresAt: null,
    contentSha256: null,
    error: "Synthetic render failure",
  };
  const state = await fixture(page, {
    create: failed,
    status: () => ({ json: failed }),
  });
  await open(page);
  await expect(dialog(page).getByText("PDF generation failed")).toBeVisible();
  await expect(
    dialog(page).getByText("Synthetic render failure"),
  ).toBeVisible();
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "Check status" }).click();
  await expect(dialog(page).getByText("PDF generation failed")).toBeVisible();
  expect(state.creates()).toHaveLength(1);
  expect(state.statuses()).toHaveLength(2);
});

for (const field of ["documentId", "exportId"] as const) {
  test(`refuses a status receipt with a different ${field}`, async ({
    page,
  }) => {
    const state = await fixture(page, {
      status: () => ({ json: { ...ready(), [field]: differentId } }),
    });
    await open(page);
    await expect(dialog(page).getByRole("alert")).toContainText(
      "does not match",
    );
    await expect(
      dialog(page).getByText("synthetic-schedule.pdf", { exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
    ).toHaveCount(0);
    expect(state.binaries()).toHaveLength(0);
    expect(state.creates()).toHaveLength(1);
  });
}

test("a held status cannot restore receipt after actor/session replacement", async ({
  page,
}) => {
  const gate = deferred();
  const state = await fixture(page, {
    status: async () => {
      await gate.promise;
      return { json: ready() };
    },
  });
  await open(page);
  await expect(dialog(page).getByText("Checking export status…")).toBeVisible();
  await page.route("**/api/capiro/me.read*", (route) =>
    route.fulfill({
      json: {
        ...testIdentity,
        user: {
          ...testIdentity.user,
          id: differentId,
          clerkUserId: "other-test-user",
        },
      },
    }),
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "other-test-user",
          sessionId: "other-test-session",
          orgId: "other-test-org",
        },
      }),
    ),
  );
  await expect(dialog(page)).toHaveCount(0);
  await expect
    .poll(() => state.aborted.includes("workspace.hillday.export.request"))
    .toBe(true);
  gate.release();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect(
    dialog(page).getByRole("button", { name: "Generate PDF", exact: true }),
  ).toBeEnabled();
  await expect(
    dialog(page).getByText("PDF ready", { exact: true }),
  ).toHaveCount(0);
  expect(state.statuses()).toHaveLength(1);
  expect(state.creates()).toHaveLength(1);
});

for (const exit of ["close", "client", "identity"] as const) {
  test(`held binary is cancelled on ${exit} without a late download`, async ({
    page,
  }) => {
    const gate = deferred();
    const state = await fixture(page, { downloadGate: gate.promise });
    await open(page);
    await dialog(page)
      .getByRole("button", { name: "Download PDF", exact: true })
      .click();
    await expect.poll(() => state.binaries().length).toBe(1);
    await expect(
      dialog(page).getByRole("button", { name: "Downloading…" }),
    ).toBeDisabled();
    if (exit === "close")
      await dialog(page)
        .getByRole("button", { name: "Close", exact: true })
        .last()
        .click();
    else if (exit === "client")
      await navigate(page, `/modules/workspace?clientId=${otherClientId}`);
    else
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: { userId: null, sessionId: null, orgId: null },
          }),
        ),
      );
    await expect(dialog(page)).toHaveCount(0);
    await expect
      .poll(() => state.aborted.includes("workspace.hillday.download"))
      .toBe(true);
    gate.release();
    await page.clock.runFor(2000);
    expect(state.downloads).toEqual([]);
    expect(state.creates()).toHaveLength(1);
  });
}

test("401 clears protected export state without replay", async ({ page }) => {
  const state = await fixture(page, {
    status: () => ({ status: 401, json: { message: "Expired session" } }),
  });
  await open(page);
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  expect(state.creates()).toHaveLength(1);
  expect(state.statuses()).toHaveLength(1);
  expect(state.binaries()).toHaveLength(0);
});

test("binary MIME refusal is visible and status retry never creates a replacement", async ({
  page,
}) => {
  const state = await fixture(page, { downloadType: "text/html" });
  await open(page);
  await dialog(page)
    .getByRole("button", { name: "Download PDF", exact: true })
    .click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "Unexpected export response",
  );
  expect(state.downloads).toEqual([]);
  await dialog(page).getByRole("button", { name: "Check status" }).click();
  await expect(
    dialog(page).getByText("PDF ready", { exact: true }),
  ).toBeVisible();
  await expect(dialog(page).getByRole("alert")).toHaveCount(0);
  expect(state.creates()).toHaveLength(1);
  expect(state.statuses()).toHaveLength(3);
});

test("a later digest substitution cannot replace the retained PDF proof", async ({
  page,
}) => {
  let substituted = false;
  const state = await fixture(page, {
    status: () => ({
      json: {
        ...ready(),
        contentSha256: substituted ? "d".repeat(64) : ready().contentSha256,
      },
    }),
  });
  await open(page);
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  substituted = true;
  await dialog(page)
    .getByRole("button", { name: "Refresh download link" })
    .click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "does not match the original request",
  );
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "does not match the original request",
  );
  expect(state.creates()).toHaveLength(1);
  expect(state.binaries()).toHaveLength(0);
});

test("a live document reassignment clears the old client's grant before a binary request", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.route("**/api/capiro/workspace.hillday.document?*", (route) =>
    route.fulfill({
      json: { ...document, client: { ...document.client, id: otherClientId } },
    }),
  );
  await dialog(page)
    .getByRole("button", { name: "Download PDF", exact: true })
    .click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "document or its client changed",
  );
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toHaveCount(0);
  expect(state.binaries()).toHaveLength(0);
  expect(state.creates()).toHaveLength(1);
});

test("export presentation keeps keyboard access and the retained original states", async ({
  page,
}, testInfo) => {
  let resolved = false;
  const state = await fixture(page, {
    createStatus: 503,
    status: () => ({ json: resolved ? ready() : null }),
  });
  await page.goto(editorUrl);
  const trigger = page.getByRole("button", { name: "Export PDF", exact: true });
  await trigger.click();
  await expect(
    dialog(page).getByRole("button", { name: "Generate PDF", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => window.document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("hillday-export-initial.png"),
  });
  const size = dialog(page).getByRole("combobox", { name: "Page size" });
  await size.focus();
  await expect(size).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog(page).getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog(page)
    .getByRole("button", { name: "Generate PDF", exact: true })
    .click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "lost acknowledgement",
  );
  await dialog(page)
    .getByRole("button", { name: "Check status", exact: true })
    .click();
  await expect(
    dialog(page).getByRole("button", { name: "Check status", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("hillday-export-unresolved.png"),
  });
  resolved = true;
  await dialog(page)
    .getByRole("button", { name: "Check status", exact: true })
    .click();
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("hillday-export-ready.png"),
  });
  expect(state.creates()).toHaveLength(1);
  expect(state.binaries()).toHaveLength(0);
});

test("closing during the original POST retires its acknowledgement and reopens by request GET", async ({
  page,
}) => {
  const gate = deferred();
  const state = await fixture(page, { createGate: gate.promise });
  await open(page);
  await expect.poll(() => state.creates().length).toBe(1);
  const original = (
    state.creates()[0]!.input as { body: { requestId: string } }
  ).body.requestId;
  await dialog(page)
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(dialog(page)).toHaveCount(0);
  gate.release();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  expect(state.statuses().map((call) => call.input)).toEqual([
    { params: { id: documentId, requestId: original } },
  ]);
  expect(state.creates()).toHaveLength(1);
  expect(state.downloads).toEqual([]);
});
