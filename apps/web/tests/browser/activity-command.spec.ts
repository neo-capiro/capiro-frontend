import { test, expect, type Page } from "@playwright/test";
import { json } from "./fixtures";
import {
  commandActor,
  commandAssignee,
  commandReceipt,
} from "../activity-command-fixtures";
import {
  commandEvent,
  completedCommand,
  installCommands,
} from "./activity-command-fixtures";

async function compose(page: Page) {
  await page.goto("/activity-command.html");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Synthetic follow-up activity");
  await page
    .getByLabel("Details", { exact: true })
    .fill("Private activity text stays in Core");
  await page.getByRole("checkbox", { name: "Add generic follow-up" }).check();
  await page
    .getByRole("combobox", { name: "Follow-up assignee", exact: true })
    .selectOption(commandAssignee.id);
}
const save = (page: Page) =>
  page
    .getByRole("button", { name: "Save activity and follow-up", exact: true })
    .click();

test("activity saved and task pending are separate; explicit resume uses the latest read version", async ({
  page,
}) => {
  const { state, unexpected } = await installCommands(page);
  await compose(page);
  await save(page);
  await expect(
    page.getByText("Activity saved.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/follow-up is pending/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume follow-up" }),
  ).toBeDisabled();
  expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  state.receipt = { ...commandReceipt(state.input), version: 9 };
  await page.getByRole("button", { name: "Read saved command" }).click();
  await expect(
    page.getByRole("button", { name: "Resume follow-up" }),
  ).toBeEnabled();
  state.receipt = completedCommand(state.input);
  await page.getByRole("button", { name: "Resume follow-up" }).click();
  await expect(
    page.getByText(/follow-up created.*synthetic-planner-task/i),
  ).toBeVisible();
  expect(
    state.calls.map((call) => [
      call.method,
      call.path.split("/activity-commands")[1],
      call.body,
    ]),
  ).toEqual([
    ["POST", "", state.input],
    ["GET", `/${state.input!.requestId}`, null],
    ["POST", `/${state.input!.requestId}/resume`, { expectedVersion: 9 }],
  ]);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("Quick log view closed.")).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Quick log result" }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});
