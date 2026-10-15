import { test, expect } from "@playwright/test";
import {
  fixture,
  generate,
  origin,
} from "./objective-generation-browser-fixtures";
import { planHref } from "../../src/shared/capiro/operations/strategy-materialization";

test("one desktop action saves Strategy then plan and opens current authorized project through Planner", async ({
  page,
}, info) => {
  const f = await fixture(page);
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await generate(page);
  const open = page.getByRole("link", {
    name: "Review generated Planner plan",
  });
  await expect(open).toBeVisible();
  expect(f.writes).toHaveLength(1);
  expect(f.planWrites).toHaveLength(1);
  expect(Object.keys(f.planWrites[0]!).sort()).toEqual([
    "expected",
    "generationJobId",
    "requestId",
  ]);
  await open.click();
  await expect(
    page.getByRole("heading", { name: "Generated Planner plan", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("generated-plan-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "Open generated project: Generated saved plan",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Human-edited generated action", { exact: true }).first(),
  ).toBeVisible();
  expect(f.planWrites).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});
test("lost plan reply recovers after reload by GET without another POST", async ({
  page,
}) => {
  const f = await fixture(page, { lostPlan: true });
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await generate(page);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Plan preparation could not be verified" }),
  ).toBeVisible();
  expect(f.planWrites).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Review generated Planner plan" }),
  ).toBeVisible();
  expect(f.planWrites).toHaveLength(1);
});
test("uncertain absent plan receipt waits for explicit same-request resume", async ({
  page,
}) => {
  const f = await fixture(page, { noPlanCommit: true });
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await generate(page);
  await expect(
    page.getByRole("button", {
      name: "Recover same plan request",
      exact: true,
    }),
  ).toBeVisible();
  const first = structuredClone(f.planWrites[0]);
  await page.reload();
  const recover = page.getByRole("button", {
    name: "Recover same plan request",
    exact: true,
  });
  await expect(recover).toBeVisible();
  expect(f.planWrites).toHaveLength(1);
  await recover.click();
  await expect(
    page.getByRole("link", { name: "Review generated Planner plan" }),
  ).toBeVisible();
  expect(f.planWrites).toEqual([first, first]);
});
test("partial outputs show saved-but-unavailable state and expose no output navigation", async ({
  page,
}) => {
  const f = await fixture(page, { partialPlan: true });
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await generate(page);
  await expect(
    page.getByText(
      "Plan was saved, but some outputs are currently unavailable.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review generated Planner plan" }),
  ).toHaveCount(0);
  expect(f.planWrites).toHaveLength(1);
});
test("a zero-actionable source creates a context plan without fabricated tasks or complete claim", async ({
  page,
}) => {
  const f = await fixture(page, { zeroWork: true });
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await generate(page);
  await expect(
    page.getByText(
      "The saved plan has no actionable work. Its context was retained.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Plan prepared; review the reported issues.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(f.plan().counts.createdTasks).toBe(0);
});
test("a forged Objective version refuses receipt content before project navigation", async ({
  page,
}) => {
  const f = await fixture(page);
  const href = new URL(planHref(f.plan()), "https://synthetic.invalid");
  href.searchParams.set("objectiveVersion", "99");
  await page.goto(href.pathname + href.search);
  await expect(page.getByRole("alert")).toContainText(
    "another saved Objective",
  );
  await expect(
    page.getByRole("button", { name: /Open generated project/ }),
  ).toHaveCount(0);
  expect(f.planWrites).toHaveLength(0);
});
test("stopping observation before generation finishes prevents automatic plan POST until resume", async ({
  page,
}) => {
  const f = await fixture(page, { holdGeneration: true });
  await page.goto(origin);
  await expect(page.getByLabel("Strategy type")).toBeEnabled();
  await generate(page);
  await page
    .getByRole("button", { name: "Stop watching", exact: true })
    .click();
  f.options.holdGeneration = false;
  await page
    .getByRole("button", { name: "Refresh generation status", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Continue plan preparation",
      exact: true,
    }),
  ).toBeVisible();
  expect(f.planWrites).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "Resume watching and plan preparation",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("link", { name: "Review generated Planner plan" }),
  ).toBeVisible();
  expect(f.planWrites).toHaveLength(1);
});

for (const redacted of [false, true]) {
  test(`changed output identity is refused${redacted ? " after a redacted observation" : ""}`, async ({
    page,
  }) => {
    const f = await fixture(page);
    let response = f.plan();
    await page.route(
      "**/api/capiro/planner.strategyMaterialization*",
      (route) => route.fulfill({ json: response }),
    );
    await page.goto(planHref(response));
    await expect(
      page.getByRole("button", { name: /Open generated project:/ }),
    ).toBeVisible();
    const original = structuredClone(response);
    if (redacted) {
      response = structuredClone(original);
      response.status = "partial";
      response.projects[0]!.output = {
        ...response.projects[0]!.output,
        availability: "unavailable",
        id: null,
        currentVersion: null,
      };
      await page
        .getByRole("button", { name: "Recheck generated plan", exact: true })
        .click();
      await expect(
        page.getByText("Saved plan outputs are partly unavailable.", {
          exact: true,
        }),
      ).toBeVisible();
    }
    response = structuredClone(original);
    response.projects[0]!.output.id = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    await page
      .getByRole("button", { name: "Recheck generated plan", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "immutable saved plan receipt changed",
    );
    await expect(
      page.getByRole("button", { name: /Open generated project:/ }),
    ).toHaveCount(0);
    expect(f.planWrites).toHaveLength(0);
  });
}
