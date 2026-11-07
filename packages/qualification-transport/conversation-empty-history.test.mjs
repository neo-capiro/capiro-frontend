import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_HISTORY_SCHEMA } from "@capiro/meri-contracts/conversation-application";
import { fixture, binding, scopes, id } from "./conversation-fixture.mjs";

const empty = () => ({ schema: EMPTY_HISTORY_SCHEMA, binding, scopes });
const setup = (t) => {
  const f = fixture();
  t.after(f.close);
  return f;
};

test("empty history does not accept or erase an uncertain request and never starts observation", async (t) => {
  const f = setup(t);
  f.override = (call) =>
    call.path.endsWith("/input/admit")
      ? Response.json(
          { error: { code: "CONVERSATION_UNAVAILABLE" } },
          { status: 503 },
        )
      : undefined;
  await assert.rejects(f.submit());
  assert.equal(f.client.getSnapshot().submit, "unknown");
  const calls = f.calls.length;
  f.override = (call) =>
    call.path.endsWith("/history") ? Response.json(empty()) : undefined;
  const snapshot = await f.client.history();
  assert.equal(snapshot.status, "ready");
  assert.equal(snapshot.submit, "unknown");
  assert.equal(snapshot.observation, null);
  assert.equal(snapshot.acceptedRequest, null);
  assert.equal(f.calls.length, calls + 1);
  assert.throws(() => f.client.openChat());
  await assert.rejects(f.client.cancel());
  f.override = undefined;
  await f.client.retrySubmit();
  assert.deepEqual(
    f.calls.filter((c) => c.path.endsWith("/input/admit")).map((c) => c.body),
    [
      { requestId: id(6), prompt: "Hello" },
      { requestId: id(6), prompt: "Hello" },
    ],
  );
});

test("empty history cannot replace a positive admitted run or cursor", async (t) => {
  const f = setup(t);
  await f.client.history();
  f.override = () => Response.json(empty());
  await assert.rejects(f.client.history());
  assert.equal(f.client.getSnapshot().status, "unavailable");
  assert.equal(f.client.getSnapshot().observation, null);
});

for (const change of [
  (value) => ({ ...value, binding: { ...binding, runId: id(99) } }),
  (value) => ({ ...value, scopes: [{ ...scopes[0], resourceId: id(99) }] }),
])
  test("empty history keeps exact session and client binding checks", async (t) => {
    const f = setup(t);
    f.override = () => Response.json(change(empty()));
    await assert.rejects(f.client.history());
    assert.notEqual(f.client.getSnapshot().status, "ready");
  });

test("a nonzero cursor never accepts an empty history response", async (t) => {
  const f = setup(t);
  f.override = () => Response.json(empty());
  await assert.rejects(f.client.history({ after: 1 }));
  assert.notEqual(f.client.getSnapshot().status, "ready");
});
