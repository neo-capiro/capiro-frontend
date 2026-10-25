import { expect, test, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { client, clientId, otherClientId } from "./next-modules-fixtures";
import { draft } from "../../tests/prospect-resources-fixtures";

const TAB_A = "90000000-0000-4000-8000-000000000001";
const TAB_B = "80000000-0000-4000-8000-000000000002";
const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ordinary = () => ({
  ...draft,
  prospectId: null,
  clientId,
  client: client.name,
  clientAssociation: undefined,
  docTitle: "Synthetic ordinary export document",
  config: { sections: ["Body"], sectionContent: { Body: "Saved body text" } },
  documents: [
    {
      id: TAB_A,
      draftId: draft.id,
      name: "Main document",
      ordinal: 0,
      body: { blocks: [] },
      createdAt: "2026-10-24T10:00:00Z",
      updatedAt: "2026-10-24T10:00:00Z",
    },
    {
      id: TAB_B,
      draftId: draft.id,
      name: "Cover letter",
      ordinal: 1,
      body: { blocks: [] },
      createdAt: "2026-10-24T10:00:00Z",
      updatedAt: "2026-10-24T10:00:00Z",
    },
  ],
});
const editorUrl = `/modules/workspace?clientId=${clientId}&draftId=${draft.id}`;
// Same route mounted through React.StrictMode (main.tsx test-harness opt-in),
// which under a development React build replays effects setup -> cleanup -> setup.
const strictEditorUrl = `${editorUrl}&strict=1`;
const libraryUrl = `/modules/workspace?clientId=${clientId}`;

type DraftReply = { json?: unknown; status?: number; message?: string };
type FixtureOptions = {
  /** The reply for the Nth workspace.draft read (read 1 is the mount read). */
  draftReply?: (read: number) => DraftReply;
  /** Hold the binary export response until releaseExport() is called. */
  holdExport?: boolean;
};

async function fixture(page: Page, options: FixtureOptions = {}) {
  await onlyLocalRequests(page);
  const calls: { operation: string; method: string }[] = [];
  const exports: { key: string; input: { query?: { part?: string } } }[] = [];
  const downloads: string[] = [];
  const errors: string[] = [];
  let draftReads = 0;
  let releaseExport!: () => void;
  const exportGate = new Promise<void>((resolve) => (releaseExport = resolve));
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "workspace.documents": {
      items: [
        {
          id: draft.id,
          kind: "draft",
          name: "Synthetic ordinary export document",
          blueprint: "Ordinary document",
          client: client.name,
          clientId,
          status: "draft",
          updatedAt: "2026-10-24T10:00:00Z",
          owner: {
            id: testIdentity.user.clerkUserId,
            name: "Test",
            initials: "T",
          },
          route: "https://untrusted.synthetic.invalid",
        },
      ],
      nextCursor: null,
    },
    "workspace.draft.versions": [],
  });
  // Own the draft read so a later (export) re-read can be moved, denied or
  // withheld without disturbing the initial mount read.
  await page.route("**/api/capiro/workspace.draft?*", (route) => {
    draftReads += 1;
    const reply = options.draftReply?.(draftReads);
    if (reply?.status)
      return route.fulfill({
        status: reply.status,
        json: { message: reply.message ?? "Request refused." },
      });
    return route.fulfill({ json: reply?.json ?? structuredClone(ordinary()) });
  });
  for (const [key, contentType, body] of [
    ["workspace.draft.pdf", "application/pdf", "%PDF-1.4 synthetic"],
    ["workspace.draft.docx", DOCX_TYPE, "PK synthetic docx"],
  ] as const)
    await page.route(`**/api/capiro/${key}?*`, async (route) => {
      const input = JSON.parse(
        new URL(route.request().url()).searchParams.get("input") ?? "{}",
      );
      exports.push({ key, input });
      if (options.holdExport) await exportGate;
      // The producer accepts 'all', 'main' or a packet ADD-ON document id only;
      // the primary row's id is never a valid part. Enforce that here so a UI
      // that offered or sent the primary id would fail rather than look healthy.
      const part = input.query?.part as string | undefined;
      const accepted = part === "all" || part === "main" || part === TAB_B;
      try {
        return await route.fulfill(
          accepted
            ? { contentType, body }
            : { status: 404, json: { message: "No such packet document." } },
        );
      } catch {
        // The view aborted the superseded request; ignore it.
      }
    });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ json: client }),
  );
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const operation = new URL(request.url()).pathname.split("/").pop()!;
    if (operation.startsWith("workspace."))
      calls.push({ operation, method: request.method() });
  });
  return { calls, exports, downloads, errors, releaseExport };
}

