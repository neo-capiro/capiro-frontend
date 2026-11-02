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

/** Holds every session issuance until released; the saved transcript is not held. */
async function holdSessions(page: Page) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/action-followthrough/session", async (route) => {
    await held;
    return route.fallback();
  });
  return () => release();
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
