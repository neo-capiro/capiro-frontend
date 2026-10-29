/** The command the question card actually submits, driven against an inert scripted port.
 *
 * These are the seams that the rendered-markup and reducer tests could not reach: the re-read of the current durable
 * view immediately before sending, the deadline that passes between render and submit, and the three acknowledgements the
 * control route can produce (a state receipt, a 502 with a nested `outcome`, or a thrown transport error). Nothing here
 * mounts React or touches the network — the hook is a thin caller of `answerCommand`, and deployed browser acceptance
 * covers the mount itself.
 */
import { describe, expect, it } from "vitest";
import {
  answerCommand,
  controlOutcome,
  questionPhase,
  type QuestionPhase,
} from "../src/features/meri/conversation/useRunQuestion";
import type { PendingQuestion } from "@capiro/meri-client/conversation";

const ID = "00000009-0000-4000-8000-000000000000";
const OTHER = "0000000a-0000-4000-8000-000000000000";

const question = (over: Partial<PendingQuestion> = {}): PendingQuestion => ({
  questionId: ID,
  expiresAt: "2026-10-29T18:00:00.000Z",
  questions: [
    {
      question: "How should I format the output?",
      header: "Format",
      multiSelect: false,
      options: [
        { label: "Summary", description: "Brief" },
        { label: "Detailed", description: "Full" },
      ],
    },
  ],
  ...over,
});

const event = (value: PendingQuestion) => ({ type: "question.pending", data: value });

/** An inert port: no network, no timers, and a record of every control it was asked to send. */
const port = ({ events, runState }: { events: readonly unknown[]; runState: string | null }) => {
  const sent: unknown[] = [];
  return {
    sent,
    getSnapshot: () => ({
      observation: runState === null ? null : { events, runState },
    }),
    control: async (request: unknown): Promise<unknown> => {
      sent.push(request);
      throw new Error("unscripted control");
    },
    subscribe: () => () => {},
  };
};

const NONE = "2026-10-29T18:00:00.000Z";
const BEFORE = Date.parse("2026-10-29T17:59:00.000Z");
const AFTER = Date.parse("2026-10-29T18:00:01.000Z");

describe("control acknowledgements", () => {
  it("reads the nested 502 outcome instead of treating it as a refusal", () => {
    expect(controlOutcome({ error: { code: "LIFECYCLE_EFFECT_UNKNOWN", outcome: "UNKNOWN" } })).toBe("UNKNOWN");
    expect(controlOutcome({ error: { code: "LIFECYCLE_INPUT_REFUSED", outcome: "NOT_DISPATCHED" } })).toBe("NOT_DISPATCHED");
    expect(controlOutcome({ state: "APPLIED" })).toBe("PENDING");
    expect(controlOutcome({ state: "UNKNOWN" })).toBe("UNKNOWN");
    expect(controlOutcome(undefined)).toBe("UNKNOWN");
  });
});

