import { describe, expect, it, vi } from "vitest";
import {
  installLeaveGuard,
  type LeaveGuardView,
} from "../src/features/modules/workspace/office/leave-guard";

type Listener = (event: unknown) => void;
function view(href = "https://app.example.test/modules/workspace?x=1") {
  const listeners = new Map<string, Listener[]>();
  const on = (key: string) => (type: string, listener: Listener) => {
    listeners.set(`${key}:${type}`, [
      ...(listeners.get(`${key}:${type}`) ?? []),
      listener,
    ]);
  };
  const off = (key: string) => (type: string, listener: Listener) => {
    listeners.set(
      `${key}:${type}`,
      (listeners.get(`${key}:${type}`) ?? []).filter((l) => l !== listener),
    );
  };
  const history = {
    state: { tree: "router" },
    pushState: vi.fn(),
    go: vi.fn(),
  };
  const target: LeaveGuardView = {
    document: {
      addEventListener: on("document") as Document["addEventListener"],
      removeEventListener: off("document") as Document["removeEventListener"],
    },
    addEventListener: on("window") as Window["addEventListener"],
    removeEventListener: off("window") as Window["removeEventListener"],
    location: { href, origin: new URL(href).origin },
    history,
  };
  const fire = (key: string, type: string, event: unknown) =>
    (listeners.get(`${key}:${type}`) ?? []).forEach((l) => l(event));
  return { target, history, fire, listeners };
}
function click(
  href: string | null,
  extra: Partial<{
    button: number;
    metaKey: boolean;
    target: string | null;
    download: boolean;
  }> = {},
) {
  const anchor =
    href === null
      ? null
      : {
          getAttribute: (name: string) =>
            name === "href"
              ? href
              : name === "target"
                ? (extra.target ?? null)
                : null,
          hasAttribute: (name: string) =>
            name === "download" ? Boolean(extra.download) : false,
        };
  const event = {
    defaultPrevented: false,
    button: extra.button ?? 0,
    metaKey: extra.metaKey ?? false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: { closest: () => anchor },
    preventDefault: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  };
  return event;
}
describe("Office workbench leave guard", () => {
  it("traps the history entry on install and leaves nothing installed after dispose", () => {
    const v = view();
    const dispose = installLeaveGuard({
      view: v.target,
      leave: vi.fn(async () => {}),
      navigate: vi.fn(),
    });
    expect(v.history.pushState).toHaveBeenCalledWith(
      { tree: "router" },
      "",
      v.target.location.href,
    );
    dispose();
    expect(v.listeners.get("document:click")).toEqual([]);
    expect(v.listeners.get("window:popstate")).toEqual([]);
  });
  it("a same-origin link click runs the close first, then the navigation with the link's own href", async () => {
    const v = view();
    const order: string[] = [];
    const leave = vi.fn(async () => {
      order.push("leave");
    });
    const navigate = vi.fn((href: string) => order.push(`navigate:${href}`));
    installLeaveGuard({ view: v.target, leave, navigate });
    const event = click("/meri?clientId=c#top");
    v.fire("document", "click", event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopImmediatePropagation).toHaveBeenCalled();
    v.fire("document", "click", click("/elsewhere"));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(order).toEqual(["leave", "navigate:/meri?clientId=c#top"]);
    expect(leave).toHaveBeenCalledTimes(1);
  });
  it("ignores clicks the browser or router should handle untouched", () => {
    const v = view();
    const leave = vi.fn(async () => {});
    installLeaveGuard({ view: v.target, leave, navigate: vi.fn() });
    for (const event of [
      click(null),
      click("https://other.example.test/x"),
      click("/x", { button: 1 }),
      click("/x", { metaKey: true }),
      click("/x", { target: "_blank" }),
      click("/x", { download: true }),
      click("/modules/workspace?x=1"),
    ]) {
      v.fire("document", "click", event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
    expect(leave).not.toHaveBeenCalled();
  });
  it("Back re-traps the entry, closes, then goes past the trap; a failed close still lets the person leave", async () => {
    const v = view();
    const leave = vi.fn(async () => {
      throw new Error("not confirmed");
    });
    installLeaveGuard({ view: v.target, leave, navigate: vi.fn() });
    v.history.pushState.mockClear();
    v.fire("window", "popstate", {});
    expect(v.history.pushState).toHaveBeenCalledTimes(1);
    v.fire("window", "popstate", {});
    await vi.waitFor(() => expect(v.history.go).toHaveBeenCalledWith(-2));
    expect(leave).toHaveBeenCalledTimes(1);
    expect(v.history.go).toHaveBeenCalledTimes(1);
  });
});
