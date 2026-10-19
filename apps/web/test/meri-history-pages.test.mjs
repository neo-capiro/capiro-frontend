import test from "node:test";
import assert from "node:assert/strict";
import {
  conversationInClient,
  discoveryConversations,
  transcriptPages,
} from "../src/shared/meri-conversations/history-pages.ts";

// Synthetic already-admitted page representations; receiver validation is separate artifact evidence.
const account = { tenantId: "tenant", actorId: "actor" };
const conversation = {
  conversationId: "conversation",
  owner: account,
  scopes: [{ kind: "client", resourceId: "client" }],
};
const binding = {
  ...account,
  conversationId: "conversation",
  runId: "run",
  writerFence: 1,
};
const turn = {
  run: { binding, state: "completed" },
  request: { requestId: "request", prompt: "Question" },
  promptLineage: {
    kind: "submission",
    logicalRequestId: "request",
    sourceBinding: null,
    sourceRequestId: null,
  },
  sequenceBase: 0,
  sequenceEnd: 2,
  lastSequence: 2,
};
const event = (sequence, run = binding, base = 0) => ({
  sequence: base + sequence,
  event: { eventId: `${run.runId}:${sequence}`, binding: run, sequence },
});
const page = (events, turns = [turn]) => ({
  conversation,
  latestRun: turns.at(-1).run,
  latestSequenceBase: turns.at(-1).sequenceBase,
  turns,
  events,
  nextSequence: events.at(-1)?.sequence ?? 0,
});

test("synthetic: discovery omits other clients but rejects another actor even in an omitted row", () => {
  assert.equal(conversationInClient(conversation, account, "client"), true);
  assert.deepEqual(
    discoveryConversations(
      [
        {
          conversations: [
            {
              ...conversation,
              scopes: [{ kind: "client", resourceId: "other" }],
            },
          ],
        },
      ],
      account,
      "client",
    ),
    [],
  );
  assert.throws(() =>
    discoveryConversations(
      [
        {
          conversations: [
            {
              ...conversation,
              owner: { ...account, actorId: "foreign" },
              scopes: [],
            },
          ],
        },
      ],
      account,
      "client",
    ),
  );
  assert.equal(
    conversationInClient(
      {
        ...conversation,
        scopes: [
          ...conversation.scopes,
          { kind: "client", resourceId: "other" },
        ],
      },
      account,
      "client",
    ),
    false,
  );
});

test("synthetic: repeated discovery rows cannot be silently merged across pages", () => {
  assert.throws(() =>
    discoveryConversations(
      [{ conversations: [conversation] }, { conversations: [conversation] }],
      account,
      "client",
    ),
  );
});

test("synthetic: conversation sequence continuity never overwrites original run-local sequence", () => {
  const next = { ...binding, runId: "next", writerFence: 2 };
  const nextTurn = {
    ...turn,
    run: { ...turn.run, binding: next },
    request: { requestId: "next-request", prompt: "Question" },
    promptLineage: {
      kind: "resume",
      logicalRequestId: "request",
      sourceBinding: binding,
      sourceRequestId: "request",
    },
    sequenceBase: 2,
    sequenceEnd: null,
    lastSequence: 1,
  };
  const saved = transcriptPages(
    [page([event(1)]), page([event(2)]), page([event(1, next, 2)], [nextTurn])],
    account,
    "client",
  );
  assert.deepEqual(
    saved.events.map((row) => row.sequence),
    [1, 2, 3],
  );
  assert.deepEqual(
    saved.events.map((row) => row.event.sequence),
    [1, 2, 1],
  );
  assert.equal(saved.cursor, 3);
});

test("synthetic: page gaps and duplicated immutable event IDs fail closed", () => {
  assert.throws(() =>
    transcriptPages([page([event(1)]), page([event(3)])], account, "client"),
  );
  assert.throws(() =>
    transcriptPages(
      [
        page([event(1)]),
        page([{ ...event(2), event: { ...event(2).event, eventId: "run:1" } }]),
      ],
      account,
      "client",
    ),
  );
});

test("synthetic: changed stored prompt, binding and final sequence range fail across page boundaries", () => {
  for (const changed of [
    { ...turn, request: { ...turn.request, prompt: "Rewritten" } },
    { ...turn, run: { ...turn.run, binding: { ...binding, writerFence: 2 } } },
    { ...turn, sequenceEnd: 3 },
  ])
    assert.throws(() =>
      transcriptPages(
        [page([event(1)]), page([event(2)], [changed])],
        account,
        "client",
      ),
    );
});

test("synthetic: resumed prompt lineage must correlate across pages, without text deduplication", () => {
  const next = { ...binding, runId: "next", writerFence: 2 };
  const resumed = {
    ...turn,
    run: { ...turn.run, binding: next },
    request: { requestId: "next-request", prompt: "Question" },
    promptLineage: {
      kind: "resume",
      logicalRequestId: "wrong-logical-id",
      sourceBinding: binding,
      sourceRequestId: "request",
    },
    sequenceBase: 2,
    sequenceEnd: null,
    lastSequence: 1,
  };
  assert.throws(() =>
    transcriptPages(
      [page([event(1), event(2)]), page([event(1, next, 2)], [resumed])],
      account,
      "client",
    ),
  );
});

test("synthetic: a resume cannot rewrite prompt or optional window presence across separate pages", () => {
  const next = { ...binding, runId: "next", writerFence: 2 };
  const resumed = {
    ...turn,
    run: { ...turn.run, binding: next },
    request: { requestId: "next-request", prompt: "Question" },
    promptLineage: {
      kind: "resume",
      logicalRequestId: "request",
      sourceBinding: binding,
      sourceRequestId: "request",
    },
    sequenceBase: 2,
    sequenceEnd: null,
    lastSequence: 1,
  };
  for (const changed of [{ prompt: "Rewritten" }, { windowRequest: null }])
    assert.throws(() =>
      transcriptPages(
        [
          page([event(1), event(2)]),
          page(
            [event(1, next, 2)],
            [{ ...resumed, request: { ...resumed.request, ...changed } }],
          ),
        ],
        account,
        "client",
      ),
    );
});

test("synthetic: adjacent saved ranges cannot overlap or leave a gap across pages", () => {
  const next = { ...binding, runId: "next", writerFence: 2 };
  for (const sequenceBase of [1, 3]) {
    const nextTurn = {
      ...turn,
      run: { ...turn.run, binding: next },
      request: { requestId: "new", prompt: "New" },
      promptLineage: { kind: "submission", logicalRequestId: "new" },
      sequenceBase,
      sequenceEnd: null,
      lastSequence: 1,
    };
    assert.throws(() =>
      transcriptPages(
        [
          page([event(1), event(2)]),
          page([{ ...event(1, next, sequenceBase), sequence: 3 }], [nextTurn]),
        ],
        account,
        "client",
      ),
    );
  }
});
