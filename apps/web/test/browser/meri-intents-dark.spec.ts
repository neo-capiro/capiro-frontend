import { expect, test } from "@playwright/test";
import { testIdentity } from "./fixtures";
import {
  binding,
  clientId,
  context,
  event,
  history,
  reply,
  setupConversation,
  status,
} from "./meri-conversation-fixtures";

test("with approvals not enabled, a live conversation shows no approvals panel and never asks for intents", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [context]);
  const intents: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/conversations/intents")) intents.push(path);
  });
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-first-chat-enabled", "true"),
  );
  await page.route("**/api/capiro/meri.conversation.bootstrap", (route) => {
    const { body } = route.request().postDataJSON() as {
      body: { schemaVersion: 1; requestId: string; clientId: string };
    };
    return reply(route, {
      schemaVersion: 1,
      requestId: body.requestId,
      conversationId: binding.conversationId,
      tenantId: testIdentity.tenant.id,
      actorId: testIdentity.user.id,
      clientId: body.clientId,
    });
  });
  await page.route("**/api/conversations/history", (route) =>
    reply(
      route,
      history([event(1, "Saved answer"), status(2, "completed")], {
        state: "completed",
      }),
    ),
  );

  await page.goto(`/meri?clientId=${clientId}`);
  await expect(page.getByText("Saved answer", { exact: true })).toBeVisible();
  // The panel would list on mount and again on run-state changes; give any such request time to appear.
  await page.waitForTimeout(1_500);
  await expect(
    page.getByRole("heading", { name: "Actions for your approval" }),
  ).toHaveCount(0);
  await expect(page.getByText("Meri has not prepared any actions")).toHaveCount(
    0,
  );
  expect(intents).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});
