import { expect, test } from "@playwright/test";
import {
  retainedCommand,
  expectRetained,
} from "./activity-command-recovery-fixtures";
import { installCommands } from "./activity-command-fixtures";
import { json } from "./fixtures";

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
