import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  retainedCommand,
  expectRetained,
} from "./activity-command-recovery-fixtures";
import { installCommands } from "./activity-command-fixtures";
import { json } from "./fixtures";

test("plain Undo response loss recovers after reload outside the transient toast without another write", async ({
  page,
}) => {
  const saved = await retainedCommand(page, false);
  saved.allowReceipt();
  const original = saved.pairs.get(saved.original.requestId)!;
  const identity = {
    schemaVersion: 1,
    commandId: original.commandId,
    creationRequestId: original.requestId,
    tenantId: original.tenantId,
    actorUserId: original.actorUserId,
    clientId: original.clientId,
    activityId: original.activity.id,
  };
  const revision = "2026-10-24T10:00:00.123456Z";
  const row = {
    ...saved.original.activity,
    id: original.activity.id,
    body: saved.original.activity.body ?? null,
    personId: null,
    occurredAt: "2026-10-24T10:00:00Z",
    dueAt: null,
    pinned: false,
    settledAt: null,
    sourceType: "activity_command",
    sourceId: original.commandId,
    origin: "recorded",
  };
  let removed: Record<string, unknown> | undefined;
  saved.state.undoRespond = async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      const digest = createHash("sha256")
        .update(
          JSON.stringify([
            "activity-command-undo",
            1,
            original.tenantId,
            original.actorUserId,
            original.clientId,
            original.commandId,
            original.requestId,
            body.requestId,
            body.activityId,
            body.expectedRevision,
          ]),
        )
        .digest("hex");
      removed = {
        ...identity,
        status: "removed",
        undo: {
          requestId: body.requestId,
          payloadDigest: digest,
          removedAt: "2026-10-24T11:00:00.654321Z",
        },
      };
      return json(
        route,
        { message: "Synthetic lost Undo response after commit" },
        503,
      );
    }
    return json(
      route,
      removed ?? { ...identity, status: "available", revision, activity: row },
    );
  };
  await page
    .getByRole("button", { name: "Read saved command", exact: true })
    .click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Read saved Undo", exact: true }),
  ).toBeVisible();
  expect(
    saved.state.undoCalls.filter((call) => call.method === "POST"),
  ).toHaveLength(1);
  await page.reload();
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("command-test-close")),
  );
  await expect(
    page.getByText("Quick log removed", { exact: true }),
  ).toBeVisible();
  expect(
    saved.state.undoCalls.filter((call) => call.method === "POST"),
  ).toHaveLength(1);
  await page
    .getByRole("button", { name: "Dismiss Quick log result", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByText("Quick log removed", { exact: true }),
  ).toHaveCount(0);
  expect(saved.posts()).toHaveLength(1);
  expect(saved.unexpected).toEqual([]);
});

test("plain lost response survives reload, GET recovery and explicit reread before acknowledgment", async ({
  page,
}) => {
  const saved = await retainedCommand(page, false);
  expect(saved.original).not.toHaveProperty("followUp");
  expect(saved.state.optionsReads).toBe(0);
  saved.allowReceipt();
  await page.reload();
  await expectRetained(page, saved.original.requestId);
  expect(saved.state.calls.map((call) => call.method)).toEqual(["POST"]);
  await expect(
    page.getByRole("checkbox", { name: "Add generic follow-up" }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Read saved command", exact: true })
    .click();
  await expect(
    page.getByText("Activity saved.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume follow-up" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("Quick log view closed.")).toBeVisible();
  expect(saved.state.calls.map((call) => call.method)).toEqual([
    "POST",
    "GET",
    "GET",
  ]);
  expect(saved.pairs.size).toBe(1);
  await page.reload();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
  expect(saved.posts()).toHaveLength(1);
  expect(saved.unexpected).toEqual([]);
});

test("unavailable plain receipt permits only deliberate replay of the exact original request", async ({
  page,
}) => {
  const saved = await retainedCommand(page, false);
  await page.reload();
  await expectRetained(page, saved.original.requestId);
  await page
    .getByRole("button", { name: "Read saved command", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recover original save", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Title", { exact: true })).toBeDisabled();
  expect(saved.posts()).toHaveLength(1);
  saved.allowReplay();
  await page
    .getByRole("button", { name: "Recover original save", exact: true })
    .click();
  await expect(
    page.getByText("Activity saved.", { exact: true }),
  ).toBeVisible();
  expect(saved.posts().map((call) => call.body)).toEqual([
    saved.original,
    saved.original,
  ]);
  expect(saved.pairs.size).toBe(1);
  expect(saved.unexpected).toEqual([]);
});

test("changed acknowledgment receipt cannot erase the retained plain command", async ({
  page,
}) => {
  const saved = await retainedCommand(page, false);
  saved.allowReceipt();
  await page
    .getByRole("button", { name: "Read saved command", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeEnabled();
  const originalReceipt = saved.pairs.get(saved.original.requestId)!;
  saved.state.respond = (route) =>
    json(route, {
      ...originalReceipt,
      commandId: "a1000000-0000-4000-8000-000000000099",
    });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Retry saved-command recovery",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Quick log view closed.")).toHaveCount(0);
  await page.reload();
  await expectRetained(page, saved.original.requestId);
  expect(saved.posts()).toHaveLength(1);
  expect(saved.unexpected).toEqual([]);
});

test("a second tab restores a plain command without dispatching or creating a follow-up", async ({
  page,
  context,
}) => {
  const saved = await retainedCommand(page, false);
  saved.allowReceipt();
  const other = await context.newPage();
  const next = await installCommands(other);
  next.state.respond = saved.state.respond;
  await other.goto("/activity-command.html");
  await expectRetained(other, saved.original.requestId);
  expect(next.state.calls).toEqual([]);
  await expect(
    other.getByRole("button", { name: "Save activity", exact: true }),
  ).toBeDisabled();
  await other
    .getByRole("button", { name: "Read saved command", exact: true })
    .click();
  await expect(
    other.getByText("Activity saved.", { exact: true }),
  ).toBeVisible();
  expect(next.state.calls.map((call) => call.method)).toEqual(["GET"]);
  expect(saved.posts()).toHaveLength(1);
  expect(next.state.optionsReads).toBe(0);
  expect(next.unexpected).toEqual([]);
});
