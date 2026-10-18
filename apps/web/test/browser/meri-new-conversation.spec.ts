import { expect, test } from "@playwright/test";
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
const third = "30000000-0000-4000-8000-000000000015";

async function enableFirstChat(page: import("@playwright/test").Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-first-chat-enabled", "true"),
  );
}

test("synthetic: desktop and phone New conversation each bootstrap a fresh client-bound intent", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [
    contextFor(binding),
    contextFor({ ...binding, conversationId: second }),
    contextFor({ ...binding, conversationId: third }),
  ]);
  await enableFirstChat(page);
  const requests: Array<{ requestId: string; clientId: string }> = [];
  const conversations = [first, second, third];
  await page.route("**/api/capiro/meri.conversation.bootstrap", (route) => {
    const { body } = route.request().postDataJSON() as {
      body: { schemaVersion: 1; requestId: string; clientId: string };
    };
    requests.push(body);
    return reply(route, {
      schemaVersion: 1,
      requestId: body.requestId,
      conversationId: conversations[requests.length - 1],
      tenantId: testIdentity.tenant.id,
      actorId: testIdentity.user.id,
      clientId: body.clientId,
    });
  });

  await page.goto(`/meri?clientId=${clientId}`);
  await expect.poll(() => fixture.hints.length).toBe(1);
  const desktop = page.getByRole("button", {
    name: "New conversation",
    exact: true,
  });
  await expect(desktop).toBeEnabled();
  await desktop.click();
  await expect.poll(() => fixture.hints.length).toBe(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Workspace menu" }).click();
  const phone = page
    .getByRole("navigation", { name: "Meri sections" })
    .getByRole("button", { name: "New conversation", exact: true });
  await expect(phone).toBeEnabled();
  await phone.click();
  await expect.poll(() => fixture.hints.length).toBe(3);

  expect(requests.map((request) => request.clientId)).toEqual([
    clientId,
    clientId,
    clientId,
  ]);
  expect(new Set(requests.map((request) => request.requestId)).size).toBe(3);
  expect(fixture.hints).toEqual([
    { clientId, conversationId: first },
    { clientId, conversationId: second },
    { clientId, conversationId: third },
  ]);
  expect(fixture.unexpected).toEqual([]);
});

test("synthetic: New conversation leaves a selected history link and does not rotate an unknown bootstrap", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [
    contextFor(binding),
    contextFor({ ...binding, conversationId: second }),
  ]);
  await enableFirstChat(page);
  let requests = 0;
  await page.route("**/api/capiro/meri.conversation.bootstrap", (route) => {
    requests++;
    const { body } = route.request().postDataJSON() as {
      body: { requestId: string; clientId: string };
    };
    return reply(route, {
      schemaVersion: 1,
      requestId: body.requestId,
      conversationId: second,
      tenantId: testIdentity.tenant.id,
      actorId: testIdentity.user.id,
      clientId: body.clientId,
    });
  });
  await page.goto(`/meri?clientId=${clientId}&conversationId=${first}`);
  await expect.poll(() => fixture.hints.length).toBe(1);
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await expect.poll(() => fixture.hints.length).toBe(2);
  await expect(page).toHaveURL(new RegExp(`/meri\\?clientId=${clientId}$`));
  expect(requests).toBe(1);
  expect(fixture.hints[1]).toEqual({ clientId, conversationId: second });
  expect(fixture.unexpected).toEqual([]);
});

test("synthetic: an unknown Core bootstrap outcome keeps its request ID and refuses New conversation", async ({
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
  await expect(
    page.getByRole("heading", { name: "Conversation connection unavailable" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "previous conversation request has an unknown outcome",
    }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
});
