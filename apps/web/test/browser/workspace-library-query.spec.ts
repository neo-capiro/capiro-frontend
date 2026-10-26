import { expect, type Page, type Route } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  clientId,
  otherClientId,
  navigate,
  setup,
} from "./next-modules-fixtures";
import type { WorkspaceLibraryDocument } from "../../src/shared/capiro/operations/workspace-schemas";

// Synthetic authorized responses qualify the mounted consumer, not Core's SQL or ACLs.
type Query = {
  q?: string;
  scope?: string;
  kind?: string;
  status?: string;
  clientId?: string;
  cursor?: string;
  limit?: number;
};
const next = "opaque+/next-page==";
const row = (
  name: string,
  overrides: Partial<WorkspaceLibraryDocument> = {},
): WorkspaceLibraryDocument => ({
  id: "90000000-0000-4000-8000-000000000001",
  kind: "draft",
  name,
  blueprint: "Synthetic document",
  client: "Synthetic duplicate",
  clientId,
  status: "draft",
  updatedAt: "2026-10-25T00:00:00Z",
  owner: { id: "test-user", name: "Synthetic User", initials: "SU" },
  route: "/modules/workspace",
  ...overrides,
});
const clients = [clientId, otherClientId].map((id) => ({
  id,
  name: "Synthetic duplicate",
  mono: "SD",
  description: null,
  objectiveCount: 0,
  officeCount: 0,
  hasLogo: false,
}));
const table = (page: Page) =>
  page.getByRole("table", { name: "Workspace documents" });
const older = (page: Page) =>
  page.getByRole("button", { name: "Load older", exact: true });
const newest = (page: Page) =>
  page.getByRole("button", { name: "Newest documents", exact: true });
const search = (page: Page) =>
  page.getByLabel("Search documents", { exact: true });

async function fixture(
  page: Page,
  response: (query: Query) => {
    items: WorkspaceLibraryDocument[];
    nextCursor: string | null;
  },
) {
  const reads: Query[] = [];
  await setup(page, {
    "workspace.clients": { items: clients, nextCursor: null, sources: [] },
    "workspace.documents": (input) => {
      const query = (input as { query: Query }).query;
      reads.push(query);
      return response(query);
    },
  });
  return reads;
}
async function choose(page: Page, label: string, name: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
async function scope(page: Page, name: string) {
  await page
    .getByRole("group", { name: "Document ownership" })
    .getByRole("button", { name, exact: true })
    .click();
}

test("server search finds a title beyond the first two unfiltered pages and resets continuation", async ({
  page,
}) => {
  const pages = Array.from({ length: 101 }, (_, index) =>
    row(
      index === 100
        ? "Synthetic page-three needle"
        : `Synthetic document ${index}`,
      { id: `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` },
    ),
  );
  const reads = await fixture(page, (query) => {
    if (query.q === "page-three needle")
      return { items: [pages[100]!], nextCursor: null };
    return {
      items: pages.slice(query.cursor ? 50 : 0, query.cursor ? 100 : 50),
      nextCursor: next,
    };
  });
  await page.goto("/modules/workspace");
  await expect(table(page)).not.toContainText("page-three needle");
  await older(page).click();
  await expect(table(page)).toContainText("Synthetic document 99");
  await expect(table(page)).not.toContainText("page-three needle");
  await search(page).fill("page-three needle");
  await expect(table(page)).toContainText("Synthetic page-three needle");
  expect(reads.at(-1)).toEqual({
    q: "page-three needle",
    scope: "all",
    kind: "all",
    limit: 50,
  });
  await expect(newest(page)).toHaveCount(0);
  await expect(search(page)).toHaveAttribute("maxlength", "200");
  await expect(
    page.getByText("1 documents on this page", { exact: true }),
  ).toBeVisible();
});

test("owner, type, canonical client and status combinations reach the server", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const reads = await fixture(page, () => ({
    items: [row("Synthetic server result")],
    nextCursor: next,
  }));
  await page.goto("/modules/workspace");
  await expect(table(page)).toContainText("Synthetic server result");
  await page.getByText("Client · All clients", { exact: true }).click();
  for (const [owner, ownerLabel] of [
    ["all", "Everyone"],
    ["mine", "Mine"],
    ["shared", "Shared with me"],
  ]) {
    await scope(page, ownerLabel!);
    for (const [kind, kindLabel] of [
      ["all", "Template · All"],
      ["hillday", "Hill Day"],
      ["draft", "Documents"],
    ]) {
      await choose(page, "Filter documents by template", kindLabel!);
      for (const id of [undefined, clientId, otherClientId]) {
        await choose(
          page,
          "Filter documents by client",
          id ? `Synthetic duplicate · ${id}` : "All clients",
        );
        for (const status of [
          "",
          "draft",
          "generating",
          "generated",
          "partial",
          "delivered",
          "complete",
        ]) {
          await choose(
            page,
            "Filter documents by status",
            status || "Status · Any",
          );
          await expect
            .poll(() => reads.at(-1))
            .toEqual({
              q: "",
              scope: owner,
              kind,
              ...(id ? { clientId: id } : {}),
              ...(status ? { status } : {}),
              limit: 50,
            });
          await expect(table(page)).toContainText("Synthetic server result");
        }
      }
    }
  }
});