test("a date requires explicit zone; scheduled generic follow-up fits mobile", async ({
  page,
}, info) => {
  const { state, unexpected } = await installCommands(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await compose(page);
  await page
    .getByLabel("Follow-up date (optional)", { exact: true })
    .fill("2026-11-01");
  await save(page);
  await expect(page.getByRole("alert")).toContainText(
    "explicit IANA time zone",
  );
  expect(state.calls).toEqual([]);
  await page
    .getByLabel("Follow-up IANA time zone", { exact: true })
    .fill("America/New_York");
  await page
    .getByLabel("Follow-up time (optional)", { exact: true })
    .fill("01:30");
  await page.getByLabel("Follow-up IANA time zone", { exact: true }).focus();
  await expect(
    page.getByLabel("Follow-up IANA time zone", { exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("generic-follow-up-mobile.png"),
  });
  await expect(
    page.getByRole("combobox", { name: "Activity type" }).locator("option"),
  ).toHaveText([
    "Note",
    "Call",
    "Logged email",
    "Decision",
    "Request",
    "Commitment",
  ]);
  await expect(page.getByText(/We owe|They owe|Counterparty/)).toHaveCount(0);
  await save(page);
  await expect(
    page.getByText("Activity saved.", { exact: true }),
  ).toBeVisible();
  expect(state.input?.followUp).toEqual({
    assigneeUserId: commandAssignee.id,
    dueOn: "2026-11-01",
    dueTime: "01:30",
    timeZone: "America/New_York",
  });
  expect(unexpected).toEqual([]);
});
test("lost create plus nondisclosing 404 retain the exact original body and key for deliberate recovery", async ({
  page,
}) => {
  const { state } = await installCommands(page);
  state.respond = (route) =>
    json(route, { message: "Synthetic lost receipt" }, 503);
  await compose(page);
  await save(page);
  await expect(page.getByText(/original request is retained/i)).toBeVisible();
  const original = structuredClone(state.input);
  await expect(
    page.getByRole("button", { name: "Save activity and follow-up" }),
  ).toBeDisabled();
  state.respond = (route) => json(route, { message: "Unavailable" }, 404);
  await page.getByRole("button", { name: "Read saved command" }).click();
  await expect(
    page.getByRole("button", { name: "Recover original save" }),
  ).toBeEnabled();
  expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  state.respond = (route) => json(route, completedCommand(state.input));
  await page.getByRole("button", { name: "Recover original save" }).click();
  await expect(page.getByText(/follow-up created/i)).toBeVisible();
  expect(
    state.calls
      .filter((call) => call.method === "POST")
      .map((call) => call.body),
  ).toEqual([original, original]);
});
test("interrupting create retains its command across reopening and reads without another POST", async ({
  page,
}) => {
  const { state } = await installCommands(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.respond = async (route) => {
    await held;
    await json(route, completedCommand(state.input)).catch(() => undefined);
  };
  await compose(page);
  await save(page);
  await expect.poll(() => state.calls.length).toBe(1);
  const original = structuredClone(state.input);
  await commandEvent(page, "close");
  await expect(page.getByText("Quick log view closed.")).toBeVisible();
  release();
  state.respond = (route) => json(route, completedCommand(original));
  await commandEvent(page, "open");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    original!.activity.title,
  );
  await expect(
    page.getByRole("button", { name: "Save activity and follow-up" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Read saved command" }).click();
  await expect(page.getByText(/follow-up created/i)).toBeVisible();
  expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(state.calls[1]?.path).toContain(original!.requestId);
});
test("actor replacement during assignee reread aborts creation and clears the former draft", async ({
  page,
}) => {
  const { state } = await installCommands(page);
  await compose(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.holdOptions = () => held;
  await save(page);
  await expect.poll(() => state.optionsReads).toBeGreaterThan(1);
  state.identity = {
    ...state.identity,
    user: { ...state.identity.user, id: commandAssignee.id },
  };
  await commandEvent(page, "identity", state.identity);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
  release();
  await expect(
    page.getByRole("checkbox", { name: "Add generic follow-up" }),
  ).not.toBeChecked();
  await expect(page.getByText(/retained activity/i)).toHaveCount(0);
  expect(state.calls).toEqual([]);
});
test("wrong-context success is uncertain, cannot show saved activity and cannot be resent", async ({
  page,
}) => {
  const { state } = await installCommands(page);
  state.respond = (route) =>
    json(route, {
      ...completedCommand(state.input),
      tenantId: commandActor.userId,
    });
  await compose(page);
  await save(page);
  await expect(page.getByText(/original request is retained/i)).toBeVisible();
  await expect(page.getByText("Activity saved.", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Save activity and follow-up" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Resume follow-up" }),
  ).toHaveCount(0);
  expect(state.calls).toHaveLength(1);
});
test("stale resume discards its receipt and requires another read; a hidden task stays unavailable", async ({
  page,
}) => {
  const { state } = await installCommands(page);
  await compose(page);
  await save(page);
  await expect(
    page.getByText("Activity saved.", { exact: true }),
  ).toBeVisible();
  state.receipt = { ...commandReceipt(state.input), version: 7 };
  await page.getByRole("button", { name: "Read saved command" }).click();
  await expect(
    page.getByRole("button", { name: "Resume follow-up" }),
  ).toBeEnabled();
  state.respond = (route) => json(route, { message: "Version changed" }, 409);
  await page.getByRole("button", { name: "Resume follow-up" }).click();
  await expect(page.getByText("Activity saved.", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Resume follow-up" }),
  ).toHaveCount(0);
  const receipt = commandReceipt(state.input);
  state.respond = (route) =>
    json(route, {
      ...receipt,
      version: 11,
      reason: "planner_receipt_unavailable",
      followUp: { ...receipt.followUp, state: "unavailable", taskId: null },
    });
  await page.getByRole("button", { name: "Read saved command" }).click();
  await expect(
    page.getByText(/follow-up task is currently unavailable/i),
  ).toBeVisible();
  expect(
    state.calls
      .filter((call) => call.method === "POST")
      .map((call) => call.body),
  ).toEqual([state.input, { expectedVersion: 7 }]);
});
