import { test, expect } from "@playwright/test";
import {
  taskHostFixture,
  taskWire,
  taskUrl,
  prepareTaskUpdate,
  navigate,
  otherTaskClient,
  context,
} from "./meri-task-command-fixtures";

test("desktop task update uses explicit connection, immutable preparation and separate approval before exact execution/replay", async ({
  page,
}, testInfo) => {
  const fixture = await taskHostFixture(page);
  await page.goto(taskUrl());
  await expect(
    page.getByRole("button", { name: "Connect task-update service" }),
  ).toBeVisible();
  expect(fixture.calls).toEqual([]);
  await prepareTaskUpdate(page);
  expect(fixture.operations("session")[0]!.authorization).toBeUndefined();
  expect(fixture.operations("prepare")[0]!.body).toEqual({
    arguments: {
      taskId: "00000000-0000-4000-8000-000000000021",
      title: "Updated",
      status: "todo",
    },
  });
  expect(fixture.operations("execute")).toHaveLength(0);
  await expect(page.getByLabel("Task ID", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("New task title", { exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: /^approve/i })).toHaveCount(0);
  const proposal = page.getByRole("region", {
    name: "Immutable task update proposal",
  });
  await expect(proposal).toContainText(
    taskWire("prepare").response.proposal.commandSha256,
  );
  await page
    .getByRole("button", { name: "Check approval and execute", exact: true })
    .click();
  await expect(proposal.getByRole("status")).toContainText(
    "Separate approval is still required",
  );
  await expect(
    page.getByRole("heading", { name: "Task update confirmed" }),
  ).toHaveCount(0);
  // Synthetic external approval control changes only the service reply; browser has no decision API.
  fixture.execute("observed");
  await page
    .getByRole("button", { name: "Check approval and execute", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Task update confirmed" }),
  ).toBeVisible();
  fixture.execute("replay");
  await page
    .getByRole("button", { name: "Check recorded result", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check recorded result", exact: true }),
  ).toBeEnabled();
  expect(fixture.operations("execute").map((call) => call.body)).toEqual([
    taskWire("observed").request,
    taskWire("observed").request,
    taskWire("observed").request,
  ]);
  expect(fixture.operations("prepare")).toHaveLength(1);
  expect(
    fixture.calls
      .filter((call) => call.route !== "session")
      .every(
        (call) =>
          call.actionSession === `action_session_${"a".repeat(43)}` &&
          call.authorization === undefined,
      ),
  ).toBe(true);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.screenshot({
    path: testInfo.outputPath("task-update-desktop.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1440);
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
  expect(fixture.remote).toEqual([]);
});

test("task-update connection remains disabled without feature activation", async ({
  page,
}) => {
  const fixture = await taskHostFixture(page);
  await page.goto(`${taskUrl()}&task-updates-disabled=1`);
  await expect(
    page.getByRole("heading", { name: "Task updates unavailable" }),
  ).toBeVisible();
  expect(fixture.calls).toEqual([]);
});

test("uncertain store outcome fences another prepare across client-side navigation", async ({
  page,
}) => {
  const fixture = await taskHostFixture(page);
  fixture.execute("missingApprovalStore");
  await page.goto(taskUrl());
  await prepareTaskUpdate(page);
  await page
    .getByRole("button", { name: "Check approval and execute", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Outcome uncertain");
  await navigate(page, `/meri/actions?clientId=${context.selectedClientId}`);
  await expect(
    page.getByRole("button", { name: "Connect action service", exact: true }),
  ).toBeVisible();
  await navigate(page, taskUrl());
  await prepareTaskUpdateWithoutSuccess(page);
  await expect(page.getByRole("alert")).toContainText("Outcome uncertain");
  expect(fixture.operations("prepare")).toHaveLength(1);
  expect(fixture.operations("execute")).toHaveLength(1);
});

test("client replacement and opaque session expiry clear prepared details without writes", async ({
  page,
}) => {
  const fixture = await taskHostFixture(page);
  await page.goto(taskUrl());
  await prepareTaskUpdate(page);
  await navigate(page, taskUrl(otherTaskClient.id));
  await expect(
    page.getByRole("region", { name: "Immutable task update proposal" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Connect task-update service", exact: true })
    .click();
  await expect(page.getByLabel("New task title", { exact: true })).toHaveValue(
    "",
  );
  await page.clock.setSystemTime(new Date(context.syntheticNow));
  await page.clock.fastForward(60_001);
  await expect(page.getByLabel("Task ID", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "Current task-update access is unavailable",
  );
  expect(fixture.operations("execute")).toHaveLength(0);
});

async function prepareTaskUpdateWithoutSuccess(
  page: import("@playwright/test").Page,
) {
  await page
    .getByRole("button", { name: "Connect task-update service", exact: true })
    .click();
  await page
    .getByLabel("Task ID", { exact: true })
    .fill("00000000-0000-4000-8000-000000000021");
  await page.getByLabel("New task title", { exact: true }).fill("Updated");
  await page
    .getByRole("button", { name: "Prepare approval proposal", exact: true })
    .click();
}
