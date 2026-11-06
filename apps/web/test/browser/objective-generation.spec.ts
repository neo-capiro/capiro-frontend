import { test, expect } from "@playwright/test";
import wire from "../../tests/objective-generation-wire-fixtures.json" with { type: "json" };
import { json, objective, clientId } from "../../tests/browser/fixtures";
import { boundStrategy, strategyId } from "../../tests/objective-work-fixtures";
import { testIdentity } from "./fixtures";
import {
  fixture,
  generate,
  origin,
} from "./objective-generation-browser-fixtures";

test("desktop generation validates the saved receipt and opens exact Strategy/version navigation", async ({
  page,
}, info) => {
  const f = await fixture(page);
  await page.goto(origin);
  const action = page.getByRole("button", {
    name: "Request Strategy generation",
    exact: true,
  });
  await expect(action).toBeDisabled();
  await expect(page.getByLabel("Strategy type", { exact: true })).toBeEnabled();
  expect(f.writes).toEqual([]);
  await generate(page);
  const open = page.getByRole("link", {
    name: "Review generated version",
    exact: true,
  });
  await expect(open).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open in Strategies", exact: true }),
  ).toHaveAttribute(
    "href",
    `/modules/strategies?clientId=${clientId}&strategy=${strategyId}`,
  );
  expect(f.writes).toHaveLength(1);
  expect(f.writes[0]).toMatchObject({
    params: { clientId, objectiveId: objective.id },
    body: {
      schemaVersion: 2,
      command: { expectedObjectiveVersion: objective.version },
      selection: { type: "appropriations" },
    },
  });
  expect(f.starts).toEqual([
    { generationJobId: wire.completedPoll.body.jobId },
  ]);
  expect(f.planWrites).toHaveLength(0);
  const versionId =
    wire.completedPoll.body.objectiveGeneration.result.strategyVersionId;
  await expect(open).toHaveAttribute(
    "href",
    new RegExp(`strategyVersionId=${versionId}`),
  );
  await open.click();
  await expect(page).toHaveURL(
    new RegExp(`generatedJobId=${wire.completedPoll.body.jobId}`),
  );
  await expect(
    page.getByRole("heading", {
      name: "Generated Strategy",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Generated strategy roadmap" }),
  ).toBeVisible();
  await expect(
    page.getByText(`Saved version: ${versionId}`, { exact: true }),
  ).toBeHidden();
  await page.screenshot({
    path: info.outputPath("objective-generated-desktop-default.png"),
    fullPage: true,
  });
  await page.getByText("Generation details", { exact: true }).click();
  await expect(
    page.getByText(`Saved version: ${versionId}`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: boundStrategy.strategy.title,
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("objective-generated-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Open in Strategies", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`clientId=${clientId}&strategy=${strategyId}$`),
  );
  await expect(
    page.getByRole("heading", { name: "Working timeline" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "PPBE", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Congress", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add step", exact: true }),
  ).toBeVisible();
  expect(f.unexpected).toEqual([]);
});

test("saved roadmap stays read-only on mobile and exposes later fiscal years and archived step details", async ({
  page,
}, info) => {
  const f = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const params = new URLSearchParams({
    clientId,
    objectiveId: objective.id,
    objectiveVersion: String(objective.version),
    strategyId,
    generatedJobId: f.job().jobId,
    strategyVersionId: f.saved().source.strategyVersionId,
  });
  await page.goto(`/modules/strategies?${params}`);
  const roadmap = page.getByRole("region", {
    name: "Generated strategy roadmap",
  });
  await expect(roadmap).toBeVisible();
  await expect(
    roadmap.getByText("Generated engagement plan", { exact: true }),
  ).toBeVisible();
  await expect(
    roadmap.getByText("Generated decision milestone", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add step", exact: true }),
  ).toHaveCount(0);
  const year = page.getByRole("combobox", {
    name: "Saved roadmap fiscal start year",
  });
  await year.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: "Start FY2029", exact: true }).click();
  await expect(roadmap.getByText("FY2029", { exact: true })).toBeVisible();
  await expect(
    roadmap.getByText("Generated decision milestone", { exact: true }),
  ).toBeVisible();
  await page.getByText("Saved step details (2)", { exact: true }).click();
  await expect(
    page.getByText("Current source availability: archived", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic saved action details", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("objective-generated-mobile.png"),
    fullPage: true,
  });
  expect(f.writes).toEqual([]);
  expect(f.starts).toEqual([]);
  expect(f.planWrites).toEqual([]);
  expect(f.unexpected).toEqual([]);
});

test("lost submission survives reload and recovery reuses the frozen request without an automatic write", async ({
  page,
}) => {
  const f = await fixture(page, { lost: true });
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await generate(page);
  await expect(
    page.getByRole("alert").filter({ hasText: "outcome is unconfirmed" }),
  ).toBeVisible();
  const original = structuredClone(f.writes[0]);
  await page.reload();
  const recover = page.getByRole("button", {
    name: "Recover same Strategy request",
    exact: true,
  });
  await expect(recover).toBeEnabled();
  expect(f.writes).toHaveLength(1);
  await expect(page.getByLabel("Strategy type")).toBeDisabled();
  await recover.click();
  await expect(
    page.getByRole("link", { name: "Review generated version" }),
  ).toBeVisible();
  expect(f.writes).toEqual([original, original]);
  expect(f.unexpected).toEqual([]);
});

test("incomplete coverage shows its issue and never exposes a saved Strategy link", async ({
  page,
}) => {
  const f = await fixture(page, { failed: true });
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await generate(page);
  await expect(
    page.getByText("Context coverage: incomplete.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Required relationship fields do not fit/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review generated version" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Open in Strategies", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Refresh saved intake and access" })
    .click();
  await expect(page.getByLabel("Strategy type")).toBeDisabled();
  expect(f.writes).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});

test("a forged saved version is refused at destination before current Strategy content is shown", async ({
  page,
}) => {
  const f = await fixture(page);
  const query = new URLSearchParams({
    clientId,
    objectiveId: objective.id,
    objectiveVersion: String(objective.version),
    strategyId,
    generatedJobId: wire.completedPoll.body.jobId,
    strategyVersionId: wire.completedPoll.body.jobId,
  });
  await page.goto(`/modules/strategies?${query}`);
  await expect(page.getByRole("alert")).toContainText(
    "does not match the selected generation and version",
  );
  await expect(
    page.getByRole("heading", {
      name: boundStrategy.strategy.title,
      exact: true,
    }),
  ).toHaveCount(0);
  expect(f.writes).toEqual([]);
});

test("read-only and unsaved Objective views cannot dispatch generation", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await page
    .getByRole("textbox", { name: "Outcome", exact: true })
    .fill("Unsaved synthetic change");
  await expect(
    page.getByRole("button", {
      name: "Request Strategy generation",
      exact: true,
    }),
  ).toBeDisabled();
  expect(f.writes).toEqual([]);
  await page.route("**/api/backend/core/me", (r) =>
    json(r, { ...testIdentity, role: "readonly" }),
  );
  await page.reload();
  await expect(
    page.getByText(
      "Save a ready Objective in your selected client to request Strategy intake.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Request Strategy generation",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(f.writes).toEqual([]);
});

test("lost start response survives hard reload and retries only the already saved job", async ({
  page,
}) => {
  const f = await fixture(page, { lostStart: true });
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await generate(page);
  await expect(
    page
      .getByRole("region", { name: "Governed Strategy intake" })
      .getByRole("alert"),
  ).toBeVisible();
  const first = structuredClone(f.starts[0]);
  await page.reload();
  const retry = page.getByRole("button", {
    name: "Start or retry saved generation",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  expect(f.writes).toHaveLength(1);
  expect(f.starts).toHaveLength(1);
  expect(f.planWrites).toHaveLength(0);
  await retry.click();
  await expect.poll(() => f.starts).toEqual([first, first]);
  await expect(
    page.getByText(
      "Generation was requested for the saved job. Its current result is checked below.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(retry).toHaveCount(0);
  expect(f.writes).toHaveLength(1);
});