test("every filter clears a prior opaque cursor and Newest retains the filters", async ({
  page,
}) => {
  const reads = await fixture(page, (query) => ({
    items: [row(query.cursor ? "Synthetic older" : "Synthetic newest")],
    nextCursor: next,
  }));
  await page.goto("/modules/workspace");
  await page.getByText("Client · All clients", { exact: true }).click();
  const changes = [
    () => search(page).fill("Synthetic"),
    () => scope(page, "Mine"),
    () => choose(page, "Filter documents by template", "Documents"),
    () =>
      choose(
        page,
        "Filter documents by client",
        `Synthetic duplicate · ${otherClientId}`,
      ),
    () => choose(page, "Filter documents by status", "draft"),
    () => search(page).fill(""),
    () => scope(page, "Everyone"),
    () => choose(page, "Filter documents by template", "Template · All"),
    () => choose(page, "Filter documents by client", "All clients"),
    () => choose(page, "Filter documents by status", "Status · Any"),
  ];
  for (const change of changes) {
    await older(page).click();
    await expect(table(page)).toContainText("Synthetic older");
    const before = reads.length;
    await change();
    await expect(table(page)).toContainText("Synthetic newest");
    expect(reads.slice(before).length).toBeGreaterThan(0);
    expect(
      reads.slice(before).every((query) => query.cursor === undefined),
    ).toBe(true);
    await expect(newest(page)).toHaveCount(0);
  }
  const filters = reads.at(-1);
  await older(page).click();
  await expect(table(page)).toContainText("Synthetic older");
  await newest(page).click();
  await expect(table(page)).toContainText("Synthetic newest");
  expect(reads.at(-1)).toEqual(filters);
});

test("an empty authorized page keeps continuation and does not invent a total", async ({
  page,
}) => {
  const reads = await fixture(page, (query) => ({
    items: query.cursor ? [row("Synthetic permitted older document")] : [],
    nextCursor: query.cursor ? null : next,
  }));
  await page.goto("/modules/workspace");
  await expect(page.getByText("No documents on this page.")).toBeVisible();
  await expect(
    page.getByText("0 documents on this page", { exact: true }),
  ).toBeVisible();
  await expect(older(page)).toBeEnabled();
  await older(page).click();
  await expect(table(page)).toContainText("Synthetic permitted older document");
  expect(reads.at(-1)?.cursor).toBe(next);
  await newest(page).click();
  await expect(older(page)).toBeEnabled();
  expect(reads.at(-1)?.cursor).toBeUndefined();
});

