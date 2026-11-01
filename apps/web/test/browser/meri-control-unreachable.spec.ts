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

const unreachable = "Capiro is not reachable right now. Try again in a moment.";
const refused = "Capiro could not accept this message. Try again in a moment.";
const inFlight = "A turn may already be in flight";

/** A finished first turn whose next-message check and send are held for the test to answer. */
async function installNextMessageFlow(page: Page) {
  const fixture = await setupConversation(
    page,
    undefined,
    [context, contextFor(nextBinding)],
    300_000,
  );
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-first-chat-enabled", "true"),
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

async function typeNextMessage(page: Page, flow: { pending: Route[] }) {
  await page.goto(selectedUrl);
  await expect(
    page.getByRole("article", { name: "Current turn" }),
  ).toHaveAttribute("data-run-state", "completed");
  await page.evaluate((id) => {
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: () => id,
    });
  }, nextRequestId);
  await composer(page).fill("Original next question");
  await sendButton(page).click();
  await expect.poll(() => flow.pending.length).toBe(1);
}

test("control answering 502, then an edge 403, to the next-message check shows one plain retry line, keeps typing open and never the in-flight lock", async ({
  page,
}) => {
  const flow = await installNextMessageFlow(page);
  await typeNextMessage(page, flow);
  const newConversation = page.getByRole("button", {
    name: "New conversation",
    exact: true,
  });
  await expect(newConversation).toBeEnabled();

  // Control did not answer: a gateway 502 with an error envelope.
  await reply(
    flow.pending[0]!,
    { error: { code: "CONVERSATION_UNAVAILABLE", outcome: "UNKNOWN" } },
    502,
  );
  const line = page.getByRole("status").filter({ hasText: unreachable });
  await expect(line.locator("p")).toHaveText(unreachable);
  await expect(page.locator("body")).not.toContainText(inFlight);
  await expect(page.locator("body")).not.toContainText(
    "Turn recovery unavailable",
  );
  const retry = page.getByRole("button", { name: "Try again", exact: true });
  await expect(retry).toBeEnabled();
  await expect(sendButton(page)).toBeDisabled();
  await expect(sendButton(page)).toHaveAttribute("title", unreachable);
  // Typing stays possible and New conversation stays open while control is away.
  await expect(composer(page)).toBeEnabled();
  await composer(page).fill("Still typing while Capiro is away");
  await expect(composer(page)).toHaveValue("Still typing while Capiro is away");
  await expect(newConversation).toBeEnabled();
  expect(flow.admissions).toEqual([]);
  expect(flow.submits).toEqual([]);

  // The same check runs again on request; the edge refuses it this time (WAF 403, no envelope).
  await retry.click();
  await expect.poll(() => flow.pending.length).toBe(2);
  await flow.pending[1]!.fulfill({
    status: 403,
    contentType: "text/html",
    body: "<html><body>Forbidden</body></html>",
  });
  await expect(
    page.getByRole("status").filter({ hasText: refused }).locator("p"),
  ).toHaveText(refused);
  await expect(page.locator("body")).not.toContainText(inFlight);
  await expect(page.locator("body")).not.toContainText(
    "Conversation access unavailable",
  );
  await expect(composer(page)).toBeEnabled();
  await expect(retry).toBeEnabled();
  expect(flow.admissions).toEqual([]);

  // Control answers: the retained message goes out once, as the same request.
  await retry.click();
  await expect.poll(() => flow.pending.length).toBe(3);
  await flow.pending[2]!.fallback();
  await expect(page.getByText("Second answer", { exact: true })).toBeVisible();
  expect(flow.reservations).toEqual(
    Array(3).fill({
      conversationId: binding.conversationId,
      sourceRunId: binding.runId,
    }),
  );
  expect(flow.admissions).toEqual([
    { requestId: nextRequestId, prompt: "Original next question" },
  ]);
  expect(flow.submits).toEqual(flow.admissions);
  expect(flow.fixture.hints.at(-1)).toEqual({
    clientId,
    conversationId: binding.conversationId,
    runId: nextBinding.runId,
  });
  await expect(page.locator("body")).not.toContainText(unreachable);
  await expect(page.locator("body")).not.toContainText(refused);
  expect(flow.fixture.unexpected).toEqual([]);
});

