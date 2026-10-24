import { expect, test, type Page, type Route } from "@playwright/test";
import type { UIEvent } from "@capiro/meri-contracts";
import {
  clientId,
  composer,
  context,
  binding,
  contextFor,
  event,
  nextBinding,
  runFor,
  sse,
  status,
  reply,
  sendButton,
  setupConversation,
} from "./meri-conversation-fixtures";
import { installInitialInput } from "./meri-initial-input-fixtures";
import {
  installHistory,
  installCurrentRun,
  nextRequestId,
  turn,
} from "./meri-history-fixtures";

const prompt = "Original initial message";
const url = `/meri?clientId=${clientId}`;

/** A synthetic admission is accepted, but the browser's session expires before its ACK arrives. */
async function expireBeforeAcknowledgement(page: Page) {
  await page.clock.install();
  let sessions = 0;
  const fixture = await setupConversation(page, (receipt) => ({
    ...receipt,
    expiresAtMs: Date.now() + (++sessions === 1 ? 10_000 : 60_000),
  }));
  const native = await installInitialInput(page);
  let renewal: Route | undefined;
  const holdRenewal = (route: Route) => {
    if (sessions === 0) return route.fallback();
    renewal = route;
  };
  await page.route("**/api/action-followthrough/session", holdRenewal);
  let held: Route | undefined;
  let accepted: object | undefined;
  await page.route("**/api/conversations/input/admit", (route) => {
    const receipt = native.admissionResponse(route);
    if (native.calls.admit.length === 1) {
      held = route;
      accepted = receipt;
      return;
    }
    return reply(route, receipt);
  });
  await page.goto(url);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now())));
  await composer(page).fill(prompt);
  await sendButton(page).click();
  await expect.poll(() => native.calls.admit.length).toBe(1);
  await page.clock.runFor(10_100);
  await expect.poll(() => renewal !== undefined).toBe(true);
  await reply(held!, accepted!).catch(() => undefined);
  expect(native.calls.submit).toHaveLength(0);
  const resume = async (observed = context) => {
    await page.unroute("**/api/action-followthrough/session", holdRenewal);
    fixture.hints.push(renewal!.request().postDataJSON());
    await reply(renewal!, {
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: (await page.evaluate(() => Date.now())) + 60_000,
      context: observed,
    });
  };
  return { fixture, native, resume };
}

async function reconnectAndRetry(page: Page, resume: () => Promise<void>) {
  await resume();
  await page
    .getByRole("button", { name: "Continue accepted request", exact: true })
    .click();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
}

test("synthetic expiry and reconnect consume the acknowledged first draft without resending it", async ({
  page,
}) => {
  const { fixture, native, resume } = await expireBeforeAcknowledgement(page);
  await expect(composer(page)).toHaveValue(prompt);
  await reconnectAndRetry(page, resume);
  await expect(composer(page)).toHaveValue("");
  await expect(sendButton(page)).toBeDisabled();
  await composer(page).press("Enter");
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.admit).toHaveLength(2);
  expect(native.calls.submit).toHaveLength(1);
  expect(
    new Set([
      ...native.calls.allocate,
      ...native.calls.admit,
      ...native.calls.submit,
    ]).size,
  ).toBe(1);
  expect(fixture.hints.at(-1)).toEqual({
    clientId,
    conversationId: context.conversationId,
    runId: context.runId,
  });
  expect(fixture.unexpected).toEqual([]);
});

for (const draft of ["New question while disconnected", prompt]) {
  test(`synthetic reconnect preserves the newer disconnected draft ${JSON.stringify(draft)}`, async ({
    page,
  }) => {
    const { fixture, native, resume } = await expireBeforeAcknowledgement(page);
    // Editing away and back to the sent text still creates a new unsent draft.
    await composer(page).fill("Intermediate draft");
    await composer(page).fill(draft);
    await reconnectAndRetry(page, resume);
    await expect(composer(page)).toHaveValue(draft);
    expect(native.calls.submit).toHaveLength(1);
    expect(
      new Set([
        ...native.calls.allocate,
        ...native.calls.admit,
        ...native.calls.submit,
      ]).size,
    ).toBe(1);
    expect(fixture.unexpected).toEqual([]);
  });
}

