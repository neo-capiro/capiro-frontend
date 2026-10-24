import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { CapiroApiError } from "../../shared/capiro/http";
import { useSettingsMutation } from "./useSettingsMutation";

type Dependencies = readonly unknown[] | undefined;
type Effect = () => void | (() => void);
const state = vi.hoisted(() => ({
  auth: { userId: "actor-a", sessionId: "session-a", orgId: "org-a" },
  api: { request: vi.fn(), upload: vi.fn(), download: vi.fn() },
}));
const hooks = vi.hoisted(() => ({
  values: [] as unknown[],
  refs: [] as { current: unknown }[],
  memos: [] as { value: unknown; deps: Dependencies }[],
  effects: [] as { deps: Dependencies; cleanup: void | (() => void) }[],
  pending: [] as { index: number; deps: Dependencies; effect: Effect }[],
  stateIndex: 0,
  refIndex: 0,
  memoIndex: 0,
  effectIndex: 0,
  dirty: false,
}));
function sameDependencies(a: Dependencies, b: Dependencies) {
  return (
    !!a && !!b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
  );
}
function memo(value: () => unknown, deps: Dependencies) {
  const index = hooks.memoIndex++;
  if (!sameDependencies(hooks.memos[index]?.deps, deps))
    hooks.memos[index] = { value: value(), deps };
  return hooks.memos[index]!.value;
}
function effect(callback: Effect, deps: Dependencies) {
  const index = hooks.effectIndex++;
  if (!sameDependencies(hooks.effects[index]?.deps, deps))
    hooks.pending.push({ index, deps, effect: callback });
}
// Same Node/SSR hook-probe pattern as newsletter-client-authority. Unlike a
// presentation-only probe, this retains memo/ref/state cells, real QueryCache
// subscriptions and effect cleanups, including scope changes and unmount.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial?: unknown) => {
      const index = hooks.stateIndex++;
      const values = hooks.values;
      if (index === values.length)
        values.push(typeof initial === "function" ? initial() : initial);
      return [
        values[index],
        (next: unknown) => {
          const value = typeof next === "function" ? next(values[index]) : next;
          if (!Object.is(value, values[index])) {
            values[index] = value;
            if (values === hooks.values) hooks.dirty = true;
          }
        },
      ];
    },
    useRef: (initial: unknown) => {
      const index = hooks.refIndex++;
      if (index === hooks.refs.length) hooks.refs.push({ current: initial });
      return hooks.refs[index];
    },
    useMemo: memo,
    useCallback: (callback: unknown, deps: Dependencies) =>
      memo(() => callback, deps),
    useEffect: effect,
    useSyncExternalStore: (
      subscribe: (notify: () => void) => () => void,
      snapshot: () => unknown,
    ) => {
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
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => cache,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => state.auth }));
vi.mock("../../shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => state.api,
}));
vi.mock("../../shared/capiro/registry", () => ({
  capiroOperations: {
    "settings.team.setBillingAdmin": { method: "PUT" },
    "settings.team.remove": { method: "DELETE" },
    "settings.team.list": { method: "GET" },
    "me.read": { method: "GET" },
    "me.update": { method: "PATCH" },
    "me.emailSignature.update": { method: "PUT" },
    "settings.contact.update": { method: "PUT" },
    "settings.profiles.create": { method: "POST" },
    "settings.profiles.archive": { method: "DELETE" },
    "settings.profiles.restore": { method: "PUT" },
  },
}));
const capture = vi.fn<(view: ReturnType<typeof useSettingsMutation>) => void>();
function current() {
  return capture.mock.lastCall![0];
}
let root: ReturnType<typeof createProbeRoot>;
let cache: QueryClient;
const after = vi.fn();
function Harness({ section }: { section: string }) {
  const view = useSettingsMutation(section);
  capture(view);
  return createElement(
    "output",
    null,
    view.action.message ?? view.action.error ?? "",
  );
}
function createProbeRoot() {
  let section = "team";
  let mounted = true;
  return {
    render(next: string) {
      section = next;
      hooks.dirty = true;
    },
    flush() {
      for (let pass = 0; mounted && hooks.dirty; pass++) {
        if (pass === 20) throw new Error("Settings hook probe did not settle");
        hooks.dirty = false;
        hooks.stateIndex =
          hooks.refIndex =
          hooks.memoIndex =
          hooks.effectIndex =
            0;
        hooks.pending = [];
        renderToStaticMarkup(createElement(Harness, { section }));
        // Render-phase state updates settle before committing effects.
        if (hooks.dirty) continue;
        for (const change of hooks.pending)
          hooks.effects[change.index]?.cleanup?.();
        for (const change of hooks.pending)
          hooks.effects[change.index] = {
            deps: change.deps,
            cleanup: change.effect(),
          };
      }
    },
    unmount() {
      if (!mounted) return;
      mounted = false;
      for (const retained of hooks.effects) retained?.cleanup?.();
      hooks.values = [];
      hooks.refs = [];
      hooks.memos = [];
      hooks.effects = [];
      hooks.pending = [];
      hooks.dirty = false;
    },
  };
}
async function act(work: () => unknown) {
  await work();
  root?.flush();
}
async function mount(section = "team") {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root = createProbeRoot();
  await act(() => root.render(section));
}
const input = { params: { userId: "target" }, body: { billingAdmin: true } };
function dispatch() {
  return current().action.run(
    (signal) =>
      current().api.request("settings.team.setBillingAdmin", input, { signal }),
    "Saved",
    after,
  );
}
async function until(test: () => boolean) {
  for (let i = 0; i < 50 && !test(); i++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2));
    });
  expect(test()).toBe(true);
}
beforeEach(() => {
  const values = new Map<string, string>();
  const storage = {
    get length() {
      return values.size;
    },
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => values.clear(),
  };
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("window", { sessionStorage: storage });
  state.auth = { userId: "actor-a", sessionId: "session-a", orgId: "org-a" };
  state.api.request.mockReset();
  state.api.request
    .mockResolvedValueOnce({
      role: "user_admin",
      billingAdmin: true,
      user: { id: "actor-a" },
    })
    .mockResolvedValueOnce([
      {
        userId: "target",
        role: "user_admin",
        status: "active",
        billingAdmin: false,
      },
    ]);
  after.mockReset();
  capture.mockClear();
  sessionStorage.clear();
});
afterEach(() => {
  root?.unmount();
  cache?.clear();
  vi.unstubAllGlobals();
});

