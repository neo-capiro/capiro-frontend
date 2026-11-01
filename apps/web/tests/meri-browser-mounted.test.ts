import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setTimeout as pause } from "node:timers/promises";
import type { ReactElement, ReactNode } from "react";
import { ConversationIntents } from "../src/features/meri/conversation/intents/ConversationIntents";
import type { useConversationIntents } from "../src/features/meri/conversation/intents/useConversationIntents";
import { intentDecisionRecovery } from "../src/features/meri/conversation/intents/decision-recovery";
import { createIntentsAccess } from "../src/shared/meri-intents/access";
import {
  browserConversationId,
  browserDecided,
  browserDecision,
  browserDecisionResponse,
  browserExecuted,
  browserFixture,
  type BrowserItem,
} from "./meri-browser-fixture";
import { installPlatform, db } from "./command-recovery-platform";

vi.mock("../src/shared/session/recovery/journal-db", () => ({
  readJournalRecord: async (scope: string) =>
    structuredClone(db.records.get(scope)),
  writeJournalRecord: async (scope: string, value: unknown) => {
    db.records.set(scope, structuredClone(value));
  },
}));

// Existing controlled hook platform: real ConversationIntents -> Body -> card -> confirmation callbacks,
// public list/decide receivers and encrypted recovery, over inert in-memory fetch. Developer mounted-hook
// coverage, not a browser/visual acceptance fixture.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  pending: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
  dirty: false,
}));
vi.mock("react", async (original) => {
  const memo = (factory: () => unknown, dependencies: readonly unknown[]) => {
    const i = hooks.cursor++,
      previous = hooks.slots[i] as
        | { dependencies: readonly unknown[]; value: unknown }
        | undefined;
    if (
      !previous ||
      !dependencies.every((v, n) => Object.is(v, previous.dependencies[n]))
    )
      hooks.slots[i] = { dependencies, value: factory() };
    return (hooks.slots[i] as { value: unknown }).value;
  };
  const effect = (
    run: () => void | (() => void),
    dependencies: readonly unknown[],
  ) => {
    const i = hooks.cursor++,
      previous = hooks.slots[i] as readonly unknown[] | undefined;
    if (previous && dependencies.every((v, n) => Object.is(v, previous[n])))
      return;
    hooks.slots[i] = dependencies;
    hooks.pending.push(() => {
      hooks.cleanups.get(i)?.();
      const cleanup = run();
      if (cleanup) hooks.cleanups.set(i, cleanup);
      else hooks.cleanups.delete(i);
    });
  };
  return {
    ...(await original<typeof import("react")>()),
    useMemo: memo,
    useCallback: (fn: unknown, dependencies: readonly unknown[]) =>
      memo(() => fn, dependencies),
    useEffect: effect,
    useLayoutEffect: effect,
    useRef(initial: unknown) {
      const i = hooks.cursor++;
      if (!(i in hooks.slots)) hooks.slots[i] = { current: initial };
      return hooks.slots[i];
    },
    useState(initial: unknown) {
      const i = hooks.cursor++;
      if (!(i in hooks.slots))
        hooks.slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        hooks.slots[i],
        (value: unknown) => {
          const next =
            typeof value === "function" ? value(hooks.slots[i]) : value;
          if (!Object.is(next, hooks.slots[i])) hooks.dirty = true;
          hooks.slots[i] = next;
        },
      ];
    },
  };
});
installPlatform();
type State = ReturnType<typeof useConversationIntents>;
type Element = ReactElement<{
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}>;
const viewer = { tenantId: "tenant", actorId: "actor" };
const conversationId = browserConversationId;
let state: State, tree: Element[], render: () => void;
let events: EventTarget & { visibilityState: string };
function text(value: ReactNode): string {
  if (value === null || typeof value === "boolean" || value === undefined)
    return "";
  if (Array.isArray(value)) return value.map(text).join("");
  if (typeof value === "object" && "props" in value)
    return text((value as Element).props.children);
  return String(value);
}
function visit(node: ReactNode): void {
  if (Array.isArray(node)) {
    node.forEach(visit);
    return;
  }
  if (!node || typeof node !== "object" || !("props" in node)) return;
  const el = node as Element;
  tree.push(el);
  if (
    typeof el.type === "function" &&
    ["Body", "Rows", "IntentCard", "DecisionControls", "FieldList"].includes(
      el.type.name,
    )
  ) {
    if (el.type.name === "Body") state = el.props as unknown as State;
    visit((el.type as (props: unknown) => ReactNode)(el.props));
  } else visit(el.props.children);
}
async function flush(until: () => boolean = () => !hooks.dirty) {
  for (let n = 0; n < 500; n++) {
    if (hooks.dirty) {
      hooks.cursor = 0;
      hooks.dirty = false;
      tree = [];
      render();
      hooks.pending.splice(0).forEach((fn) => fn());
    }
    await pause(1);
    if (!hooks.dirty && until()) return;
  }
  throw Error(
    "Synthetic mounted fixture did not settle: " +
      JSON.stringify({
        list: state?.list.status,
        ready: state?.decisionsReady,
        error: state?.recoveryError,
        dirty: hooks.dirty,
      }),
  );
}
function control(label: string) {
  return tree.find(
    (node) => node.props.onClick && text(node.props.children) === label,
  );
}
function button(label: string) {
  const el = control(label);
  if (!el) throw Error(`No mounted control: ${label}`);
  return el;
}
function journal(item: BrowserItem) {
  return intentDecisionRecovery(
    { ...viewer, conversationId },
    item.proposal.proposalId,
    () => undefined,
  );
}
async function mount(initial = browserFixture()) {
  const model = {
    item: initial,
    requests: [] as Array<{ route: string; body: unknown }>,
    lose: false,
    deny: false,
    delayed: null as null | (() => Promise<Response>),
  };
  let access = makeAccess(),
    scope = { ...viewer, conversationId };
  const settled = vi.fn();
  function makeAccess() {
    return createIntentsAccess(
      "synthetic-session",
      new AbortController().signal,
      async (url, init) => {
        const route = String(url),
          body = JSON.parse(String(init?.body));
        model.requests.push({ route, body });
        if (model.deny)
          return Response.json(
            { error: { code: "ACCESS_DENIED" } },
            { status: 403 },
          );
        if (route.endsWith("/decide")) {
          if (model.delayed) return model.delayed();
          if (model.item.decision === "unavailable") throw Error("fixture");
          model.item = browserDecided(model.item, body.decision);
          if (model.lose)
            throw Error("Synthetic response lost after owner write");
          return Response.json(browserDecisionResponse(model.item));
        }
        return Response.json({
          conversationId,
          intents: [model.item],
          next: null,
        });
      },
    );
  }
  render = () =>
    visit(ConversationIntents({ access, scope, onDecisionSettled: settled }));
  hooks.dirty = true;
  await flush(() => state.decisionsReady);
  return {
    model,
    settled,
    /** Simulate unmount/remount or a new session: new access, effects re-run against the same stored journal. */
    async renew(next = scope) {
      scope = next;
      access = makeAccess();
      hooks.dirty = true;
      await flush(
        () => state.decisionsReady || state.list.status === "unavailable",
      );
    },
  };
}
beforeEach(() => {
  hooks.cursor = 0;
  hooks.slots = [];
  hooks.pending = [];
  hooks.cleanups.clear();
  hooks.dirty = false;
  tree = [];
  events = Object.assign(new EventTarget(), { visibilityState: "visible" });
  vi.stubGlobal("document", events);
});
afterEach(() => {
  hooks.cleanups.forEach((fn) => fn());
  hooks.cleanups.clear();
  vi.useRealTimers();
});

