import { test, expect, type Page } from "@playwright/test";
import wire from "../../tests/objective-generation-wire-fixtures.json" with { type: "json" };
import {
  objectiveGenerationRequest,
  type ObjectiveGenerationRequest,
} from "../../src/shared/capiro/operations/objective-generation";
import {
  installFixtures,
  json,
  objective,
  clientId,
} from "../../tests/browser/fixtures";
import {
  binding,
  boundStrategy,
  strategyId,
} from "../../tests/objective-work-fixtures";
import { operationFixtures, testIdentity } from "./fixtures";

const origin = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
const ready = { ...objective, status: "ready", readyAt: objective.updatedAt };
async function fixture(
  page: Page,
  options: { lost?: boolean; failed?: boolean } = {},
) {
  const unexpected = await installFixtures(page);
  await page.route(`**/api/backend/core/clients/${clientId}/objectives`, (r) =>
    json(r, [ready]),
  );
  const writes: ObjectiveGenerationRequest[] = [];
  const job = () => {
    const value = structuredClone(
      options.failed
        ? wire.incompleteContextPoll.body
        : wire.completedPoll.body,
    );
    value.objectiveGeneration.requestId =
      writes[0]?.requestId ?? wire.request.body.requestId;
    value.objectiveGeneration.source = { ...binding };
    if (value.objectiveGeneration.result)
      value.objectiveGeneration.result.strategyId = strategyId;
    value.strategyId = value.objectiveGeneration.result ? strategyId : null;
    return value;
  };
  await page.route(
    "**/api/backend/strategy/strategies/objective-drafts",
    async (route) => {
      const body = objectiveGenerationRequest.parse(
        route.request().postDataJSON(),
      );
      writes.push(body);
      if (options.lost && writes.length === 1) return route.abort("failed");
      const value = structuredClone(wire.accepted.body);
      value.objectiveGeneration.requestId = body.requestId;
      value.objectiveGeneration.source = { ...binding };
      return json(route, value);
    },
  );
  await page.route("**/api/backend/strategy/strategies/draft-jobs/*", (r) =>
    json(r, job()),
  );
  await operationFixtures(page, {
    "me.read": testIdentity,
    "strategies.objectiveDraftJob": () => job(),
    "strategies.objectiveDestination": boundStrategy,
  });
  return { writes, job, unexpected };
}
async function generate(page: Page) {
  await page
    .getByLabel("Strategy type", { exact: true })
    .selectOption("appropriations");
  await page
    .getByRole("button", { name: "Generate Strategy", exact: true })
    .click();
}

test("desktop generation validates the saved receipt and opens exact Strategy/version navigation", async ({
  page,
}, info) => {
  const f = await fixture(page);
  await page.goto(origin);
  const action = page.getByRole("button", {
    name: "Generate Strategy",
    exact: true,
  });
  await expect(action).toBeDisabled();
  await expect(page.getByLabel("Strategy type", { exact: true })).toBeEnabled();
  expect(f.writes).toEqual([]);
  await generate(page);
  const open = page.getByRole("link", {
    name: "Open generated Strategy receipt",
    exact: true,
  });
  await expect(open).toBeVisible();
  expect(f.writes).toHaveLength(1);
  expect(Object.keys(f.writes[0]!).sort()).toEqual([
    "clientId",
    "objective",
    "requestId",
    "type",
  ]);
  expect(f.writes[0]).toMatchObject({
    clientId,
    objective: {
      objectiveId: objective.id,
      objectiveVersion: objective.version,
    },
    type: "appropriations",
  });
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
      name: "Current authorized Strategy content",
      exact: true,
    }),
  ).toBeVisible();
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
    name: "Recover same request",
    exact: true,
  });
  await expect(recover).toBeEnabled();
  expect(f.writes).toHaveLength(1);
  await expect(page.getByLabel("Strategy type")).toBeDisabled();
  await recover.click();
  await expect(
    page.getByRole("link", { name: "Open generated Strategy receipt" }),
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
    page.getByRole("link", { name: "Open generated Strategy receipt" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Start another Strategy request" })
    .click();
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
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
    "does not match this exact Strategy destination",
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
    page.getByRole("button", { name: "Generate Strategy", exact: true }),
  ).toBeDisabled();
  expect(f.writes).toEqual([]);
  await page.route("**/api/backend/core/me", (r) =>
    json(r, { ...testIdentity, role: "readonly" }),
  );
  await page.reload();
  await expect(
    page.getByText(
      "Your current session cannot generate a Strategy for this client.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate Strategy", exact: true }),
  ).toHaveCount(0);
  expect(f.writes).toEqual([]);
});