describe("Settings dispatch lifetime", () => {
  it("a revoked actor never dispatches the write or leaves a recovery record", async () => {
    state.api.request.mockReset().mockResolvedValueOnce({
      role: "standard_user",
      user: { id: "actor-a" },
    });
    await mount();
    await act(dispatch);
    expect(
      state.api.request.mock.calls.map(([operation]) => operation),
    ).toEqual(["me.read"]);
    expect(current().locked).toBe(false);
    expect(current().action.error).toContain("no longer available");
    expect(after).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
  it("scope cancellation during preflight never reaches a team mutation", async () => {
    let finish!: (value: unknown) => void;
    state.api.request.mockReset().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await mount();
    const first = dispatch();
    await until(() => state.api.request.mock.calls.length === 1);
    await act(() => root.render("other-section"));
    await act(async () => {
      finish({ role: "standard_user", user: { id: "actor-a" } });
      await first;
    });
    expect(
      state.api.request.mock.calls.map(([operation]) => operation),
    ).toEqual(["me.read"]);
    expect(sessionStorage.length).toBe(0);
    expect(after).not.toHaveBeenCalled();
  });
  it("double submission dispatches once, freezes the captured input and validates the target", async () => {
    let finish!: (value: unknown) => void;
    state.api.request.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await mount();
    const changing = {
      params: { userId: "target" },
      body: { billingAdmin: true },
    };
    let first!: Promise<void>;
    await act(async () => {
      first = current().action.run(
        (signal) =>
          current().api.request("settings.team.setBillingAdmin", changing, {
            signal,
          }),
        "Saved",
        after,
      );
      changing.params.userId = "other";
      void dispatch();
    });
    await until(() => state.api.request.mock.calls.length === 3);
    expect(current().locked).toBe(true);
    expect(state.api.request.mock.calls[2]?.[1]).toEqual(input);
    await act(async () => {
      finish({ userId: "target", billingAdmin: true });
      await first;
    });
    expect(after).toHaveBeenCalledTimes(1);
    expect(current().locked).toBe(false);
  });
  it("a mismatched successful receipt stays fenced across navigation and reload", async () => {
    state.api.request.mockResolvedValue({
      userId: "wrong",
      billingAdmin: true,
    });
    await mount();
    await act(async () => {
      await dispatch();
    });
    expect(current().action.message).toBeUndefined();
    expect(current().pending?.state).toBe("unknown");
    expect(after).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    cache.clear();
    await mount();
    expect(current().locked).toBe(true);
    await act(async () => {
      await dispatch();
    });
    expect(state.api.request).toHaveBeenCalledTimes(3);
    expect(current().action.error).toContain("not confirmed");
  });
  it.each(["target", "client", "actor", "organization", "session"])(
    "scope change cancels the request lifetime and suppresses late success: %s",
    async (kind) => {
      let finish!: (value: unknown) => void;
      state.api.request.mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
      await mount();
      let first!: Promise<void>;
      await act(async () => {
        first = dispatch();
      });
      await until(() => state.api.request.mock.calls.length === 3);
      const signal = state.api.request.mock.calls[2]?.[2].signal as AbortSignal;
      if (kind === "client") state.api = { ...state.api };
      if (kind === "actor") state.auth = { ...state.auth, userId: "actor-b" };
      if (kind === "organization")
        state.auth = { ...state.auth, orgId: "org-b" };
      if (kind === "session")
        state.auth = { ...state.auth, sessionId: "session-b" };
      await act(async () =>
        root.render(kind === "target" ? "other-target" : "team"),
      );
      expect(signal.aborted).toBe(true);
      await act(async () => {
        finish({ userId: "target", billingAdmin: true });
        await first;
      });
      expect(after).not.toHaveBeenCalled();
      expect(current().action.message).toBeUndefined();
      if (kind === "client") expect(current().pending?.state).toBe("unknown");
      else expect(current().pending).toBeUndefined();
    },
  );
  it("a readback denial after an accepted write never unlocks it for replay", async () => {
    state.api.request
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(
        new CapiroApiError(403, "revoked during readback"),
      );
    await mount();
    await act(async () => {
      await current().action.run(
        (signal) =>
          current().api.request(
            "settings.team.remove",
            { params: { userId: "target" } },
            { signal },
          ),
        "Removed",
        after,
      );
    });
    expect(current().pending?.state).toBe("unknown");
    expect(current().locked).toBe(true);
    expect(after).not.toHaveBeenCalled();
  });
  it("read-only reconciliation unlocks only the recorded target and never dispatches again", async () => {
    state.api.request.mockRejectedValueOnce(new Error("response lost"));
    await mount();
    await act(async () => {
      await dispatch();
    });
    state.api.request.mockResolvedValueOnce([
      { userId: "target", billingAdmin: false },
    ]);
    await act(async () => {
      await current().reconcile();
    });
    expect(current().locked).toBe(true);
    state.api.request.mockResolvedValueOnce([
      { userId: "target", billingAdmin: true },
    ]);
    await act(async () => {
      await current().reconcile();
    });
    expect(current().locked).toBe(false);
    expect(
      state.api.request.mock.calls.map(([operation]) => operation),
    ).toEqual([
      "me.read",
      "settings.team.list",
      "settings.team.setBillingAdmin",
      "settings.team.list",
      "settings.team.list",
    ]);
    expect(sessionStorage.length).toBe(0);
  });
  it("a definitive rejected write clears its lock but never reports success", async () => {
    state.api.request.mockRejectedValueOnce(new CapiroApiError(403, "denied"));
    await mount();
    await act(async () => {
      await dispatch();
    });
    expect(current().pending).toBeUndefined();
    expect(current().action.error).toBe("denied");
    expect(after).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
});

describe("Personal title receipt and reload recovery", () => {
  const identity = {
    user: { id: "actor-a", title: "Reviewed title" },
    tenant: { id: "tenant-a" },
  };
  const submit = () =>
    current().action.run(
      (signal) =>
        current().api.request(
          "me.update",
          { body: { title: "Reviewed title" } },
          { signal },
        ),
      "Saved",
      after,
    );
  it("accepts only the exact account and title", async () => {
    state.api.request
      .mockReset()
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce(identity);
    await mount("personal-title");
    await act(submit);
    expect(current().action.message).toBe("Saved");
    expect(sessionStorage.length).toBe(0);
    expect(after).toHaveBeenCalledTimes(1);
  });
  it("retains uncertainty after a wrong-account receipt and reload, without retaining the title", async () => {
    state.api.request
      .mockReset()
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce({ ...identity, tenant: { id: "other" } });
    await mount("personal-title");
    await act(submit);
    expect(current().pending?.state).toBe("unknown");
    const key = `capiro:settings-write:v1:${JSON.stringify(["actor-a", "session-a", "org-a", "personal-title"])}`;
    expect(sessionStorage.getItem(key)).not.toContain("Reviewed title");
    await act(() => root.unmount());
    cache.clear();
    await mount("personal-title");
    expect(current().locked).toBe(true);
    state.api.request.mockResolvedValueOnce({
      ...identity,
      user: { ...identity.user, title: "Other title" },
    });
    await act(() => current().reconcile());
    expect(current().locked).toBe(true);
    state.api.request.mockResolvedValueOnce(identity);
    await act(() => current().reconcile());
    expect(current().locked).toBe(false);
    expect(current().action.message).toContain("now has the requested state");
    expect(
      state.api.request.mock.calls.filter(
        ([operation]) => operation === "me.update",
      ),
    ).toHaveLength(1);
    expect(after).not.toHaveBeenCalled();
  });
});

describe("Remaining Settings form recovery", () => {
  const identity = { user: { id: "actor-a" }, tenant: { id: "tenant-a" } };
  const send = (
    operation: Parameters<
      ReturnType<typeof useSettingsMutation>["api"]["request"]
    >[0],
    payload: unknown,
  ) =>
    current().action.run(
      (signal) =>
        current().api.request(operation, payload as never, { signal }),
      "Saved",
      after,
    );
  const remount = async (section: string) => {
    await act(() => root.unmount());
    cache.clear();
    await mount(section);
  };
  it("a lost contact reply reconciles only the full recorded value in the original account", async () => {
    const body = {
      email: "synthetic@example.test",
      name: "Synthetic organization",
    };
    state.api.request
      .mockReset()
      .mockResolvedValueOnce(identity)
      .mockRejectedValueOnce(new Error("response lost"));
    await mount("contact");
    await act(() => send("settings.contact.update", { body }));
    expect(current().locked).toBe(true);
    const key = `capiro:settings-write:v1:${JSON.stringify(["actor-a", "session-a", "org-a", "contact"])}`;
    expect(sessionStorage.getItem(key)).not.toContain(body.email);
    expect(sessionStorage.getItem(key)).not.toContain(body.name);
    await remount("contact");
    state.api.request.mockResolvedValueOnce({
      ...identity,
      tenant: { id: "other" },
    });
    await act(() => current().reconcile());
    expect(current().locked).toBe(true);
    state.api.request
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce({ ...body, phone: "extra" });
    await act(() => current().reconcile());
    expect(current().locked).toBe(true);
    state.api.request
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce({ name: body.name, email: body.email });
    await act(() => current().reconcile());
    expect(current().locked).toBe(false);
    expect(
      state.api.request.mock.calls.filter(
        ([op]) => op === "settings.contact.update",
      ),
    ).toHaveLength(1);
  });
  it("does not accept nonempty contact data as the receipt for clearing contact details", async () => {
    state.api.request
      .mockReset()
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce({ phone: "old" });
    await mount("contact");
    await act(() => send("settings.contact.update", { body: {} }));
    expect(current().locked).toBe(true);
    expect(after).not.toHaveBeenCalled();
  });
  it.each(["archive", "restore"] as const)(
    "retains the exact profile %s target/status across reload",
    async (operation) => {
      state.api.request
        .mockReset()
        .mockResolvedValueOnce({
          id: "other",
          status: operation === "archive" ? "archived" : "active",
        });
      await mount("profiles");
      await act(() =>
        send(`settings.profiles.${operation}`, {
          params: { clientId: "reviewed" },
          ...(operation === "restore" ? { body: { status: "active" } } : {}),
        }),
      );
      await remount("profiles");
      state.api.request.mockResolvedValueOnce([
        {
          id: "other",
          status: operation === "archive" ? "archived" : "active",
        },
      ]);
      await act(() => current().reconcile());
      expect(current().locked).toBe(true);
      state.api.request.mockResolvedValueOnce([
        {
          id: "reviewed",
          status: operation === "archive" ? "archived" : "active",
        },
      ]);
      await act(() => current().reconcile());
      expect(current().locked).toBe(false);
      expect(after).not.toHaveBeenCalled();
    },
  );
  it("never retries profile creation after a lost response or guesses identity from a matching name", async () => {
    state.api.request
      .mockReset()
      .mockRejectedValueOnce(new Error("lost response"));
    await mount("profile-create");
    await act(() =>
      send("settings.profiles.create", { body: { name: "Synthetic" } }),
    );
    await remount("profile-create");
    await act(() => current().reconcile());
    await act(() =>
      send("settings.profiles.create", { body: { name: "Synthetic" } }),
    );
    expect(current().locked).toBe(true);
    expect(state.api.request).toHaveBeenCalledTimes(1);
  });
  it("confirms the server-sanitized signature only after exact current readback", async () => {
    const saved = { html: "<p>Saved signature</p>", enabled: true };
    state.api.request
      .mockReset()
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce(saved)
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce(saved);
    await mount("signature");
    await act(() =>
      send("me.emailSignature.update", {
        body: { html: '<p onclick="bad()">Saved signature</p>', enabled: true },
      }),
    );
    expect(current().locked).toBe(false);
    expect(after).toHaveBeenCalledTimes(1);
  });
  it("retains only a signature receipt hash through readback failure and reload", async () => {
    const saved = { html: "<p>Private signature</p>", enabled: false };
    state.api.request
      .mockReset()
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce(saved)
      .mockRejectedValueOnce(new Error("read unavailable"));
    await mount("signature");
    await act(() => send("me.emailSignature.update", { body: saved }));
    const key = `capiro:settings-write:v1:${JSON.stringify(["actor-a", "session-a", "org-a", "signature"])}`;
    expect(sessionStorage.getItem(key)).not.toContain("Private signature");
    await remount("signature");
    state.api.request
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce(saved);
    await act(() => current().reconcile());
    expect(current().locked).toBe(false);
    expect(after).not.toHaveBeenCalled();
  });
});
