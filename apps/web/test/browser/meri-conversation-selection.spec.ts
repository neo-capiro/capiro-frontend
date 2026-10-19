import { test, expect } from "@playwright/test";
import {
  binding,
  clientId,
  history,
  reply,
  setupConversation,
  status,
} from "./meri-conversation-fixtures";

test("synthetic: selected conversation reload keeps the exact selector and admitted transcript", async ({
  page,
}) => {
  const fixture = await setupConversation(page);
  await page.route("**/api/conversations/history", (route) =>
    reply(route, history([status(1, "completed")], { state: "completed" })),
  );
  await page.goto(
    `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`,
  );
  await expect(
    page.getByText("You: Previously stored request", { exact: true }),
  ).toBeVisible();
  expect(fixture.hints).toEqual([
    { clientId, conversationId: binding.conversationId },
  ]);
  await page.reload();
  await expect(
    page.getByText("You: Previously stored request", { exact: true }),
  ).toBeVisible();
  expect(fixture.hints).toEqual([
    { clientId, conversationId: binding.conversationId },
    { clientId, conversationId: binding.conversationId },
  ]);
  expect(fixture.unexpected).toEqual([]);
});

test("synthetic: malformed conversation link never falls back to another conversation", async ({
  page,
}) => {
  const fixture = await setupConversation(page);
  await page.goto(
    `/meri?clientId=${clientId}&conversationId=not-a-conversation`,
  );
  await expect(
    page.getByRole("heading", { name: "Conversation selection unavailable" }),
  ).toBeVisible();
  expect(fixture.hints).toEqual([]);
  await expect(page.getByRole("article", { name: "Current turn" })).toHaveCount(
    0,
  );
  expect(fixture.unexpected).toEqual([]);
});

test("synthetic: a mismatched selected-conversation session cannot dispatch history", async ({
  page,
}) => {
  const fixture = await setupConversation(page);
  let reads = 0;
  await page.route("**/api/conversations/history", (route) => {
    reads++;
    return reply(route, history());
  });
  await page.goto(
    `/meri?clientId=${clientId}&conversationId=30000000-0000-4000-8000-000000000099`,
  );
  await expect(
    page.getByRole("heading", { name: "Conversation connection unavailable" }),
  ).toBeVisible();
  expect(fixture.hints).toEqual([
    { clientId, conversationId: "30000000-0000-4000-8000-000000000099" },
  ]);
  expect(reads).toBe(0);
  expect(fixture.unexpected).toEqual([]);
});
