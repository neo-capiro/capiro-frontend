import { vi } from "vitest";

// Controlled hook scheduling only. Production authorization, upload and encrypted
// recovery execute unchanged; this is not browser/React scheduling acceptance.
const platform = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  pending: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
  dirty: false,
}));
export const hooks = platform;
vi.mock("react", async (original) => {
  const memo = (factory: () => unknown, dependencies: readonly unknown[]) => {
    const i = hooks.cursor++;
    const previous = hooks.slots[i] as
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
    const i = hooks.cursor++;
    const previous = hooks.slots[i] as readonly unknown[] | undefined;
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
    useSyncExternalStore(
      subscribe: (notify: () => void) => () => void,
      snapshot: () => unknown,
    ) {
      effect(
        () =>
          subscribe(() => {
            hooks.dirty = true;
          }),
        [subscribe],
      );
      return snapshot();
    },
  };
});
export function resetHooks() {
  hooks.cleanups.forEach((fn) => fn());
  hooks.cleanups.clear();
  hooks.cursor = 0;
  hooks.slots = [];
  hooks.pending = [];
  hooks.dirty = false;
}
