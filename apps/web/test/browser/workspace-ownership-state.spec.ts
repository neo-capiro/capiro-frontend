import { expect, type Page, type Route } from "@playwright/test";
import { test } from "./runtime-observed-test";
import type { WorkspaceLibraryDocument } from "../../src/shared/capiro/operations/workspace-schemas";
import { testIdentity } from "./fixtures";
import { client, navigate, otherClient, setup } from "./next-modules-fixtures";

const ownBrief: WorkspaceLibraryDocument = {
  id: "90000000-0000-4000-8000-000000000001",
  kind: "draft",
  name: "Synthetic own brief",
  blueprint: "Synthetic document",
  client: client.name,
  status: "draft",
  updatedAt: "2026-10-08T12:00:00Z",
  owner: { id: "test-user", name: "Test User", initials: "TU" },
  route: "/modules/workspace",
};
const sharedBrief: WorkspaceLibraryDocument = {
  ...ownBrief,
  id: "90000000-0000-4000-8000-000000000002",
  name: "Synthetic shared brief",
  owner: { id: "other-user", name: "Other User", initials: "OU" },
};
const documents: WorkspaceLibraryDocument[] = [
  ownBrief,
  sharedBrief,
  {
    ...sharedBrief,
    id: "90000000-0000-4000-8000-000000000003",
    name: "Synthetic other client brief",
    client: otherClient.name,
  },
  {
    ...ownBrief,
    id: "90000000-0000-4000-8000-000000000004",
    name: "Synthetic unrelated document",
  },
  {
    ...sharedBrief,
    id: "90000000-0000-4000-8000-000000000005",
    name: "Synthetic shared brief schedule",
    kind: "hillday",
  },
  {
    ...ownBrief,
    id: "90000000-0000-4000-8000-000000000006",
    name: "Synthetic complete brief",
    status: "complete",
  },
];

async function setupLibrary(page: Page) {
  const reads: { query: { cursor?: string; status?: string } }[] = [];
  await setup(page, {
    "workspace.documents": (input) => {
      const request = input as (typeof reads)[number];
      reads.push(request);
      return {
        items: documents.filter(
          (row) => !request.query.status || row.status === request.query.status,
        ),
        nextCursor: request.query.cursor ? null : "older-documents",
      };
    },
  });
  return reads;
}

async function chooseScope(page: Page, name: string) {
  const button = page
    .getByRole("group", { name: "Document ownership" })
    .getByRole("button", { name, exact: true });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

async function filterBriefs(page: Page) {
  await page.getByRole("table", { name: "Workspace documents" }).waitFor();
  await page.getByLabel("Search documents", { exact: true }).fill("brief");
  for (const [label, value] of [
    ["Filter documents by client", client.name],
    ["Filter documents by template", "Documents"],
    ["Filter documents by status", "draft"],
  ] as const) {
    await page.getByRole("combobox", { name: label }).click();
    await page.getByRole("option", { name: value, exact: true }).click();
  }
  await expect(page.getByText("2 documents", { exact: true })).toBeVisible();
}

async function expectFilters(page: Page) {
  await expect(
    page.getByLabel("Search documents", { exact: true }),
  ).toHaveValue("brief");
  for (const [label, value] of [
    ["Filter documents by client", client.name],
    ["Filter documents by template", "Documents"],
    ["Filter documents by status", "draft"],
  ] as const)
    await expect(page.getByRole("combobox", { name: label })).toHaveText(value);
}

async function expectUnavailableResults(page: Page) {
  await expect(
    page.getByRole("table", { name: "Workspace documents" }),
  ).toHaveCount(0);
  await expect(page.getByText(/^\d+ documents$/)).toHaveCount(0);
  await expect(page.getByText("No documents match these filters.")).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Load older", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Newest documents", exact: true }),
  ).toHaveCount(0);
}

async function expectOwnedResult(page: Page, scope: string) {
  const table = page.getByRole("table", { name: "Workspace documents" });
  await expect(table).toContainText(
    scope === "Mine" ? ownBrief.name : sharedBrief.name,
  );
  await expect(table).not.toContainText(
    scope === "Mine" ? sharedBrief.name : ownBrief.name,
  );
  await expect(page.getByText("1 documents", { exact: true })).toBeVisible();
  await expectFilters(page);
}

