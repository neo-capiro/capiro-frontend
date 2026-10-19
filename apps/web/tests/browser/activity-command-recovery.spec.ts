import { test, expect } from "@playwright/test";
import { commandActor, commandAssignee } from "../activity-command-fixtures";
import { commandEvent } from "./activity-command-fixtures";
import {
  expectHold,
  expectRetained,
  retainedCommand,
} from "./activity-command-recovery-fixtures";
import { json } from "./fixtures";

test("reload restores the original body only after fresh Core authority; 404 permits only deliberate exact-key replay", async ({
  page,
}) => {
  const saved = await retainedCommand(page);
  let reads = 0;
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/backend/core/me", async (route) => {
    reads++;
    await hold;
    return json(route, saved.state.identity);
  });
  await page.reload();
  await expect.poll(() => reads).toBeGreaterThan(0);
  await expect(page.getByLabel("Title", { exact: true })).not.toHaveValue(
    "Private restart activity",
  );
  expect(saved.posts()).toHaveLength(1);
  release();
  await expectRetained(page, saved.original.requestId);
  expect(reads).toBeGreaterThanOrEqual(2);
  expect(saved.state.calls).toHaveLength(1);
  await page
    .getByRole("button", { name: "Read saved command", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recover original save", exact: true }),
  ).toBeEnabled();
  expect(saved.posts()).toHaveLength(1);
  saved.allowReplay();
  await page
    .getByRole("button", { name: "Recover original save", exact: true })
    .click();
  await expect(
    page.getByText(/follow-up created.*synthetic-planner-task/i),
  ).toBeVisible();
  expect(saved.posts().map((call) => call.body)).toEqual([
    saved.original,
    saved.original,
  ]);
  expect(saved.pairs.size).toBe(1);
  expect(saved.unexpected).toEqual([]);
});

for (const replacement of ["actor", "tenant"] as const) {
  test(`a replacement Core ${replacement} never sees or dispatches the retained body after reload`, async ({
    page,
  }) => {
    const saved = await retainedCommand(page);
    saved.state.identity =
      replacement === "actor"
        ? {
            ...saved.state.identity,
            user: { ...saved.state.identity.user, id: commandAssignee.id },
          }
        : {
            ...saved.state.identity,
            tenant: { ...saved.state.identity.tenant, id: commandAssignee.id },
          };
    await page.reload();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Details", { exact: true })).toHaveValue("");
    await expect(
      page.getByText(saved.original.requestId, { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: /Read saved command|Recover original save/,
      }),
    ).toHaveCount(0);
    expect(saved.posts()).toHaveLength(1);
    expect(saved.pairs.size).toBe(1);
    expect(saved.unexpected).toEqual([]);
  });
}

test("expiry hides the draft immediately; restoring the same current actor recovers the original without posting", async ({
  page,
}) => {
  const saved = await retainedCommand(page);
  await commandEvent(page, "identity", {
    user: { id: commandActor.userId, email: null },
    tenant: null,
    role: null,
  });
  await expect(page.getByLabel("Title", { exact: true })).not.toHaveValue(
    "Private restart activity",
  );
  await expect(
    page.getByText(saved.original.requestId, { exact: true }),
  ).toHaveCount(0);
  await commandEvent(page, "identity", saved.state.identity);
  await expectRetained(page, saved.original.requestId);
  expect(saved.posts()).toHaveLength(1);
});

test("current client authorization refusal holds recovery without decrypting or posting; explicit retry rereads authority", async ({
  page,
}) => {
  const saved = await retainedCommand(page);
  const path =
    "**/api/backend/core/clients/10000000-0000-4000-8000-000000000001";
  await page.route(path, (route) =>
    json(route, { message: "Synthetic current client revoked" }, 403),
  );
  await page.reload();
  await expectHold(page);
  await expect(
    page.getByText(saved.original.requestId, { exact: true }),
  ).toHaveCount(0);
  expect(saved.posts()).toHaveLength(1);
  await page.unroute(path);
  await page
    .getByRole("button", { name: "Retry saved-command recovery", exact: true })
    .click();
  await expectRetained(page, saved.original.requestId);
  expect(saved.posts()).toHaveLength(1);
});

test("explicit acknowledgement erases the sensitive journal payload and permits the next intent after reload", async ({
  page,
}) => {
  const saved = await retainedCommand(page);
  saved.allowReceipt();
  await page
    .getByRole("button", { name: "Read saved command", exact: true })
    .click();
  await expect(page.getByText(/follow-up created/i)).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("Quick log view closed.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Read saved command", exact: true }),
  ).toHaveCount(0);
  expect(saved.posts()).toHaveLength(1);
  expect(saved.unexpected).toEqual([]);
});

test("closing the document and opening another tab recovers the journal without an automatic command call", async ({
  page,
  context,
}) => {
  const saved = await retainedCommand(page);
  saved.allowReceipt();
  const other = await context.newPage();
  const { installCommands } = await import("./activity-command-fixtures");
  const next = await installCommands(other);
  next.state.respond = saved.state.respond;
  await page.close();
  await other.goto("/activity-command.html");
  await expectRetained(other, saved.original.requestId);
  expect(next.state.calls).toEqual([]);
  await other
    .getByRole("button", { name: "Read saved command", exact: true })
    .click();
  await expect(other.getByText(/follow-up created/i)).toBeVisible();
  expect(next.state.calls.map((call) => call.method)).toEqual(["GET"]);
  expect(saved.pairs.size).toBe(1);
  expect(next.unexpected).toEqual([]);
});
