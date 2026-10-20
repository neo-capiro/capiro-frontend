import { expect, test } from "@playwright/test";
import { testIdentity } from "./fixtures";
import {
  binding,
  clientId,
  composer,
  context,
  event,
  history,
  reply,
  setupConversation,
  status,
} from "./meri-conversation-fixtures";

test("a transient stored-session failure keeps the Core conversation, draft and exact retry", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [context]);
  const sessionHints: object[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/action-followthrough/session")
      sessionHints.push(request.postDataJSON());
  });
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-first-chat-enabled", "true"),
  );
  const bootstrap: Array<{
    schemaVersion: 1;
    requestId: string;
    clientId: string;
  }> = [];
  await page.route("**/api/capiro/meri.conversation.bootstrap", (route) => {
    const { body } = route.request().postDataJSON() as {
      body: { schemaVersion: 1; requestId: string; clientId: string };
    };
    bootstrap.push(body);
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
  expect(bootstrap).toHaveLength(1);
  const originalRequestId = bootstrap[0]!.requestId;

  // Issuance keeps failing until the test clears it, outlasting the automatic retries (after 1 s and 3 s).
  let sessionsFail = true;
  await page.route("**/api/action-followthrough/session", (route) => {
    if (!sessionsFail) return route.fallback();
    return reply(route, { message: "Temporary service failure" }, 503);
  });
  await page.reload();
  const retry = page.getByRole("button", { name: "Try again", exact: true });
  await expect(retry).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("heading", { name: "Conversation connection unavailable" }),
  ).toBeVisible();
  await composer(page).fill("Keep this unsent draft");
  await expect(composer(page)).toHaveValue("Keep this unsent draft");
  expect(bootstrap).toEqual([
    { schemaVersion: 1, requestId: originalRequestId, clientId },
    { schemaVersion: 1, requestId: originalRequestId, clientId },
  ]);

  const failedIssuances = sessionHints.length - 1;
  expect(failedIssuances).toBeGreaterThan(1);
  sessionsFail = false;
  await retry.click();
  await expect.poll(() => sessionHints.length).toBe(failedIssuances + 2);
  await expect(page.getByText("Saved answer", { exact: true })).toBeVisible();
  await expect(composer(page)).toHaveValue("Keep this unsent draft");
  expect(bootstrap).toHaveLength(2);
  expect(sessionHints).toEqual(
    Array.from({ length: failedIssuances + 2 }, () => ({
      clientId,
      conversationId: binding.conversationId,
    })),
  );
  expect(fixture.unexpected).toEqual([]);
});
