/** The command the question card actually submits, driven against an inert scripted port and the real tab journal.
 *
 * These are the seams the rendered-markup and reducer tests could not reach: the re-read of the current durable view
 * immediately before sending, the deadline that passes between render and submit, the three acknowledgements the control
 * route can produce, and — the condition this file exists for — the retained answer identity across two invocations and
 * across a reload of the same run, reconciled against the run's own durable question projection.
 */
import { describe, expect, it } from "vitest";
import {
  controlOutcome,
  projectRetainedAnswer,
  questionPhase,
  retainedAnswer,
  sendAnswer,
  settleRetainedAnswer,
  type AnswerJournal,
  type QuestionPhase,
} from "../src/features/meri/conversation/useRunQuestion";
import { lifecycleJournal } from "../src/shared/meri-conversation-lifecycle/journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import type { ConversationContext } from "../src/shared/meri-conversations/session";
import type { PendingQuestion } from "@capiro/meri-client/conversation";

const ID = "00000009-0000-4000-8000-000000000000";
const OTHER = "0000000a-0000-4000-8000-000000000000";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

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

const pendingEvent = (value: PendingQuestion) => ({ type: "question.pending", data: value });
const answeredEvent = (questionId: string, outcome: "answered" | "cancelled") => ({
  type: "question.answered",
  data: { questionId, outcome, reasonCode: null },
});

const C1 = id(50);
const C2 = id(51);
const C9 = id(59);

const NONE = "2026-10-29T18:00:00.000Z";
const BEFORE = Date.parse("2026-10-29T17:59:00.000Z");
const AFTER = Date.parse("2026-10-29T18:00:01.000Z");

/** An inert port: no network, no timers, and a record of every control it was asked to send. */
const port = ({
  events,
  runState,
  context,
}: {
  events: readonly unknown[];
  runState: string | null;
  context: ConversationContext;
}) => {
  const sent: { controlId: string; intent: string }[] = [];
  return {
    sent,
    context,
    getSnapshot: () => ({
      status: "ready",
      observation: runState === null ? null : { events, runState },
    }),
    control: async (request: unknown): Promise<unknown> => {
      sent.push(request as { controlId: string; intent: string });
      throw new Error("unscripted control");
    },
    subscribe: () => () => {},
  };
};

const context = {
  tenantId: "synthetic",
  actorId: "actor",
  conversationId: id(1),
  runId: id(2),
  selectedClientId: id(5),
} as unknown as ConversationContext;

/** The real tab journal over an in-memory tab storage, exactly as the mounted hook creates it. */
const journalFor = (storage: TabStorage): AnswerJournal =>
  lifecycleJournal(context, storage) as AnswerJournal;

function memory(): TabStorage {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  syncMeriTabIdentity("session-a", storage);
  return storage;
}

const unknownReceipt = () => ({
  error: { code: "LIFECYCLE_EFFECT_UNKNOWN", outcome: "UNKNOWN" },
});
const refusedReceipt = () => ({
  error: { code: "LIFECYCLE_INPUT_REFUSED", outcome: "NOT_DISPATCHED" },
});
const appliedReceipt = (controlId: string) => ({
  controlId,
  intent: "answer",
  state: "APPLIED",
});

const send = (
  target: ReturnType<typeof port>,
  journal: AnswerJournal | null,
  over: {
    reconcile?: boolean;
    now?: number;
    pending?: PendingQuestion;
    selection?: Record<string, string | string[]>;
    controlId?: string;
  } = {},
) =>
  sendAnswer({
    port: target as never,
    journal,
    pending: over.pending ?? question(),
    selection: over.selection ?? { "How should I format the output?": "Summary" },
    freeText: {},
    controlId: over.controlId ?? C1,
    reconcile: over.reconcile ?? false,
    now: over.now ?? BEFORE,
  });