test("authorized client search and paging distinguish duplicate names by exact IDs", async ({
  page,
}) => {
  const reads = await fixture(page, () => ({ items: [], nextCursor: null }));
  const clientReads: Query[] = [];
  await page.route("**/api/capiro/workspace.clients?*", (route) => {
    const query = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    ).query as Query;
    clientReads.push(query);
    const found = query.q === "Synthetic duplicate" || query.cursor;
    return route.fulfill({
      json: {
        items: found ? clients : [],
        nextCursor: found ? null : next,
        sources: [],
      },
    });
  });
  await page.goto("/modules/workspace");
  await page.getByText("Client · All clients", { exact: true }).click();
  await expect(
    page.getByText("No clients on this page.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More clients", exact: true }).click();
  await choose(
    page,
    "Filter documents by client",
    `Synthetic duplicate · ${otherClientId}`,
  );
  await expect.poll(() => reads.at(-1)?.clientId).toBe(otherClientId);
  await page.getByLabel("Search library clients").fill("Synthetic duplicate");
  await expect
    .poll(() => clientReads.at(-1))
    .toEqual({ q: "Synthetic duplicate", limit: 50 });
  await choose(
    page,
    "Filter documents by client",
    `Synthetic duplicate · ${clientId}`,
  );
  await expect.poll(() => reads.at(-1)?.clientId).toBe(clientId);
  await page.getByLabel("Search library clients").fill("Absent on this page");
  await expect(
    page.getByRole("combobox", { name: "Filter documents by client" }),
  ).toContainText("Selected client");
  expect(reads.at(-1)?.clientId).toBe(clientId);
  await choose(page, "Filter documents by client", "All clients");
  await expect.poll(() => reads.at(-1)?.clientId).toBeUndefined();
});

test("mounted receiver client changes reset paging and cannot be overridden by a duplicate name", async ({
  page,
}) => {
  const reads = await fixture(page, (query) => ({
    items: [
      row(
        query.clientId === otherClientId
          ? "Synthetic moved scope"
          : "Synthetic original scope",
      ),
    ],
    nextCursor: next,
  }));
  await page.goto(`/modules/workspace?clientId=${clientId}`);
  await expect(table(page)).toContainText("Synthetic original scope");
  await expect(
    page.getByRole("combobox", { name: "Filter documents by client" }),
  ).toBeDisabled();
  await older(page).click();
  await expect.poll(() => reads.at(-1)?.cursor).toBe(next);
  const before = reads.length;
  await navigate(page, `/modules/workspace?clientId=${otherClientId}`);
  await expect(table(page)).toContainText("Synthetic moved scope");
  expect(
    reads
      .slice(before)
      .every(
        (query) =>
          query.clientId === otherClientId && query.cursor === undefined,
      ),
  ).toBe(true);
  await expect(newest(page)).toHaveCount(0);
});

test("withheld rows stay absent, denied reads clear prior rows, and retry rechecks the server", async ({
  page,
}) => {
  await fixture(page, () => ({
    items: [row("Synthetic initially permitted")],
    nextCursor: null,
  }));
  await page.goto("/modules/workspace");
  await expect(table(page)).toContainText("Synthetic initially permitted");
  let attempts = 0;
  await page.route("**/api/capiro/workspace.documents?*", (route) => {
    attempts++;
    return route.fulfill(
      attempts === 1
        ? { status: 403, json: { message: "Synthetic client access revoked" } }
        : { json: { items: [], nextCursor: null } },
    );
  });
  await scope(page, "Mine");
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic client access revoked",
  );
  await expect(table(page)).toHaveCount(0);
  await expect(page.getByText("Synthetic initially permitted")).toHaveCount(0);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("No documents on this page.")).toBeVisible();
  await expect(page.getByText("Synthetic initially permitted")).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("a late superseded response cannot replace the current authorized page", async ({
  page,
}) => {
  await fixture(page, () => ({
    items: [row("Synthetic initial")],
    nextCursor: null,
  }));
  await page.goto("/modules/workspace");
  await expect(table(page)).toContainText("Synthetic initial");
  let held: Route | undefined;
  await page.route("**/api/capiro/workspace.documents?*", (route) => {
    const query = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    ).query as Query;
    if (query.q === "old") {
      held = route;
      return;
    }
    return route.fulfill({
      json: { items: [row("Synthetic current authorized")], nextCursor: null },
    });
  });
  await search(page).fill("old");
  await expect.poll(() => Boolean(held)).toBe(true);
  await expect(table(page)).toHaveCount(0);
  await search(page).fill("current");
  await expect(table(page)).toContainText("Synthetic current authorized");
  await held!
    .fulfill({
      json: { items: [row("Synthetic stale response")], nextCursor: next },
    })
    .catch(() => {});
  await expect(table(page)).toContainText("Synthetic current authorized");
  await expect(table(page)).not.toContainText("Synthetic stale response");
  await expect(older(page)).toHaveCount(0);
});