test("synthetic refused renewal cannot release a late acknowledgement or dispatch the retained input", async ({
  page,
}) => {
  const { fixture, native, resume } = await expireBeforeAcknowledgement(page);
  await composer(page).fill("Newer private draft");
  await resume({ ...context, actorId: "another-native-actor" });
  await expect(
    page.getByRole("heading", {
      name: "Conversation connection unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("Newer private draft");
  await expect(sendButton(page)).toBeDisabled();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toHaveCount(0);
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.admit).toHaveLength(1);
  expect(native.calls.submit).toHaveLength(0);
  expect(fixture.unexpected).toEqual([]);
});

/** Another writer has admitted a successor while this page retained the first run's lost ACK. */
async function openSuccessorWithRetainedDraft(
  page: Page,
  queued = false,
  newerDraft?: string,
) {
  const { fixture, native, resume } = await expireBeforeAcknowledgement(page);
  if (newerDraft) await composer(page).fill(newerDraft);
  const first = turn(binding, native.native.input!.requestId, prompt);
  first.sequenceEnd = 2;
  const next = turn(nextBinding, nextRequestId, prompt, 2, queued ? 1 : 2);
  next.run = runFor(queued ? "queued" : "completed", nextBinding);
  const successorEvents = queued
    ? [status(1, "queued", nextBinding)]
    : [
        event(1, "Successor answer", nextBinding),
        status(2, "completed", nextBinding),
      ];
  const saved = await installHistory(page, {
    turns: [first, next],
    events: [
      event(1, "First accepted answer"),
      status(2, "completed"),
      ...successorEvents,
    ].map((event, index) => ({ sequence: index + 1, event: event as UIEvent })),
  });
  await installCurrentRun(page, saved.native);
  await page.route("**/api/action-followthrough/session", (route) => {
    const hints = route.request().postDataJSON();
    fixture.hints.push(hints);
    return reply(route, {
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + 60_000,
      context: contextFor(
        hints.runId === nextBinding.runId ? nextBinding : binding,
      ),
    });
  });
  await page.route("**/api/conversations/events", (route) =>
    sse(route, successorEvents),
  );
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (route) => sse(route, []),
  );
  await resume();
  await page
    .getByRole("button", { name: "Open latest accepted turn", exact: true })
    .click();
  await expect
    .poll(() => fixture.hints.at(-1))
    .toEqual({
      clientId,
      conversationId: binding.conversationId,
      runId: nextBinding.runId,
    });
  return { fixture, saved };
}

test("synthetic a same-prompt successor acknowledgement cannot consume the first run's retained draft", async ({
  page,
}) => {
  const { fixture } = await openSuccessorWithRetainedDraft(page, true);
  let submissions = 0;
  await page.route("**/api/conversations/submit", (route) => {
    submissions++;
    return reply(route, {
      run: runFor("running", nextBinding),
      requestId: nextRequestId,
      lastSequence: 1,
      replayed: true,
    });
  });
  await page
    .getByRole("button", { name: "Continue accepted request", exact: true })
    .click();
  await expect.poll(() => submissions).toBe(1);
  await expect(
    page.getByRole("button", {
      name: "Continue accepted request",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(composer(page)).toHaveValue(prompt);
  expect(fixture.unexpected).toEqual([]);
});

test("synthetic a retained initial guard from an earlier run cannot swallow a later next-turn send", async ({
  page,
}) => {
  const newerDraft = "A genuinely new third question";
  const { fixture } = await openSuccessorWithRetainedDraft(
    page,
    false,
    newerDraft,
  );
  const reservations: Array<{ sourceRunId: string }> = [];
  await page.route("**/api/conversations/next-turn", (route) => {
    reservations.push(route.request().postDataJSON());
    return reply(route, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 503);
  });
  await expect(
    page.getByText("Successor answer", { exact: true }),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue(newerDraft);
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect.poll(() => reservations.length).toBe(1);
  expect(reservations[0]!.sourceRunId).toBe(nextBinding.runId);
  expect(fixture.unexpected).toEqual([]);
});
