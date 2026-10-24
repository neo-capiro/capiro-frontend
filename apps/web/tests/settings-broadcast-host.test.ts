import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BroadcastRecipient } from "../src/features/settings/BroadcastRecipient";
const state = vi.hoisted(() => ({
  reload: vi.fn(),
  request: vi.fn(),
  query: vi.fn(),
  panel: vi.fn(),
  cleanup: [] as Array<() => void>,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => () => void) => {
    state.cleanup.push(effect());
  },
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({ request: state.request }),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (...args: unknown[]) => {
    state.query(...args);
    return { data: [], loading: false, reload: state.reload };
  },
}));
vi.mock("../src/features/settings/BroadcastRecipientPanel", () => ({
  BroadcastRecipientPanel: (props: unknown) => {
    state.panel(props);
    return null;
  },
}));
afterEach(() => {
  for (const cleanup of state.cleanup) cleanup();
  state.cleanup = [];
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe("Authenticated broadcast host", () => {
  it("uses fixed operations, acknowledges the exact ID and invalidates without sharing private data", async () => {
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), {
      visibilityState: "visible",
    });
    const setItem = vi.fn();
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    vi.stubGlobal("localStorage", { setItem });
    renderToStaticMarkup(createElement(BroadcastRecipient));
    expect(state.query).toHaveBeenCalledExactlyOnceWith(
      "me.broadcasts.pending",
      {},
    );
    expect(state.request).not.toHaveBeenCalled();
    const props = state.panel.mock.lastCall![0] as {
      acknowledge: (id: string, signal: AbortSignal) => Promise<unknown>;
      onAcknowledged: () => void;
    };
    const signal = new AbortController().signal;
    await props.acknowledge("reviewed", signal);
    expect(state.request).toHaveBeenCalledExactlyOnceWith(
      "me.broadcasts.acknowledge",
      { params: { id: "reviewed" } },
      { signal },
    );
    expect(setItem).not.toHaveBeenCalled();
    props.onAcknowledged();
    expect(setItem).toHaveBeenCalledWith(
      "capiro:broadcast-acknowledgment",
      expect.stringMatching(/^\d+$/),
    );
    win.dispatchEvent(new Event("focus"));
    win.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: "capiro:broadcast-acknowledgment",
      }),
    );
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(state.reload).toHaveBeenCalledTimes(4);
    state.cleanup[0]!();
    win.dispatchEvent(new Event("focus"));
    expect(state.reload).toHaveBeenCalledTimes(4);
  });
});
