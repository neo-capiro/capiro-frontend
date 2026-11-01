import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setTimeout as pause } from "node:timers/promises";
import type { ReactElement, ReactNode } from "react";
import { ConversationIntents } from "../src/features/meri/conversation/intents/ConversationIntents";
import type { useConversationIntents } from "../src/features/meri/conversation/intents/useConversationIntents";
import { createIntentsAccess } from "../src/shared/meri-intents/access";
import {
  savedNoteFixture,
  noteConversationId,
  noteViewer,
} from "./meri-saved-note-fixture";
import { installPlatform, db } from "./command-recovery-platform";
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
async function mount(initial = savedNoteFixture()) {
  const model = {
    item: initial,
    requests: [] as string[],
    deny: false,
    delayNext: null as null | (() => Promise<Response>),
  };
  let lifetime: AbortController;
  let access = makeAccess(),
    scope = { ...noteViewer, conversationId: noteConversationId };
  function makeAccess() {
    lifetime = new AbortController();
    return createIntentsAccess(
      "synthetic-session",
      lifetime.signal,
      async (url) => {
        const route = String(url);
        model.requests.push(route);
        if (!route.endsWith("/list"))
          throw Error("A direct-PASS note must never decide or resend");
        if (model.deny)
          return Response.json(
            { error: { code: "ACCESS_DENIED" } },
            { status: 403 },
          );
        if (model.delayNext) {
          const wait = model.delayNext;
          model.delayNext = null;
          return wait();
        }
        return Response.json({
          conversationId: noteConversationId,
          intents: [model.item],
          next: null,
        });
      },
    );
  }
  render = () => visit(ConversationIntents({ access, scope }));
  hooks.dirty = true;
  await flush(() => state.decisionsReady);
  return {
    model,
    async renew(next = scope) {
      // Same lifetime retirement performed by the mounted session owner.
      lifetime.abort();
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

it("mounted direct-PASS note history reads only, with no approval or decision journal", async () => {
  const f = await mount(savedNoteFixture("meeting"));
  expect(state.rows[0]?.status).toBe("Note saved");
  expect(state.rows[0]?.proposal).toBeNull();
  const controls = tree
    .filter((el) => el.props.onClick)
    .map((el) => text(el.props.children));
  expect(controls).toContain("Refresh");
  expect(controls.join(" ")).not.toMatch(
    /Approve|Reject|Confirm|Retry|Check result/,
  );
  button("Refresh").props.onClick!();
  await flush(() => f.model.requests.length === 2);
  expect(f.model.requests).toHaveLength(2);
  expect(f.model.requests.every((route) => route.endsWith("/list"))).toBe(true);
  expect(db.writes).toEqual([]);
});

it("UNKNOWN refresh remains read-only; access loss and a retired identity discard the receipt", async () => {
  const f = await mount(savedNoteFixture("general", "unknown"));
  expect(state.rows[0]?.status).toBe("Save uncertain");
  button("Refresh").props.onClick!();
  await flush(() => f.model.requests.length === 2);
  expect(state.rows[0]?.result).toEqual([]);
  expect(f.model.requests).toHaveLength(2);
  f.model.item = savedNoteFixture();
  await state.refresh();
  await flush();
  expect(state.rows[0]?.status).toBe("Note saved");
  f.model.deny = true;
  await state.refresh();
  await flush();
  expect(state.rows).toEqual([]);
  f.model.deny = false;
  await f.renew();
  expect(state.rows[0]?.status).toBe("Note saved");
  let release!: (response: Response) => void;
  f.model.delayNext = () =>
    new Promise<Response>((resolve) => {
      release = resolve;
    });
  const pending = state.refresh();
  await flush(() => typeof release === "function");
  const oldRefresh = state.refresh;
  const previous = f.model.item;
  f.model.deny = true;
  await f.renew({
    ...noteViewer,
    actorId: "other-actor",
    conversationId: noteConversationId,
  });
  expect(state.rows).toEqual([]);
  release(
    Response.json({
      conversationId: noteConversationId,
      intents: [previous],
      next: null,
    }),
  );
  await pending;
  await flush();
  expect(state.rows).toEqual([]);
  const calls = f.model.requests.length;
  await oldRefresh();
  await flush();
  expect(f.model.requests).toHaveLength(calls);
  expect(state.rows).toEqual([]);
  expect(f.model.requests.every((route) => route.endsWith("/list"))).toBe(true);
  expect(db.writes).toEqual([]);
});
