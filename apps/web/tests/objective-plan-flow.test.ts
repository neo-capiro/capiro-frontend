import "./command-recovery-platform";
import { it, expect } from "vitest";
import { installPlatform, barrier } from "./command-recovery-platform";
import { planSetup } from "./objective-plan-test-setup";
import { planHref } from "../src/shared/capiro/operations/strategy-materialization";
installPlatform();

it.each([false, true])(
  "pins known project output IDs through an unavailable observation: %s",
  async (unavailable) => {
    const s = planSetup(),
      flow = s.flow();
    await flow.hydrate();
    await flow.finish("appropriations");
    await flow.refresh();
    const original = structuredClone(flow.snapshot().plan.response!);
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
      expect(flow.snapshot().plan.verified).toBe(true);
    }
    const changed = structuredClone(original);
    changed.projects[0]!.output.id = original.requestId;
    s.replaceSavedPlan(changed);
    await flow.refresh();
    expect(flow.snapshot().plan.verified).toBe(false);
    const reopened = s.flow();
    await reopened.hydrate();
    expect(reopened.snapshot().plan.verified).toBe(false);
  },
);

it("one explicit finish advances generation then plan without inventing Objective completion", async () => {
  const s = planSetup(),
    flow = s.flow();
  await flow.hydrate();
  await flow.finish("appropriations");
  expect(s.generations).toHaveLength(1);
  expect(s.plans).toHaveLength(0);
  await flow.refresh();
  expect(s.plans).toHaveLength(1);
  expect(flow.snapshot().plan.verified).toBe(true);
  expect(flow.snapshot().plan.response?.status).toBe("prepared");
  expect(flow.snapshot().generation.accepted?.status).toBe("completed");
});
it("lost plan commit reply is recovered by reads after reload without another POST", async () => {
  const s = planSetup(),
    first = s.flow();
  await first.hydrate();
  s.control.lostPlan = true;
  await first.finish("appropriations");
  await first.refresh();
  expect(first.snapshot().plan.uncertain).toBe(true);
  expect(first.canReset()).toBe(false);
  const reopened = s.flow();
  await reopened.hydrate();
  expect(reopened.snapshot().plan.verified).toBe(true);
  expect(s.plans).toHaveLength(1);
});
it("404 is not no-write proof; only explicit resume reuses the identical frozen plan request", async () => {
  const s = planSetup(),
    first = s.flow();
  await first.hydrate();
  s.control.failBeforeCommit = true;
  await first.finish("appropriations");
  await first.refresh();
  const original = structuredClone(s.plans[0]);
  const reopened = s.flow();
  await reopened.hydrate();
  expect(reopened.snapshot().plan.error).toBeTruthy();
  expect(s.plans).toHaveLength(1);
  await reopened.resume();
  expect(s.plans).toEqual([original, original]);
  expect(reopened.snapshot().plan.verified).toBe(true);
});
it("two views use real encrypted journal command locks and create one plan intent", async () => {
  const s = planSetup(),
    a = s.flow(),
    b = s.flow();
  await Promise.all([a.hydrate(), b.hydrate()]);
  await Promise.all([a.finish("appropriations"), b.finish("appropriations")]);
  await a.refresh();
  expect(s.generations).toHaveLength(1);
  expect(s.plans).toHaveLength(1);
});
it("stopping observation prevents the unsent automatic plan stage until explicit resume", async () => {
  const s = planSetup(),
    flow = s.flow();
  await flow.hydrate();
  await flow.finish("appropriations");
  flow.suspend();
  await flow.refresh();
  expect(s.plans).toHaveLength(0);
  expect(flow.snapshot().observing).toBe(false);
  await flow.resume();
  expect(s.plans).toHaveLength(1);
});
it("authority loss between generation and plan conceals receipts and dispatches no plan", async () => {
  const s = planSetup(),
    flow = s.flow();
  await flow.hydrate();
  await flow.finish("appropriations");
  s.control.deny = true;
  await flow.refresh();
  expect(s.plans).toHaveLength(0);
  expect(flow.snapshot().generation.verified).toBe(false);
});
it("foreign plan source is never rendered or navigable", async () => {
  const s = planSetup(),
    flow = s.flow();
  await flow.hydrate();
  s.control.foreign = true;
  await flow.finish("appropriations");
  await flow.refresh();
  expect(flow.snapshot().plan.verified).toBe(false);
  expect(flow.snapshot().plan.response).toBeUndefined();
});
it("partial current outputs do not become a complete-plan navigation link", async () => {
  const s = planSetup(),
    flow = s.flow();
  await flow.hydrate();
  s.control.partial = true;
  await flow.finish("appropriations");
  await flow.refresh();
  expect(flow.snapshot().plan.response?.status).toBe("partial");
  expect(() => planHref(flow.snapshot().plan.response!)).toThrow();
});
it("unreviewed service details never appear as a public plan error", async () => {
  const s = planSetup(),
    flow = s.flow();
  await flow.hydrate();
  s.control.malformedError = true;
  await flow.finish("appropriations");
  await flow.refresh();
  expect(flow.snapshot().plan.error).not.toContain("raw secret");
  expect(flow.canReset()).toBe(false);
});
it("stopping a held plan POST keeps its UUID and cannot claim cancellation or success", async () => {
  const s = planSetup(),
    flow = s.flow(),
    held = barrier();
  await flow.hydrate();
  await flow.finish("appropriations");
  s.control.pausePost = held.promise;
  const pending = flow.refresh();
  while (!s.plans.length)
    await new Promise((resolve) => setTimeout(resolve, 0));
  flow.suspend();
  held.resolve();
  await pending;
  expect(flow.snapshot().plan.verified).toBe(false);
  expect(flow.snapshot().plan.request?.requestId).toBe(s.plans[0]!.requestId);
});
