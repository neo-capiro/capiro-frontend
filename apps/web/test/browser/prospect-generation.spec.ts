import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { prospectStateFixture } from "../../tests/prospect-atomic-fixture";
import {
  generationProposal,
  generationList,
  generationDecisionFixture,
  draft,
  version,
} from "../../tests/prospect-generation-fixture";
import { publicationStateFixture } from "../../tests/prospect-publication-fixture";
import type {
  ProspectGenerationBody,
  ProspectGenerationDecision,
  ProspectGenerationProposal,
} from "../../src/shared/capiro/operations/workspace-prospect-generation";

const detail = `/modules/workspace?prospectId=${draft.prospectId}&draftId=${draft.id}`;
async function setup(
  page: Page,
  lose: "generation" | "decision" | undefined = undefined,
) {
  await onlyLocalRequests(page);
  let proposal: ProspectGenerationProposal | undefined,
    saved: Awaited<ReturnType<typeof generationDecisionFixture>> | undefined;
  const generates: ProspectGenerationBody[] = [],
    decisions: ProspectGenerationDecision[] = [];
  let published = 0;
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.prospect.drafts": { drafts: [] },
    "workspace.draft": draft,
    "workspace.prospect.state": prospectStateFixture(draft),
    "workspace.draft.versions": [version],
    "workspace.prospect.publication": publicationStateFixture,
    "workspace.prospect.generation.list": () =>
      generationList(proposal ? [proposal] : []),
    "workspace.prospect.generation.read": () => proposal,
    "workspace.draft.savedSnapshot": () => saved?.saved,
  });
  await page.route(
    "**/api/capiro/workspace.prospect.generation.create",
    async (route) => {
      const { body } = route.request().postDataJSON();
      generates.push(body);
      proposal ??= await generationProposal(body);
      if (lose === "generation" && generates.length === 1)
        return route.abort("connectionreset");
      return route.fulfill({ json: proposal });
    },
  );
  await page.route(
    "**/api/capiro/workspace.prospect.generation.decide",
    async (route) => {
      const { body } = route.request().postDataJSON();
      decisions.push(body);
      saved ??= await generationDecisionFixture(proposal!, body);
      proposal = saved.result.proposal;
      if (lose === "decision" && decisions.length === 1)
        return route.abort("connectionreset");
      return route.fulfill({ json: saved.result });
    },
  );
  await page.route("**/api/capiro/workspace.prospect.publish", (route) => {
    published++;
    return route.fulfill({
      status: 500,
      json: { message: "No publication expected" },
    });
  });
  const open = async () => {
    await page.getByRole("button", { name: "History", exact: true }).click();
    await page.getByRole("button", { name: /^View Manual save/ }).click();
    await expect(
      page.getByRole("button", { name: "Generate proposal", exact: true }),
    ).toBeVisible();
  };
  const generate = async () => {
    await page.getByRole("checkbox", { name: "Body", exact: true }).check();
    await page
      .getByLabel("Writing brief", { exact: true })
      .fill("Write an evidence-based proposal.");
    await page
      .getByRole("button", { name: "Generate proposal", exact: true })
      .click();
  };
  return {
    generates,
    decisions,
    open,
    generate,
    publications: () => published,
  };
}
test("saved selection creates a reviewable proposal and acceptance saves without publication", async ({
  page,
}, info) => {
  const f = await setup(page);
  await page.goto(detail);
  await f.open();
  expect(f.generates).toHaveLength(0);
  expect(f.decisions).toHaveLength(0);
  await f.generate();
  await expect(
    page.getByText("Generated proposal content.", { exact: true }),
  ).toBeVisible();
  expect(f.generates[0]!.sourceVersionId).toBe(version.id);
  expect(f.generates[0]!.selectedSections).toEqual(["Body"]);
  expect(f.decisions).toHaveLength(0);
  await page
    .getByRole("button", { name: "Accept and save draft version" })
    .click();
  await expect(
    page.getByText(
      "Accepted content is saved as a new draft version. Publishing is separate.",
    ),
  ).toBeVisible();
  expect(f.decisions).toHaveLength(1);
  expect(f.publications()).toBe(0);
  await page.screenshot({
    path: info.outputPath("prospect-generated-accepted.png"),
    fullPage: true,
  });
});
test("lost generation acknowledgement survives reload with the exact original source and request", async ({
  page,
}) => {
  const f = await setup(page, "generation");
  await page.goto(detail);
  await f.open();
  await f.generate();
  await expect(
    page.getByRole("button", { name: "Recover original generation request" }),
  ).toBeEnabled();
  await page.reload();
  await f.open();
  expect(f.generates).toHaveLength(1);
  await page
    .getByRole("button", { name: "Recover original generation request" })
    .click();
  await expect(
    page.getByText("Generated proposal content.", { exact: true }),
  ).toBeVisible();
  expect(f.generates).toHaveLength(2);
  expect(f.generates[0]).toEqual(f.generates[1]);
  expect(f.decisions).toHaveLength(0);
});
test("lost acceptance recovers the original decision and saved version", async ({
  page,
}) => {
  const f = await setup(page, "decision");
  await page.goto(detail);
  await f.open();
  await f.generate();
  await page
    .getByRole("button", { name: "Accept and save draft version" })
    .click();
  await expect(
    page.getByRole("button", { name: "Recover original generation request" }),
  ).toBeEnabled();
  await page.reload();
  await f.open();
  expect(f.decisions).toHaveLength(1);
  await page
    .getByRole("button", { name: "Recover original generation request" })
    .click();
  await expect(
    page.getByText(
      "Accepted content is saved as a new draft version. Publishing is separate.",
    ),
  ).toBeVisible();
  expect(f.decisions).toHaveLength(2);
  expect(f.decisions[0]).toEqual(f.decisions[1]);
  expect(f.publications()).toBe(0);
});
test("unsaved edits block generation, and revoked access clears retained proposal content", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto(detail);
  await page.getByLabel("Document title", { exact: true }).fill("Unsaved work");
  await f.open();
  await expect(
    page.getByRole("button", { name: "Generate proposal", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await f.open();
  await f.generate();
  await expect(
    page.getByText("Generated proposal content.", { exact: true }),
  ).toBeVisible();
  await page.route(
    "**/api/capiro/workspace.prospect.generation.list?*",
    (route) =>
      route.fulfill({
        status: 403,
        json: { message: "Current generation access revoked" },
      }),
  );
  await page.getByRole("button", { name: "Refresh proposals" }).click();
  await expect(
    page.getByText("Current generation access revoked"),
  ).toBeVisible();
  await expect(
    page.getByText("Generated proposal content.", { exact: true }),
  ).toHaveCount(0);
});
