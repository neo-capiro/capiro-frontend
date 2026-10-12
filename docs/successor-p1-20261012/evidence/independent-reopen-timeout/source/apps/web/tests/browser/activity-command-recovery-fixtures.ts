import { expect, type Page } from "@playwright/test";
import { json } from "./fixtures";
import { commandAssignee } from "../activity-command-fixtures";
import { completedCommand, installCommands } from "./activity-command-fixtures";

export async function retainedCommand(page: Page) {
  const fixture = await installCommands(page);
  const pairs = new Map<string, ReturnType<typeof completedCommand>>();
  let disclose = false;
  let loseResponse = true;
  fixture.state.respond = async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const input = request.postDataJSON();
      if (!pairs.has(input.requestId))
        pairs.set(input.requestId, completedCommand(input));
      return json(
        route,
        loseResponse
          ? { message: "Synthetic loss after commit" }
          : pairs.get(input.requestId),
        loseResponse ? 503 : 200,
      );
    }
    const id = new URL(request.url()).pathname.split("/").pop()!;
    return json(
      route,
      disclose ? pairs.get(id) : { message: "Not found" },
      disclose ? 200 : 404,
    );
  };
  await page.goto("/activity-command.html");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Private restart activity");
  await page
    .getByLabel("Details", { exact: true })
    .fill("Private restart details");
  await page.getByRole("checkbox", { name: "Add generic follow-up" }).check();
  await page
    .getByRole("combobox", { name: "Follow-up assignee", exact: true })
    .selectOption(commandAssignee.id);
  await page
    .getByRole("button", { name: "Save activity and follow-up", exact: true })
    .click();
  await expect.poll(() => pairs.size).toBe(1);
  await expect(
    page.getByRole("button", { name: "Read saved command", exact: true }),
  ).toBeEnabled();
  const original = structuredClone(fixture.state.input!);
  return {
    ...fixture,
    original,
    pairs,
    posts: () => fixture.state.calls.filter((call) => call.method === "POST"),
    allowReceipt: () => {
      disclose = true;
      loseResponse = false;
    },
    allowReplay: () => {
      loseResponse = false;
    },
  };
}
export async function expectRetained(page: Page, requestId: string) {
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Private restart activity",
  );
  await expect(page.getByLabel("Details", { exact: true })).toHaveValue(
    "Private restart details",
  );
  await expect(page.getByText(requestId, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Read saved command", exact: true }),
  ).toBeEnabled();
}
export async function expectHold(page: Page) {
  await expect(
    page.getByRole("button", {
      name: "Retry saved-command recovery",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^Save activity/ }),
  ).toHaveCount(0);
}
