import "./command-recovery-platform";
import { beforeEach, expect, it } from "vitest";
import { installPlatform, db, local } from "./command-recovery-platform";
import { QuestionSession } from "../src/features/portfolio/objectives/questions/question-session";
import {
  questionCommandSchema,
  questionOperations,
  requireQuestionReceipt,
  type QuestionCommand,
} from "../src/shared/capiro/operations/objective-questions";
import { CapiroApiError } from "../src/shared/capiro/http";
installPlatform();
beforeEach(() => {
  db.records.clear();
  local.clear();
});
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = { tenantId: id(1), userId: id(2) };
const target = { clientId: id(3), objectiveId: id(4) };
const draft = {
  action: "create" as const,
  questionId: id(5),
  title: "Which context matters?",
  expectedVersion: 0 as const,
  expectedObjectiveVersion: 7,
};
function setup() {
  const posts: QuestionCommand[] = [];
  const controls = { lost: false, missing: false, refused: false, denied: false, wrong: false };
  let receipt: ReturnType<typeof receiptFor> | undefined;
  function receiptFor(command: QuestionCommand) {
    return {
      requestId: command.requestId,
      actorUserId: actor.userId,
      action: command.action,
      committedAt: "2026-11-01T00:00:00Z",
      question: {
        id: command.questionId,
        version: command.expectedVersion + 1,
        title: draft.title,
        status: "open" as const,
        answer: null,
        evidenceNote: null,
        sourceObjectiveVersion: 7,
        sourceRevisionId: id(6),
        evidenceKind: "objective_context" as const,
        stale: false,
      },
    };
  }
  const api = {
    request: async (key: string, input: any) => {
      if (controls.denied) throw new CapiroApiError(404, "Unavailable");
      if (key === "objectives.questions.command") {
        posts.push(structuredClone(input.body));
        if (controls.refused)
          throw new CapiroApiError(
            409,
            "Refused",
            undefined,
            undefined,
            undefined,
            "OBJECTIVE_QUESTION_REFUSED",
          );
        receipt ??= receiptFor(input.body);
        if (controls.lost) throw Error("Lost reply");
        return controls.wrong ? { ...receipt, requestId: id(90) } : receipt;
      }
      if (key === "objectives.questions.receipt") {
        if (controls.missing || !receipt) throw new CapiroApiError(404, "Unknown original outcome");
        return receipt;
      }
      if (key === "objectives.questions.list")
        return {
          ...target,
          objectiveVersion: 7,
          items: [],
          total: 0,
          openCount: 0,
          nextCursor: null,
        };
      throw Error("Unexpected operation");
    },
  };
  return {
    controls,
    posts,
    session: () =>
      new QuestionSession(api as any, actor, target, () => {
        if (controls.denied) throw Error("Session revoked");
      }),
  };
}
it("mount and reads never create Questions", async () => {
  const s = setup(),
    session = s.session();
  await session.hydrate();
  await session.recover();
  expect(s.posts).toEqual([]);
});
it("lost commit reply reload recovers the original outcome without another POST", async () => {
  const s = setup();
  s.controls.lost = true;
  const first = s.session();
  await first.hydrate();
  await first.execute(draft);
  expect(first.snapshot().retained?.command.requestId).toBeTruthy();
  const reloaded = s.session();
  await reloaded.hydrate();
  await reloaded.recover();
  expect(reloaded.snapshot().retained?.receipt?.question.id).toBe(draft.questionId);
  expect(s.posts).toHaveLength(1);
});
it("missing original result is unknown; explicit retry preserves original body", async () => {
  const s = setup();
  s.controls.lost = true;
  const flow = s.session();
  await flow.hydrate();
  await flow.execute(draft);
  s.controls.missing = true;
  await flow.recover();
  await flow.execute({ ...draft, questionId: id(50) });
  expect(s.posts).toHaveLength(1);
  s.controls.lost = false;
  await flow.retry();
  expect(s.posts).toHaveLength(2);
  expect(s.posts[1]).toEqual(s.posts[0]);
});
it("known request survives disappearance of both journal and fence without a replacement POST", async () => {
  const s = setup();
  s.controls.lost = true;
  const flow = s.session();
  await flow.hydrate();
  await flow.execute(draft);
  const original = flow.snapshot().retained;
  db.records.clear();
  local.clear();
  await flow.execute({ ...draft, questionId: id(50) });
  expect(s.posts).toHaveLength(1);
  expect(flow.snapshot().retained).toEqual(original);
});
it("refused command retires only after current source access is refreshed", async () => {
  const s = setup();
  s.controls.refused = true;
  const flow = s.session();
  await flow.hydrate();
  await flow.execute(draft);
  expect(flow.snapshot().retained?.refusal).toBe("OBJECTIVE_QUESTION_REFUSED");
  s.controls.denied = true;
  await flow.acknowledge();
  expect(flow.snapshot().retained).toBeDefined();
  s.controls.denied = false;
  await flow.acknowledge();
  expect(flow.snapshot().retained).toBeUndefined();
});
it("unknown result cannot be acknowledged to bypass recovery", async () => {
  const s = setup();
  s.controls.lost = true;
  const flow = s.session();
  await flow.hydrate();
  await flow.execute(draft);
  await flow.acknowledge();
  expect(flow.snapshot().retained?.command).toBeDefined();
  expect(flow.snapshot().retained?.receipt).toBeUndefined();
});
it("substituted receipt is rejected while original command remains retained", async () => {
  const s = setup();
  s.controls.wrong = true;
  const flow = s.session();
  await flow.hydrate();
  await flow.execute(draft);
  expect(flow.snapshot().error).toMatch(/receipt/);
  expect(flow.snapshot().retained?.receipt).toBeUndefined();
});
it("another tab cannot silently dispatch a retained original command", async () => {
  const s = setup();
  s.controls.lost = true;
  const first = s.session(),
    second = s.session();
  await first.hydrate();
  await second.hydrate();
  await first.execute(draft);
  await second.execute({ ...draft, questionId: id(99) });
  expect(s.posts).toHaveLength(1);
  expect(second.snapshot().retained?.command).toEqual(first.snapshot().retained?.command);
});
it("wire boundary refuses actor injection and blank evidence", () => {
  const base = { ...draft, requestId: id(8) };
  expect(questionCommandSchema.safeParse({ ...base, actorUserId: id(9) }).success).toBe(false);
  expect(
    questionCommandSchema.safeParse({
      requestId: id(8),
      questionId: id(5),
      expectedVersion: 1,
      expectedObjectiveVersion: 7,
      action: "answer",
      answer: "Answer",
      evidenceNote: " ",
    }).success,
  ).toBe(false);
  expect(questionOperations["objectives.questions.command"].path).toBe(
    "/clients/:clientId/objectives/:objectiveId/questions",
  );
});
it("receipt validation refuses wrong actor, status and source version", () => {
  const command = questionCommandSchema.parse({
    requestId: id(8),
    questionId: id(5),
    expectedVersion: 1,
    expectedObjectiveVersion: 7,
    action: "answer",
    answer: "Answer",
    evidenceNote: "Context",
  });
  const row = {
    requestId: id(8),
    actorUserId: id(2),
    action: "answer",
    committedAt: "2026-11-01T00:00:00Z",
    question: {
      id: id(5),
      version: 2,
      title: "Q",
      status: "answered",
      answer: "Answer",
      evidenceNote: "Context",
      sourceObjectiveVersion: 7,
      sourceRevisionId: id(6),
      evidenceKind: "objective_context",
      stale: false,
    },
  };
  expect(requireQuestionReceipt(row, command, id(2))).toEqual(row);
  expect(() => requireQuestionReceipt({ ...row, actorUserId: id(90) }, command, id(2))).toThrow();
  expect(() =>
    requireQuestionReceipt(
      { ...row, question: { ...row.question, sourceObjectiveVersion: 8 } },
      command,
      id(2),
    ),
  ).toThrow();
});

it.each(["create", "reopen", "close"] as const)("binds %s receipt to its original Objective version", (action) => {
  const command = questionCommandSchema.parse(action === "create" ? { ...draft, requestId: id(8) } : { requestId: id(8), questionId: id(5), expectedVersion: 2, expectedObjectiveVersion: 7, action });
  const row = { requestId: id(8), actorUserId: id(2), action, committedAt: "2026-11-01T00:00:00Z", question: { id: id(5), version: command.expectedVersion + 1, title: draft.title, status: action === "close" ? "closed" : "open", answer: action === "close" ? "Answer" : null, evidenceNote: action === "close" ? "Context" : null, sourceObjectiveVersion: 8, sourceRevisionId: id(6), evidenceKind: "objective_context", stale: false } };
  expect(() => requireQuestionReceipt(row, command, id(2))).toThrow();
});
