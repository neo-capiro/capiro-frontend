import { expect, test } from "@playwright/test";
import { clientId, json, objective, objectiveId } from "./fixtures";
import { installRemoval, savedActivity } from "./overview-removal-fixtures";
import { completedCommand, installCommands } from "./activity-command-fixtures";
import { commandReceipt } from "../activity-command-fixtures";

const revisionId = "90000000-0000-4000-8000-000000000002";
const objectiveLink = {
  objectiveId,
  objectiveVersion: objective.version,
  objectiveRevisionId: revisionId,
  availability: "current",
};

test("direct Quick Log sends selected current Objective and verifies rich receipt", async ({
  page,
}, info) => {
  const { state, unexpected } = await installRemoval(page);
  const posts: Record<string, unknown>[] = [];
  await page.route(
    `**/api/backend/core/clients/${clientId}/objectives`,
    (route) => json(route, [objective]),
  );
  await page.route(
    `**/api/backend/core/clients/${clientId}/activity`,
    (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON();
      posts.push(body);
      const saved = {
        ...savedActivity,
        ...body,
        direction: body.direction ?? null,
        counterparty: body.counterparty ?? null,
        objective: objectiveLink,
      };
      state.activities.push({ ...saved, origin: "recorded" });
      return json(route, saved);
    },
  );
  await page.goto(`/portfolio/${clientId}?log=1`);
  const dialog = page.getByRole("dialog", { name: "Quick log", exact: true });
  await dialog.getByLabel("Activity type").selectOption("commitment");
  await dialog.getByLabel("Title", { exact: true }).fill("Synthetic promise");
  await dialog
    .getByLabel("Details", { exact: true })
    .fill("Send revised briefing");
  await dialog.getByLabel("Who owes it").selectOption("we_owe");
  await dialog.getByLabel("Counterparty").fill("Client counsel");
  await dialog
    .getByLabel("Objective", { exact: true })
    .selectOption(objectiveId);
  await dialog.getByLabel("Due date").fill("2026-10-25");
  await page.screenshot({ path: info.outputPath("direct-rich-1440x1040.png") });
  await dialog
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Quick log result" }),
  ).toContainText("Logged to Test Aerospace");
  await expect(page.getByText("We owe · Client counsel")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open linked objective" }),
  ).toHaveAttribute(
    "href",
    `/portfolio/${clientId}/objectives?objective=${objectiveId}`,
  );
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({
    kind: "commitment",
    direction: "we_owe",
    counterparty: "Client counsel",
    objectiveId,
    objectiveVersion: 1,
  });
  expect(unexpected).toEqual([]);
});

test("compound commitment keeps rich activity and generic Planner result separate", async ({
  page,
}, info) => {
  const { state, unexpected } = await installCommands(page);
  await page.route(
    `**/api/backend/core/clients/${clientId}/objectives`,
    (route) => json(route, [objective]),
  );
  await page.route(
    `**/api/backend/core/clients/${clientId}/activity?limit=500`,
    (route) => {
      const input = state.input!.activity;
      const receipt = commandReceipt(state.input);
      return json(route, [
        {
          id: receipt.activity.id,
          kind: input.kind,
          title: input.title,
          body: input.body,
          personId: input.personId ?? null,
          occurredAt: input.occurredAt,
          dueAt: input.dueAt,
          sourceType: "activity_command",
          sourceId: receipt.commandId,
          origin: "recorded",
          pinned: false,
          settledAt: null,
          direction: input.direction,
          counterparty: input.counterparty,
          objective: objectiveLink,
        },
      ]);
    },
  );
  state.respond = (route) => json(route, completedCommand(state.input));
  await page.goto("/activity-command.html");
  const dialog = page.getByRole("dialog", { name: "Quick log", exact: true });
  await dialog.getByLabel("Activity type").selectOption("commitment");
  await dialog.getByLabel("Title", { exact: true }).fill("Synthetic promise");
  await dialog
    .getByLabel("Details", { exact: true })
    .fill("Send revised briefing");
  await dialog.getByLabel("Who owes it").selectOption("we_owe");
  await dialog.getByLabel("Counterparty").fill("Client counsel");
  await dialog
    .getByLabel("Objective", { exact: true })
    .selectOption(objectiveId);
  await dialog.getByLabel("When").fill("2025-10-17T14:00");
  await dialog.getByLabel("Due date").fill("2026-10-25");
  await dialog.getByRole("checkbox", { name: "Add generic follow-up" }).check();
  await dialog
    .getByRole("combobox", { name: "Follow-up assignee", exact: true })
    .selectOption("a1000000-0000-4000-8000-000000000007");
  await page.screenshot({
    path: info.outputPath("compound-rich-1440x1040.png"),
  });
  await dialog.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.screenshot({
    path: info.outputPath("compound-rich-bottom-1440x1040.png"),
  });
  await dialog
    .getByRole("button", { name: "Save activity and follow-up", exact: true })
    .click();
  await expect(
    page.getByText("Activity saved.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/follow-up created/i)).toBeVisible();
  expect(state.input?.activity).toMatchObject({
    kind: "commitment",
    direction: "we_owe",
    counterparty: "Client counsel",
    objectiveId,
    objectiveVersion: 1,
  });
  expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  await page.screenshot({
    path: info.outputPath("compound-result-1440x1040.png"),
  });
  await page.reload();
  await expect(dialog.getByLabel("When", { exact: true })).toHaveValue(
    "2025-10-17T14:00",
  );
  await expect(dialog.getByLabel("Due date", { exact: true })).toHaveValue(
    "2026-10-25",
  );
  await expect(dialog.getByLabel("Who owes it")).toHaveValue("we_owe");
  await expect(dialog.getByLabel("Counterparty")).toHaveValue("Client counsel");
  await expect(dialog.getByLabel("Objective", { exact: true })).toHaveValue(
    objectiveId,
  );
  await expect(dialog.getByLabel("When", { exact: true })).toBeDisabled();
  expect(unexpected).toEqual([]);
});

test("a command with missing canonical details retains its key and does not claim completion", async ({
  page,
}) => {
  const { state, unexpected } = await installCommands(page);
  await page.route(
    `**/api/backend/core/clients/${clientId}/objectives`,
    (route) => json(route, [objective]),
  );
  await page.route(
    `**/api/backend/core/clients/${clientId}/activity?limit=500`,
    (route) => json(route, []),
  );
  state.respond = (route) => json(route, completedCommand(state.input));
  await page.goto("/activity-command.html");
  const dialog = page.getByRole("dialog", { name: "Quick log", exact: true });
  await dialog.getByLabel("Activity type").selectOption("commitment");
  await dialog.getByLabel("Title", { exact: true }).fill("Synthetic promise");
  await dialog.getByLabel("Who owes it").selectOption("we_owe");
  await dialog.getByRole("checkbox", { name: "Add generic follow-up" }).check();
  await dialog
    .getByRole("combobox", { name: "Follow-up assignee", exact: true })
    .selectOption("a1000000-0000-4000-8000-000000000007");
  await dialog
    .getByRole("button", { name: "Save activity and follow-up", exact: true })
    .click();
  await expect(dialog).toContainText(
    "The command activity details are not confirmed in the client timeline.",
  );
  await expect(page.getByText("Activity saved.", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    dialog.getByRole("button", {
      name: "Save activity and follow-up",
      exact: true,
    }),
  ).toBeDisabled();
  expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(unexpected).toEqual([]);
});