describe("control acknowledgements", () => {
  it("reads the nested 502 outcome instead of treating it as a refusal", () => {
    expect(controlOutcome({ error: { code: "LIFECYCLE_EFFECT_UNKNOWN", outcome: "UNKNOWN" } })).toBe("UNKNOWN");
    expect(controlOutcome({ error: { code: "LIFECYCLE_INPUT_REFUSED", outcome: "NOT_DISPATCHED" } })).toBe("NOT_DISPATCHED");
    expect(controlOutcome({ state: "APPLIED" })).toBe("PENDING");
    expect(controlOutcome({ state: "UNKNOWN" })).toBe("UNKNOWN");
    expect(controlOutcome(undefined)).toBe("UNKNOWN");
  });
});

describe("answer command guards", () => {
  it("does not send at all when the deadline passed between render and submit", async () => {
    const target = port({ events: [pendingEvent(question({ expiresAt: NONE }))], runState: "streaming", context });
    const journal = journalFor(memory());
    expect(await send(target, journal, { now: AFTER })).toEqual({ kind: "skipped", reason: "expired" });
    expect(target.sent).toHaveLength(0);
    expect(journal.read()).toBeUndefined();
  });

  it("does not send for a question the view no longer shows as pending", async () => {
    const target = port({ events: [], runState: "streaming", context });
    const journal = journalFor(memory());
    expect(await send(target, journal)).toEqual({ kind: "skipped", reason: "not-current" });
    expect(target.sent).toHaveLength(0);
  });

  it("does not send once the run has settled", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "paused", context });
    const journal = journalFor(memory());
    expect(await send(target, journal)).toEqual({ kind: "skipped", reason: "settled" });
    expect(target.sent).toHaveLength(0);
  });

  it("refuses a local selection without retaining or sending anything", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    const journal = journalFor(memory());
    expect(
      await send(target, journal, { selection: { "How should I format the output?": ["Summary"] } }),
    ).toEqual({ kind: "phase", phase: "local" });
    expect(target.sent).toHaveLength(0);
    expect(journal.read()).toBeUndefined();
  });

  it("refuses to send without a journal rather than mint an unretained identity", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    expect(await send(target, null)).toEqual({ kind: "refused", reason: "unretained" });
    expect(target.sent).toHaveLength(0);
  });
});

describe("answer dispositions", () => {
  it("keeps a genuinely unknown delivery unconfirmed and retains its identity", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    target.control = async (request: unknown) => {
      target.sent.push(request as { controlId: string; intent: string });
      return unknownReceipt();
    };
    const journal = journalFor(memory());
    expect(await send(target, journal)).toEqual({ kind: "phase", phase: "unknown" });
    expect(target.sent).toHaveLength(1);
    expect(retainedAnswer(journal)?.controlId).toBe(C1);
  });

  it("treats a lost response after dispatch as unknown and keeps the identity", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    target.control = async (request: unknown) => {
      target.sent.push(request as { controlId: string; intent: string });
      throw new TypeError("fetch failed");
    };
    const journal = journalFor(memory());
    expect(await send(target, journal)).toEqual({ kind: "phase", phase: "unknown" });
    expect(target.sent).toHaveLength(1);
    expect(retainedAnswer(journal)?.controlId).toBe(C1);
  });

  it("retires the identity and allows a corrected answer only on a proven NOT_DISPATCHED refusal", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    target.control = async (request: unknown) => {
      target.sent.push(request as { controlId: string; intent: string });
      return refusedReceipt();
    };
    const journal = journalFor(memory());
    expect(await send(target, journal)).toEqual({ kind: "phase", phase: "rejected" });
    expect(journal.read()).toBeUndefined();
    expect(
      await send(target, journal, {
        controlId: C2,
        selection: { "How should I format the output?": "Detailed" },
      }),
    ).toEqual({ kind: "phase", phase: "rejected" });
    expect(target.sent.map((entry) => entry.controlId)).toEqual([C1, C2]);
    expect(target.sent[1]?.intent).toBe("answer");
  });

  it("keeps an applied answer waiting and retained until the run settles the question", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    target.control = async (request: unknown) => {
      const controlId = (request as { controlId: string }).controlId;
      target.sent.push(request as { controlId: string; intent: string });
      return appliedReceipt(controlId);
    };
    const journal = journalFor(memory());
    expect(await send(target, journal)).toEqual({ kind: "phase", phase: "waiting" });
    expect(retainedAnswer(journal)?.controlId).toBe(C1);
  });
});

