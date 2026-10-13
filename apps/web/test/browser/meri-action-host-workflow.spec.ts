import { test, expect } from "@playwright/test";
import {
  actionHostFixture,
  actionContext,
  actionUrl,
  actionClock,
  wire,
  sessionReceipt,
  connectActionHost,
  selectAction,
  reviewAction,
  prepareAction,
  expectActionIsolation,
} from "./meri-action-host-fixtures";

test("Meri actual host bootstraps only explicitly and keeps action requests behind the received context", async ({
  page,
}) => {
  const fixture = await actionHostFixture(page);
  const held = fixture.hold("session", { json: sessionReceipt() });
  await page.goto(actionUrl());
  await expect(
    page.getByRole("button", { name: "Connect action service" }),
  ).toBeEnabled();
  expect(fixture.actions()).toEqual([]);
  await page.getByRole("button", { name: "Connect action service" }).click();
  await held.entered;
  await expect(page.getByRole("status")).toContainText(
    "Checking the current action context…",
  );
  await expect(
    page.getByRole("button", { name: "Connect action service" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Find recommendations" }),
  ).toHaveCount(0);
  expect(fixture.calls("session")[0]!.body).toEqual({
    clientId: actionContext.clientId,
  });
  expect(fixture.calls("session")[0]!.headers.authorization).toBeUndefined();
  await held.release();
  await expect(
    page.getByRole("button", { name: "Find recommendations" }),
  ).toBeEnabled();
  expect(fixture.actions().map((request) => request.route)).toEqual([
    "session",
  ]);
  expectActionIsolation(fixture);
});

test("Meri unavailable connection exposes no automatic action dispatch", async ({
  page,
}) => {
  const fixture = await actionHostFixture(page);
  await page.goto(`${actionUrl()}&actions-disabled=1`);
  await expect(
    page.getByRole("heading", { name: "Action service unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find recommendations" }),
  ).toBeDisabled();
  expect(fixture.actions()).toEqual([]);
  expectActionIsolation(fixture);
});

test("Meri exact proposal requires separate approval and rechecks the identical observed command", async ({
  page,
}) => {
  const fixture = await actionHostFixture(page);
  for (const name of ["query", "draft", "prepare", "execute-approval-pending"])
    fixture.use(name);
  await page.goto(actionUrl());
  await connectActionHost(page);
  await selectAction(page);
  const coverage = page.getByLabel("Recommendation coverage", { exact: true });
  await expect(coverage).toContainText("Enumeration: unknown");
  await expect(coverage).toContainText("freshness unknown");
  await expect(coverage).toContainText("history: unsupported");
  await expect(coverage).toContainText("absence supported: false");
  await expect(coverage).toContainText("Evidence ready: false");
  expect(fixture.actions().map((request) => request.route)).toEqual([
    "session",
    "query",
  ]);
  expect(fixture.calls("query")[0]!.body).toEqual(wire("query").request);
  await reviewAction(page);
  expect(fixture.calls("draft")[0]!.body).toEqual(wire("draft").request);
  expect(fixture.calls("prepare")).toHaveLength(0);
  await prepareAction(page);
  expect(fixture.calls("prepare")[0]!.body).toEqual(wire("prepare").request);
  const proposal = page.getByRole("region", {
    name: "Immutable approval proposal",
  });
  await expect(proposal).toContainText(actionContext.proposal.proposalId);
  await expect(proposal).toContainText(actionContext.proposal.commandSha256);
  await expect(page.getByRole("button", { name: /approve/i })).toHaveCount(0);
  expect(fixture.calls("execute")).toHaveLength(0);
  await page
    .getByRole("button", { name: "Request execution", exact: true })
    .click();
  await expect(proposal.getByRole("status")).toContainText(
    "Current approval is still required.",
  );
  await expect(
    page.getByRole("heading", { name: "Task creation confirmed" }),
  ).toHaveCount(0);
  expect(fixture.calls("execute")).toHaveLength(1);
  // External test control supplies a later service observation; the browser never approves.
  fixture.use("execute-observed");
  await page
    .getByRole("button", { name: "Request execution", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Task creation confirmed" }),
  ).toBeVisible();
  fixture.use("execute-replay");
  await page
    .getByRole("button", { name: "Check recorded result", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check recorded result", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Task creation confirmed" }),
  ).toBeVisible();
  await expect(proposal).toContainText(actionContext.proposal.commandSha256);
  expect(fixture.calls("execute").map((request) => request.body)).toEqual([
    wire("execute-approval-pending").request,
    wire("execute-observed").request,
    wire("execute-replay").request,
  ]);
  expect(
    new Set(
      fixture.calls("execute").map((request) => JSON.stringify(request.body)),
    ).size,
  ).toBe(1);
  expect(fixture.calls("prepare")).toHaveLength(1);
  expectActionIsolation(fixture);
});

for (const width of [1440, 375]) {
  test(`Meri dated draft controls are keyboard operable and fit ${width}px`, async ({
    page,
  }, testInfo) => {
    const fixture = await actionHostFixture(page);
    fixture.use("query");
    fixture.use("draft-canonical-date");
    fixture.use("prepare-canonical-date");
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(actionUrl());
    const connect = page.getByRole("button", {
      name: "Connect action service",
      exact: true,
    });
    await expect(connect).toBeEnabled();
    await connect.focus();
    await expect(connect).toBeFocused();
    await page.keyboard.press("Enter");
    const find = page.getByRole("button", {
      name: "Find recommendations",
      exact: true,
    });
    await expect(find).toBeEnabled();
    await find.focus();
    await page.keyboard.press("Enter");
    const select = page.getByRole("button", {
      name: /^Select recommendation\s*:/,
    });
    await expect(select).toBeVisible();
    await select.focus();
    await page.keyboard.press("Enter");
    const title = page.getByLabel("Task title", { exact: true });
    await title.focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText(actionContext.task.title);
    await expect(title).toHaveValue(actionContext.task.title);
    await page.getByLabel("Due date", { exact: true }).fill("2026-11-02");
    const review = page.getByRole("button", {
      name: "Review draft",
      exact: true,
    });
    await review.focus();
    await expect(review).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Reviewed task intent" }),
    ).toBeVisible();
    expect(fixture.calls("draft")[0]!.body).toEqual({
      selection: actionContext.selection,
      edits: {
        title: actionContext.task.title,
        dueDate: "2026-11-02T00:00:00.000Z",
      },
    });
    await expect(
      page.getByText("Due date: 2026-11-02", { exact: true }),
    ).toBeVisible();
    await prepareAction(page);
    expect(fixture.calls("prepare")[0]!.body).toEqual({
      draft: wire("draft-canonical-date").response,
    });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.screenshot({
      path: testInfo.outputPath(`meri-actions-${width}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(() =>
        Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        ),
      ),
    ).toBeLessThanOrEqual(width);
    expect(fixture.calls("execute")).toHaveLength(0);
    expectActionIsolation(fixture);
  });
}

test("Meri admitted context expiry clears an idle private draft without another request", async ({
  page,
}) => {
  const fixture = await actionHostFixture(page);
  fixture.use("query");
  await page.goto(actionUrl());
  await connectActionHost(page);
  await selectAction(page);
  await page
    .getByLabel("Task title", { exact: true })
    .fill("Synthetic private draft before expiry");
  const before = fixture.actions().length;
  await page.clock.setSystemTime(new Date(actionClock));
  await page.clock.fastForward(60_001);
  await expect(page.getByRole("status")).toContainText(
    "Current action access is unavailable.",
  );
  await expect(page.getByLabel("Task title", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Returned recommendations" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Connect action service" }),
  ).toBeEnabled();
  expect(fixture.actions()).toHaveLength(before);
  expectActionIsolation(fixture);
});
