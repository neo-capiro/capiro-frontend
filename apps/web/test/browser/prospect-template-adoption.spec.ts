import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { draft, prospectId } from "../../tests/prospect-resources-fixtures";
import {
  blueprint,
  catalog,
  publishedPin,
  versions,
} from "../../tests/document-blueprint-fixtures";
import { studioDefinition } from "../../tests/document-studio-fixtures";
import { prospectStateFixture } from "../../tests/prospect-atomic-fixture";
import type { WorkspaceDraftDocument } from "../../src/shared/capiro/operations/workspace-documents";

const url = `/modules/workspace?prospectId=${prospectId}`;
async function fixture(page: Page) {
  await onlyLocalRequests(page);
  const state = {
    writes: [] as Record<string, unknown>[],
    lost: false,
    wrongPin: false,
  };
  let current: WorkspaceDraftDocument = structuredClone(draft);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.prospect.drafts": { drafts: [] },
    "workspace.draft": () => current,
    "workspace.prospect.state": () => prospectStateFixture(current),
    "workspace.draft.versions": [],
    "workspace.blueprints.list": catalog(),
    "workspace.blueprints.detail": blueprint,
    "workspace.blueprints.version": {
      ...versions[1],
      definition: studioDefinition,
    },
  });
  await page.route("**/api/capiro/workspace.prospect.create", async (route) => {
    const { body } = route.request().postDataJSON();
    state.writes.push(body);
    current = {
      ...current,
      docTitle: body.docTitle,
      config: {
        sections: ["1. Executive summary"],
        sectionContent: { "1. Executive summary": "" },
        documentAgent: {
          blueprintPin: {
            ...body.blueprintPin,
            ...(state.wrongPin ? { version: 99 } : {}),
          },
        },
      },
    };
    if (state.lost) return route.abort("connectionreset");
    return route.fulfill({ json: current });
  });
  return state;
}
async function preview(page: Page) {
  await page.getByRole("button", { name: "Choose proposal template" }).click();
  await page.getByLabel("Proposal template", { exact: true }).click();
  await page
    .getByRole("option", {
      name: "Synthetic policy brief · Capiro",
      exact: true,
    })
    .click();
  await page.getByLabel("Published template version", { exact: true }).click();
  await expect(
    page.getByRole("option", { name: "Version 1", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "Version 3", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("option", { name: "Version 2", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Saved blueprint sections" }),
  ).toContainText("Executive summary");
}
async function choose(page: Page) {
  await preview(page);
  await page
    .getByRole("button", { name: "Use template version 2", exact: true })
    .click();
  await page
    .getByLabel("New prospect document title")
    .fill("A prospect proposal");
}
test("template preview performs no writes and creation preserves the exact published pin", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(url);
  await preview(page);
  expect(state.writes).toEqual([]);
  await page
    .getByRole("button", { name: "Use template version 2", exact: true })
    .click();
  expect(state.writes).toEqual([]);
  await page
    .getByLabel("New prospect document title")
    .fill("A prospect proposal");
  await page
    .getByRole("button", { name: "Create proposal draft", exact: true })
    .click();
  await expect(page.getByLabel("1. Executive summary content")).toHaveValue("");
  await expect(
    page.getByText("Document blueprint · pinned v2", { exact: true }),
  ).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]).toMatchObject({
    prospectId,
    docTitle: "A prospect proposal",
    blueprintPin: publishedPin(),
  });
  expect(state.writes[0]).not.toHaveProperty("clientId");
});
test("reload recovers the original selected template and request after a lost creation receipt", async ({
  page,
}) => {
  const state = await fixture(page);
  state.lost = true;
  await page.goto(url);
  await choose(page);
  await page
    .getByRole("button", { name: "Create proposal draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recover original draft", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByText("Selected published template · version 2", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clear template selection", exact: true }),
  ).toBeDisabled();
  state.lost = false;
  await page
    .getByRole("button", { name: "Recover original draft", exact: true })
    .click();
  await expect(page.getByLabel("1. Executive summary content")).toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(state.writes[0]).toEqual(state.writes[1]);
});
test("a receipt with a different template cannot acknowledge or replace the retained creation", async ({
  page,
}) => {
  const state = await fixture(page);
  state.wrongPin = true;
  await page.goto(url);
  await choose(page);
  await page
    .getByRole("button", { name: "Create proposal draft", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("receipt does not match");
  await expect(
    page.getByRole("button", { name: "Recover original draft", exact: true }),
  ).toBeEnabled();
  expect(state.writes).toHaveLength(1);
  await expect(page.getByLabel("1. Executive summary content")).toHaveCount(0);
});
test("unavailable template content offers no adoption action and preview cannot send or publish", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.route("**/api/capiro/workspace.blueprints.version?*", (route) =>
    route.fulfill({ status: 404, json: { message: "Template unavailable" } }),
  );
  await page.goto(url);
  await page.getByRole("button", { name: "Choose proposal template" }).click();
  await page.getByLabel("Proposal template", { exact: true }).click();
  await page
    .getByRole("option", {
      name: "Synthetic policy brief · Capiro",
      exact: true,
    })
    .click();
  await page.getByLabel("Published template version", { exact: true }).click();
  await page.getByRole("option", { name: "Version 2", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Use template version/ }),
  ).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
