"use client";
import { useEffect, useRef } from "react";
import type {
  BrowserViewerController,
  BrowserViewerState,
} from "../../../shared/meri-browser/viewer-controller";

/** Native image decoding precedes input admission. Only viewport coordinates and
 * ordinary keyboard/mouse events cross the private viewer channel. */
export function ViewerSurface({
  controller,
  state,
}: {
  controller: BrowserViewerController;
  state: BrowserViewerState;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current,
      frame = state.frame;
    if (!element || !frame || !state.imageUrl) return;
    const image = new Image();
    let alive = true;
    image.onload = () => {
      if (!alive || !canvas.current) return;
      const context = element.getContext("2d");
      if (
        !context ||
        image.naturalWidth !== frame.width ||
        image.naturalHeight !== frame.height
      )
        return;
      context.drawImage(image, 0, 0);
      controller.displayed(frame.frameId);
    };
    image.onerror = () => {
      if (alive) controller.renderFailed(frame.frameId);
    };
    image.src = state.imageUrl;
    return () => {
      alive = false;
      image.onload = null;
      image.onerror = null;
      image.src = "";
      element.getContext("2d")?.clearRect(0, 0, element.width, element.height);
    };
  }, [controller, state.frame, state.imageUrl]);
  if (!state.frame || !state.imageUrl) return null;
  const frame = state.frame,
    enabled = state.status === "ready" && state.displayed;
  const point = (element: HTMLCanvasElement, x: number, y: number) => {
    const bounds = element.getBoundingClientRect();
    return {
      x: Math.min(
        frame.width - 1,
        Math.max(0, ((x - bounds.left) * frame.width) / bounds.width),
      ),
      y: Math.min(
        frame.height - 1,
        Math.max(0, ((y - bounds.top) * frame.height) / bounds.height),
      ),
    };
  };
  return (
    <canvas
      ref={canvas}
      width={frame.width}
      height={frame.height}
      tabIndex={enabled ? 0 : -1}
      role="application"
      aria-label="Remote browser. Click to focus, then type. Clipboard shortcuts and file transfer are unavailable."
      aria-disabled={!enabled}
      style={{
        maxWidth: "100%",
        height: "auto",
        border: "1px solid currentColor",
      }}
      onClick={(event) => {
        if (!enabled) return;
        event.currentTarget.focus();
        const position = point(
          event.currentTarget,
          event.clientX,
          event.clientY,
        );
        void controller.input([
          { type: "mouse", action: "down", button: "left", ...position },
          { type: "mouse", action: "up", button: "left", ...position },
        ]);
      }}
      onKeyDown={(event) => {
        if (
          !enabled ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey ||
          event.nativeEvent.isComposing ||
          event.repeat
        )
          return;
        const key = event.key === " " ? "Space" : event.key;
        if (
          ![
            "Enter",
            "Tab",
            "Backspace",
            "Delete",
            "Escape",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
            "PageUp",
            "PageDown",
            "Space",
          ].includes(key) &&
          [...key].length !== 1
        )
          return;
        event.preventDefault();
        void controller.input([
          { type: "key", action: "down", key, shift: event.shiftKey },
          { type: "key", action: "up", key, shift: event.shiftKey },
        ]);
      }}
      onWheel={(event) => {
        if (!enabled) return;
        const position = point(
          event.currentTarget,
          event.clientX,
          event.clientY,
        );
        void controller.input([
          {
            type: "wheel",
            ...position,
            deltaX: Math.max(-10000, Math.min(10000, event.deltaX)),
            deltaY: Math.max(-10000, Math.min(10000, event.deltaY)),
          },
        ]);
      }}
    />
  );
}
