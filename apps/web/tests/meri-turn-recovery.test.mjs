import { test } from "vitest";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  conversationTurnJournal,
  recoverConversationTurn,
} from "../src/shared/meri-conversations/turn-journal.ts";

// Synthetic scope-memory controls; these objects are not public receiver/live admission proof.
const account = { tenantId: "tenant", actorId: "actor" };
const source = {
  ...account,
  conversationId: "conversation",
  runId: "run",
  attemptId: "attempt",
  workerId: "worker",
  writerFence: 1,
};
const target = {
  ...source,
  runId: "next",
  attemptId: "next-attempt",
  workerId: "next-worker",
  writerFence: 2,
};
const receipt = {
  schema: "meri.conversation-turn/1",
  sourceBinding: source,
  targetBinding: target,
  state: "RESERVED",
  replayed: false,
};
const setup = () => {
  const cache = new QueryClient();
  return {
    cache,
    journal: conversationTurnJournal(
      cache,
      account,
      "client",
      source.conversationId,
    ),
  };
};

test("synthetic: reserve UNKNOWN retains the immutable prompt, submit ID and source before dispatch", async () => {
  const { cache, journal } = setup();
  try {
    journal.start(source, "Question", "request");
    await assert.rejects(
      recoverConversationTurn(journal, async (input) => {
        assert.deepEqual(input, {
          conversationId: "conversation",
          sourceRunId: "run",
        });
        assert.equal(journal.read().requestId, "request");
        throw Error("lost ACK");
      }),
    );
    assert.equal(journal.read().state, "unknown");
    assert.equal(journal.read().prompt, "Question");
    assert.throws(() => journal.start(source, "Replacement", "new-id"));
  } finally {
    cache.clear();
  }
});

test("synthetic: recovery replays the original source even when its target was accepted", async () => {
  const { cache, journal } = setup();
  try {
    journal.start(source, "Question", "request");
    await recoverConversationTurn(journal, async () => receipt);
    const recovered = await recoverConversationTurn(journal, async (input) => {
      assert.equal(input.sourceRunId, source.runId);
      return { ...receipt, state: "ACCEPTED", replayed: true };
    });
    assert.equal(recovered.receipt.targetBinding.runId, "next");
    assert.equal(recovered.requestId, "request");
  } finally {
    cache.clear();
  }
});

test("synthetic: a changed target after the original receipt is rejected", async () => {
  const { cache, journal } = setup();
  try {
    journal.start(source, "Question", "request");
    await recoverConversationTurn(journal, async () => receipt);
    await assert.rejects(
      recoverConversationTurn(journal, async () => ({
        ...receipt,
        targetBinding: { ...target, runId: "third" },
      })),
    );
    assert.equal(journal.read().receipt.targetBinding.runId, "next");
    assert.equal(journal.read().state, "unknown");
  } finally {
    cache.clear();
  }
});

test("synthetic: stale reservation completion cannot restore an identity after canonical cache replacement", async () => {
  const { cache, journal } = setup();
  try {
    journal.start(source, "Question", "request");
    await assert.rejects(
      recoverConversationTurn(journal, async () => {
        cache.clear();
        conversationTurnJournal(cache, account, "client", "conversation");
        return receipt;
      }),
    );
    assert.equal(journal.read(), undefined);
    assert.equal(
      conversationTurnJournal(cache, account, "client", "conversation").read(),
      undefined,
    );
  } finally {
    cache.clear();
  }
});

test("synthetic: hard reload and a different client never reconstruct first-submit identity from RESERVED", async () => {
  const { cache, journal } = setup();
  const reloaded = new QueryClient();
  try {
    journal.start(source, "Question", "request");
    await recoverConversationTurn(journal, async () => receipt);
    assert.equal(
      conversationTurnJournal(
        reloaded,
        account,
        "client",
        "conversation",
      ).read(),
      undefined,
    );
    assert.equal(
      conversationTurnJournal(
        cache,
        account,
        "other-client",
        "conversation",
      ).read(),
      undefined,
    );
    await assert.rejects(
      recoverConversationTurn(
        conversationTurnJournal(reloaded, account, "client", "conversation"),
        async () => receipt,
      ),
    );
  } finally {
    cache.clear();
    reloaded.clear();
  }
});

test("synthetic: foreign source binding is rejected and only the accepted successor can begin the next intent", async () => {
  const { cache, journal } = setup();
  try {
    assert.throws(() =>
      journal.start({ ...source, actorId: "foreign" }, "Question", "request"),
    );
    journal.start(source, "Question", "request");
    await recoverConversationTurn(journal, async () => receipt);
    assert.throws(() =>
      journal.start({ ...target, runId: "unrelated" }, "Replacement", "new"),
    );
    assert.throws(() =>
      journal.start({ ...target, writerFence: 9 }, "Replacement", "new"),
    );
    assert.equal(
      journal.start(target, "Next question", "next-request").source.runId,
      target.runId,
    );
  } finally {
    cache.clear();
  }
});

test("synthetic: late recovery of an older source cannot replace a successor command identity", async () => {
  const { cache, journal } = setup();
  try {
    journal.start(source, "Question", "request");
    await recoverConversationTurn(journal, async () => receipt);
    let release;
    const late = recoverConversationTurn(
      journal,
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    journal.start(target, "Next question", "next-request");
    release({ ...receipt, state: "ACCEPTED", replayed: true });
    await assert.rejects(late);
    assert.equal(journal.read().requestId, "next-request");
    assert.equal(journal.read().source.runId, target.runId);
  } finally {
    cache.clear();
  }
});

test("synthetic: the retained receipt snapshots bindings instead of keeping a caller-mutable target", async () => {
  const { cache, journal } = setup();
  try {
    journal.start(source, "Question", "request");
    const mutable = structuredClone(receipt);
    await recoverConversationTurn(journal, async () => mutable);
    mutable.targetBinding.runId = "rewritten";
    assert.equal(journal.read().receipt.targetBinding.runId, target.runId);
    assert.throws(() => {
      journal.read().receipt.targetBinding.writerFence = 999;
    });
  } finally {
    cache.clear();
  }
});
