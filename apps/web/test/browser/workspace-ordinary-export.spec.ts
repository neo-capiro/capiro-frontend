import { expect, test, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { client, clientId, otherClientId } from "./next-modules-fixtures";
import { draft, otherId } from "../../tests/prospect-resources-fixtures";

const TAB_A = otherId;
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

async function fixture(page: Page, draft?: () => unknown) {
  await onlyLocalRequests(page);
  const calls: { operation: string; method: string }[] = [];
  const exports: { key: string; input: { query?: { part?: string } } }[] = [];
  const errors: string[] = [];
  let draftReads = 0;
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "workspace.documents": {
      items: [
        {
          id: draft,
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
    "workspace.draft": () => {
      draftReads += 1;
      return draft ? draft() : structuredClone(ordinary());
    },
    "workspace.draft.versions": [],
  });
  for (const [key, contentType, body] of [
    ["workspace.draft.pdf", "application/pdf", "%PDF-1.4 synthetic"],
    ["workspace.draft.docx", DOCX_TYPE, "PK synthetic docx"],
  ] as const)
    await page.route(`**/api/capiro/${key}?*`, (route) => {
      exports.push({
        key,
        input: JSON.parse(
          new URL(route.request().url()).searchParams.get("input") ?? "{}",
        ),
      });
      return route.fulfill({ contentType, body });
    });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ json: client }),
  );
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const operation = new URL(request.url()).pathname.split("/").pop()!;
    if (operation.startsWith("workspace."))
      calls.push({ operation, method: request.method() });
  });
  return { calls, exports, errors, draftReads: () => draftReads };
}

test("ordinary saved PDF export downloads the server-saved document and writes nothing", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(editorUrl);
  await expect(
    page.getByRole("heading", { name: "Synthetic ordinary export document" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("workspace-document.pdf");
  expect(state.exports).toHaveLength(1);
  expect(state.exports[0]!.input.query?.part).toBe("all");
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("an exact ordinary tab id is sent as the export part with the DOCX format", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(editorUrl);
  await page.getByRole("combobox", { name: "Saved content to export" }).click();
  await page.getByRole("option", { name: "Cover letter" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved DOCX" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("workspace-document.docx");
  expect(state.exports).toHaveLength(1);
  expect(state.exports[0]!.key).toBe("workspace.draft.docx");
  expect(state.exports[0]!.input.query?.part).toBe(TAB_B);
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
});

test("a moved ordinary client receipt refuses the export before any download", async ({
  page,
}) => {
  const state = await fixture(page, () => ({
    ...ordinary(),
    clientId: otherClientId,
    client: "Moved client",
  }));
  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  await expect(page.getByRole("alert")).toContainText("client scope");
  expect(state.exports).toEqual([]);
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("a denied ordinary export surfaces a refusal and downloads nothing", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.route("**/api/capiro/workspace.draft?*", (route) =>
    route.fulfill({
      status: 403,
      json: { message: "You do not have permission to export this document." },
    }),
  );
  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  await expect(page.getByRole("alert")).toContainText("do not have permission");
  expect(state.exports).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("ordinary export controls are keyboard reachable", async ({ page }) => {
  await fixture(page);
  await page.goto(editorUrl);
  await page.getByRole("combobox", { name: "Saved content to export" }).focus();
  await expect(
    page.getByRole("combobox", { name: "Saved content to export" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Export saved DOCX" }).focus();
  await expect(
    page.getByRole("button", { name: "Export saved DOCX" }),
  ).toBeFocused();
});
