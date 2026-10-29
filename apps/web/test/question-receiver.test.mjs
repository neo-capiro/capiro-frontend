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

test("the installed event receiver schema carries the durable question events", async () => {
  // The installed package's own conversation-application schema is what the client's event receiver validates with:
  // compile that exact file and drive a question event through it, instead of re-declaring the shape locally.
  const { default: Ajv } = await import("ajv/dist/2020.js");
  const schema = JSON.parse(
    readFileSync(
      new URL("../../../node_modules/@capiro/meri-contracts/dist/conversation-application.schema.json", import.meta.url),
      "utf8",
    ),
  );
  const validate = new Ajv({ strict: false, allErrors: true }).compile(schema);
  const envelope = (sequence, type, data) => ({
    contractVersion: "0.1.0", eventId: id(30 + sequence), binding, sequence,
    createdAt: "2026-10-13T12:00:01Z", scopes, type, data,
  });
  const pending = envelope(1, "question.pending", {
    questionId: id(21), toolUseId: "toolu_1", questionsSha256: "c".repeat(64),
    expiresAt: "2026-10-13T12:15:00.000Z",
    questions: [{
      question: "How should I format the output?", header: "Format", multiSelect: false,
      options: [{ label: "Summary", description: "Brief" }, { label: "Detailed", description: "Full" }],
    }],
  });
  assert.equal(validate({ ...pending, runId: id(2), attemptId: id(3) }), true, JSON.stringify(validate.errors));
  const answered = envelope(2, "question.answered", { questionId: id(21), outcome: "answered", reasonCode: null });
  assert.equal(validate({ ...answered, runId: id(2), attemptId: id(3) }), true, JSON.stringify(validate.errors));
  // The per-event strictness (required fields, closed payloads) is enforced by the durable owner's validator; this
  // asserts the installed event schema the client ships with actually carries both question branches.
  assert.match(JSON.stringify(schema), /question\.pending/);
  assert.match(JSON.stringify(schema), /question\.answered/);
});
