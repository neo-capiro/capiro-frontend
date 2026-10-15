/** Fixture-mode header overlays (Figma 3.4 Overlay · Updates panel and Overlay · Account menu). */
export type HeaderOverlay = "updates" | "account";

const event = "meri:header-overlay";

/** Asks the fixture header to open one of its overlays; ordinary routes do not listen. */
export function openHeaderOverlay(overlay: HeaderOverlay) {
  window.dispatchEvent(
    new CustomEvent<HeaderOverlay>(event, { detail: overlay }),
  );
}

/** Subscribes to header overlay requests; returns the unsubscribe function. */
export function onHeaderOverlay(listener: (overlay: HeaderOverlay) => void) {
  const handle = (request: Event) => {
    const overlay = (request as CustomEvent<unknown>).detail;
    if (overlay === "updates" || overlay === "account") listener(overlay);
  };
  window.addEventListener(event, handle);
  return () => window.removeEventListener(event, handle);
}
