import { expect, test, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { client, clientId } from "./next-modules-fixtures";
import { draft, otherId } from "../../tests/prospect-resources-fixtures";

const ordinary = {
  ...draft,
  prospectId: null,
  clientId,
  client: client.name,
  docTitle: "Synthetic history document",
  config: { sections: ["Body"], sectionContent: { Body: "Current text" } },
};
const V_OLD = "60000000-0000-4000-8000-0000000000a1";
const V_NEW = "60000000-0000-4000-8000-0000000000a2";
const TAB_A = "70000000-0000-4000-8000-0000000000b1";
const TAB_B = "70000000-0000-4000-8000-0000000000b2";
const block = (content: string) => ({
  blocks: [{ id: "b1", type: "section", content }],
});

const savedVersions = () => [
  {
    id: V_NEW,
    draftId: draft.id,
    label: "Later save",
    authorId: testIdentity.user.clerkUserId,
    authorKind: "person",
    createdAt: "2026-10-25T10:00:00.000Z",
    snapshot: {
      docTitle: "History title two",
      config: { clientId, sectionContent: { Body: "Second text" } },
      documents: [
        {
          id: TAB_B,
          name: "Beta",
          ordinal: 0,
          body: block("Second beta body"),
        },
        {
          id: TAB_A,
          name: "Alpha",
          ordinal: 1,
          body: block("Second alpha body"),
        },
      ],
    },
  },
  {
    id: V_OLD,
    draftId: draft.id,
    label: "Earlier save",
    authorId: testIdentity.user.clerkUserId,
    authorKind: "person",
    createdAt: "2026-10-24T10:00:00.000Z",
    snapshot: {
      docTitle: "History title one",
      config: { clientId, sectionContent: { Body: "First text" } },
      documents: [
        {
          id: TAB_A,
          name: "Alpha",
          ordinal: 0,
          body: block("First alpha body"),
        },
      ],
    },
  },
];

const editorUrl = `/modules/workspace?clientId=${clientId}&draftId=${draft.id}`;

async function fixture(page: Page, versions: unknown[] = savedVersions()) {
  await onlyLocalRequests(page);
  const calls: { operation: string; method: string }[] = [];
  const errors: string[] = [];
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "workspace.documents": {
      items: [
        {
          id: draft.id,
          kind: "draft",
          name: ordinary.docTitle,
          blueprint: "Ordinary document",
          client: client.name,
          clientId,
          status: "draft",
          updatedAt: ordinary.updatedAt,
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
    "workspace.draft": () => structuredClone(ordinary),
    "workspace.draft.versions": () => structuredClone(versions),
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
  return { calls, errors };
}

const history = (page: Page) =>
  page.getByRole("dialog", { name: "Document history" });
const saveList = (page: Page) =>
  history(page).getByRole("tablist", { name: "Saved versions" });
const compareList = (page: Page) =>
  history(page).getByRole("tablist", { name: "Compare with" });

async function openHistory(page: Page) {
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(history(page)).toBeVisible();
}

test("saved history reads exact versions with keyboard selection, compare and no writes", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(editorUrl);
  await expect(
    page.getByRole("heading", { name: ordinary.docTitle, exact: true }),
  ).toBeVisible();
  await openHistory(page);

  // The list is the authorized read; two synthetic saved versions.
  await expect(saveList(page).getByRole("tab")).toHaveCount(2);

  // Keyboard moves the read-only selection and marks the active tab.
  const later = saveList(page).getByRole("tab", { name: "Later save" });
  await later.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    saveList(page).getByRole("tab", { name: "Earlier save" }),
  ).toHaveAttribute("aria-selected", "true");

  // Detail shows the exact label, saved date, parent identity and saved content
  // of the selected snapshot only.
  await expect(history(page).getByText("Parent document")).toBeVisible();
  await expect(
    history(page).getByText(draft.id, { exact: true }),
  ).toBeVisible();
  await expect(
    history(page).getByText(clientId, { exact: true }),
  ).toBeVisible();
  await expect(history(page).getByText("History title one")).toBeVisible();
  await expect(history(page).getByText("First alpha body")).toBeVisible();
  await expect(history(page).getByText("Second alpha body")).toHaveCount(0);

  // Comparing two exact saved versions diffs tabs (documents) in old→new order.
  await compareList(page).getByRole("tab", { name: "Later save" }).click();
  await expect(
    history(page).getByRole("heading", { name: /^Comparing/ }),
  ).toBeVisible();
  await expect(history(page).getByText("Tabs added: Beta")).toBeVisible();

  // Reopening after a reload restores the read with no live-state substitution.
  await page.reload();
  await openHistory(page);
  await expect(saveList(page).getByRole("tab")).toHaveCount(2);

  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("a foreign parent saved version refuses detail display", async ({
  page,
}) => {
  const state = await fixture(
    page,
    savedVersions().map((version) => ({ ...version, draftId: otherId })),
  );
  await page.goto(editorUrl);
  await openHistory(page);
  await expect(history(page).getByRole("alert")).toContainText(
    "another document",
  );
  await expect(history(page).getByText("Parent document")).toHaveCount(0);
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("a denied current-access read clears saved history detail", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.route("**/api/capiro/*", (route) => {
    const key = decodeURIComponent(
      new URL(route.request().url()).pathname.split("/").pop()!,
    );
    if (key === "workspace.draft.versions")
      return route.fulfill({
        status: 403,
        json: { message: "You do not have permission to access this document" },
      });
    return route.fallback();
  });
  await page.goto(editorUrl);
  await openHistory(page);
  await expect(history(page).getByRole("alert")).toContainText(
    "do not have permission",
  );
  await expect(history(page).getByText("Parent document")).toHaveCount(0);
  await expect(
    history(page).getByRole("heading", { name: /^Comparing/ }),
  ).toHaveCount(0);
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
  expect(state.errors).toEqual([]);
});

/** Override only the version read; later registrations win over the base fixture. */
async function overrideVersions(
  page: Page,
  handler: () =>
    | { json?: unknown; status?: number }
    | Promise<{ json?: unknown; status?: number }>,
) {
  await page.route("**/api/capiro/*", async (route) => {
    const key = decodeURIComponent(
      new URL(route.request().url()).pathname.split("/").pop()!,
    );
    if (key !== "workspace.draft.versions") return route.fallback();
    const reply = await handler();
    try {
      return await route.fulfill(
        reply.status
          ? { status: reply.status, json: reply.json }
          : { json: reply.json },
      );
    } catch {
      // The view aborting the superseded read closes this route; ignore it.
    }
  });
}

test("a late response after close never overwrites the current saved history", async ({
  page,
}) => {
  const state = await fixture(page);
  const stale = savedVersions().map((version) => ({
    ...version,
    label: "Stale save",
  }));
  let calls = 0;
  let releaseStale!: () => void;
  const staleGate = new Promise<void>((resolve) => (releaseStale = resolve));
  await overrideVersions(page, () =>
    calls++ === 0
      ? staleGate.then(() => ({ json: stale }))
      : { json: savedVersions() },
  );
  await page.goto(editorUrl);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(history(page).getByRole("status")).toContainText("Loading");
  // Close while the first read is still in flight, then reopen (a fresh read).
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(history(page)).toHaveCount(0);
  await openHistory(page);
  await expect(
    saveList(page).getByRole("tab", { name: "Earlier save" }),
  ).toBeVisible();
  // The obsolete response arrives only now and must never reach the view.
  releaseStale();
  await page.waitForTimeout(400);
  await expect(
    saveList(page).getByRole("tab", { name: "Earlier save" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Stale save" })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("already populated saved detail clears when the next read is denied", async ({
  page,
}) => {
  const state = await fixture(page);
  const denial = {
    status: 403,
    json: { message: "You do not have permission to access this document" },
  };
  let calls = 0;
  await overrideVersions(page, () =>
    calls++ === 0 ? { json: savedVersions() } : denial,
  );
  await page.goto(editorUrl);
  await openHistory(page);
  // Populate the read-only detail for one saved version.
  await saveList(page).getByRole("tab", { name: "Earlier save" }).click();
  await expect(history(page).getByText("Parent document")).toBeVisible();
  // A later authorized read is denied: the populated detail must not remain.
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(history(page)).toHaveCount(0);
  await openHistory(page);
  await expect(history(page).getByRole("alert")).toContainText(
    "do not have permission",
  );
  await expect(history(page).getByText("Parent document")).toHaveCount(0);
  await expect(page.getByRole("tablist")).toHaveCount(0);
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("already populated saved detail clears when a later read expires the session", async ({
  page,
}) => {
  const state = await fixture(page);
  const revoked = { status: 401, json: { message: "Session expired" } };
  let calls = 0;
  await overrideVersions(page, () =>
    calls++ === 0 ? { json: savedVersions() } : revoked,
  );
  await page.goto(editorUrl);
  await openHistory(page);
  await saveList(page).getByRole("tab", { name: "Earlier save" }).click();
  await expect(history(page).getByText("Parent document")).toBeVisible();
  // Revocation: the next read returns 401 and the session owner ends the view.
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(history(page)).toHaveCount(0);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(history(page)).toHaveCount(0);
  await expect(page.getByText("Parent document")).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