describe("answer command", () => {
  it("does not send at all when the deadline passed between render and submit", async () => {
    const target = port({ events: [event(question({ expiresAt: NONE }))], runState: "streaming" });
    const result = await answerCommand({
      port: target as never,
      pending: question({ expiresAt: NONE }),
      selection: { "How should I format the output?": "Summary" },
      freeText: {},
      controlId: "control-1",
      now: AFTER,
    });
    expect(result).toEqual({ kind: "skipped", reason: "expired" });
    expect(target.sent).toHaveLength(0);
  });

  it("does not send for a question the view no longer shows as pending", async () => {
    const target = port({ events: [], runState: "streaming" });
    const result = await answerCommand({
      port: target as never,
      pending: question(),
      selection: { "How should I format the output?": "Summary" },
      freeText: {},
      controlId: "control-1",
      now: BEFORE,
    });
    expect(result).toEqual({ kind: "skipped", reason: "not-current" });
    expect(target.sent).toHaveLength(0);
  });

  it("does not send once the run has settled", async () => {
    const target = port({ events: [event(question())], runState: "paused" });
    const result = await answerCommand({
      port: target as never,
      pending: question(),
      selection: { "How should I format the output?": "Summary" },
      freeText: {},
      controlId: "control-1",
      now: BEFORE,
    });
    expect(result).toEqual({ kind: "skipped", reason: "settled" });
    expect(target.sent).toHaveLength(0);
  });

  it("keeps a genuinely unknown delivery unconfirmed and sends exactly one control", async () => {
    const target = port({ events: [event(question())], runState: "streaming" });
    target.control = async (request: unknown) => {
      target.sent.push(request);
      return { error: { code: "LIFECYCLE_EFFECT_UNKNOWN", outcome: "UNKNOWN" } };
    };
    const result = await answerCommand({
      port: target as never,
      pending: question(),
      selection: { "How should I format the output?": "Summary" },
      freeText: {},
      controlId: "control-1",
      now: BEFORE,
    });
    expect(result).toEqual({ kind: "phase", phase: "unknown" });
    // The latched phase is what stops a blind resend: a second submit from the card never happens without a new choice.
    expect(questionPhase("unknown", { type: "result", phase: "unknown" })).toBe("unknown");
    expect(target.sent).toHaveLength(1);
    expect((target.sent[0] as { controlId: string }).controlId).toBe("control-1");
  });

  it("treats a lost response after dispatch as unknown, not as a correctable refusal", async () => {
    const target = port({ events: [event(question())], runState: "streaming" });
    target.control = async (request: unknown) => {
      target.sent.push(request);
      throw new TypeError("fetch failed");
    };
    const result = await answerCommand({
      port: target as never,
      pending: question(),
      selection: { "How should I format the output?": "Summary" },
      freeText: {},
      controlId: "control-1",
      now: BEFORE,
    });
    expect(result).toEqual({ kind: "phase", phase: "unknown" });
    expect(target.sent).toHaveLength(1);
  });

  it("marks a not-dispatchable refusal correctable and sends it once", async () => {
    const target = port({ events: [event(question())], runState: "streaming" });
    target.control = async (request: unknown) => {
      target.sent.push(request);
      return { error: { code: "LIFECYCLE_INPUT_REFUSED", outcome: "NOT_DISPATCHED" } };
    };
    const result = await answerCommand({
      port: target as never,
      pending: question(),
      selection: { "How should I format the output?": "Summary" },
      freeText: {},
      controlId: "control-1",
      now: BEFORE,
    });
    expect(result).toEqual({ kind: "phase", phase: "rejected" });
    expect(target.sent).toHaveLength(1);
  });

  it("keeps an applied answer waiting for the durable record", async () => {
    const target = port({ events: [event(question())], runState: "streaming" });
    target.control = async (request: unknown) => {
      target.sent.push(request);
      return { controlId: "control-1", intent: "answer", state: "APPLIED" };
    };
    const result = await answerCommand({
      port: target as never,
      pending: question(),
      selection: { "How should I format the output?": "Summary" },
      freeText: {},
      controlId: "control-1",
      now: BEFORE,
    });
    expect(result).toEqual({ kind: "phase", phase: "waiting" });
  });

  it("refuses a local selection without sending anything", async () => {
    const target = port({ events: [event(question())], runState: "streaming" });
    const result = await answerCommand({
      port: target as never,
      pending: question(),
      selection: { "How should I format the output?": ["Summary"] },
      freeText: {},
      controlId: "control-1",
      now: BEFORE,
    });
    expect(result).toEqual({ kind: "phase", phase: "local" });
    expect(target.sent).toHaveLength(0);
  });

  it("does not send for a previous question when the view has moved on", async () => {
    const target = port({ events: [event(question({ questionId: OTHER }))], runState: "streaming" });
    const result = await answerCommand({
      port: target as never,
      pending: question({ questionId: ID }),
      selection: { "How should I format the output?": "Summary" },
      freeText: {},
      controlId: "control-1",
      now: BEFORE,
    });
    expect(result).toEqual({ kind: "skipped", reason: "not-current" });
    expect(target.sent).toHaveLength(0);
  });
});

describe("phase transitions", () => {
  const run = (actions: readonly Parameters<typeof questionPhase>[1][]): QuestionPhase =>
    actions.reduce<QuestionPhase>(questionPhase, "open");

  it("returns to an answerable phase only for a proven refusal or a correctable local problem", () => {
    expect(run([{ type: "result", phase: "rejected" }])).toBe("rejected");
    expect(run([{ type: "result", phase: "local" }])).toBe("local");
    expect(run([{ type: "submitted" }, { type: "result", phase: "waiting" }])).toBe("waiting");
  });

  it("latches unknown and a superseded conversation so neither offers a resend", () => {
    expect(run([{ type: "result", phase: "unknown" }])).toBe("unknown");
    expect(run([{ type: "result", phase: "error" }])).toBe("error");
    expect(run([{ type: "result", phase: "unknown" }, { type: "reset" }])).toBe("open");
  });
});
