import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  draft,
  revision,
  session,
  version,
} from "../../tests/newsletter-staging-fixtures";

const dir =
  process.env.CAPIRO_FIGMA_CAPTURE_DIR ??
  "C:/ProgramData/Hermes/cache/scratch/fe-newsletter";

async function setupSaved(
  page: Page,
  overrides: Parameters<typeof operationFixtures>[1] = {},
) {
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.draft": draft,
    "workspace.draft.state": {
      schemaVersion: 1,
      tenantId: testIdentity.tenant.id,
      draftId: draft.id,
      clientId: draft.clientId,
      stateHash: "a".repeat(64),
      hashFormat: "workspace-ordinary-draft-state-v1",
      draft: {
        ...draft,
        documents: draft.documents.map((document) => ({
          ...document,
          body: {
            ...document.body,
            newsletter: revision.snapshot.documents[0]!.body.newsletter,
          },
        })),
      },
    },
    "workspace.clients": { items: [] },
    "workspace.comments": [],
    "workspace.draft.versions": [version],
    "workspace.newsletter.revision": revision,
    "engagement.sessions": [
      {
        ...session.session,
        topic: null,
        goal: null,
        targetCount: 0,
        recordStatus: null,
        sentAt: null,
      },
    ],
    "engagement.session": session,
    ...overrides,
  });
  await page.goto(`/modules/workspace?draftId=${draft.id}`);
}

test("capture the stage in Outreach confirmation", async ({ page }) => {
  mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1040 });
  await setupSaved(page);
  await page
    .getByRole("button", { name: "Stage in Outreach", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCSS("width", "760px");
  await expect(
    page.getByText("Prepare this version for delivery"),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(dir, "04-stage.png") });
});

test("review counts and comment rows share the same reload after resolve", async ({
  page,
}) => {
  let reads = 0;
  let resolves = 0;
  let comment = {
    id: "30000000-0000-4000-8000-000000000055",
    documentId: draft.documents[0]!.id,
    authorId: testIdentity.user.id,
    role: "user_admin",
    quote: null,
    body: "Synthetic review comment",
    resolved: false,
    parentId: null,
    createdAt: "2026-10-31T00:00:00Z",
  };
  await setupSaved(page, {
    "workspace.comments": () => {
      reads += 1;
      return [comment];
    },
    "workspace.comment.resolve": () => {
      resolves += 1;
      comment = { ...comment, resolved: true };
      return comment;
    },
  });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Open · 1" })).toBeVisible();
  expect(reads).toBe(1);
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Open · 0" })).toBeVisible();
  await page.getByRole("tab", { name: "Resolved · 1" }).click();
  await expect(
    page.getByText("Synthetic review comment", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reopen", exact: true }),
  ).toBeVisible();
  expect(reads).toBe(2);
  expect(resolves).toBe(1);
});
