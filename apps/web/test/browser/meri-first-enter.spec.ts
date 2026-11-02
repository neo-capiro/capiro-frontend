import { expect, test, type Page } from "@playwright/test";
import { testIdentity } from "./fixtures";
import {
  binding,
  clientId,
  composer,
  context,
  contextFor,
  nextBinding,
  reply,
  runFor,
  setupConversation,
} from "./meri-conversation-fixtures";
import { installInitialInput } from "./meri-initial-input-fixtures";
import {
  installCurrentRun,
  installHistory,
  installReservation,
  selectedUrl,
} from "./meri-history-fixtures";

/**
 * Acceptance X15: the first Enter in a freshly opened or reloaded thread used to be refused while
 * Meri was still checking the conversation, and the refusal cleared itself as soon as the check
 * finished, so the person saw their text still in the box and nothing else. One Enter now sends:
 * the message waits for the check and goes out once, by itself.
 */

/** Holds the first answer of a route until released; later calls pass straight through. */
async function holdFirst(page: Page, pattern: string) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let count = 0;
  await page.route(pattern, async (route) => {
    if (count++ === 0) await held;
    return route.fallback();
  });
  return release;
}

test("first Enter in a new thread sends once the conversation check completes", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [contextFor()]);
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-first-chat-enabled", "true"),
  );
  await page.route("**/api/capiro/meri.conversation.bootstrap", (route) => {
    const { body } = route.request().postDataJSON() as {
      body: { requestId: string; clientId: string };
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
  const native = await installInitialInput(page);
  // The new session's first read of the conversation is slow, as it is at a busy edge.
  const release = await holdFirst(page, "**/api/conversations/history");

  await page.goto(`/meri?clientId=${clientId}`);
  await expect(page).toHaveURL(
    new RegExp(`conversationId=${binding.conversationId}$`),
  );
  await composer(page).fill("First message");
  await composer(page).press("Enter");
  // Nothing is sent before the check answers, and the text is not lost.
  expect(native.calls.submit).toHaveLength(0);
  await expect(composer(page)).toHaveValue("First message");

  release();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
  expect(native.calls.submit).toHaveLength(1);
  await expect(composer(page)).toHaveValue("");
  expect(fixture.unexpected).toEqual([]);
});

test("first Enter in a reloaded thread sends once the latest-run check completes", async ({
  page,
}) => {
  await setupConversation(page, undefined, [context, contextFor(nextBinding)]);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await installReservation(page, native);
  let reservations = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/conversations/next-turn"))
      reservations += 1;
  });
  await page.route("**/api/conversations/submit", (route) => {
    const input = route.request().postDataJSON() as { requestId: string };
    return reply(route, {
      run: runFor("running", nextBinding),
      requestId: input.requestId,
      lastSequence: 0,
      replayed: false,
    });
  });
  // The saved transcript and its latest-run read are slow; the run's own history is not.
  const release = await holdFirst(page, "**/api/conversations/transcript");

  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  expect(reservations).toBe(0);
  await expect(composer(page)).toHaveValue("Second message");

  release();
  await expect.poll(() => reservations).toBe(1);
  await expect(
    page
      .getByRole("article", { name: "Current turn" })
      .getByText(/Second message/),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("");
});

test("a message waits on the conversation check only for a bounded time, then the check's refusal shows and nothing is sent", async ({
  page,
}) => {
  await page.clock.install();
  await setupConversation(page, undefined, [context, contextFor(nextBinding)]);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await installReservation(page, native);
  let reservations = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/conversations/next-turn"))
      reservations += 1;
  });
  // The latest-run read never answers within the wait.
  const release = await holdFirst(page, "**/api/conversations/transcript");

  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  await expect(page.getByText(/Queued: sends when Meri finishes/)).toBeVisible();

  await page.clock.fastForward(9_000);
  await expect(page.getByText(/Queued: sends when Meri finishes/)).toHaveCount(0);
  await expect(
    page.getByText(
      "Capiro is checking this conversation before you can send again.",
    ),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("Second message");
  expect(reservations).toBe(0);

  // The released message is the person's again: a late check does not send it on its own.
  release();
  await page.clock.fastForward(1_000);
  expect(reservations).toBe(0);
  await expect(composer(page)).toHaveValue("Second message");
});