for (const scope of ["Mine", "Shared with me"]) {
  test(`${scope} waits for identity while Everyone, filters and pagination remain usable`, async ({
    page,
  }) => {
    await setupLibrary(page);
    const held: Route[] = [];
    await page.route("**/api/capiro/me.read?*", (route) => {
      held.push(route);
    });
    await page.goto("/modules/workspace");
    await filterBriefs(page);
    await expect.poll(() => held.length).toBe(1);
    await page.getByRole("button", { name: "Load older", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Newest documents", exact: true }),
    ).toBeVisible();
    for (let turn = 0; turn < 2; turn++) {
      await chooseScope(page, scope);
      await expect(page.getByRole("status")).toHaveText("Loading…");
      await expectUnavailableResults(page);
      await expectFilters(page);
      await chooseScope(page, "Everyone");
      await expect(
        page.getByText("2 documents", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Newest documents", exact: true }),
      ).toBeEnabled();
      await expect(page.getByRole("status")).toHaveCount(0);
    }
    await chooseScope(page, scope);
    await held[0]!.fulfill({ json: testIdentity });
    await expectOwnedResult(page, scope);
    await expect(
      page.getByRole("button", { name: "Newest documents", exact: true }),
    ).toBeEnabled();
    await chooseScope(page, scope === "Mine" ? "Shared with me" : "Mine");
    await expectOwnedResult(page, scope === "Mine" ? "Shared with me" : "Mine");
    expect(held).toHaveLength(1);
  });

  test(`${scope} exposes identity failure and keyboard retry without clearing filters`, async ({
    page,
  }) => {
    const documentReads = await setupLibrary(page);
    let retry: Route | undefined;
    let identityReads = 0;
    await page.route("**/api/capiro/me.read?*", (route) => {
      identityReads++;
      if (identityReads === 1)
        return route.fulfill({
          status: 503,
          json: { message: "Synthetic identity unavailable" },
        });
      retry = route;
    });
    await page.goto("/modules/workspace");
    await filterBriefs(page);
    for (let turn = 0; turn < 2; turn++) {
      await chooseScope(page, scope);
      await expect(page.getByRole("alert")).toContainText(
        "Synthetic identity unavailable",
      );
      await expectUnavailableResults(page);
      await expectFilters(page);
      await chooseScope(page, "Everyone");
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expect(
        page.getByText("2 documents", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Load older", exact: true }),
      ).toBeEnabled();
    }
    await chooseScope(page, scope);
    const readsBeforeRetry = documentReads.length;
    await page.getByRole("button", { name: "Try again", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => Boolean(retry)).toBe(true);
    await expect(page.getByRole("status")).toHaveText("Loading…");
    await expectUnavailableResults(page);
    await expectFilters(page);
    await retry!.fulfill({ json: testIdentity });
    await expectOwnedResult(page, scope);
    expect(identityReads).toBe(2);
    expect(documentReads).toHaveLength(readsBeforeRetry);
  });
}

test("history remount waits for the current identity and ignores a former library read", async ({
  page,
}) => {
  await setupLibrary(page);
  const identities: Route[] = [];
  await page.route("**/api/capiro/me.read?*", (route) => {
    identities.push(route);
  });
  await page.goto("/modules/workspace");
  await filterBriefs(page);
  await chooseScope(page, "Mine");
  await expect(page.getByRole("status")).toHaveText("Loading…");
  await navigate(page, "/modules/workspace?view=workflows");
  await expect(
    page.getByRole("heading", { name: "Templates and workflows" }),
  ).toBeVisible();
  await page.goBack();
  await filterBriefs(page);
  await chooseScope(page, "Shared with me");
  await expect.poll(() => identities.length).toBe(2);
  await identities[0]!
    .fulfill({
      json: {
        ...testIdentity,
        user: { ...testIdentity.user, clerkUserId: "other-user" },
      },
    })
    .catch(() => {});
  await expect(page.getByRole("status")).toHaveText("Loading…");
  await expectUnavailableResults(page);
  await identities[1]!.fulfill({ json: testIdentity });
  await expectOwnedResult(page, "Shared with me");
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Templates and workflows" }),
  ).toBeVisible();
  await page.goBack();
  await filterBriefs(page);
  await chooseScope(page, "Mine");
  await expect.poll(() => identities.length).toBe(3);
  await expect(page.getByRole("status")).toHaveText("Loading…");
  await expectUnavailableResults(page);
  await identities[2]!.fulfill({ json: testIdentity });
  await expectOwnedResult(page, "Mine");
});

test("Everyone retains document failure and retries documents independently of identity", async ({
  page,
}) => {
  await setupLibrary(page);
  let documentReads = 0;
  let identityReads = 0;
  await page.route("**/api/capiro/me.read?*", (route) => {
    identityReads++;
    return route.fulfill({
      status: 503,
      json: { message: "Synthetic identity unavailable" },
    });
  });
  await page.route("**/api/capiro/workspace.documents?*", (route) => {
    documentReads++;
    return route.fulfill(
      documentReads === 1
        ? { status: 503, json: { message: "Synthetic documents unavailable" } }
        : { json: { items: documents, nextCursor: null } },
    );
  });
  await page.goto("/modules/workspace");
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic documents unavailable",
  );
  await expectUnavailableResults(page);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Workspace documents" }),
  ).toContainText(ownBrief.name);
  await expect(page.getByText("6 documents", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(documentReads).toBe(2);
  expect(identityReads).toBe(1);
});
