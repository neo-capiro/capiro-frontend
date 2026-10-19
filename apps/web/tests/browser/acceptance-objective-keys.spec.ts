import { expect, test } from "@playwright/test";
import { clientId, objective } from "./fixtures";
import { strategyId } from "../objective-work-fixtures";
import { sessionId } from "../newsletter-staging-fixtures";
import {
  objectiveKeyFixtures,
  objectivePanels,
  objectiveKeysPath,
  chooseBothObjectiveDestinations,
  holdObjectiveResolutions,
  nextObjectivePath,
} from "./acceptance-objective-keys-fixtures";

test("actual ObjectiveEditor has independent destination panels without duplicate sibling-key warnings", async ({
  page,
}, info) => {
  const messages: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning")
      messages.push(message.text());
  });
  const { state, unexpected } = await objectiveKeyFixtures(page);
  await page.goto(objectiveKeysPath);
  await chooseBothObjectiveDestinations(page);
  const { outreach, work } = objectivePanels(page);
  await outreach
    .getByRole("button", { name: "Hide session selection", exact: true })
    .click();
  await expect(
    work.getByLabel("Existing Strategy", { exact: true }),
  ).toHaveValue(strategyId);
  await outreach
    .getByRole("button", {
      name: "Choose existing Outreach session",
      exact: true,
    })
    .click();
  await expect(
    outreach.getByLabel("Existing Outreach session", { exact: true }),
  ).toHaveValue(sessionId);
  await expect(outreach).toHaveCount(1);
  await expect(work).toHaveCount(1);
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
  await info.attach("actual-objective-console", {
    body: JSON.stringify(messages, null, 2),
    contentType: "application/json",
  });
  expect(
    messages.filter((message) =>
      /Encountered two children with the same key|unique ["']key["'] prop/i.test(
        message,
      ),
    ),
  ).toEqual([]);
});

test("a persisted Objective version remounts both destination selections and resolves only the new version", async ({
  page,
}) => {
  const { state, unexpected } = await objectiveKeyFixtures(page);
  await page.goto(objectiveKeysPath);
  await chooseBothObjectiveDestinations(page);
  const { editor, outreach, work } = objectivePanels(page);
  await editor
    .getByLabel("Outcome", { exact: true })
    .fill("Revised saved outcome");
  await editor
    .getByRole("button", { name: "Request review", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText(
    "Synthetic review transition unavailable",
  );
  await expect(editor.getByLabel("Outcome", { exact: true })).toHaveValue(
    "Revised saved outcome",
  );
  await expect(
    outreach.getByRole("button", {
      name: "Choose existing Outreach session",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    work.getByRole("button", {
      name: "Choose existing resources",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    outreach.getByLabel("Existing Outreach session", { exact: true }),
  ).toHaveCount(0);
  await expect(work.getByLabel("Resource type", { exact: true })).toHaveCount(
    0,
  );
  await outreach
    .getByRole("button", {
      name: "Choose existing Outreach session",
      exact: true,
    })
    .click();
  await work
    .getByRole("button", { name: "Choose existing resources", exact: true })
    .click();
  await expect(
    outreach.getByLabel("Existing Outreach session", { exact: true }),
  ).toHaveValue("");
  await expect(work.getByLabel("Resource type", { exact: true })).toHaveValue(
    "",
  );
  await outreach
    .getByLabel("Existing Outreach session", { exact: true })
    .selectOption(sessionId);
  await work
    .getByLabel("Resource type", { exact: true })
    .selectOption("strategy");
  await work
    .getByLabel("Existing Strategy", { exact: true })
    .selectOption(strategyId);
  await outreach
    .getByRole("button", { name: "Open Objective-bound Outreach", exact: true })
    .click();
  await expect(outreach.getByRole("alert")).toContainText(
    "current destination conflict",
  );
  await work
    .getByRole("button", { name: "Open Objective-bound Strategy", exact: true })
    .click();
  await expect(work.getByRole("alert")).toContainText(
    "current destination conflict",
  );
  expect(state.resolutions).toEqual(
    Array.from({ length: 2 }, () => ({
      clientId,
      objectiveId: objective.id,
      objectiveVersion: "2",
    })),
  );
  expect(state.writes).toHaveLength(2);
  expect(state.writes[0]).toMatchObject({
    method: "PATCH",
    body: { expectedVersion: 1, outcome: "Revised saved outcome" },
  });
  expect(state.writes[1]).toEqual({
    method: "POST",
    body: { action: "request_review", expectedVersion: 2 },
  });
  expect(new URL(page.url()).pathname).toBe(
    `/portfolio/${clientId}/objectives`,
  );
  expect(unexpected).toEqual([]);
});

for (const replacement of ["close", "client"]) {
  test(`both held destination resolutions abort on editor ${replacement} without late navigation`, async ({
    page,
  }, info) => {
    const { state, unexpected } = await objectiveKeyFixtures(page);
    const held = await holdObjectiveResolutions(page);
    await page.goto(objectiveKeysPath);
    await chooseBothObjectiveDestinations(page);
    const { outreach, work } = objectivePanels(page);
    const failures = ["/outreach-v3/", "/strategy/strategies/"].map((part) =>
      page.waitForEvent("requestfailed", {
        predicate: (request) =>
          request.url().includes(part) &&
          request.url().includes("/objective-destination?"),
      }),
    );
    try {
      await outreach
        .getByRole("button", {
          name: "Open Objective-bound Outreach",
          exact: true,
        })
        .click();
      await work
        .getByRole("button", {
          name: "Open Objective-bound Strategy",
          exact: true,
        })
        .click();
      await expect.poll(() => held.state.entered).toBe(2);
      if (replacement === "close") await page.keyboard.press("Escape");
      else
        await page.evaluate((path) => {
          history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, nextObjectivePath);
      const aborted = await Promise.all(failures);
      for (const request of aborted)
        expect(request.failure()?.errorText).toContain("ERR_ABORTED");
      await info.attach("destination-aborts", {
        body: JSON.stringify(
          aborted.map((request) => ({
            url: request.url(),
            failure: request.failure(),
          })),
        ),
        contentType: "application/json",
      });
    } finally {
      held.release();
    }
    await expect.poll(() => held.state.offered).toBe(2);
    if (replacement === "close")
      await expect(
        page.getByRole("dialog", { name: "Edit objective", exact: true }),
      ).toHaveCount(0);
    else {
      await expect(page.getByLabel("Outcome", { exact: true })).toHaveValue(
        "Other client objective",
      );
      await expect(
        page.getByRole("button", {
          name: "Choose existing Outreach session",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Choose existing resources",
          exact: true,
        }),
      ).toBeVisible();
    }
    expect(new URL(page.url()).pathname).toBe(
      replacement === "client"
        ? nextObjectivePath.split("?")[0]
        : `/portfolio/${clientId}/objectives`,
    );
    expect(state.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}
