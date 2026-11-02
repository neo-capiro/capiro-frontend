import { expect, test, type Page } from "@playwright/test";
import { testIdentity } from "./fixtures";
import {
  binding,
  clientId,
  contextFor,
  reply,
  setupConversation,
} from "./meri-conversation-fixtures";

const first = binding.conversationId;
const second = "30000000-0000-4000-8000-000000000014";

async function enableFirstChat(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-first-chat-enabled", "true"),
  );
}

/** Core creates one conversation per request id and reopens it for the same id. */
async function bootstrap(page: Page, conversations: readonly string[]) {
  const requests: string[] = [];
  const byRequest = new Map<string, string>();
  await page.route("**/api/capiro/meri.conversation.bootstrap", (route) => {
    const { body } = route.request().postDataJSON() as {
      body: { schemaVersion: 1; requestId: string; clientId: string };
    };
    requests.push(body.requestId);
    if (!byRequest.has(body.requestId))
      byRequest.set(body.requestId, conversations[byRequest.size]!);
    return reply(route, {
      schemaVersion: 1,
      requestId: body.requestId,
      conversationId: byRequest.get(body.requestId),
      tenantId: testIdentity.tenant.id,
      actorId: testIdentity.user.id,
      clientId: body.clientId,
    });
  });
  return requests;
}

const newConversation = (page: Page) =>
  page.getByRole("button", { name: "New conversation", exact: true });

test("synthetic: desktop and phone New conversation reopen the still-empty client conversation", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [contextFor()]);
  await enableFirstChat(page);
  const requests = await bootstrap(page, [first, second]);

  await page.goto(`/meri?clientId=${clientId}`);
  await expect(page).toHaveURL(new RegExp(`conversationId=${first}$`));
  await expect.poll(() => fixture.hints.length).toBe(1);
  await expect(newConversation(page)).toBeEnabled();
  await newConversation(page).click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(page).toHaveURL(new RegExp(`conversationId=${first}$`));
  await expect.poll(() => fixture.hints.length).toBe(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Workspace menu" }).click();
  const phone = page
    .getByRole("navigation", { name: "Meri sections" })
    .getByRole("button", { name: "New conversation", exact: true });
  await expect(phone).toBeEnabled();
  await phone.click();
  await expect.poll(() => requests.length).toBe(3);
  await expect(page).toHaveURL(new RegExp(`conversationId=${first}$`));
  await expect.poll(() => fixture.hints.length).toBe(3);

  expect(new Set(requests).size).toBe(1);
  // A reopened conversation resumes with its run; the first opening has none yet.
  expect(fixture.hints[0]).toEqual({ clientId, conversationId: first });
  for (const hint of fixture.hints.slice(1))
    expect(hint).toMatchObject({ clientId, conversationId: first });
  expect(fixture.unexpected).toEqual([]);
});

test("synthetic: New conversation from a selected history link opens a new conversation", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [
    contextFor(binding),
    contextFor({ ...binding, conversationId: second }),
  ]);
  await enableFirstChat(page);
  const requests = await bootstrap(page, [second]);

  await page.goto(`/meri?clientId=${clientId}&conversationId=${first}`);
  await expect.poll(() => fixture.hints.length).toBe(1);
  expect(requests).toHaveLength(0);
  await newConversation(page).click();
  await expect.poll(() => fixture.hints.length).toBe(2);
  await expect(page).toHaveURL(
    new RegExp(`/meri\\?clientId=${clientId}&conversationId=${second}$`),
  );
  expect(requests).toHaveLength(1);
  expect(fixture.hints[1]).toEqual({ clientId, conversationId: second });
  expect(fixture.unexpected).toEqual([]);
});

test("synthetic: an unknown Core bootstrap outcome keeps its request ID through New conversation and retry", async ({
  page,
}) => {
  await setupConversation(page);
  await enableFirstChat(page);
  const requests: string[] = [];
  await page.route("**/api/capiro/meri.conversation.bootstrap", (route) => {
    const { body } = route.request().postDataJSON() as {
      body: { requestId: string };
    };
    requests.push(body.requestId);
    return reply(route, { message: "Service unavailable" }, 503);
  });

  await page.goto(`/meri?clientId=${clientId}`);
  const unavailable = page.getByRole("heading", {
    name: "Conversation connection unavailable",
  });
  await expect(unavailable).toBeVisible();
  await newConversation(page).click();
  await expect(unavailable).toBeVisible();
  expect(requests).toHaveLength(1);

  await page.getByRole("button", { name: "Retry conversation" }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(new Set(requests).size).toBe(1);
});
