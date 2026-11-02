import { expect, test, type Page } from "@playwright/test";
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
import {
  installCurrentRun,
  installHistory,
  installReservation,
  requestId,
  selectedUrl,
} from "./meri-history-fixtures";
import { testIdentity } from "./fixtures";

/**
 * 2 Nov preview: after a reload the first Enter in a finished thread did nothing, and a later Enter cleared the box
 * with nothing sent. The tab still held the capture of the message this run already answered (its acknowledgement
 * was lost with the page), so every send of the run returned without sending while the composer's form reset
 * emptied the controlled box.
 */
const scopeKey = JSON.stringify([
  testIdentity.tenant.id,
  testIdentity.user.id,
  clientId,
  binding.conversationId,
]);
const runKey = JSON.stringify([
  context.tenantId,
  context.actorId,
  context.selectedClientId,
  context.conversationId,
  context.runId,
]);

/** The draft record a lost acknowledgement leaves: this run's own message still captured. */
async function seedCapture(page: Page, capturedRequestId: string, draft = "") {
  const key = `capiro-meri-chat-v1:${JSON.stringify([scopeKey, "draft", ""])}`;
  const value = {
    draft,
    revision: 1,
    pending: {
      run: runKey,
      request: JSON.stringify({
        prompt: "First question",
        requestId: capturedRequestId,
      }),
      draft: "First question",
      revision: 1,
      continuation: false,
    },
    reserved: null,
    selection: {},
  };
  await page.addInitScript(
    ({ key, record }) => {
      if (sessionStorage.getItem("synthetic-capture-seeded")) return;
      sessionStorage.setItem("synthetic-capture-seeded", "1");
      // The same signed-in tab: a changed identity would retire every record before the page reads it.
      sessionStorage.setItem(
        "capiro-meri-tab-identity-v1",
        JSON.stringify(["test-user", "test-session", "test-org"]),
      );
      sessionStorage.setItem(key, record);
    },
    {
      key,
      record: JSON.stringify({
        version: 1,
        scope: scopeKey,
        key,
        at: Date.now(),
        value,
      }),
    },
  );
}

async function setup(page: Page) {
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
  return { reservations: () => reservations };
}

test("after a reload, the answered run's leftover capture no longer swallows the first Enter", async ({
  page,
}) => {
  await seedCapture(page, requestId);
  const fixture = await setup(page);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  await expect.poll(fixture.reservations).toBe(1);
  await expect(
    page
      .getByRole("article", { name: "Current turn" })
      .getByText(/Second message/),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("");
});

test("a leftover capture this run never admitted is released: the text stays the person's and Enter sends", async ({
  page,
}) => {
  await seedCapture(page, "a0000000-0000-4000-8000-0000000000ff", "Kept text");
  const fixture = await setup(page);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  // The capture's text was never sent to this run, so it is the person's draft again.
  await expect(composer(page)).toHaveValue("Kept text");
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  await expect.poll(fixture.reservations).toBe(1);
});
