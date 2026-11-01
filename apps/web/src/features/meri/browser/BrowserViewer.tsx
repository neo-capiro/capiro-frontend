"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@capiro/ui/button";
import type { BrowserViewerController } from "../../../shared/meri-browser/viewer-controller";
import { ViewerSurface } from "./ViewerSurface";
import ui from "../ui/meri-ui.module.css";
import styles from "../conversation/live.module.css";

export function BrowserViewer({
  controller,
}: {
  controller: BrowserViewerController;
}) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => () => controller.setVisible(false), [controller]);
  const busy = state.status === "loading",
    current = state.current;
  return (
    <details
      className={styles.runControls}
      onToggle={(event) => controller.setVisible(event.currentTarget.open)}
    >
      <summary>Browser control</summary>
      <p role="status">
        {current?.state === "user"
          ? "You control the browser. Meri is paused."
          : current?.state === "returning"
            ? "Control returned. Meri stays paused until you explicitly resume."
            : current?.state === "taking"
              ? "Waiting for Meri to pause and hand over the browser."
              : current?.state === "agent"
                ? "Meri controls the browser."
                : state.status === "loading"
                  ? "Checking the browser…"
                  : "Check whether a browser is available for this chat."}
      </p>
      {state.message && <p role="alert">{state.message}</p>}
      {busy && current?.state === "user" && (
        <p role="status">
          Updating the browser. Input will be available when the new view
          appears.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className={ui.outline}
        disabled={busy || state.status === "expired"}
        onClick={() => void controller.refresh()}
      >
        Refresh browser
      </Button>
      {((current && ["agent", "taking"].includes(current.state)) ||
        state.status === "recovery") && (
        <Button
          type="button"
          className={ui.primary}
          disabled={busy}
          onClick={() => void controller.takeControl()}
        >
          {state.status === "recovery"
            ? "Reconnect browser control"
            : "Take control"}
        </Button>
      )}
      {current?.state === "user" && (
        <>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={busy}
            onClick={() => void controller.release()}
          >
            Return control
          </Button>
          {current.pages.length > 1 && (
            <label>
              Browser page{" "}
              <select
                disabled={busy}
                value={state.frame?.pageId ?? ""}
                onChange={(event) =>
                  void controller.selectPage(event.target.value)
                }
              >
                {current.pages.map((page, index) => (
                  <option key={page.pageId} value={page.pageId}>
                    {index + 1}. {page.origin}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ViewerSurface controller={controller} state={state} />
        </>
      )}
      {controller.canResume() &&
        (current?.state === "returning" ||
          current?.state === "unavailable" ||
          state.status === "recovery") && (
          <Button
            type="button"
            className={ui.primary}
            disabled={busy || state.status === "expired"}
            onClick={() => void controller.resume()}
          >
            {current?.state === "returning"
              ? "Resume Meri"
              : "Recover pending resume"}
          </Button>
        )}
    </details>
  );
}
