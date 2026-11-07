import "./command-recovery-platform";
import { expect, it } from "vitest";
import { db } from "./command-recovery-platform";
import { setup, id } from "./objective-strategy-intake-fixture";

async function expiredAttempt() {
  const fixture = setup(),
    session = fixture.session();
  await session.hydrate();
  await session.submit("appropriations");
  fixture.expire();
  await session.refresh();
  expect(session.snapshot().canRetry).toBe(true);
  return { ...fixture, first: session };
}

async function supersededAttempt() {
  const s = await expiredAttempt();
  s.control.source.control.version = 2;
  s.control.source.control.currentAuthorizationRequestId = id(107);
  s.control.source.consent!.id = id(107);
  s.expire();
  return s;
}

it("a later expired consent permits explicit retry after reload while preserving the earlier accepted receipt", async () => {
  const s = await supersededAttempt();
  const previous = structuredClone(s.first.snapshot().retained!);
  const reopened = s.session();
  await reopened.hydrate();
  expect(reopened.snapshot().canRetry).toBe(true);
  expect(reopened.snapshot().retained).toEqual(previous);
  expect(s.writes).toHaveLength(1);
  expect(s.starts).toHaveBeenCalledTimes(1);
  await reopened.retry("appropriations");
  expect(s.writes).toHaveLength(2);
  expect(s.writes[1]!.body.command).toMatchObject({
    expectedControlVersion: 2,
    targetAuthorizationRequestId: id(107),
  });
  expect(s.writes[1]!.body.command.requestId).not.toBe(previous.request.body.command.requestId);
  expect(s.receipts.get(previous.request.body.command.requestId)).toEqual(previous.accepted);
  expect(s.starts.mock.calls.map(([job]) => job)).toEqual([id(20), id(21)]);
});

it.each(["live", "live-prior-failed", "same-version", "older-version", "same-consent", "running", "receipt-mismatch"])(
  "a superseded journal refuses %s without replacing its accepted request",
  async (defect) => {
    const s = await supersededAttempt();
    const retained = structuredClone(s.first.snapshot().retained);
    if (defect === "live" || defect === "live-prior-failed") {
      s.control.source.consent!.expired = false;
      s.control.source.observedAt = s.control.source.consent!.confirmedAt;
      s.control.contextFailure = defect === "live-prior-failed";
    }
    if (defect === "same-version") s.control.source.control.version = 1;
    if (defect === "older-version") s.control.source.control.version = 0;
    if (defect === "same-consent") {
      s.control.source.control.currentAuthorizationRequestId = id(7);
      s.control.source.consent!.id = id(7);
    }
    if (defect === "running") s.control.running = true;
    if (defect === "receipt-mismatch") s.control.receiptMismatch = true;
    await s.first.retry("appropriations");
    expect(s.writes).toHaveLength(1);
    expect(s.first.snapshot().retained).toEqual(retained);
    expect(s.starts).toHaveBeenCalledTimes(1);
    expect(s.first.snapshot().error).toBeTruthy();
  },
);

it("Core refusal of a superseded queued attempt never starts generation and retains the exact successor request", async () => {
  const s = await supersededAttempt();
  await s.first.refresh();
  expect(s.first.snapshot().canRetry).toBe(true);
  s.control.status = 409;
  await s.first.retry("appropriations");
  const successor = structuredClone(s.writes[1]!);
  expect(s.first.snapshot().retained?.request).toEqual(successor);
  expect(s.first.snapshot().retained?.accepted).toBeUndefined();
  expect(s.starts).toHaveBeenCalledTimes(1);
  const reopened = s.session();
  await reopened.hydrate();
  expect(reopened.snapshot().canRetry).toBe(false);
  await reopened.submit("appropriations");
  expect(s.writes).toEqual([s.writes[0], successor, successor]);
  expect(s.starts).toHaveBeenCalledTimes(1);
});

it("explicit new consent preserves the original receipt and advances current CAS with fresh IDs", async () => {
  const s = await expiredAttempt();
  const previous = structuredClone(s.first.snapshot().retained!);
  await s.first.retry("appropriations");
  expect(s.writes).toHaveLength(2);
  const request = s.writes[1]!;
  expect(request.body.command).toMatchObject({
    expectedControlVersion: 1,
    targetAuthorizationRequestId: id(7),
  });
  expect(request.body.command.requestId).not.toBe(
    previous.request.body.command.requestId,
  );
  expect(request.body.selection.generationRequestId).not.toBe(
    previous.request.body.selection.generationRequestId,
  );
  expect(s.receipts.get(previous.request.body.command.requestId)).toEqual(
    previous.accepted,
  );
  expect(s.starts.mock.calls.map(([job]) => job)).toEqual([id(20), id(21)]);
  const reopened = s.session();
  await reopened.hydrate();
  expect(reopened.snapshot().retained?.request).toEqual(request);
  expect(reopened.snapshot().retained?.origin.control.version).toBe(1);
  expect(reopened.snapshot().canRetry).toBe(false);
  expect(s.writes).toHaveLength(2);
});

