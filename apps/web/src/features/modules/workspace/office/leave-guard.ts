/** Leaving the workbench by in-app navigation while the editor holds unsaved or in-flight work: the Next.js app
 * router handles sidebar links and the browser's Back client-side, so `beforeunload` never fires and an unmount
 * would drop the CODE edits. The guard runs the same close (save, release, publish) first, then lets the navigation
 * happen: a capture-phase click guard on same-origin links, and a history trap for Back (a duplicate of the current
 * entry, re-pushed on each popstate while guarded, then left with `go(-2)` once the close is confirmed). The trap
 * carries the router's own state for the same URL, so the router sees a no-op; after an editing session one extra
 * Back press may be needed, which is the price of not losing work. */
export type LeaveGuardView = {
  document: Pick<Document, "addEventListener" | "removeEventListener">;
  addEventListener: Window["addEventListener"];
  removeEventListener: Window["removeEventListener"];
  location: Pick<Location, "href" | "origin">;
  history: Pick<History, "state" | "pushState" | "go">;
};
export type LeaveGuardOptions = {
  view: LeaveGuardView;
  /** Runs the confirmed close; resolves once the editor is released (or the attempt settled). */
  leave(): Promise<void>;
  /** The in-app navigation to perform after the close, with the link's own href. */
  navigate(href: string): void;
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
}: LeaveGuardOptions) {
  let pending: Promise<void> | null = null;
  let leaving = false;
  const trap = () =>
    view.history.pushState(view.history.state, "", view.location.href);
  const settle = (then: () => void) => {
    if (pending) return;
    pending = leave()
      .then(then, then)
      .finally(() => {
        pending = null;
      });
  };
  const onClick = (event: MouseEvent) => {
    if (leaving) return;
    const href = guardedHref(event, view);
    if (href === null) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    settle(() => {
      leaving = true;
      navigate(href);
    });
  };
  const onPopState = () => {
    if (leaving) return;
    // The user pressed Back onto the trapped entry: stay, close, then go past the trap to where they were heading.
    trap();
    settle(() => {
      leaving = true;
      view.history.go(-2);
    });
  };
  trap();
  view.document.addEventListener("click", onClick as EventListener, true);
  view.addEventListener("popstate", onPopState);
  return () => {
    view.document.removeEventListener("click", onClick as EventListener, true);
    view.removeEventListener("popstate", onPopState);
  };
}