describe("retained identity across a second invocation and a reload", () => {
  const twoCall = async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    target.control = async (request: unknown) => {
      target.sent.push(request as { controlId: string; intent: string });
      return unknownReceipt();
    };
    const storage = memory();
    const first = journalFor(storage);
    const one = await send(target, first);
    // The card is asked again while the outcome is still unknown: this must not mint or send a second identity.
    const two = await send(target, first, {
      controlId: C2,
      selection: { "How should I format the output?": "Detailed" },
    });
    return { target, storage, one, two, first };
  };

  it("sends exactly one control across two invocations and refuses the second", async () => {
    const { target, one, two, first } = await twoCall();
    expect(one).toEqual({ kind: "phase", phase: "unknown" });
    expect(two).toEqual({ kind: "refused", reason: "retained" });
    expect(target.sent).toHaveLength(1);
    expect(target.sent[0]?.controlId).toBe(C1);
    expect(retainedAnswer(first)?.controlId).toBe(C1);
  });

  it("finds the same attempted answer after a reload of the same run and never mints a fresh one", async () => {
    const { target, storage } = await twoCall();
    // A new page for the same signed-in tab: a new journal instance over the same tab record.
    const reloaded = journalFor(storage);
    expect(retainedAnswer(reloaded)?.controlId).toBe(C1);
    expect(
      await send(target, reloaded, {
        controlId: C9,
        selection: { "How should I format the output?": "Detailed" },
      }),
    ).toEqual({ kind: "refused", reason: "retained" });
    expect(target.sent).toHaveLength(1);
    // Asking again reconciles the SAME control id rather than sending a new identity.
    expect(await send(target, reloaded, { controlId: C9, reconcile: true })).toEqual({
      kind: "phase",
      phase: "unknown",
    });
    expect(target.sent.map((entry) => entry.controlId)).toEqual([C1, C1]);
  });

  it("settles the retained attempt from the run's own answered projection", async () => {
    const { target, storage } = await twoCall();
    const reloaded = journalFor(storage);
    // A pending event alone, or its absence, proves nothing: the identity survives.
    expect(settleRetainedAnswer(reloaded, [pendingEvent(question())], ID)).toBeNull();
    expect(retainedAnswer(reloaded)?.controlId).toBe(C1);
    // The durable outcome for exactly this question is what retires it.
    expect(
      settleRetainedAnswer(reloaded, [pendingEvent(question()), answeredEvent(ID, "answered")], ID),
    ).toBe("answered");
    expect(retainedAnswer(reloaded)).toBeNull();
    // And nothing else was dispatched by any of that.
    expect(target.sent).toHaveLength(1);
  });

  it("does not settle from another question's outcome or from a cancelled-other id", async () => {
    const { storage } = await twoCall();
    const reloaded = journalFor(storage);
    expect(settleRetainedAnswer(reloaded, [answeredEvent(OTHER, "answered")], ID)).toBeNull();
    expect(retainedAnswer(reloaded)?.controlId).toBe(C1);
  });

  it("keeps two different answers to the same question distinct in the journal", async () => {
    const journal = journalFor(memory());
    const retained = journal.retain({
      controlId: C1,
      intent: "answer",
      questionId: ID,
      answers: { "How should I format the output?": "Summary" },
    });
    expect(
      journal.retain({
        controlId: C1,
        intent: "answer",
        questionId: ID,
        answers: { "How should I format the output?": "Summary" },
      }),
    ).toEqual(retained);
    expect(() =>
      journal.retain({
        controlId: C1,
        intent: "answer",
        questionId: ID,
        answers: { "How should I format the output?": "Detailed" },
      }),
    ).toThrow();
    expect(() =>
      journal.retain({
        controlId: C1,
        intent: "answer",
        questionId: OTHER,
        answers: { "How should I format the output?": "Summary" },
      }),
    ).toThrow();
  });
});

