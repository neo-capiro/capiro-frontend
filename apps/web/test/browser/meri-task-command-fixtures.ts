import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { client, navigate } from "./next-modules-fixtures";

export { navigate };
export function taskWire(name: string) {
  return JSON.parse(
    readFileSync(
      new URL(
        `../../tests/fixtures/meri-task-commands/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
}
export const context = taskWire("context");
export const taskClient = {
  ...client,
  id: context.selectedClientId,
  name: "Synthetic task-update client",
};
export const otherTaskClient = {
  ...client,
  id: "00000000-0000-4000-8000-000000000098",
  name: "Synthetic other task client",
};
export const taskUrl = (id = taskClient.id) =>
  `/meri/task-updates?clientId=${id}`;
export async function taskHostFixture(page: Page) {
  await page.clock.install({ time: new Date(context.syntheticNow) });
  await page.clock.setFixedTime(new Date(context.syntheticNow));
  await onlyLocalRequests(page);
  const calls: { route: string; body: unknown; authorization?: string }[] = [];
  const errors: string[] = [],
    unexpected: string[] = [],
    remote: string[] = [];
  let execute = "pending";
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      remote.push(request.url());
  });
  await page.route("**/api/**", (route) => {
    unexpected.push(route.request().url());
    return route.fulfill({ status: 501, json: { synthetic: "unconfigured" } });
  });
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [taskClient, otherTaskClient],
  });
  await page.route("**/api/backend/core/me", (route) =>
    route.fulfill({ json: testIdentity }),
  );
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: route.request().url().endsWith(otherTaskClient.id)
        ? otherTaskClient
        : taskClient,
    }),
  );
  // The ordinary Home selector reads the authorized roster before navigation.
  await page.route("**/api/backend/core/clients", (route) => {
    expect(route.request().method()).toBe("GET");
    return route.fulfill({ json: [taskClient, otherTaskClient] });
  });
  await page.route("**/api/action-followthrough/session", async (route) => {
    const body = route.request().postDataJSON() as { clientId: string },
      headers = await route.request().allHeaders();
    calls.push({
      route: "session",
      body,
      authorization: headers.authorization,
    });
    await route.fulfill({
      json: {
        credential: `action_session_${"a".repeat(43)}`,
        expiresAtMs: context.syntheticNow + 60_000,
        context: {
          tenantId: context.tenantId,
          actorId: context.actorId,
          conversationId: context.conversationId,
          runId: context.runId,
          selectedClientId: body.clientId,
        },
      },
    });
  });
  await page.route("**/api/task-commands/*", async (route) => {
    const request = route.request(),
      operation = new URL(request.url()).pathname.split("/").pop()!,
      headers = await request.allHeaders();
    calls.push({
      route: operation,
      body: request.postDataJSON(),
      authorization: headers.authorization,
    });
    const wire = taskWire(operation === "prepare" ? "prepare" : execute);
    await route.fulfill({ status: wire.httpStatus, json: wire.response });
  });
  return {
    calls,
    errors,
    unexpected,
    remote,
    execute: (name: string) => {
      execute = name;
    },
    operations: (name: string) => calls.filter((call) => call.route === name),
  };
}
export async function prepareTaskUpdate(page: Page) {
  await page
    .getByRole("button", { name: "Connect task-update service", exact: true })
    .click();
  await page
    .getByLabel("Task ID", { exact: true })
    .fill("00000000-0000-4000-8000-000000000021");
  await page.getByLabel("New task title", { exact: true }).fill("Updated");
  await page
    .getByRole("combobox", { name: "New task status", exact: true })
    .selectOption("todo");
  const prepare = page.getByRole("button", {
    name: "Prepare approval proposal",
    exact: true,
  });
  await prepare.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", {
      name: "Immutable task update proposal",
      exact: true,
    }),
  ).toBeVisible();
}
