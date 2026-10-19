import test from "node:test";
import assert from "node:assert/strict";
import { conversationSelection } from "../src/shared/meri-conversations/selection.ts";

const id = "30000000-0000-4000-8000-000000000003";
test("synthetic: an explicit canonical conversation selector survives reload as the same hint", () => {
  const search = new URLSearchParams({
    clientId: "untrusted-client-hint",
    conversationId: id,
  });
  assert.deepEqual(conversationSelection(search), {
    state: "selected",
    conversationId: id,
  });
  assert.deepEqual(
    conversationSelection(new URLSearchParams(search.toString())),
    conversationSelection(search),
  );
});
test("synthetic: absent selector permits current selection while empty/malformed selectors never broaden", () => {
  assert.deepEqual(conversationSelection(new URLSearchParams()), {
    state: "current",
  });
  for (const value of [
    "",
    "undefined",
    "../another",
    "A0000000-0000-4000-8000-000000000003",
  ])
    assert.deepEqual(
      conversationSelection(new URLSearchParams({ conversationId: value })),
      { state: "invalid" },
    );
});
test("synthetic: duplicate conversation selectors fail closed even when equal", () => {
  assert.deepEqual(
    conversationSelection(
      new URLSearchParams(`conversationId=${id}&conversationId=${id}`),
    ),
    { state: "invalid" },
  );
});
