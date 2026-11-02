import { expect, test, type Page } from "@playwright/test";
import {
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
  selectedUrl,
} from "./meri-history-fixtures";

/**
 * Acceptance 2 Nov (frontend 105697ad): after a reload the saved transcript shows before the conversation session is
 * issued. The first Enter typed in that window was refused as "Connecting to Meri." with the text left in the box, and
 * only a second Enter sent. One Enter now waits for the session and sends once, by itself.
 */
async function setup(page: Page) {
  await setupConversation(page, undefined, [context, contextFor(nextBinding)]);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await installReservation(page, native);
  let reservations = 0,
    submits = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/conversations/next-turn"))
      reservations += 1;
    if (request.url().endsWith("/api/conversations/submit")) submits += 1;
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
  return { reservations: () => reservations, submits: () => submits };
}

/** Holds every session issuance until released (or refused); the saved transcript is not held. */
async function holdSessions(page: Page) {
  let release!: (refuse?: boolean) => void;
  const held = new Promise<boolean>((resolve) => {
    release = (refuse = false) => resolve(refuse);
  });
  await page.route("**/api/action-followthrough/session", async (route) => {
    if (await held)
      return reply(route, { error: { code: "SESSION_REFUSED" } }, 403);
    return route.fallback();
  });
  return release;
}

test("the first Enter while the session is still connecting waits for it and sends once", async ({
  page,
}) => {
  const fixture = await setup(page);
  const release = await holdSessions(page);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  // Nothing is sent before the session exists, the text stays, and the person is told it will go.
  await expect(
    page.getByText(/Queued: sends when Meri connects/),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("Second message");
  expect(fixture.reservations()).toBe(0);

  release();
  await expect.poll(fixture.reservations).toBe(1);
  await expect(
    page
      .getByRole("article", { name: "Current turn" })
      .getByText(/Second message/),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("");
  // Exactly one message went out.
  await page.waitForTimeout(1_500);
  expect(fixture.reservations()).toBe(1);
  expect(fixture.submits()).toBe(1);
});

test("a message that waited for the session is handed to the conversation check's own queue and sent once", async ({
  page,
}) => {
  const fixture = await setup(page);
  const release = await holdSessions(page);
  // The saved transcript and its latest-run read are slow too: the session arrives while the conversation is
  // still being checked.
  let releaseCheck!: () => void;
  const check = new Promise<void>((resolve) => {
    releaseCheck = resolve;
  });
  await page.route("**/api/conversations/transcript", async (route) => {
    await check;
    return route.fallback();
  });
  await page.goto(selectedUrl);
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  await expect(
    page.getByText(/Queued: sends when Meri connects/),
  ).toBeVisible();
  release();
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Queued: sends when Meri finishes/),
  ).toBeVisible();
  expect(fixture.reservations()).toBe(0);
  releaseCheck();
  await expect.poll(fixture.reservations).toBe(1);
  await expect(composer(page)).toHaveValue("");
  await page.waitForTimeout(1_500);
  expect(fixture.reservations()).toBe(1);
  expect(fixture.submits()).toBe(1);
});

test("access refused while the message waits lets it go; nothing is sent", async ({
  page,
}) => {
  const fixture = await setup(page);
  const release = await holdSessions(page);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  await expect(
    page.getByText(/Queued: sends when Meri connects/),
  ).toBeVisible();
  release(true);
  await expect(page.getByText(/Queued: sends when/)).toHaveCount(0);
  await page.waitForTimeout(1_500);
  expect(fixture.reservations()).toBe(0);
  expect(fixture.submits()).toBe(0);
});

test("emptying the box while the message waits releases the wait; nothing is sent", async ({
  page,
}) => {
  const fixture = await setup(page);
  const release = await holdSessions(page);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  await expect(
    page.getByText(/Queued: sends when Meri connects/),
  ).toBeVisible();
  await composer(page).fill("");
  await expect(page.getByText(/Queued: sends when/)).toHaveCount(0);
  release();
  await page.waitForTimeout(2_000);
  expect(fixture.reservations()).toBe(0);
  expect(fixture.submits()).toBe(0);
});

test("a queued Enter can be cancelled while connecting; then nothing is sent", async ({
  page,
}) => {
  const fixture = await setup(page);
  const release = await holdSessions(page);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  await page.getByRole("button", { name: "Cancel" }).click();
  release();
  await expect(page.getByText(/Queued: sends when/)).toHaveCount(0);
  await page.waitForTimeout(1_500);
  expect(fixture.reservations()).toBe(0);
  await expect(composer(page)).toHaveValue("Second message");
});

test("a session that does not come within the wait lets the message go and says why; nothing is sent", async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await setup(page);
  const release = await holdSessions(page);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await composer(page).fill("Second message");
  await composer(page).press("Enter");
  await expect(
    page.getByText(/Queued: sends when Meri connects/),
  ).toBeVisible();
  await page.clock.fastForward(21_000);
  await expect(page.getByText(/Queued: sends when/)).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Connecting to Meri." }).first(),
  ).toBeVisible();
  release();
  await page.clock.fastForward(2_000);
  expect(fixture.reservations()).toBe(0);
  await expect(composer(page)).toHaveValue("Second message");
});