it("records exactly one browser decision and shows awaiting execution, never success", async () => {
  const f = await mount();
  button("Approve…").props.onClick!();
  await flush();
  button("Confirm approval").props.onClick!();
  await flush(
    () =>
      state.rows[0]?.status === "Approved · awaiting execution" &&
      state.decisionsReady,
  );
  expect(
    f.model.requests
      .filter((r) => r.route.endsWith("/decide"))
      .map((r) => r.body),
  ).toEqual([browserDecision(f.model.item)]);
  expect(state.rows[0]?.status).toBe("Approved · awaiting execution");
  expect(state.rows[0]?.tone).toBe("neutral");
  expect(await journal(f.model.item).load()).toBeNull();
});

it("lost browser acknowledgement survives remount and Check without a second decide", async () => {
  const item = browserFixture(),
    f = await mount(item);
  // The owner wrote nothing this time: the client cannot know whether the choice landed, so the list still
  // shows an undecided proposal.
  f.model.delayed = async () => {
    throw Error("Synthetic lost browser acknowledgement");
  };
  await state.decide(state.rows[0]!, "approved");
  await flush(() => state.decisionsReady);
  expect(await journal(item).load()).toEqual(browserDecision(item));
  await f.renew();
  expect(state.attempts[item.proposal.proposalId]?.state).toBe("uncertain");
  expect(control("Approve…")).toBeUndefined();
  expect(control("Reject…")).toBeUndefined();
  button("Check result").props.onClick!();
  await flush(() => state.decisionsReady);
  // A captured old callback cannot post again either: the saved decision is read, not resent.
  await state.decide(state.rows[0]!, "approved");
  await flush(() => state.decisionsReady);
  expect(
    f.model.requests.filter((r) => r.route.endsWith("/decide")),
  ).toHaveLength(1);
  expect(
    f.model.requests.filter((r) => /\/(consume|result)$/u.test(r.route)),
  ).toHaveLength(0);
  // Once the exact recorded decision is admitted, the same identity reconciles and no approval is offered.
  f.model.item = browserDecided(item, "approved");
  await f.renew();
  await flush(() => Object.keys(state.attempts).length === 0);
  expect(state.rows[0]?.status).toBe("Approved · awaiting execution");
  expect(await journal(item).load()).toBeNull();
  expect(
    f.model.requests.filter((r) => r.route.endsWith("/decide")),
  ).toHaveLength(1);
});

