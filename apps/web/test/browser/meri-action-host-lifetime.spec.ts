import { test, expect } from "@playwright/test";
import {
  actionHostFixture,
  actionUrl,
  otherActionClient,
  wire,
  navigate,
  connectActionHost,
  selectAction,
  reviewAction,
  prepareAction,
  replaceActionIdentity,
  expectActionIsolation,
} from "./meri-action-host-fixtures";

const identities = [
  { name: "user", detail: { userId: "synthetic-new-user" } },
  { name: "session", detail: { sessionId: "synthetic-new-session" } },
  { name: "organization", detail: { orgId: "synthetic-new-org" } },
] as const;
for (const identity of identities) {
  for (const status of [200, 401]) {
    test(`Meri held query ${status} cannot publish after ${identity.name} replacement`, async ({
      page,
    }) => {
      const fixture = await actionHostFixture(page);
      const response = wire(status === 200 ? "query" : "error-unauthenticated");
      const held = fixture.hold("query", { status, json: response.response });
      await page.goto(actionUrl());
      await connectActionHost(page);
      await page
        .getByRole("button", { name: "Find recommendations", exact: true })
        .click();
      await held.entered;
      await expect(page.getByRole("status")).toContainText(
        "Request in progress: query",
      );
      await replaceActionIdentity(page, identity.detail);
      await expect(
        page.getByRole("button", { name: "Connect action service" }),
      ).toBeEnabled();
      await held.release();
      await expect(
        page.getByRole("region", { name: "Returned recommendations" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Current access unavailable" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Your session expired" }),
      ).toHaveCount(0);
      expect(fixture.calls("session")).toHaveLength(1);
      expect(fixture.calls("query")).toHaveLength(1);
      // A new explicit connection/query proves the old cache journal did not poison this scope.
      fixture.use("query");
      await connectActionHost(page);
      await selectAction(page);
      await expect(
        page.getByLabel("Task title", { exact: true }),
      ).toBeEditable();
      expect(fixture.calls("session")).toHaveLength(2);
      expect(fixture.calls("query")).toHaveLength(2);
      expect(fixture.calls("draft")).toHaveLength(0);
      expect(fixture.calls("prepare")).toHaveLength(0);
      expect(fixture.calls("execute")).toHaveLength(0);
      expectActionIsolation(fixture);
    });
  }
}

for (const status of [200, 401]) {
  test(`Meri held execution ${status} cannot restore the former client's proposal or expire its replacement`, async ({
    page,
  }) => {
    const fixture = await actionHostFixture(page);
    for (const name of ["query", "draft", "prepare"]) fixture.use(name);
    await page.goto(actionUrl());
    await connectActionHost(page);
    await selectAction(page);
    await reviewAction(page);
    await prepareAction(page);
    const response = wire(
      status === 200 ? "execute-observed" : "error-unauthenticated",
    );
    const held = fixture.hold("execute", { status, json: response.response });
    await page.getByRole("checkbox", { name: /I approve/ }).check();
    await page
      .getByRole("button", { name: "Approve and execute", exact: true })
      .click();
    await held.entered;
    await expect(
      page.getByRole("button", { name: "Approve and execute", exact: true }),
    ).toBeDisabled();
    await navigate(page, actionUrl(otherActionClient.id));
    await expect(
      page.getByRole("button", { name: "Connect action service" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("region", { name: "Action connection" }),
    ).toContainText(otherActionClient.name);
    await held.release();
    await expect(
      page.getByRole("region", { name: "Immutable approval proposal" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Task creation confirmed" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Your session expired" }),
    ).toHaveCount(0);
    expect(fixture.calls("session")).toHaveLength(1);
    expect(fixture.calls("execute")).toHaveLength(1);
    await connectActionHost(page);
    expect(fixture.calls("session")[1]!.body).toEqual({
      clientId: otherActionClient.id,
    });
    await expect(
      page.getByRole("button", { name: "Find recommendations" }),
    ).toBeEnabled();
    expect(fixture.calls("query")).toHaveLength(1);
    expect(fixture.calls("prepare")).toHaveLength(1);
    expect(fixture.calls("execute")).toHaveLength(1);
    expectActionIsolation(fixture);
  });
}

test("a current action401 removes private workflow state without an automatic reconnect", async ({
  page,
}) => {
  const fixture = await actionHostFixture(page);
  fixture.use("query");
  await page.goto(actionUrl());
  await connectActionHost(page);
  await selectAction(page);
  const denied = wire("error-unauthenticated");
  fixture.reply("draft", { status: denied.httpStatus, json: denied.response });
  await page.getByRole("button", { name: "Review draft", exact: true }).click();
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
  expect(fixture.calls("session")).toHaveLength(1);
  expect(fixture.calls("draft")).toHaveLength(1);
  expect(fixture.calls("prepare")).toHaveLength(0);
  expectActionIsolation(fixture);
});
