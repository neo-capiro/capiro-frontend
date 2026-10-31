import "./command-recovery-platform";
import { it, expect } from "vitest";
import {
  installPlatform,
  barrier,
  db,
  local,
} from "./command-recovery-platform";
import { planSetup } from "./objective-plan-test-setup";
import { planHref } from "../src/shared/capiro/operations/strategy-materialization";
installPlatform();

it.each([false, true])(
  "missing recovery storage cannot replace a known plan request (lost reply: %s)",
  async (lostReply) => {
    const s = planSetup(),
      session = s.session();
    await session.refresh();
    s.control.lostPlan = lostReply;
    await session.execute();
    const original = structuredClone(session.snapshot().request);
    db.records.clear();
    local.clear();
    await session.execute();
    expect(s.plans).toHaveLength(1);
    expect(session.snapshot().request).toEqual(original);
    expect(session.snapshot().verified).toBe(false);
    expect(session.snapshot().uncertain).toBe(true);
    expect(session.snapshot().error).toBeTruthy();
  },
);

it.each([false, true])(
  "pins known project output IDs through an unavailable observation: %s",
  async (unavailable) => {
    const s = planSetup(),
      flow = s.session();
    await flow.refresh();
    await flow.execute();
    await flow.refresh();
    const original = structuredClone(flow.snapshot().response!);
    if (unavailable) {
      const partial = structuredClone(original);
      partial.status = "partial";
      partial.projects[0]!.output = {
        ...partial.projects[0]!.output,
        availability: "unavailable",
        id: null,
        currentVersion: null,
      };
      s.replaceSavedPlan(partial);
      await flow.refresh();
      expect(flow.snapshot().verified).toBe(true);
    }
    const changed = structuredClone(original);
    changed.projects[0]!.output.id = original.requestId;
    s.replaceSavedPlan(changed);
    await flow.refresh();
    expect(flow.snapshot().verified).toBe(false);
    const reopened = s.session();
    await reopened.refresh();
    expect(reopened.snapshot().verified).toBe(false);
  },
);

it("mount and refresh never prepare a plan until the explicit action", async () => {
  const s = planSetup(),
    session = s.session();
  await session.refresh();
  await session.refresh();
  expect(s.plans).toHaveLength(0);
  await session.execute();
  expect(s.plans).toHaveLength(1);
  expect(session.snapshot().verified).toBe(true);
  expect(session.snapshot().response?.status).toBe("prepared");
});
it("lost plan commit reply is recovered by reads after reload without another POST", async () => {
  const s = planSetup(),
    first = s.session();
  await first.refresh();
  s.control.lostPlan = true;
  await first.execute();
  expect(first.snapshot().uncertain).toBe(true);
  expect(first.snapshot().request).toBeDefined();
  const reopened = s.session();
  await reopened.refresh();
  expect(reopened.snapshot().verified).toBe(true);
  expect(s.plans).toHaveLength(1);
});
it("404 is not no-write proof; only explicit resume reuses the identical frozen plan request", async () => {
  const s = planSetup(),
    first = s.session();
  await first.refresh();
  s.control.failBeforeCommit = true;
  await first.execute();
  const original = structuredClone(s.plans[0]);
  const reopened = s.session();
  await reopened.refresh();
  expect(reopened.snapshot().error).toBeTruthy();
  expect(s.plans).toHaveLength(1);
  await reopened.execute();
  expect(s.plans).toEqual([original, original]);
  expect(reopened.snapshot().verified).toBe(true);
});
it("two views use real encrypted journal command locks and create one plan intent", async () => {
  const s = planSetup(),
    a = s.session(),
    b = s.session();
  await Promise.all([a.refresh(), b.refresh()]);
  await Promise.all([a.execute(), b.execute()]);
  await a.refresh();
  expect(s.plans).toHaveLength(1);
});
it("authority loss between generation and plan conceals receipts and dispatches no plan", async () => {
  const s = planSetup(),
    flow = s.session();
  await flow.refresh();
  s.control.deny = true;
  await flow.execute();
  expect(s.plans).toHaveLength(0);
  expect(flow.snapshot().verified).toBe(false);
});
it("foreign plan source is never rendered or navigable", async () => {
  const s = planSetup(),
    flow = s.session();
  await flow.refresh();
  s.control.foreign = true;
  await flow.execute();
  await flow.refresh();
  expect(flow.snapshot().verified).toBe(false);
  expect(flow.snapshot().response).toBeUndefined();
});
it("partial current outputs do not become a complete-plan navigation link", async () => {
  const s = planSetup(),
    flow = s.session();
  await flow.refresh();
  s.control.partial = true;
  await flow.execute();
  await flow.refresh();
  expect(flow.snapshot().response?.status).toBe("partial");
  expect(() => planHref(flow.snapshot().response!)).toThrow();
});
it("unreviewed service details never appear as a public plan error", async () => {
  const s = planSetup(),
    flow = s.session();
  await flow.refresh();
  s.control.malformedError = true;
  await flow.execute();
  await flow.refresh();
  expect(flow.snapshot().error).not.toContain("raw secret");
  expect(flow.snapshot().request).toBeDefined();
});
it("stopping a held plan POST keeps its UUID and cannot claim cancellation or success", async () => {
  const s = planSetup(),
    flow = s.session(),
    held = barrier();
  await flow.refresh();
  s.control.pausePost = held.promise;
  const pending = flow.execute();
  while (!s.plans.length)
    await new Promise((resolve) => setTimeout(resolve, 0));
  flow.suspend();
  held.resolve();
  await pending;
  expect(flow.snapshot().verified).toBe(false);
  expect(flow.snapshot().request?.requestId).toBe(s.plans[0]!.requestId);
});
