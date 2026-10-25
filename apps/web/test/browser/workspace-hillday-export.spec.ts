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
// The actual Core137 ExportView shape, including null grants when signing is unavailable.
function ready(expires = now + 3_600_000): Receipt {
  return {
    exportId,
    documentId,
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
      await options.createGate;
      await route.fulfill({ json: options.create ?? ready() }).catch(() => {});
    } else {
      const reply = (await options.status?.(++reads)) ?? { json: ready() };
      await route.fulfill(reply).catch(() => {});
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
      calls.filter((c) => c.key === "workspace.hillday.export.status"),
    binaries: () => calls.filter((c) => c.key === "workspace.hillday.download"),
  };
}
async function open(page: Page) {
  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
}
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Export Hill Day Schedule" });

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
  expect(state.statuses()).toHaveLength(2);
  expect(state.statuses().every((call) => call.method === "GET")).toBe(true);
  expect(state.statuses().map((call) => call.input)).toEqual([
    { params: { id: documentId, exportId } },
    { params: { id: documentId, exportId } },
  ]);
  expect(state.binaries()[0]!.input).toEqual({
    params: { id: documentId, exportId },
    query: { exp: String(now + 3_600_000), sig: "a".repeat(64) },
  });
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
    dialog(page).getByRole("button", { name: "Retry status" }),
  ).toBeDisabled();
  statusGate.release();
  await expect(dialog(page).getByText("Preparing PDF…")).toBeVisible();
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
  await dialog(page).getByRole("button", { name: "Retry status" }).click();
  await expect(
    dialog(page).getByText("PDF ready", { exact: true }),
  ).toBeVisible();
  expect(state.statuses()).toHaveLength(3);
  expect(state.creates()).toHaveLength(1);
  expect(state.binaries()).toHaveLength(0);
});

test("missing signing grant and failed render remain honest and do not recreate", async ({
  page,
}) => {
  const state = await fixture(page, {
    status: (n) => ({
      json:
        n === 1
          ? { ...ready(), url: null, expiresAt: null }
          : {
              ...ready(),
              status: "failed",
              url: null,
              expiresAt: null,
              error: "Synthetic render failure",
            },
    }),
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
  await expect(dialog(page).getByText("PDF generation failed")).toBeVisible();
  await expect(
    dialog(page).getByText("Synthetic render failure"),
  ).toBeVisible();
  await expect(
    dialog(page).getByRole("button", { name: "Download PDF", exact: true }),
  ).toHaveCount(0);
  await page.clock.runFor(6000);
  expect(state.statuses()).toHaveLength(2);
  expect(state.creates()).toHaveLength(1);
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
    .poll(() => state.aborted.includes("workspace.hillday.export.status"))
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
  await dialog(page)
    .getByRole("button", { name: "Refresh download link" })
    .click();
  await expect(dialog(page).getByRole("alert")).toHaveCount(0);
  expect(state.creates()).toHaveLength(1);
  expect(state.statuses()).toHaveLength(2);
});