it("an unavailable decision read stays uncertain instead of offering a fresh choice", async () => {
  const item = browserFixture(),
    f = await mount({
      ...item,
      decision: "unavailable",
      phase: "unknown_decision",
    } as BrowserItem);
  expect(state.rows[0]?.status).toBe("Decision unavailable");
  expect(control("Approve…")).toBeUndefined();
  const calls = f.model.requests.length;
  await state.refresh();
  await flush();
  expect(f.model.requests.length).toBeGreaterThan(calls);
  expect(
    f.model.requests.filter((r) => r.route.endsWith("/decide")),
  ).toHaveLength(0);
});

it("the shared expiry clock closes a browser approval at expiresAtMs and on tab return without IO", async () => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  const f = await mount(browserFixture(5_000)),
    calls = f.model.requests.length;
  expect(control("Approve…")).toBeDefined();
  await vi.advanceTimersByTimeAsync(6_000);
  await flush();
  expect(state.rows[0]?.status).toBe("Expired");
  expect(control("Approve…")).toBeUndefined();
  events.visibilityState = "hidden";
  events.dispatchEvent(new Event("visibilitychange"));
  events.visibilityState = "visible";
  events.dispatchEvent(new Event("visibilitychange"));
  await flush();
  expect(state.rows[0]?.status).toBe("Expired");
  expect(f.model.requests).toHaveLength(calls);
});

it("a later actual observation replaces awaiting execution with the browser's own outcome", async () => {
  const item = browserFixture(),
    f = await mount(browserDecided(item, "approved"));
  f.model.item = browserExecuted(f.model.item, "ok");
  await f.renew();
  expect(state.rows[0]?.status).toBe("Completed");
  expect(state.rows[0]?.tone).toBe("success");
  await f.renew();
  f.model.item = browserExecuted(f.model.item, "error");
  await f.renew();
  expect(state.rows[0]?.status).toBe("Failed");
  expect(
    f.model.requests.filter((r) => r.route.endsWith("/decide")),
  ).toHaveLength(0);
});