const openEditor = (page: Page) =>
  page.goto(editorUrl).then(() =>
    expect(
      page.getByRole("heading", {
        name: "Synthetic ordinary export document",
      }),
    ).toBeVisible(),
  );

test("ordinary saved PDF export downloads server-saved content with the unsaved warning and no writes", async ({
  page,
}) => {
  const state = await fixture(page);
  await openEditor(page);
  await expect(page.getByText("server-saved content")).toBeVisible();
  await expect(
    page.getByText("may differ from unsaved editor changes"),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("workspace-document.pdf");
  expect(state.exports).toHaveLength(1);
  expect(state.exports[0]!.input.query?.part).toBe("all");
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
  expect(
    state.calls.filter((call) => call.operation.includes("snapshot")),
  ).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("a real development StrictMode replay still downloads exactly once", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(strictEditorUrl);
  await expect(
    page.getByRole("heading", { name: "Synthetic ordinary export document" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("workspace-document.pdf");
  expect(state.downloads).toEqual(["workspace-document.pdf"]);
  expect(state.exports).toHaveLength(1);
  expect(state.exports[0]!.input.query?.part).toBe("all");
  expect(state.errors).toEqual([]);
});

test("ordinary export chooses main sections and an exact document id", async ({
  page,
}) => {
  const state = await fixture(page);
  await openEditor(page);
  const select = page.getByRole("combobox", {
    name: "Saved content to export",
  });
  await select.click();
  // Only the packet add-on is offered as an exact id; the primary row is not.
  await expect(page.getByRole("option")).toHaveText([
    "All documents",
    "Main sections only",
    "Cover letter",
  ]);
  await page.getByRole("option", { name: "Main sections only" }).click();
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  await expect.poll(() => state.exports.length).toBe(1);
  expect(state.exports[0]!.input.query?.part).toBe("main");

  await select.click();
  await page.getByRole("option", { name: "Cover letter" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved DOCX" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("workspace-document.docx");
  await expect.poll(() => state.exports.length).toBe(2);
  expect(state.exports[1]!.key).toBe("workspace.draft.docx");
  expect(state.exports[1]!.input.query?.part).toBe(TAB_B);
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
});

test("a moved ordinary client receipt refuses the export before any download", async ({
  page,
}) => {
  const state = await fixture(page, {
    draftReply: (read) =>
      read > 1
        ? { json: { ...ordinary(), clientId: otherClientId, client: "Moved" } }
        : {},
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  await expect(page.getByRole("alert")).toContainText("client scope");
  expect(state.exports).toEqual([]);
  expect(state.downloads).toEqual([]);
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("a denied ordinary export shows a refusal and a later retry succeeds", async ({
  page,
}) => {
  const state = await fixture(page, {
    draftReply: (read) =>
      read === 2
        ? {
            status: 403,
            message: "You do not have permission to export this document.",
          }
        : {},
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  await expect(page.getByRole("alert")).toContainText("do not have permission");
  expect(state.downloads).toEqual([]);
  // Recoverable: a later authorizing read lets the same action succeed.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  await download;
  expect(state.downloads).toEqual(["workspace-document.pdf"]);
  expect(state.errors).toEqual([]);
});

test("an in-flight ordinary export blocks a duplicate action and downloads once", async ({
  page,
}) => {
  const state = await fixture(page, { holdExport: true });
  await openEditor(page);
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  await expect(page.getByText("Preparing the saved export")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export saved PDF" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Export saved DOCX" }),
  ).toBeDisabled();
  expect(state.exports).toHaveLength(1);
  state.releaseExport();
  await expect.poll(() => state.downloads.length).toBe(1);
  expect(state.exports).toHaveLength(1);
});

test("a held export response resolving after unmount never downloads", async ({
  page,
}) => {
  const state = await fixture(page, { holdExport: true });
  await openEditor(page);
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  await expect(page.getByText("Preparing the saved export")).toBeVisible();
  expect(state.exports).toHaveLength(1);
  // Leave the document (unmount) while the export is still in flight.
  await page.getByRole("button", { name: "← Workspace" }).click();
  await expect(page).toHaveURL(libraryUrl);
  state.releaseExport();
  await page.waitForTimeout(400);
  expect(state.downloads).toEqual([]);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("ordinary export controls are keyboard reachable", async ({ page }) => {
  await fixture(page);
  await openEditor(page);
  const select = page.getByRole("combobox", {
    name: "Saved content to export",
  });
  await select.focus();
  await expect(select).toBeFocused();
  await page.getByRole("button", { name: "Export saved DOCX" }).focus();
  await expect(
    page.getByRole("button", { name: "Export saved DOCX" }),
  ).toBeFocused();
});
