import { expect, test, type Page, type Route } from "@playwright/test";
import {
  binding,
  clientId,
  composer,
  context,
  contextFor,
  event,
  nextBinding,
  reply,
  runFor,
  sendButton,
  setupConversation,
  sse,
  status,
} from "./meri-conversation-fixtures";
import {
  acceptNext,
  installCurrentRun,
  installHistory,
  installReservation,
  nextRequestId,
  selectedUrl,
} from "./meri-history-fixtures";

/** Hold the public reservation boundary; the UI and request journals remain real. */
async function installReadinessFlow(page: Page) {
  const fixture = await setupConversation(
    page,
    undefined,
    [context, contextFor(nextBinding)],
    300_000,
  );
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await installReservation(page, native);
  const reservations: unknown[] = [];
  const pending: Route[] = [];
  const admissions: { requestId: string; prompt: string }[] = [];
  const submits: { requestId: string; prompt: string }[] = [];
  await page.route("**/api/conversations/next-turn", (route) => {
    reservations.push(route.request().postDataJSON());
    pending.push(route);
  });
  await page.route("**/api/conversations/input/admit", (route) => {
    admissions.push(route.request().postDataJSON());
    return route.fallback();
  });
  await page.route("**/api/conversations/submit", (route) => {
    const body = route.request().postDataJSON();
    submits.push(body);
    acceptNext(native, body.requestId, body.prompt);
    return reply(route, {
      run: runFor("completed", nextBinding),
      requestId: body.requestId,
      lastSequence: 2,
      replayed: false,
    });
  });
  await page.route("**/api/conversations/events", (route) =>
    sse(route, [
      event(1, "Second answer", nextBinding),
      status(2, "completed", nextBinding),
    ]),
  );
  return { fixture, reservations, pending, admissions, submits };
}

test("M1 synthetic Ready can be refused: 409 saves the immutable turn and only an explicit retry sends it", async ({
  page,
}) => {
  await page.clock.install();
  const flow = await installReadinessFlow(page);
  await page.goto(selectedUrl);
  const ready = page.getByRole("region", {
    name: "Next message status",
    exact: true,
  });
  await expect(
    ready.getByRole("heading", { name: "Ready", exact: true }),
  ).toBeVisible();
  await expect(ready.getByText("Complete", { exact: true })).toBeVisible();
  await expect(
    ready.getByText("You can send your next message.", { exact: true }),
  ).toBeVisible();
  await ready
    .getByRole("button", { name: "Write next message", exact: true })
    .click();
  await expect(composer(page)).toBeFocused();
  expect(flow.reservations).toEqual([]);
  expect(flow.admissions).toEqual([]);
  expect(flow.submits).toEqual([]);

  // A different UUID source before retry detects regeneration of the original ID.
  await page.evaluate((id) => {
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: () => id,
    });
  }, nextRequestId);
  await composer(page).fill("Original next question");
  await sendButton(page).dblclick();
  await expect.poll(() => flow.pending.length).toBe(1);
  await expect(ready).toHaveCount(0);
  await expect(composer(page)).toHaveValue("Original next question");
  expect(flow.admissions).toEqual([]);
  expect(flow.submits).toEqual([]);
  await reply(
    flow.pending[0]!,
    {
      error: {
        code: "CONVERSATION_TURN_CONFLICT",
        outcome: "NOT_DISPATCHED",
      },
    },
    409,
  );
  const finishing = page.getByRole("status").filter({
    hasText:
      "Meri is still finishing up. Your message is saved; try again in a moment.",
  });
  await expect(finishing.locator("p")).toHaveText(
    "Meri is still finishing up. Your message is saved; try again in a moment.",
  );
  const retry = page.getByRole("button", {
    name: "Retry same turn",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  await expect(ready).toHaveCount(0);
  await expect(composer(page)).toHaveValue("Original next question");
  await expect(sendButton(page)).toBeDisabled();
  // Two former 3-second retry intervals must not trigger any reservation or send.
  await page.clock.runFor(6_001);
  expect(flow.reservations).toHaveLength(1);
  expect(flow.admissions).toEqual([]);
  expect(flow.submits).toEqual([]);
  await expect(composer(page)).toHaveValue("Original next question");

  await page.evaluate(() => {
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: () => "a0000000-0000-4000-8000-00000000000c",
    });
  });
  await composer(page).fill("Newer draft for later");
  await retry.dblclick();
  await expect.poll(() => flow.pending.length).toBe(2);
  await expect(
    page.getByRole("button", {
      name: /^(Retry same turn|Recover same turn)$/,
      disabled: false,
    }),
  ).toHaveCount(0);
  await expect(ready).toHaveCount(0);
  await page.clock.runFor(6_001);
  expect(flow.reservations).toEqual(
    Array(2).fill({
      conversationId: binding.conversationId,
      sourceRunId: binding.runId,
    }),
  );
  expect(flow.admissions).toEqual([]);
  expect(flow.submits).toEqual([]);
  await flow.pending[1]!.fallback();
  await expect(page.getByText("Second answer", { exact: true })).toBeVisible();
  expect(flow.admissions).toEqual([
    { requestId: nextRequestId, prompt: "Original next question" },
  ]);
  expect(flow.submits).toEqual(flow.admissions);
  expect(flow.fixture.hints.at(-1)).toEqual({
    clientId,
    conversationId: binding.conversationId,
    runId: nextBinding.runId,
  });
  await expect(composer(page)).toHaveValue("Newer draft for later");
  expect(flow.fixture.unexpected).toEqual([]);
});
