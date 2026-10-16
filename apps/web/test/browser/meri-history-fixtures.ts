import type { Page } from "@playwright/test";
import type { UIEvent } from "@capiro/meri-contracts";
import type {
  ConversationListPage,
  ConversationTranscriptPage,
} from "../../src/shared/meri-conversations/history-client";
import {
  binding,
  clientId,
  event,
  nextBinding,
  reply,
  runFor,
  scopes,
  status,
} from "./meri-conversation-fixtures";

/** Explicit synthetic public-history fixture; no browser credential or real provider is involved. */
export const stored = (requestId: string, prompt: string) => ({
  requestId,
  prompt,
  skill: null,
  window: null,
  windowRequest: null,
});
export const requestId = "a0000000-0000-4000-8000-00000000000a";
export const nextRequestId = "a0000000-0000-4000-8000-00000000000b";
type Conversation = ConversationListPage["conversations"][number];
export const conversation: Conversation = {
  conversationId: binding.conversationId,
  owner: { tenantId: binding.tenantId, actorId: binding.actorId },
  scopes,
  createdAt: "2026-10-13T00:00:00.000Z",
  policyRevision: "policy1",
};
export const turn = (
  value = binding,
  id = requestId,
  prompt = "First question",
  sequenceBase = 0,
  lastSequence = 2,
): SavedTurn => ({
  run: runFor("completed", value),
  request: stored(id, prompt),
  promptLineage: {
    kind: "submission" as const,
    logicalRequestId: id,
    sourceBinding: null,
    sourceRequestId: null,
  },
  sequenceBase,
  sequenceEnd: null,
  lastSequence,
});
export const reserved = {
  schema: "meri.conversation-turn/1" as const,
  sourceBinding: binding,
  targetBinding: nextBinding,
  state: "RESERVED" as const,
  replayed: true,
};
export const initialEvents = [
  event(1, "First answer"),
  status(2, "completed"),
].map((item) => ({ sequence: item.sequence, event: item as UIEvent }));
type SavedTurn = ConversationTranscriptPage["turns"][number];

/** Pages wrap the original frozen events without rewriting their run-local sequence. */
export async function installHistory(
  page: Page,
  options: {
    turns?: SavedTurn[];
    events?: ConversationTranscriptPage["events"];
    pendingTurn?: ConversationTranscriptPage["pendingTurn"];
    conversations?: Conversation[];
  } = {},
) {
  const native = {
    turns: options.turns ?? [turn()],
    events: options.events ?? initialEvents,
    pendingTurn: options.pendingTurn ?? null,
    conversations: options.conversations ?? [conversation],
    denied: false,
  };
  const calls = { list: [] as unknown[], transcript: [] as unknown[] };
  // Receipt-only synthetic owner for retained/recovered requests, never fresh-target proof.
  const inputReceipts = new Map<string, { bytes: string; receipt: object }>();
  await page.route("**/api/conversations/input/admit", (route) => {
    const input = route.request().postDataJSON(),
      bytes = route.request().postData()!;
    const previous = inputReceipts.get(input.requestId);
    if (previous)
      return previous.bytes === bytes
        ? reply(route, { ...previous.receipt, replayed: true })
        : reply(route, { error: { code: "REQUEST_CONFLICT" } }, 409);
    const accepted = native.turns.find(
      (row) => row.request.requestId === input.requestId,
    );
    const target = native.pendingTurn?.targetBinding ?? accepted?.run.binding;
    if (!target)
      return reply(route, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 503);
    const receipt = {
      run: accepted?.run ?? runFor("queued", target),
      request: accepted?.request ?? stored(input.requestId, input.prompt),
      lastSequence: accepted?.lastSequence ?? 1,
      replayed: false,
    };
    inputReceipts.set(input.requestId, { bytes, receipt });
    return reply(route, receipt);
  });
  await page.route("**/api/conversations/list", (route) => {
    const input = route.request().postDataJSON();
    calls.list.push(input);
    const start = input.before
      ? native.conversations.findIndex(
          (row) => row.conversationId === input.before.conversationId,
        ) + 1
      : 0;
    const conversations = native.conversations.slice(
      start,
      start + input.limit,
    );
    const last = conversations.at(-1);
    return reply(route, {
      schema: "meri.conversation-list/1",
      conversations,
      nextBefore:
        start + conversations.length < native.conversations.length && last
          ? { createdAt: last.createdAt, conversationId: last.conversationId }
          : null,
    });
  });
  await page.route("**/api/conversations/transcript", (route) => {
    const input = route.request().postDataJSON();
    calls.transcript.push(input);
    if (native.denied)
      return reply(route, { error: { code: "MEMBERSHIP_REVOKED" } }, 403);
    const events = native.events
      .filter((row) => row.sequence > input.after)
      .slice(0, input.limit);
    const touched = new Set(events.map(({ event }) => event.binding.runId));
    const latest = native.turns.at(-1)!;
    const nextSequence = events.at(-1)?.sequence ?? input.after;
    const lastSequence = native.events.at(-1)!.sequence;
    return reply(route, {
      schema: "meri.conversation-transcript/1",
      conversation,
      latestRun: latest.run,
      latestSequenceBase: latest.sequenceBase,
      turns: native.turns.filter((row) => touched.has(row.run.binding.runId)),
      events,
      nextSequence,
      lastSequence,
      hasMore: nextSequence < lastSequence,
      pendingTurn: native.pendingTurn,
    });
  });
  return { native, calls };
}

export async function installCurrentRun(
  page: Page,
  native: Awaited<ReturnType<typeof installHistory>>["native"],
) {
  await page.route("**/api/conversations/history", (route) => {
    const latest = native.turns.at(-1)!;
    const events = native.events
      .filter(({ event }) => event.binding.runId === latest.run.binding.runId)
      .map(({ event }) => event);
    return reply(route, {
      run: latest.run,
      request: latest.request,
      events: events.slice(0, 100),
      nextSequence: Math.min(100, latest.lastSequence),
      lastSequence: latest.lastSequence,
      hasMore: latest.lastSequence > 100,
    });
  });
}

export function acceptNext(
  native: Awaited<ReturnType<typeof installHistory>>["native"],
  id: string,
  prompt: string,
  answer = "Second answer",
) {
  const source = native.turns[0]!;
  source.sequenceEnd = source.sequenceBase + source.lastSequence;
  native.turns.push(turn(nextBinding, id, prompt, 2, 2));
  native.events = [
    ...native.events,
    event(1, answer, nextBinding) as UIEvent,
    status(2, "completed", nextBinding) as UIEvent,
  ].map((item, index) =>
    "event" in item ? item : { sequence: index + 1, event: item },
  );
  native.pendingTurn = null;
}

export async function installReservation(
  page: Page,
  native: Awaited<ReturnType<typeof installHistory>>["native"],
) {
  await page.route("**/api/conversations/next-turn", (route) => {
    native.pendingTurn = {
      sourceBinding: binding,
      targetBinding: nextBinding,
      state: "RESERVED",
    };
    return reply(route, { ...reserved, replayed: false });
  });
}

export const selectedUrl = `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`;