it("a lost successor reply retains that exact request across reload and never issues another successor", async () => {
  const s = await expiredAttempt();
  s.control.lostReply = true;
  await s.first.retry("appropriations");
  const successor = structuredClone(s.writes[1]!);
  expect(s.first.snapshot().retained?.accepted).toBeUndefined();
  const reopened = s.session();
  await reopened.hydrate();
  await reopened.retry("appropriations");
  expect(s.writes).toHaveLength(2);
  expect(reopened.snapshot().retained?.request).toEqual(successor);
  await reopened.submit("appropriations");
  expect(s.writes).toEqual([s.writes[0], successor, successor]);
  expect(s.starts.mock.calls.map(([job]) => job)).toEqual([id(20), id(21)]);
});

it("an unconfirmed original command cannot be acknowledged even when current consent expires", async () => {
  const s = setup(),
    session = s.session();
  await session.hydrate();
  s.control.lostReply = true;
  await session.submit("appropriations");
  const retained = structuredClone(session.snapshot().retained);
  s.expire();
  await session.refresh();
  expect(session.snapshot().canRetry).toBe(false);
  await session.retry("appropriations");
  expect(session.snapshot().retained).toEqual(retained);
  expect(s.writes).toHaveLength(1);
  expect(s.starts).not.toHaveBeenCalled();
});

it("new consent requires a fresh matching original command receipt before journal acknowledgement", async () => {
  const s = await expiredAttempt();
  const retained = structuredClone(s.first.snapshot().retained);
  s.control.receiptMismatch = true;
  await s.first.retry("appropriations");
  expect(s.first.snapshot().error).toMatch(/original Strategy request/);
  expect(s.first.snapshot().retained).toEqual(retained);
  expect(s.writes).toHaveLength(1);
  const reopened = s.session();
  await reopened.hydrate();
  expect(reopened.snapshot().retained).toEqual(retained);
});

it("a verified context failure offers explicit new consent before its deadline", async () => {
  const s = setup(),
    session = s.session();
  await session.hydrate();
  await session.submit("appropriations");
  s.control.contextFailure = true;
  await session.refresh();
  expect(session.snapshot().job?.status).toBe("failed");
  expect(session.snapshot().canRetry).toBe(true);
  await session.retry("appropriations");
  expect(s.writes).toHaveLength(2);
  expect(s.writes[1]!.body.command.expectedControlVersion).toBe(1);
});

it.each([
  "running",
  "completed",
  "cancelled",
  "changed-source",
  "changed-objective",
  "revoked",
  "live",
])(
  "fresh reads refuse %s without replacing the retained request",
  async (defect) => {
    const s = await expiredAttempt();
    const request = structuredClone(s.first.snapshot().retained!.request);
    if (defect === "running") s.control.running = true;
    if (defect === "completed") s.control.complete = true;
    if (defect === "cancelled")
      s.control.source.control.cancelledAt = s.control.source.observedAt;
    if (defect === "changed-source")
      s.control.source.requestedSource.revision.id = id(99);
    if (defect === "changed-objective") s.control.objectiveVersion++;
    if (defect === "revoked") s.control.role = "client_portal_user";
    if (defect === "live") {
      s.control.source.consent!.expired = false;
      s.control.source.observedAt = s.control.source.consent!.confirmedAt;
    }
    await s.first.retry("appropriations");
    expect(s.writes).toHaveLength(1);
    expect(s.first.snapshot().retained?.request).toEqual(request);
    expect(s.first.snapshot().error).toBeTruthy();
  },
);

it("two tabs requesting a successor create only one new request", async () => {
  const s = await expiredAttempt(),
    other = s.session();
  await other.hydrate();
  expect(other.snapshot().canRetry).toBe(true);
  await Promise.all([
    s.first.retry("appropriations"),
    other.retry("appropriations"),
  ]);
  expect(s.writes).toHaveLength(2);
  expect(s.starts.mock.calls.map(([job]) => job)).toEqual([id(20), id(21)]);
});

it("failed journal acknowledgement prevents a successor dispatch", async () => {
  const s = await expiredAttempt();
  const request = structuredClone(s.first.snapshot().retained!.request);
  db.failWrite = true;
  await s.first.retry("appropriations");
  expect(s.writes).toHaveLength(1);
  expect(s.first.snapshot().retained?.request).toEqual(request);
});

it("server refusal preserves the new request for exact recovery", async () => {
  const s = await expiredAttempt();
  s.control.status = 409;
  await s.first.retry("appropriations");
  const next = structuredClone(s.writes[1]!);
  expect(s.first.snapshot().error).toMatch(/outcome is unconfirmed/);
  expect(s.first.snapshot().retained?.request).toEqual(next);
  await s.first.submit("appropriations");
  expect(s.writes).toEqual([s.writes[0], next, next]);
  expect(s.starts).toHaveBeenCalledTimes(1);
});
