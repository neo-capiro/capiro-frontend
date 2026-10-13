import { useLayoutEffect, useRef, type RefObject } from "react";

const handledClicks = new WeakSet<MouseEvent>();

/** Cover visible portal clicks before Radix's deferred pointer listener mounts. */
export function useDialogOverlayDismissal(
  open: boolean,
  content: RefObject<HTMLDivElement | null>,
  onOpenChange: (open: boolean) => void,
) {
  useLayoutEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      const node = content.current;
      if (
        !node ||
        event.defaultPrevented ||
        handledClicks.has(event) ||
        event.button !== 0 ||
        event.ctrlKey ||
        !(event.target instanceof Element) ||
        event.target.getAttribute("data-slot") !== "dialog-overlay"
      )
        return;
      const document = node.ownerDocument;
      const dialogs = document.querySelectorAll(
        '[role="dialog"][data-state="open"]',
      );
      const overlays = document.querySelectorAll(
        '[data-slot="dialog-overlay"][data-state="open"]',
      );
      if (
        dialogs.item(dialogs.length - 1) !== node ||
        overlays.item(overlays.length - 1) !== event.target
      )
        return;
      // A portalled menu/select/popover remains owned by its Radix layer.
      if (
        [
          ...document.querySelectorAll("[data-radix-popper-content-wrapper]"),
        ].some((popup) => popup.getClientRects().length > 0)
      )
        return;
      handledClicks.add(event);
      event.preventDefault();
      event.stopPropagation();
      onOpenChange(false);
    };
    document.addEventListener("click", dismiss, true);
    return () => document.removeEventListener("click", dismiss, true);
  }, [open, content, onOpenChange]);
}

/** Controlled callers need not render a Radix Trigger to restore keyboard focus. */
export function useDialogReturnFocus(open: boolean) {
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open)
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
  }, [open]);
  return (event: Event) => {
    if (event.defaultPrevented || !opener.current?.isConnected) return;
    opener.current.focus();
    if (document.activeElement === opener.current) event.preventDefault();
  };
}
