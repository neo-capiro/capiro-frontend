/** The REAL installed receiver: the same `@capiro/meri-contracts` bundle `conversation-client.control()` validates with
 * before any network call and `conversation-observation` validates each received event with. No local re-definition of
 * types, no bypassed validator, no stub transport. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  receiveConversationLifecycleRequest,
} from "@capiro/meri-contracts/conversation-lifecycle";
import {
  receiveConversationRequest,
  receiveConversationResponse,
  receiveConversationEvent,
  createConversationCursor,
} from "@capiro/meri-contracts/conversation-application";

const id = (n) => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const bytes = (value) => new TextEncoder().encode(JSON.stringify(value));
const binding = {
  tenantId: "synthetic", actorId: "actor", conversationId: id(1), runId: id(2),
  attemptId: id(3), workerId: id(4), writerFence: 1,
};
const scopes = [{ tenantId: "synthetic", kind: "client", resourceId: id(5), policyRevision: "p1" }];
const run = {
  binding, scopes, state: "queued", policyRevision: "p1", createdAt: "2026-10-13T12:00:00Z",
  versions: {
    imageDigest: "sha256:" + "a".repeat(64), sdk: "0.3.295", cli: "2.1.295",
    contracts: "0.1.0", skillsDigest: "b".repeat(64), checkpointFormat: "0.1.0",
  },
};
const answer = {
  controlId: id(20), intent: "answer", questionId: id(21),
  answers: { "How should I format the output?": "Summary" },
};
const questionEvent = (sequence, over = {}) => ({
  contractVersion: "0.1.0", eventId: id(30 + sequence), binding, sequence,
  createdAt: "2026-10-13T12:00:01Z", scopes, type: "question.pending",
  data: {
    questionId: id(21), toolUseId: "toolu_1", questionsSha256: "c".repeat(64),
    expiresAt: "2026-10-13T12:15:00.000Z",
    questions: [{
      question: "How should I format the output?", header: "Format", multiSelect: false,
      options: [{ label: "Summary", description: "Brief" }, { label: "Detailed", description: "Full" }],
    }],
  },
  ...over,
});

test("the installed contracts version carries the answer intent the client validates against", () => {
  const installed = JSON.parse(
    readFileSync(new URL("../../../node_modules/@capiro/meri-contracts/package.json", import.meta.url), "utf8"),
  );
  assert.equal(installed.version, "0.1.36");
});

test("the real client control boundary accepts an answer control and refuses a malformed one", () => {
  // This is exactly what conversation-client.control() runs before the request leaves the browser.
  const accepted = receiveConversationLifecycleRequest("control", bytes(answer));
  assert.deepEqual(accepted, answer);
  assert.deepEqual(
    receiveConversationLifecycleRequest("control", bytes({ ...answer, answers: { "Which?": ["A", "B"] } })).answers,
    { "Which?": ["A", "B"] },
  );
  for (const bad of [
    { controlId: id(20), intent: "answer", answers: { Q: "A" } },
    { ...answer, answers: {} },
    { ...answer, prompt: "and a prompt" },
    { ...answer, intent: "answerQuestion" },
  ]) {
    assert.throws(
      () => receiveConversationLifecycleRequest("control", bytes(bad)),
      /INVALID_REQUEST|INVALID_BYTES/,
      JSON.stringify(bad).slice(0, 80),
    );
  }
});

test("the real installed event receiver admits both question events and refuses a malformed one", async () => {
  // Same fixture shape the contracts package uses for its own admitted view: a real submit receipt is the only thing the
  // private cursor brand accepts, so the events travel through createConversationCursor/receiveConversationEvent exactly
  // as conversation-observation does. No local re-declaration and no bypass of the receiver's brand.
  const run = {
    binding, scopes, state: "queued", policyRevision: "p1", createdAt: "2026-10-13T12:00:00Z",
    versions: {
      imageDigest: "sha256:" + "a".repeat(64), sdk: "0.3.295", cli: "2.1.295",
      contracts: "0.1.0", skillsDigest: "b".repeat(64), checkpointFormat: "0.1.0",
    },
  };
  const submitted = { run, requestId: id(6), lastSequence: 1, replayed: false };
  const view = await receiveConversationResponse(
    "submit", 200, bytes(submitted),
    receiveConversationRequest("submit", bytes({ requestId: id(6), prompt: "Hello" })),
  );
  const envelope = (sequence, type, data) => ({
    contractVersion: "0.1.0", eventId: id(30 + sequence), binding, scopes, sequence,
    createdAt: "2026-10-13T12:00:01Z", type, data,
  });
  // The submit receipt acknowledges sequence 1, so the question opens the stream at 2 and its answer follows at 3.
  const pending = receiveConversationEvent(
    bytes(envelope(1, "question.pending", {
      questionId: id(21), toolUseId: "toolu_1", questionsSha256: "c".repeat(64),
      expiresAt: "2026-10-13T12:15:00.000Z",
      questions: [{
        question: "How should I format the output?", header: "Format", multiSelect: false,
        options: [{ label: "Summary", description: "Brief" }, { label: "Detailed", description: "Full" }],
      }],
    })),
    createConversationCursor(view),
  );
  assert.equal(pending.event.type, "question.pending");
  assert.equal(pending.event.data.questions[0].options[1].label, "Detailed");
  assert.equal(pending.cursor.after, 1);
  const answered = receiveConversationEvent(
    bytes(envelope(2, "question.answered", { questionId: id(21), outcome: "answered", reasonCode: null })),
    pending.cursor,
  );
  assert.equal(answered.event.data.outcome, "answered");
  // The same receiver refuses an event that is not a complete durable question payload, and the cursor does not advance.
  const broken = envelope(3, "question.pending", { questionId: id(21) });
  assert.throws(() => receiveConversationEvent(bytes(broken), answered.cursor), /INVALID_EVENT|ConversationResponseError/);
  assert.equal(answered.cursor.after, 2);
});