test("an edge 403 on the message itself is refused, not a lost membership: the transcript stays and the same request retries", async ({
  page,
}) => {
  const flow = await installNextMessageFlow(page);
  let refusals = 0;
  await page.route("**/api/conversations/input/admit", (route) => {
    if (refusals++ > 0) return route.fallback();
    return route.fulfill({
      status: 403,
      contentType: "text/html",
      body: "<html><body>Forbidden</body></html>",
    });
  });
  await typeNextMessage(page, flow);
  await flow.pending[0]!.fallback();
  const turn = page.getByRole("article", { name: "Current turn" });
  await expect(turn.getByText(refused, { exact: true })).toBeVisible();
  await expect(turn.getByText("Original next question")).toBeVisible();
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    "Conversation access unavailable",
  );
  await expect(page.locator("body")).not.toContainText("Delivery is uncertain");
  await expect(page.locator("body")).not.toContainText(
    "Conversation operation unavailable",
  );
  await expect(page.locator("body")).not.toContainText(inFlight);
  await expect(sendButton(page)).toBeDisabled();
  await expect(sendButton(page)).toHaveAttribute("title", refused);
  await expect(composer(page)).toBeEnabled();
  expect(refusals).toBe(1);
  expect(flow.admissions).toEqual([]);
  expect(flow.submits).toEqual([]);

  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(page.getByText("Second answer", { exact: true })).toBeVisible();
  // The retry is the same request: the edge saw it once, control admitted it once.
  expect(refusals).toBe(2);
  expect(flow.admissions).toEqual([
    { requestId: nextRequestId, prompt: "Original next question" },
  ]);
  expect(flow.submits).toEqual(flow.admissions);
  expect(flow.fixture.hints).toHaveLength(2);
  await expect(page.locator("body")).not.toContainText(refused);
  expect(flow.fixture.unexpected).toEqual([]);
});

test("access lost while a message runs rechecks itself once before asking the person", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [context], 300_000);
  let streams = 0;
  await page.route("**/api/conversations/history", (r) =>
    reply(
      r,
      {
        run: runFor("running"),
        request: {
          requestId: "a0000000-0000-4000-8000-00000000000a",
          prompt: "The question",
          windowRequest: null,
          window: null,
          skill: null,
        },
        events: [event(1, "Partial answer")],
        nextSequence: 1,
        lastSequence: 1,
        hasMore: false,
      },
      200,
    ),
  );
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (r) => {
      streams++;
      // The edge refuses the first observation outright; the next one answers.
      if (streams === 1)
        return r.fulfill({
          status: 403,
          contentType: "text/html",
          body: "<html><body>Forbidden</body></html>",
        });
      return sse(r, [event(2, " completed"), status(3, "completed")]);
    },
  );
  await page.goto(selectedUrl);
  await page
    .getByRole("heading", { name: "Conversation", exact: true })
    .waitFor();
  await expect.poll(() => streams).toBe(1);
  // Nobody clicks: the session is reissued once on its own and the transcript returns.
  await expect.poll(() => fixture.hints.length, { timeout: 10_000 }).toBe(2);
  await expect(
    page.getByText("Partial answer completed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Conversation access unavailable" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Check access again", exact: true }),
  ).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});

test("a transcript read that control answers 503 is one plain notice with one Retry, no codes, and reconnects on its own", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [context], 300_000);
  // Saved history is healthy; only the current transcript read is held by control.
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  const reads: number[] = [];
  await page.route("**/api/conversations/history", (r) => {
    reads.push(Date.now());
    if (reads.length <= 2)
      return reply(r, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 503);
    return reply(r, {
      run: runFor("completed"),
      request: {
        requestId: "a0000000-0000-4000-8000-00000000000a",
        prompt: "The question",
        windowRequest: null,
        window: null,
        skill: null,
      },
      events: [event(1, "Completed answer"), status(2, "completed")],
      nextSequence: 2,
      lastSequence: 2,
      hasMore: false,
    });
  });
  await page.goto(selectedUrl);
  const notice = page.getByRole("status").filter({
    hasText: "Your conversation is safe; we'll reconnect automatically.",
  });
  await expect(notice.first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    "CONVERSATION_UNAVAILABLE",
  );
  await expect(page.locator("body")).not.toContainText(
    "Conversation operation unavailable",
  );
  await expect(page.locator("body")).not.toContainText("Refresh run status");
  await expect(page.locator("body")).not.toContainText(
    "The current transcript could not be loaded.",
  );
  await expect(page.locator("body")).not.toContainText(
    "Actions for your approval",
  );
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toHaveCount(1);
  expect(reads).toHaveLength(1);
  // Nobody clicks: the read repeats after 2 s, then 4 s, and the transcript arrives.
  await expect.poll(() => reads.length, { timeout: 4_000 }).toBe(2);
  await expect
    .poll(() => reads.length, { timeout: 8_000, intervals: [250] })
    .toBe(3);
  expect(reads[1]! - reads[0]!).toBeGreaterThanOrEqual(1_800);
  expect(reads[2]! - reads[1]!).toBeGreaterThanOrEqual(3_600);
  await expect(
    page.getByText("Completed answer", { exact: true }),
  ).toBeVisible();
  await expect(notice).toHaveCount(0);
  await expect(composer(page)).toBeEnabled();
  expect(fixture.unexpected).toEqual([]);
});
