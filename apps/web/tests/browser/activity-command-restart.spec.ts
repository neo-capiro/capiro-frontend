import { test, expect, type Page } from "@playwright/test";
import { json } from "./fixtures";
import { commandAssignee } from "../activity-command-fixtures";
import { completedCommand, installCommands } from "./activity-command-fixtures";

async function enter(page: Page) {
  await page
    .getByLabel("Title", { exact: true })
    .fill("Restart-sensitive activity");
  await page
    .getByLabel("Details", { exact: true })
    .fill("Private original body");
  await page.getByRole("checkbox", { name: "Add generic follow-up" }).check();
  await page
    .getByRole("combobox", { name: "Follow-up assignee", exact: true })
    .selectOption(commandAssignee.id);
}

test("a committed command with a lost response cannot create another activity/task pair after reload", async ({
  page,
}) => {
  const { state } = await installCommands(page);
  const persisted = new Map<string, ReturnType<typeof completedCommand>>();
  state.respond = async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const input = request.postDataJSON();
      if (!persisted.has(input.requestId))
        persisted.set(input.requestId, completedCommand(input));
      return json(
        route,
        {
          message: "Synthetic response loss after committed activity and task",
        },
        503,
      );
    }
    const requestId = new URL(request.url()).pathname.split("/").pop()!;
    return json(
      route,
      persisted.get(requestId) ?? { message: "Not found" },
      persisted.has(requestId) ? 200 : 404,
    );
  };
  await page.goto("/activity-command.html");
  await enter(page);
  await page
    .getByRole("button", { name: "Save activity and follow-up", exact: true })
    .click();
  await expect(page.getByText(/original request is retained/i)).toBeVisible();
  await expect.poll(() => persisted.size).toBe(1);
  await expect(
    page.getByRole("button", { name: "Read saved command", exact: true }),
  ).toBeEnabled();
  const original = structuredClone(state.input);
  await page.reload();
  await page
    .locator("button:not([disabled])")
    .filter({ hasText: /^(Read saved command|Save activity)$/ })
    .first()
    .waitFor();
  if (
    await page
      .getByRole("button", { name: "Read saved command", exact: true })
      .isVisible()
  ) {
    await page
      .getByRole("button", { name: "Read saved command", exact: true })
      .click();
    await expect(page.getByText(/follow-up created/i)).toBeVisible();
  } else {
    // Independent replay of the observed regression: the UI permits a fresh key.
    await enter(page);
    await page
      .getByRole("button", { name: "Save activity and follow-up", exact: true })
      .click();
    await expect
      .poll(() => state.calls.filter((call) => call.method === "POST").length)
      .toBe(2);
  }
  expect(
    persisted.size,
    "one durable activity/task pair across browser reload",
  ).toBe(1);
  expect(
    state.calls
      .filter((call) => call.method === "POST")
      .map((call) => call.body),
  ).toEqual([original]);
});
