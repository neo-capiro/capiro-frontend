"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clientViews } from "@/shared/portfolio/shell/client-views";

/** Local navigation only; current-client and session gates remain route-owned. */
export function useClientViewKeys(base: string, toggle: () => void) {
  const router = useRouter();
  useEffect(() => {
    let prefixAt = 0;
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      const editing =
        target instanceof Element &&
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"]',
        );
      const modal = document.querySelector(
        '[aria-modal="true"][data-state="open"]',
      );
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        editing ||
        modal
      ) {
        prefixAt = 0;
        return;
      }
      const key = event.key.toLowerCase();
      if (
        (event.metaKey || event.ctrlKey) &&
        key === "j" &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        prefixAt = 0;
        toggle();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        prefixAt = 0;
        return;
      }
      const now = performance.now();
      if (prefixAt && now - prefixAt < 1000) {
        prefixAt = 0;
        const view = clientViews.find((item) => item.shortcut === key);
        if (view) {
          event.preventDefault();
          router.push(`${base}${view.suffix}`);
          return;
        }
      }
      prefixAt = key === "g" ? now : 0;
    }
    const reset = () => {
      prefixAt = 0;
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", reset);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", reset);
    };
  }, [base, router, toggle]);
}
