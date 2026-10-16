import { test, expect } from "@playwright/test";
import type { UIEvent } from "@capiro/meri-contracts";
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
  conversation,
  initialEvents,
  installCurrentRun,
  installHistory,
  nextRequestId,
  requestId,
  reserved,
  selectedUrl,
  turn,
} from "./meri-history-fixtures";

test("synthetic native discovery pages through other permitted clients and preserves exact selected URL on reload", async ({
  page,
}) => {
  const f = await setupConversation(page);
  const otherClient = "10000000-0000-4000-8000-000000000002";
  const others = Array.from({ length: 50 }, (_, index) => ({
    ...conversation,
    conversationId: `30000000-0000-4000-8000-${String(1000 - index).padStart(12, "0")}`,
    createdAt: "2026-10-14T00:00:00.000Z",
    scopes: [{ ...conversation.scopes[0]!, resourceId: otherClient }],
  }));
  const { native, calls } = await installHistory(page, {
    conversations: [...others, conversation],
  });
  await installCurrentRun(page, native);
  await page.goto(`/meri?clientId=${clientId}`);
  await expect(
    page.getByText("No conversations for this client in the loaded pages."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "More conversations", exact: true })
    .click();
  const recent = page.getByRole("link", { name: /^Conversation ·/ });
  await expect(recent).toHaveCount(1);
  await expect(recent).toHaveAttribute("href", selectedUrl);
  await recent.click();
  await expect(page).toHaveURL(selectedUrl);
  await page.reload();
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  expect(f.hints.at(-1)).toEqual({
    clientId,
    conversationId: binding.conversationId,
  });
  expect(calls.list.length).toBeGreaterThanOrEqual(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Workspace menu", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Meri sections" })
    .getByRole("button", { name: "More conversations", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Meri sections" })
      .getByRole("link", { name: /^Conversation ·/ }),
  ).toHaveCount(1);
  expect(f.unexpected).toEqual([]);
});

test("synthetic saved transcript preserves resumed output, shows each logical prompt once and labels partial pages", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/action-followthrough/session", (r) =>
    reply(r, { error: { code: "SESSION_UNAVAILABLE" } }, 503),
  );
  const resumed = {
    ...turn(nextBinding, nextRequestId),
    sequenceBase: 2,
    sequenceEnd: 4,
    promptLineage: {
      kind: "resume" as const,
      logicalRequestId: requestId,
      sourceBinding: binding,
      sourceRequestId: requestId,
    },
  };
  const third = {
    ...nextBinding,
    runId: "40000000-0000-4000-8000-000000000077",
    attemptId: "50000000-0000-4000-8000-000000000077",
    workerId: "60000000-0000-4000-8000-000000000077",
    writerFence: 3,
  };
  const thirdTurn = turn(
    third,
    "a0000000-0000-4000-8000-00000000000c",
    "First question",
    4,
    101,
  );
  const source = { ...turn(), sequenceEnd: 2 };
  const resumedEvents = [
    event(1, "Resumed answer", nextBinding),
    status(2, "completed", nextBinding),
  ].map((item) => ({ sequence: item.sequence + 2, event: item as UIEvent }));
  const lastEvents = Array.from({ length: 101 }, (_, index) => ({
    sequence: index + 5,
    event: {
      ...(index === 100
        ? status(index + 1, "completed", third)
        : event(index + 1, "x", third)),
      eventId: `70000000-0000-4000-9000-${String(index + 5).padStart(12, "0")}`,
    } as UIEvent,
  }));
  await installHistory(page, {
    turns: [source, resumed, thirdTurn],
    events: [...initialEvents, ...resumedEvents, ...lastEvents],
  });
  await page.goto(selectedUrl);
  await expect(
    page.getByText("Part of the saved conversation is shown."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Load more saved turns", exact: true })
    .click();
  await expect(
    page.getByText("Saved conversation history loaded."),
  ).toBeVisible();
  await expect(page.getByText("First question", { exact: true })).toHaveCount(
    2,
  );
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await expect(page.getByText("Resumed answer", { exact: true })).toBeVisible();
  await expect(sendButton(page)).toBeDisabled();
  expect(f.unexpected).toEqual([]);
});

