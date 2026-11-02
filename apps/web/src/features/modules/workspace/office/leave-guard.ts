/** Leaving the workbench by in-app navigation while the editor holds unsaved edits: the Next.js app router handles
 * sidebar links and the browser's Back client-side, so `beforeunload` never fires and an unmount would drop the CODE
 * edits. The guard runs the same close (save, release, publish) first and then owns the destination: a
 * capture-phase click guard on same-origin links, and a history trap for Back. The trap is one duplicate of the
 * current entry, carrying the router's own state for the same URL so the router sees a no-op; it is pushed once when
 * edits first appear and stepped back off when they are saved or the screen leaves, so an unmodified editor, a Save
 * or a renewal never changes the history. A close that is not confirmed keeps the person on the page with the
 * recovery notice; nothing navigates away from unsaved work. */
export type LeaveGuardView = {
  document: Pick<Document, "addEventListener" | "removeEventListener">;
  addEventListener: Window["addEventListener"];
  removeEventListener: Window["removeEventListener"];
  location: Pick<Location, "href" | "origin">;
  history: Pick<History, "state" | "pushState" | "go">;
};
export type LeaveGuardOptions = {
  view: LeaveGuardView;
  /** Runs the confirmed close without the host's own after-close navigation; resolves true only when it was confirmed. */
  leave(): Promise<boolean>;
  /** The in-app navigation to perform after a confirmed close, with the link's own href. */
  navigate(href: string): void;
};
export type LeaveGuard = {
  /** Arms the trap when unsaved edits appear and steps back off it when they are gone. */
  sync(unsaved: boolean): void;
  dispose(): void;
};
/** Links the guard lets the browser or the router handle untouched. */
function guardedHref(event: MouseEvent, view: LeaveGuardView) {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return null;
  const target = event.target as { closest?: Element["closest"] } | null;
  const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!anchor) return null;
  const raw = anchor.getAttribute("href");
  if (!raw || anchor.hasAttribute("download")) return null;
  const rel = anchor.getAttribute("target");
  if (rel && rel !== "_self") return null;
  let url: URL;
  try {
    url = new URL(raw, view.location.href);
  } catch {
    return null;
  }
  if (url.origin !== view.location.origin) return null;
  if (url.href === view.location.href) return null;
  return url.pathname + url.search + url.hash;
}
export function installLeaveGuard({
  view,
  leave,
  navigate,
}: LeaveGuardOptions): LeaveGuard {
  let armed = false;
  let pending: Promise<void> | null = null;
  let leaving = false;
  const trap = () => {
    view.history.pushState(view.history.state, "", view.location.href);
    armed = true;
  };
  const release = () => {
    armed = false;
    view.history.go(-1);
  };
  const settle = (then: () => void) => {
    if (pending) return;
    pending = leave()
      .then(
        (confirmed) => confirmed,
        () => false,
      )
      .then((confirmed) => {
        if (!confirmed) return;
        leaving = true;
        then();
      })
      .finally(() => {
        pending = null;
      });
  };
  const onClick = (event: MouseEvent) => {
    if (leaving || !armed) return;
    const href = guardedHref(event, view);
    if (href === null) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    settle(() => navigate(href));
  };
  const onPopState = () => {
    if (leaving || !armed) return;
    // The user pressed Back onto the trapped entry: stay, close, then go past the trap to where they were heading.
    trap();
    settle(() => view.history.go(-2));
  };
  view.document.addEventListener("click", onClick as EventListener, true);
  view.addEventListener("popstate", onPopState);
  return {
    sync(unsaved) {
      if (leaving) return;
      if (unsaved && !armed) trap();
      else if (!unsaved && armed && !pending) release();
    },
    dispose() {
      view.document.removeEventListener(
        "click",
        onClick as EventListener,
        true,
      );
      view.removeEventListener("popstate", onPopState);
      if (armed && !leaving && !pending) release();
    },
  };
}
