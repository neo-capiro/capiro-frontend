import {
  useCallback,
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type RefObject,
} from "react";

/** Recover a disabled focused control; Radix still owns the modal focus scope. */
export function useDialogDisabledFocus(
  open: boolean,
  content: RefObject<HTMLDivElement | null>,
) {
  const lastFocused = useRef<HTMLElement | null>(null);
  const remember = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (
      event.target instanceof HTMLElement &&
      event.currentTarget.contains(event.target)
    )
      lastFocused.current = event.target;
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    const observer = new MutationObserver((records) => {
      const node = content.current;
      const previous = lastFocused.current;
      if (
        !node?.isConnected ||
        !previous ||
        !node.contains(previous) ||
        !previous.matches(":disabled") ||
        !records.some((record) => record.target.contains(previous)) ||
        !document.hasFocus() ||
        (document.activeElement !== document.body &&
          document.activeElement !== previous)
      )
        return;
      const dialogs = document.querySelectorAll(
        '[role="dialog"][data-state="open"]',
      );
      if (dialogs.item(dialogs.length - 1) === node)
        node.focus({ preventScroll: true });
    });
    // Portalled content can mount after this effect. Only disabled attributes
    // are observed, and recovery is restricted to this dialog's focused control.
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });
    return () => {
      observer.disconnect();
      lastFocused.current = null;
    };
  }, [open, content]);
  // React capture observes child autoFocus during portal commit, before this
  // hook's layout effect or a native document listener could be installed.
  return remember;
}
