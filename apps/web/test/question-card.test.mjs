/** Clarifying questions in the conversation surface: pending projection from durable events, answer mapping and the exact
 * lifecycle control the browser submits. Pure source, no server, no React render. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  pendingQuestion, questionOutcome, questionAnswers, answerControl,
} from "../../../packages/meri-client/src/conversation-questions.ts";

const pendingEvent = (questionId, over = {}) => ({
  type: "question.pending",
  sequence: 1,
  data: {
    questionId,
    toolUseId: "toolu_1",
    questionsSha256: "a".repeat(64),
    expiresAt: "2026-10-29T12:15:00.000Z",
    questions: [
      { question: "How should I format the output?", header: "Format", multiSelect: false,
        options: [{ label: "Summary", description: "Brief" }, { label: "Detailed", description: "Full" }] },
      { question: "Which sections?", header: "Sections", multiSelect: true,
        options: [{ label: "Introduction", description: "Open" }, { label: "Conclusion", description: "Close" }] },
    ],
    ...over,
  },
});
const answered = (questionId, outcome = "answered") => ({ type: "question.answered", sequence: 2, data: { questionId, outcome, reasonCode: outcome === "answered" ? null : "USER_QUESTION_CANCELLED" } });
const id = "00000000-0000-4000-8000-000000000101";

test("the pending question is read from durable events, not from client state", () => {
  assert.equal(pendingQuestion([]), null);
  const open = pendingQuestion([pendingEvent(id)]);
  assert.equal(open.questionId, id);
  assert.equal(open.questions.length, 2);
  assert.equal(open.questions[1].multiSelect, true);
  assert.equal(open.questions[0].options[0].label, "Summary");
  assert.equal(pendingQuestion([pendingEvent(id), answered(id)]), null, "a resolved question never reopens the card");
  assert.equal(questionOutcome([pendingEvent(id), answered(id)], id), "answered");
  assert.equal(questionOutcome([pendingEvent(id), answered(id, "cancelled")], id), "cancelled");
  assert.equal(questionOutcome([pendingEvent(id)], id), null);
  // An event for another question id never resolves this one.
  assert.equal(pendingQuestion([pendingEvent(id), answered("00000000-0000-4000-8000-000000000202")]).questionId, id);
  // A malformed pending payload is ignored rather than rendered as an empty question.
  assert.equal(pendingQuestion([{ type: "question.pending", data: { questionId: id } }]), null);
});

test("a selection becomes an answers record keyed by the asked question text", () => {
  const open = pendingQuestion([pendingEvent(id)]);
  assert.deepEqual(questionAnswers(open, {
    "How should I format the output?": "Summary",
    "Which sections?": ["Introduction", "Conclusion"],
  }), {
    "How should I format the output?": "Summary",
    "Which sections?": ["Introduction", "Conclusion"],
  });
  // Free text is the answer to its own question, never a detached reply.
  assert.deepEqual(questionAnswers(open, { "Which sections?": ["Introduction"] }, { "How should I format the output?": "a one-page brief" }), {
    "How should I format the output?": "a one-page brief",
    "Which sections?": ["Introduction"],
  });
  // A single value on a multi-select question becomes that one label.
  assert.deepEqual(questionAnswers(open, { "How should I format the output?": "Summary", "Which sections?": "Introduction" }), {
    "How should I format the output?": "Summary",
    "Which sections?": ["Introduction"],
  });
});

test("an incomplete or impossible selection is refused instead of submitting a partial answer", () => {
  const open = pendingQuestion([pendingEvent(id)]);
  assert.throws(() => questionAnswers(open, { "How should I format the output?": "Summary" }), /QUESTION_UNANSWERED/);
  assert.throws(() => questionAnswers(open, { "How should I format the output?": ["Summary"], "Which sections?": "Introduction" }), /QUESTION_SELECTION_INVALID/);
  assert.throws(() => questionAnswers(open, { "How should I format the output?": "Summary", "Which sections?": ["Invented"] }), /QUESTION_SELECTION_INVALID/);
  assert.throws(() => questionAnswers(open, { "How should I format the output?": "   ", "Which sections?": "Introduction" }), /QUESTION_SELECTION_INVALID/);
});

test("the submitted control is the existing answer intent with its own idempotent control id", () => {
  const controlId = "00000000-0000-4000-8000-000000000303";
  const control = answerControl(id, { "How should I format the output?": "Summary" }, controlId);
  assert.deepEqual(control, { controlId, intent: "answer", questionId: id, answers: { "How should I format the output?": "Summary" } });
  assert.equal(Object.keys(control).length, 4, "no prompt, proposal or extra surface rides along");
});