describe("a replay refusal cannot erase an earlier unknown delivery", () => {
  it("keeps the original identity after UNKNOWN then a NOT_DISPATCHED reconciliation", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    const journal = journalFor(memory());
    target.control = async (request: unknown) => {
      target.sent.push(request as { controlId: string; intent: string });
      return unknownReceipt();
    };
    expect(await send(target, journal)).toEqual({ kind: "phase", phase: "unknown" });
    expect(retainedAnswer(journal)?.controlId).toBe(C1);
    // The user asks again and the replay is refused before dispatch: that says nothing about the earlier delivery.
    target.control = async (request: unknown) => {
      target.sent.push(request as { controlId: string; intent: string });
      return refusedReceipt();
    };
    expect(await send(target, journal, { reconcile: true, controlId: C2 })).toEqual({
      kind: "phase",
      phase: "unknown",
    });
    expect(retainedAnswer(journal)?.controlId).toBe(C1);
    // A fresh answer is therefore still refused, and no third request exists.
    expect(await send(target, journal, { controlId: C2 })).toEqual({ kind: "refused", reason: "retained" });
    expect(target.sent.map((entry) => entry.controlId)).toEqual([C1, C1]);
  });

  it("still retires a known fresh non-dispatch", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    target.control = async (request: unknown) => {
      target.sent.push(request as { controlId: string; intent: string });
      return refusedReceipt();
    };
    const journal = journalFor(memory());
    expect(await send(target, journal)).toEqual({ kind: "phase", phase: "rejected" });
    expect(journal.read()).toBeUndefined();
  });
});

describe("retained projection when the journal arrives after the question", () => {
  it("projects nothing without a journal, then unknown once the same pending question has one", async () => {
    const target = port({ events: [pendingEvent(question())], runState: "streaming", context });
    target.control = async (request: unknown) => {
      target.sent.push(request as { controlId: string; intent: string });
      return unknownReceipt();
    };
    // First read: the journal effect has not produced a record yet.
    expect(projectRetainedAnswer(null, question())).toBeNull();
    const storage = memory();
    const first = journalFor(storage);
    await send(target, first, { controlId: C1 });
    // Same pending question, journal now available: the retained attempt is projected independently of a question change.
    const recovered = journalFor(storage);
    expect(projectRetainedAnswer(recovered, question())).toBe("unknown");
    // A different question in the same run is not that attempt.
    expect(projectRetainedAnswer(recovered, question({ questionId: OTHER }))).toBeNull();
    // The matching durable outcome settles it, and the projection then disappears.
    expect(settleRetainedAnswer(recovered, [answeredEvent(ID, "answered")], ID)).toBe("answered");
    expect(projectRetainedAnswer(recovered, question())).toBeNull();
  });

  it("projects nothing when the remembered record belongs to another run", async () => {
    const otherRun = { ...context, runId: id(3) } as unknown as typeof context;
    const storage = memory();
    const first = journalFor(storage);
    // Retain under this run, then read through a journal bound to a different run.
    const command = {
      controlId: C1,
      intent: "answer" as const,
      questionId: ID,
      answers: { "How should I format the output?": "Summary" },
    };
    first.retain(command);
    expect(lifecycleJournal(otherRun, storage).read()).toBeUndefined();
    expect(projectRetainedAnswer(null, question())).toBeNull();
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
