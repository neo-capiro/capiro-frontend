import { expect, type Page, type Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { client, clientId } from "./next-modules-fixtures";
import { blankTemplate } from "../../src/features/modules/workspace/templates/template-model";

export const id = (n: number) =>
  `74000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const url = `/modules/workspace?clientId=${clientId}&view=templates`;
const date = "2026-10-26T10:00:00.000Z";
export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
export async function setup(page: Page, scoped = false) {
  await onlyLocalRequests(page);
  const spec = blankTemplate();
  spec.goal.topic = "Synthetic policy topic";
  const capabilities = {
    canUse: true,
    canDuplicate: true,
    canInspect: true,
    canEdit: true,
    canCreateVersion: true,
    canPublish: true,
    canArchive: true,
    canRestore: false,
  };
  const template = {
    id: id(1),
    name: "Synthetic recovery template",
    description: "Original description",
    campaignType: "Briefing",
    ownerUserId: testIdentity.user.id,
    clientId: scoped ? clientId : null,
    scope: scoped ? "client" : "private",
    status: "active",
    currentDraftVersionId: id(3),
    publishedVersionId: id(2),
    createdAt: date,
    updatedAt: date,
    archivedAt: null,
    draftVersionNumber: 2,
    publishedVersionNumber: 1,
    usageCount: 0,
    lastUsedAt: null,
    previewSummary: null,
    capabilities,
  };
  const version = (n: number) => ({
    id: id(n + 1),
    templateId: id(1),
    versionNumber: n,
    lifecycle: n === 1 ? "published" : "draft",
    contentHash: String(n).repeat(64),
    sourceSessionId: null,
    createdByUserId: testIdentity.user.id,
    createdAt: date,
    publishedAt: n === 1 ? date : null,
    spec,
  });
  const receipt = {
    templateId: id(1),
    templateName: template.name,
    templateVersionId: id(2),
    templateVersionNumber: 1,
    templateContentHash: "1".repeat(64),
    inherited: [
      { field: "topic", label: "Topic", detail: "Original applied topic" },
    ],
    refreshed: [],
    unresolved: [],
    unavailable: [],
    nextRequiredStep: null,
    requiresLiveTargets: true,
    requiresLiveContext: true,
  };
  const useResult = {
    applicationId: id(6),
    sessionId: id(5),
    stateVersion: 1,
    templateId: id(1),
    templateVersionId: id(2),
    replayed: true,
    receipt,
  };
  const provenance = {
    sessionId: id(5),
    templateId: id(1),
    templateName: template.name,
    templateVersionId: id(2),
    versionNumber: 1,
    contentHash: "1".repeat(64),
    applicationId: id(6),
    appliedByUserId: testIdentity.user.id,
    appliedAt: date,
    receiptJsonb: receipt,
  };
  const calls: Array<{ key: string; input: unknown }> = [];
  const state = {
    me: structuredClone(testIdentity),
    lists: 0,
    denyProvenance: false,
    detailClient: scoped ? clientId : (undefined as string | undefined),
  };
  const campaigns = Array.from({ length: 103 }, (_, index) => ({
    id: id(100 + index),
    title: `Campaign ${index + 1}`,
    status: "active",
    currentStateVersion: 1,
    createdAt: date,
    updatedAt: date,
    archivedAt: null,
    topic: `Topic ${index + 1}`,
    goal: null,
    targetCount: 0,
    recordStatus: null,
    sentAt: null,
  }));
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "me.read": () => state.me,
    "clients.list": [client],
    "workspace.clients": {
      items: [
        {
          id: client.id,
          name: client.name,
          mono: "CA",
          description: null,
          objectiveCount: 0,
          officeCount: 0,
          hasLogo: false,
        },
      ],
      nextCursor: null,
      sources: [],
    },
    "workspace.templates": () => {
      state.lists++;
      return [template];
    },
    "engagement.sessions": (input) => {
      calls.push({ key: "search", input });
      const q = (
        input as { query: { search?: string; offset: number; limit: number } }
      ).query;
      return campaigns
        .filter(
          (row) =>
            !q.search ||
            `${row.title} ${row.topic}`
              .toLowerCase()
              .includes(q.search.toLowerCase()),
        )
        .slice(q.offset, q.offset + q.limit);
    },
  });
  await page.route("**/api/capiro/workspace.template?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input") ?? "{}",
    );
    calls.push({ key: "detail", input });
    if (state.detailClient && input.query?.clientId !== state.detailClient)
      return route.fulfill({
        status: 403,
        json: { message: "Current client selection required" },
      });
    return route.fulfill({
      json: {
        template,
        versions: [version(1), version(2), version(3)],
        capabilities,
      },
    });
  });
  await page.route("**/api/capiro/workspace.template.provenance?*", (route) => {
    calls.push({ key: "provenance", input: {} });
    return state.denyProvenance
      ? route.fulfill({
          status: 403,
          json: { message: "Current campaign access denied" },
        })
      : route.fulfill({ json: provenance });
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ json: client }),
  );
  async function write(
    key: string,
    respond: (
      route: Route,
      input: { body: Record<string, unknown> & { clientId?: string } },
      count: number,
    ) => Promise<void>,
  ) {
    let count = 0;
    await page.route(
      `**/api/capiro/workspace.template.${key}`,
      async (route) => {
        const input = route.request().postDataJSON();
        calls.push({ key, input });
        await respond(route, input, ++count);
      },
    );
  }
  async function open() {
    await page.goto(url);
    await expect(
      page.getByRole("button", { name: "+ Create template", exact: true }),
    ).toBeEnabled();
  }
  return {
    template,
    version,
    useResult,
    provenance,
    state,
    calls,
    write,
    open,
  };
}
export async function menu(
  page: Page,
  action: string,
  name = "Synthetic recovery template",
) {
  await page
    .getByRole("button", { name: `Actions for ${name}`, exact: true })
    .click();
  await page.getByRole("menuitem", { name: action, exact: true }).click();
}
export async function reviewWizard(page: Page, name: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  for (let step = 0; step < 4; step++)
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
  return dialog;
}
export const panel = (page: Page) =>
  page.getByRole("region", { name: "Template command recovery" });
