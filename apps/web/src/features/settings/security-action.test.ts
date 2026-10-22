// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { webcrypto } from "node:crypto";
import { CapiroApiError } from "../../shared/capiro/http";
import { useSettingsMutation } from "./useSettingsMutation";
const state = vi.hoisted(() => ({
  auth: { userId: "actor-a", sessionId: "session-a", orgId: "org-a" },
  api: { request: vi.fn(), upload: vi.fn(), download: vi.fn() },
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
  },
}));
let current: ReturnType<typeof useSettingsMutation>;
let root: Root;
let cache: QueryClient;
const after = vi.fn();
function Harness({ section = "team" }: { section?: string }) {
  current = useSettingsMutation(section);
  return createElement(
    "output",
    null,
    current.action.message ?? current.action.error ?? "",
  );
}
async function mount(section = "team") {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
  await act(async () =>
    root.render(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(Harness, { section }),
      ),
    ),
  );
}
const input = { params: { userId: "target" }, body: { billingAdmin: true } };
function dispatch() {
  return current.action.run(
    (signal) =>
      current.api.request("settings.team.setBillingAdmin", input, { signal }),
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
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
  state.auth = { userId: "actor-a", sessionId: "session-a", orgId: "org-a" };
  state.api.request.mockReset();
  after.mockReset();
  sessionStorage.clear();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  cache?.clear();
  document.body.replaceChildren();
});

describe("Settings dispatch lifetime", () => {
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
      first = current.action.run(
        (signal) =>
          current.api.request("settings.team.setBillingAdmin", changing, {
            signal,
          }),
        "Saved",
        after,
      );
      changing.params.userId = "other";
      void dispatch();
    });
    await until(() => state.api.request.mock.calls.length === 1);
    expect(current.locked).toBe(true);
    expect(state.api.request.mock.calls[0]?.[1]).toEqual(input);
    await act(async () => {
      finish({ userId: "target", billingAdmin: true });
      await first;
    });
    expect(after).toHaveBeenCalledTimes(1);
    expect(current.locked).toBe(false);
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
    expect(current.action.message).toBeUndefined();
    expect(current.pending?.state).toBe("unknown");
    expect(after).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    cache.clear();
    await mount();
    expect(current.locked).toBe(true);
    await act(async () => {
      await dispatch();
    });
    expect(state.api.request).toHaveBeenCalledTimes(1);
    expect(current.action.error).toContain("not confirmed");
  });
  it("scope change cancels the request lifetime and suppresses late success", async () => {
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
    await until(() => state.api.request.mock.calls.length === 1);
    const signal = state.api.request.mock.calls[0]?.[2].signal as AbortSignal;
    await act(async () =>
      root.render(
        createElement(
          QueryClientProvider,
          { client: cache },
          createElement(Harness, { section: "other-target" }),
        ),
      ),
    );
    expect(signal.aborted).toBe(true);
    await act(async () => {
      finish({ userId: "target", billingAdmin: true });
      await first;
    });
    expect(after).not.toHaveBeenCalled();
    expect(current.action.message).toBeUndefined();
    expect(current.pending).toBeUndefined();
  });
  it("a readback denial after an accepted write never unlocks it for replay", async () => {
    state.api.request
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(
        new CapiroApiError(403, "revoked during readback"),
      );
    await mount();
    await act(async () => {
      await current.action.run(
        (signal) =>
          current.api.request(
            "settings.team.remove",
            { params: { userId: "target" } },
            { signal },
          ),
        "Removed",
        after,
      );
    });
    expect(current.pending?.state).toBe("unknown");
    expect(current.locked).toBe(true);
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
      await current.reconcile();
    });
    expect(current.locked).toBe(true);
    state.api.request.mockResolvedValueOnce([
      { userId: "target", billingAdmin: true },
    ]);
    await act(async () => {
      await current.reconcile();
    });
    expect(current.locked).toBe(false);
    expect(
      state.api.request.mock.calls.map(([operation]) => operation),
    ).toEqual([
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
    expect(current.pending).toBeUndefined();
    expect(current.action.error).toBe("denied");
    expect(after).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
});