test("synthetic partial history keeps an admitted current prompt visible while native lineage is unavailable", async ({
  page,
}) => {
  const f = await setupConversation(page, undefined, [contextFor(nextBinding)]);
  const source = {
    ...turn(binding, requestId, "Earlier submitted question", 0, 100),
    sequenceEnd: 100,
  };
  const current = turn(
    nextBinding,
    nextRequestId,
    "Distinct current question",
    100,
    2,
  );
  const sourceEvents = Array.from({ length: 100 }, (_, index) => {
    const item =
      index === 99 ? status(index + 1, "completed") : event(index + 1, ".");
    return { sequence: item.sequence, event: item as UIEvent };
  });
  const currentEvents = [
    event(1, "Current admitted answer", nextBinding),
    status(2, "completed", nextBinding),
  ].map((item) => ({ sequence: item.sequence + 100, event: item as UIEvent }));
  const { native } = await installHistory(page, {
    turns: [source, current],
    events: [...sourceEvents, ...currentEvents],
  });
  await installCurrentRun(page, native);
  await page.route("**/api/conversations/transcript", (route) =>
    route.request().postDataJSON().after === 100
      ? reply(route, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 503)
      : route.fallback(),
  );
  await page.goto(selectedUrl);
  await expect(
    page.getByText(
      "The latest turn could not be verified. Reload saved history before starting another turn.",
    ),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Earlier turn 1", exact: true })
      .getByText("Earlier submitted question", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Current turn", exact: true })
      .getByText("Distinct current question", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Current admitted answer", { exact: true }),
  ).toBeVisible();
  await expect(sendButton(page)).toBeDisabled();
  expect(f.unexpected).toEqual([]);
});

test("synthetic hard reload with RESERVED and no immutable submit identity can only replay that source mapping", async ({
  page,
}) => {
  const f = await setupConversation(page);
  const { native } = await installHistory(page, {
    pendingTurn: {
      sourceBinding: binding,
      targetBinding: nextBinding,
      state: "RESERVED",
    },
  });
  await installCurrentRun(page, native);
  const mappings: unknown[] = [],
    submits: unknown[] = [];
  await page.route("**/api/conversations/next-turn", (r) => {
    mappings.push(r.request().postDataJSON());
    return reply(r, reserved);
  });
  await page.route("**/api/conversations/submit", (r) => {
    submits.push(r.request().postDataJSON());
    return reply(r, {}, 500);
  });
  await page.goto(selectedUrl);
  await expect(
    page.getByText(/original message identity is unavailable/),
  ).toBeVisible();
  await composer(page).fill("A different request");
  await expect(sendButton(page)).toBeDisabled();
  await page
    .getByRole("button", { name: "Check reserved turn", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByText(/original message identity is unavailable/),
  ).toBeVisible();
  await expect(sendButton(page)).toBeDisabled();
  expect(mappings).toEqual([
    { conversationId: binding.conversationId, sourceRunId: binding.runId },
  ]);
  expect(submits).toEqual([]);
  expect(
    f.hints.every(
      (hint) => !("runId" in hint) || hint.runId !== nextBinding.runId,
    ),
  ).toBe(true);
  expect(f.unexpected).toEqual([]);
});

test("synthetic absent history never treats 404 as proof that a new first-submit ID is safe", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/transcript", (r) =>
    reply(r, { error: { code: "CONVERSATION_NOT_FOUND" } }, 404),
  );
  await page.route("**/api/conversations/history", (r) =>
    reply(r, { error: { code: "NOT_FOUND" } }, 404),
  );
  const submits: unknown[] = [];
  await page.route("**/api/conversations/submit", (r) => {
    submits.push(r.request().postDataJSON());
    return reply(r, {}, 500);
  });
  await page.goto(selectedUrl);
  await composer(page).fill("First message after reload");
  await expect(sendButton(page)).toBeDisabled();
  await expect(sendButton(page)).toHaveAttribute(
    "title",
    /cannot verify whether a message is already in flight/,
  );
  await page.reload();
  await expect(sendButton(page)).toBeDisabled();
  expect(submits).toEqual([]);
  expect(f.unexpected).toEqual([]);
});

test("synthetic lost reservation and submit ACKs preserve source, exact target and immutable request bytes", async ({
  page,
}) => {
  const f = await setupConversation(page, undefined, [
    context,
    contextFor(nextBinding),
  ]);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  const mappings: unknown[] = [],
    submits: { requestId: string; prompt: string }[] = [];
  await page.route("**/api/conversations/next-turn", (r) => {
    mappings.push(r.request().postDataJSON());
    native.pendingTurn = {
      sourceBinding: binding,
      targetBinding: nextBinding,
      state: "RESERVED",
    };
    return mappings.length === 1
      ? reply(
          r,
          { error: { code: "PRODUCT_UNAVAILABLE", outcome: "UNKNOWN" } },
          502,
        )
      : reply(r, reserved);
  });
  await page.route("**/api/conversations/submit", (r) => {
    const body = r.request().postDataJSON();
    submits.push(body);
    if (submits.length === 1) {
      acceptNext(native, body.requestId, body.prompt);
      return reply(r, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 502);
    }
    return reply(r, {
      run: runFor("completed", nextBinding),
      requestId: body.requestId,
      lastSequence: 2,
      replayed: true,
    });
  });
  await page.route("**/api/conversations/events", (r) =>
    sse(r, [
      event(1, "Second answer", nextBinding),
      status(2, "completed", nextBinding),
    ]),
  );
  await page.goto(selectedUrl);
  await composer(page).fill("Second question");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await page
    .getByRole("button", { name: "Recover same turn", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(page.getByText("Second answer", { exact: true })).toBeVisible();
  expect(mappings).toEqual(
    Array(2).fill({
      conversationId: binding.conversationId,
      sourceRunId: binding.runId,
    }),
  );
  expect(f.hints.at(-1)).toEqual({
    clientId,
    conversationId: binding.conversationId,
    runId: nextBinding.runId,
  });
  expect(submits).toHaveLength(2);
  expect(submits[1]).toEqual(submits[0]);
  await expect(page.getByText("Second question", { exact: true })).toHaveCount(
    1,
  );
  expect(f.unexpected).toEqual([]);
});

test("synthetic membership revocation removes saved output and closes the prior session", async ({
  page,
}) => {
  const f = await setupConversation(page);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  native.denied = true;
  await page
    .getByRole("button", { name: "Reload saved history", exact: true })
    .click();
  await expect(
    page.getByText(
      "Saved conversation history unavailable. No sample transcript was substituted.",
    ),
  ).toBeVisible();
  await expect(page.getByText("First answer", { exact: true })).toHaveCount(0);
  await expect(sendButton(page)).toBeDisabled();
  expect(f.unexpected).toEqual([]);
});
