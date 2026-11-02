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
  return {
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
}
const confirmed = () => vi.fn(async () => true);

describe("Office workbench leave guard", () => {
  it("arms one trap when edits appear, steps back off it when they are saved, and never touches history otherwise", () => {
    const v = view();
    const guard = installLeaveGuard({
      view: v.target,
      leave: confirmed(),
      navigate: vi.fn(),
    });
    guard.sync(false);
    expect(v.history.pushState).not.toHaveBeenCalled();
    guard.sync(true);
    guard.sync(true);
    expect(v.history.pushState).toHaveBeenCalledTimes(1);
    expect(v.history.pushState).toHaveBeenCalledWith(
      { tree: "router" },
      "",
      v.target.location.href,
    );
    guard.sync(false);
    expect(v.history.go).toHaveBeenCalledWith(-1);
    guard.sync(false);
    expect(v.history.go).toHaveBeenCalledTimes(1);
    // Back on an unarmed guard is the router's; a click is the router's.
    v.fire("window", "popstate", {});
    const event = click("/elsewhere");
    v.fire("document", "click", event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(v.history.pushState).toHaveBeenCalledTimes(1);
    guard.sync(true);
    guard.dispose();
    expect(v.history.go).toHaveBeenCalledTimes(2);
    expect(v.listeners.get("document:click")).toEqual([]);
    expect(v.listeners.get("window:popstate")).toEqual([]);
  });
  it("a same-origin link click runs the close first, then owns the navigation with the link's own href", async () => {
    const v = view();
    const order: string[] = [];
    const leave = vi.fn(async () => {
      order.push("leave");
      return true;
    });
    const navigate = vi.fn((href: string) => order.push(`navigate:${href}`));
    const guard = installLeaveGuard({ view: v.target, leave, navigate });
    guard.sync(true);
    const event = click("/meri?clientId=c#top");
    v.fire("document", "click", event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopImmediatePropagation).toHaveBeenCalled();
    v.fire("document", "click", click("/elsewhere"));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(order).toEqual(["leave", "navigate:/meri?clientId=c#top"]);
    expect(leave).toHaveBeenCalledTimes(1);
    // Once leaving, the trap is left in place for the navigation to replace; nothing steps back.
    guard.sync(false);
    guard.dispose();
    expect(v.history.go).not.toHaveBeenCalled();
  });
  it("ignores clicks the browser or router should handle untouched", () => {
    const v = view();
    const leave = confirmed();
    const guard = installLeaveGuard({
      view: v.target,
      leave,
      navigate: vi.fn(),
    });
    guard.sync(true);
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
  it("Back re-traps the entry, closes, then goes past the trap to the previous page", async () => {
    const v = view();
    const leave = confirmed();
    const guard = installLeaveGuard({
      view: v.target,
      leave,
      navigate: vi.fn(),
    });
    guard.sync(true);
    v.history.pushState.mockClear();
    v.fire("window", "popstate", {});
    expect(v.history.pushState).toHaveBeenCalledTimes(1);
    v.fire("window", "popstate", {});
    await vi.waitFor(() => expect(v.history.go).toHaveBeenCalledWith(-2));
    expect(leave).toHaveBeenCalledTimes(1);
    expect(v.history.go).toHaveBeenCalledTimes(1);
  });
  it("a close that is not confirmed keeps the person on the page: no navigation, no Back, the trap released once edits are gone", async () => {
    const v = view();
    const navigate = vi.fn();
    const leave = vi.fn(async () => false);
    const guard = installLeaveGuard({ view: v.target, leave, navigate });
    guard.sync(true);
    v.fire("document", "click", click("/elsewhere"));
    await vi.waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
    await new Promise((settled) => setTimeout(settled, 0));
    expect(navigate).not.toHaveBeenCalled();
    v.fire("window", "popstate", {});
    await vi.waitFor(() => expect(leave).toHaveBeenCalledTimes(2));
    await new Promise((settled) => setTimeout(settled, 0));
    expect(v.history.go).not.toHaveBeenCalledWith(-2);
    // The failed close closed the frame (unsaved edits are gone from the host's view): the trap is stepped back off.
    guard.sync(false);
    expect(v.history.go).toHaveBeenCalledWith(-1);
    const rejecting = installLeaveGuard({
      view: view().target,
      leave: vi.fn(async () => {
        throw new Error("lost");
      }),
      navigate,
    });
    rejecting.sync(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
