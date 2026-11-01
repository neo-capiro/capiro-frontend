import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setTimeout as pause } from "node:timers/promises";
import type { ReactElement, ReactNode } from "react";
import { ConversationIntents } from "../src/features/meri/conversation/intents/ConversationIntents";
import type { useConversationIntents } from "../src/features/meri/conversation/intents/useConversationIntents";
import { intentDecisionRecovery } from "../src/features/meri/conversation/intents/decision-recovery";
import { createIntentsAccess } from "../src/shared/meri-intents/access";
import {
  clientRecordFixture,
  clientDecision,
  clientDecisionResponse,
  type ClientItem,
} from "./meri-client-record-fixture";
import { conversationId, viewer } from "./meri-legiwatch-fixture";
import { installPlatform, db } from "./command-recovery-platform";
vi.mock("../src/shared/session/recovery/journal-db", () => ({
  readJournalRecord: async (scope: string) =>
    structuredClone(db.records.get(scope)),
  writeJournalRecord: async (scope: string, value: unknown) => {
    db.records.set(scope, structuredClone(value));
  },
}));

// Existing controlled hook platform. Execute the real ConversationIntents -> Body ->
// card -> confirmation callbacks, list/public receiver and encrypted recovery. This
// is developer prop/lifetime coverage, not a browser or visual acceptance fixture.
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
function button(label: string) {
  const el = tree.find(
    (node) => node.props.onClick && text(node.props.children) === label,
  );
  if (!el) throw Error(`No mounted control: ${label}`);
  return el;
}
function historyJournal(item: ClientItem) {
  return intentDecisionRecovery(
    { ...viewer, conversationId },
    item.proposal.proposalId,
    () => undefined,
  );
}
async function mount(initial = clientRecordFixture()) {
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
          if (model.item.result === "unavailable") throw Error("fixture");
          const terminal = clientRecordFixture(
            body.decision === "rejected" ? "dismissed" : "succeeded",
            model.item.proposal.operation === "create_client",
          );
          model.item = {
            ...model.item,
            result: {
              ...model.item.result,
              status:
                terminal.result === "unavailable"
                  ? "succeeded"
                  : terminal.result.status,
              receipt:
                terminal.result === "unavailable"
                  ? null
                  : terminal.result.receipt,
            },
          };
          if (model.lose)
            throw Error("Synthetic response lost after owner write");
          return Response.json(clientDecisionResponse(model.item));
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

it("mounted explicit confirmation sends the immutable client decision and displays the exact partial receipt", async () => {
  const f = await mount();
  button("Approve…").props.onClick!();
  await flush();
  expect(
    f.model.requests.filter((r) => r.route.endsWith("/decide")),
  ).toHaveLength(0);
  button("Confirm approval").props.onClick!();
  await flush(
    () => state.rows[0]?.status === "Partially updated" && state.decisionsReady,
  );
  expect(
    f.model.requests
      .filter((r) => r.route.endsWith("/decide"))
      .map((r) => r.body),
  ).toEqual([clientDecision(f.model.item)]);
  expect(tree.map((node) => text(node.props.children)).join(" ")).toContain(
    "Synthetic office could not be updated",
  );
  expect(await historyJournal(f.model.item).load()).toBeNull();
  expect(f.settled).toHaveBeenCalledWith(f.model.item.proposal.binding.runId);
});
it("lost outcome stays uncertain until a current read, never repeats the decision, and rejects a captured old callback", async () => {
  const item = clientRecordFixture(),
    f = await mount(item);
  f.model.lose = true;
  // Keep the immediate history read unresolved. A later fresh same-identity session
  // represents the Core-authorized own-edit membership transition; the wire proposal
  // and result retain their original immutable revisions.
  f.model.delayed = async () => {
    f.model.item = {
      ...item,
      result: { ...(item.result as object), status: "outcome_unknown" },
    } as ClientItem;
    throw Error("lost");
  };
  await state.decide(state.rows[0]!, "approved");
  await flush(() => state.decisionsReady);
  expect(await historyJournal(item).load()).toEqual(clientDecision(item));
  const oldDecide = state.decide,
    oldRow = state.rows[0]!;
  const before = f.model.requests.filter((r) =>
    r.route.endsWith("/decide"),
  ).length;
  button("Check result").props.onClick!();
  await flush(() => state.decisionsReady);
  expect(
    f.model.requests.filter((r) => r.route.endsWith("/decide")),
  ).toHaveLength(before);
  const terminal = clientRecordFixture("succeeded");
  f.model.item = {
    ...item,
    result: {
      ...(item.result as Exclude<ClientItem["result"], "unavailable">),
      status: "succeeded",
      receipt:
        terminal.result === "unavailable" ? null : terminal.result.receipt,
    },
  };
  const exact = f.model.item;
  if (exact.result === "unavailable") throw Error("fixture");
  f.model.item = {
    ...exact,
    result: {
      ...exact.result,
      context: { ...exact.result.context, membershipRevision: "d".repeat(64) },
    },
  };
  await f.renew();
  expect(state.list.status).toBe("unavailable");
  expect(await historyJournal(item).load()).toEqual(clientDecision(item));
  f.model.item = exact;
  await f.renew();
  await flush(() => Object.keys(state.attempts).length === 0);
  expect(state.rows[0]?.status).toBe("Partially updated");
  expect(await historyJournal(item).load()).toBeNull();
  const calls = f.model.requests.length;
  await oldDecide(oldRow, "approved");
  expect(f.model.requests).toHaveLength(calls);
  expect(f.model.item.proposal.context.membershipRevision).toBe(
    item.proposal.context.membershipRevision,
  );
});
it("mounted rejection is distinct and cannot execute the approved branch", async () => {
  const f = await mount();
  button("Reject…").props.onClick!();
  await flush();
  button("Confirm rejection").props.onClick!();
  await flush(
    () => state.rows[0]?.status === "Rejected" && state.decisionsReady,
  );
  expect(
    f.model.requests
      .filter((r) => r.route.endsWith("/decide"))
      .map((r) => r.body),
  ).toEqual([clientDecision(f.model.item, "rejected")]);
  expect(
    f.model.item.result !== "unavailable" && f.model.item.result.receipt,
  ).toBeNull();
});
it("current access refusal clears private rows and a retired identity cannot dispatch its captured callback", async () => {
  const f = await mount(),
    oldDecide = state.decide,
    oldRow = state.rows[0]!;
  f.model.deny = true;
  await state.refresh();
  await flush();
  expect(state.rows).toEqual([]);
  expect(state.decisionsReady).toBe(false);
  await f.renew({ ...viewer, actorId: "other-actor", conversationId });
  const calls = f.model.requests.length;
  await oldDecide(oldRow, "approved");
  expect(f.model.requests).toHaveLength(calls);
});
it("expires a mounted client proposal with no HTTP and retires the local timer/listener", async () => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  const f = await mount(),
    calls = f.model.requests.length;
  await vi.advanceTimersByTimeAsync(60000);
  await flush();
  expect(state.rows[0]?.status).toBe("Expired");
  expect(
    tree.some(
      (node) => node.props.onClick && text(node.props.children) === "Approve…",
    ),
  ).toBe(false);
  expect(f.model.requests).toHaveLength(calls);
  hooks.cleanups.forEach((fn) => fn());
  hooks.cleanups.clear();
  events.dispatchEvent(new Event("visibilitychange"));
  expect(vi.getTimerCount()).toBe(0);
});
