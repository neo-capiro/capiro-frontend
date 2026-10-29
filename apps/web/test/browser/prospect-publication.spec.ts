import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { prospectStateFixture } from "../../tests/prospect-atomic-fixture";
import {
  publicationDraft as draft,
  publicationVersion as version,
  publicationStateFixture as state,
  publicationReceiptFixture,
} from "../../tests/prospect-publication-fixture";
import type { ProspectPublicationBody } from "../../src/shared/capiro/operations/workspace-prospect-publication";
const detail = `/modules/workspace?prospectId=${draft.prospectId}&draftId=${draft.id}`;
async function setup(page: Page, lose = false) {
  await onlyLocalRequests(page);
  let saved: Awaited<ReturnType<typeof publicationReceiptFixture>> | undefined;
  const writes: ProspectPublicationBody[] = [];
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.prospect.drafts": { drafts: [] },
    "workspace.draft": draft,
    "workspace.prospect.state": prospectStateFixture(draft),
    "workspace.draft.versions": [version],
    "workspace.prospect.publication": () => ({
      ...state,
      current: saved?.receipt ?? null,
    }),
  });
  await page.route(
    "**/api/capiro/workspace.prospect.publish",
    async (route) => {
      const { body } = route.request().postDataJSON();
      writes.push(body);
      saved ??= await publicationReceiptFixture(body);
      if (lose && writes.length === 1) return route.abort("connectionreset");
      return route.fulfill({ json: { ...saved, replayed: writes.length > 1 } });
    },
  );
  const open = async () => {
    await page.getByRole("button", { name: "History", exact: true }).click();
    await page.getByRole("button", { name: /^View Manual save/ }).click();
    await expect(
      page.getByRole("region", { name: "Prospect publication" }),
    ).toBeVisible();
  };
  return { writes, open };
}
test("preview is read only and publication creates a separate saved version", async ({
  page,
}, info) => {
  const f = await setup(page);
  await page.goto(detail);
  await f.open();
  await expect(page.getByText("No published revision yet.")).toBeVisible();
  expect(f.writes).toHaveLength(0);
  await page
    .getByRole("button", { name: "Publish this saved revision", exact: true })
    .click();
  await expect(page.getByText(/^Published saved revision/)).toBeVisible();
  expect(f.writes).toHaveLength(1);
  expect(f.writes[0]!.sourceVersionId).toBe(version.id);
  await page.screenshot({
    path: info.outputPath("prospect-published.png"),
    fullPage: true,
  });
  await page.route("**/api/capiro/workspace.prospect.publication?*", (route) =>
    route.fulfill({ status: 403, json: { message: "Current access revoked" } }),
  );
  await page
    .getByRole("button", { name: "Refresh publication status" })
    .click();
  await expect(page.getByText("Current access revoked")).toBeVisible();
  await expect(page.getByText(/^Current publication:/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Publish this saved revision" }),
  ).toHaveCount(0);
});
test("lost publication response survives reload and recovers only the original request", async ({
  page,
}) => {
  const f = await setup(page, true);
  await page.goto(detail);
  await f.open();
  await page
    .getByRole("button", { name: "Publish this saved revision" })
    .click();
  await expect(
    page.getByRole("button", { name: "Recover original publication" }),
  ).toBeEnabled();
  await page.reload();
  await f.open();
  await expect(
    page.getByRole("button", { name: "Recover original publication" }),
  ).toBeEnabled();
  expect(f.writes).toHaveLength(1);
  await page
    .getByRole("button", { name: "Recover original publication" })
    .click();
  await expect(page.getByText(/^Published saved revision/)).toBeVisible();
  expect(f.writes).toHaveLength(2);
  expect(f.writes[0]).toEqual(f.writes[1]);
});
test("unsaved edits disable publication and a stale-source refusal requires fresh review", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto(detail);
  await page
    .getByLabel("Document title", { exact: true })
    .fill("Unsaved changes");
  await f.open();
  await expect(
    page.getByRole("button", { name: "Publish this saved revision" }),
  ).toBeDisabled();
  await page.reload();
  await f.open();
  await page.route("**/api/capiro/workspace.prospect.publish", (route) =>
    route.fulfill({
      status: 409,
      json: {
        code: "WORKSPACE_PUBLICATION_STATE_CONFLICT",
        message: "Changed",
      },
    }),
  );
  await page
    .getByRole("button", { name: "Publish this saved revision" })
    .click();
  await expect(page.getByText(/Publication was refused/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish this saved revision" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Recover original publication" }),
  ).toHaveCount(0);
});
