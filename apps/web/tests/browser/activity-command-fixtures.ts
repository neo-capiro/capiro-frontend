import type { Page, Route } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import {
  commandActor,
  commandAssignee,
  commandClientId,
  commandReceipt,
} from "../activity-command-fixtures";
import type {
  ActivityCommandInput,
  ActivityCommandReceipt,
} from "../../src/features/portfolio/client-profile/quick-log/command-contracts";

export async function installCommands(page: Page) {
  const unexpected = await installFixtures(page);
  const identity = {
    user: { id: commandActor.userId, email: "actor@example.test" },
    tenant: { id: commandActor.tenantId, name: "Synthetic tenant" },
    role: "user_admin",
  };
  const state = {
    identity,
    input: undefined as ActivityCommandInput | undefined,
    receipt: undefined as ActivityCommandReceipt | undefined,
    calls: [] as { path: string; method: string; body: unknown }[],
    optionsReads: 0,
    holdOptions: async () => {},
    respond: async (route: Route) =>
      json(route, state.receipt ?? commandReceipt(state.input)),
  };
  await page.route("**/api/backend/core/me", (route) =>
    json(route, state.identity),
  );
  await page.route(
    "**/api/backend/core/client-account-owners/options",
    async (route) => {
      state.optionsReads++;
      await state.holdOptions();
      return json(route, [commandAssignee]);
    },
  );
  await page.route(
    `**/api/backend/core/clients/${commandClientId}/activity-commands**`,
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      const body = route.request().postData()
        ? route.request().postDataJSON()
        : null;
      state.calls.push({ path, method, body });
      if (method === "POST" && path.endsWith("/activity-commands"))
        state.input = body;
      await state.respond(route);
    },
  );
  return { state, unexpected };
}
export async function commandEvent(page: Page, name: string, detail?: unknown) {
  await page.evaluate(
    ({ name, detail }) =>
      window.dispatchEvent(new CustomEvent(`command-test-${name}`, { detail })),
    { name, detail },
  );
}
export function completedCommand(
  input?: ActivityCommandInput,
  version = 12,
): ActivityCommandReceipt {
  const value = commandReceipt(input);
  return {
    ...value,
    version,
    status: "completed",
    reason: null,
    followUp: {
      ...value.followUp!,
      state: "completed",
      taskId: "synthetic-planner-task",
    },
  };
}
