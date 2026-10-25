import { expect, test, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { client, clientId, otherClientId } from "./next-modules-fixtures";
import { draft, otherId } from "../../tests/prospect-resources-fixtures";
import type { HillDayDocument } from "../../src/shared/capiro/operations/workspace-schemas";

const ordinary = {
  ...draft,
  prospectId: null,
  clientId,
  client: client.name,
  docTitle: "Synthetic ordinary navigation document",
  config: {
    sections: ["Body"],
    sectionContent: { Body: "Saved navigation text" },
  },
};
const hillday: HillDayDocument = {
  id: draft.id,
  name: "Synthetic Hill Day navigation document",
  status: "draft",
  client: { id: clientId, name: client.name, mono: "SC", hasLogo: false },
  firm: { name: "Synthetic firm" },
  owner: { id: "test-user", name: "Test", initials: "T" },
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
const libraryUrl = `/modules/workspace?clientId=${clientId}`;
const editorUrl = (kind: "draft" | "hillday") =>
  kind === "draft"
    ? `${libraryUrl}&draftId=${draft.id}`
    : `${libraryUrl}&view=hillday&hilldayId=${draft.id}`;

async function fixture(page: Page) {
  await onlyLocalRequests(page);
  const calls: { operation: string; method: string }[] = [];
  const errors: string[] = [];
  const documents = {
    ordinary: structuredClone(ordinary),
    hillday: structuredClone(hillday),
  };
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "workspace.documents": {
      items: (["draft", "hillday"] as const).map((kind) => ({
        id: draft.id,
        kind,
        name: kind === "draft" ? ordinary.docTitle : hillday.name,
        blueprint: kind === "draft" ? "Ordinary document" : "Hill Day",
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
      })),
      nextCursor: null,
    },
    "workspace.draft": () => documents.ordinary,
    "workspace.hillday.document": () => documents.hillday,
    "workspace.hillday.quality": { checks: [] },
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
  return { documents, calls, errors };
}

for (const kind of ["draft", "hillday"] as const) {
  test(`${kind} library selection survives reload and browser history without writes`, async ({
    page,
  }) => {
    const state = await fixture(page);
    const title = kind === "draft" ? ordinary.docTitle : hillday.name;
    await page.goto(libraryUrl);
    await page.getByRole("button", { name: new RegExp(title) }).click();
    await expect(page).toHaveURL(editorUrl(kind));
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(libraryUrl);
    await expect(
      page.getByRole("heading", { name: "Workspace", exact: true }),
    ).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(editorUrl(kind));
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: kind === "draft" ? "← Workspace" : "←",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(libraryUrl);
    expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
    expect(state.errors).toEqual([]);
  });

  test(`${kind} direct URL rejects a moved client receipt before showing content`, async ({
    page,
  }) => {
    const state = await fixture(page);
    state.documents.ordinary.clientId = otherClientId;
    state.documents.hillday.client.id = otherClientId;
    await page.goto(editorUrl(kind));
    await expect(page.getByRole("alert")).toContainText("client scope");
    await expect(
      page.getByRole("heading", {
        name: kind === "draft" ? ordinary.docTitle : hillday.name,
        exact: true,
      }),
    ).toHaveCount(0);
    expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test("conflicting document identities never load or mutate a Workspace resource", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(`${libraryUrl}&draftId=${draft.id}&draftId=${otherId}`);
  await expect(page.getByRole("alert")).toContainText("invalid or conflicting");
  expect(state.calls).toEqual([]);
  expect(state.errors).toEqual([]);
});
