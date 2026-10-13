import type { Page } from "@playwright/test";

/** Exercise a native caret move before the editor observes selectionchange. */
export async function delayMailSelectionObservation(page: Page) {
  await page.addInitScript(() => {
    let pending = false;
    document.addEventListener(
      "keydown",
      (event) => {
        const editor = document.querySelector(
          '[contenteditable="true"][role="textbox"]',
        );
        if (event.target !== editor) return;
        if (event.key === "End") pending = true;
        else if (
          pending &&
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey
        )
          pending = false;
      },
      true,
    );
    document.addEventListener(
      "selectionchange",
      (event) => {
        if (!pending) return;
        // Leave the browser caret untouched; withhold the observer notification.
        event.stopImmediatePropagation();
        document.documentElement.dataset.delayedMailSelection = "observed";
      },
      true,
    );
  });
}
