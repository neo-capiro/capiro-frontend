"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import styles from "./shell.module.css";

type SidebarVisibility = {
  expanded: boolean;
  toggle: () => void;
};

const SidebarVisibilityContext = createContext<SidebarVisibility | null>(null);

const widthKey = "capiro.meri.sidebar-width";
const minimumWidth = 232;
const maximumWidth = 480;
const boundWidth = (value: number) =>
  Math.round(Math.max(minimumWidth, Math.min(maximumWidth, value)));

/** A device-local appearance preference, containing no account or conversation data. */
function saveWidth(width: number) {
  try {
    window.localStorage.setItem(widthKey, String(width));
  } catch {
    // Storage can be unavailable; resizing still works for this mounted shell.
  }
}

/** Meri's desktop sidebar state is local to one mounted product shell. */
export function MeriSidebarVisibility({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <SidebarVisibilityContext.Provider
      value={{ expanded, toggle: () => setExpanded((value) => !value) }}
    >
      {children}
    </SidebarVisibilityContext.Provider>
  );
}

export function useMeriSidebarVisibility() {
  const state = useContext(SidebarVisibilityContext);
  if (!state) throw new Error("Meri sidebar control requires ProductShell");
  return state;
}

/** Owns only the resize gesture and its device-local width preference. */
function useSidebarSizing() {
  const [width, setWidth] = useState(minimumWidth);
  const drag = useRef<{ pointer: number; x: number; width: number } | null>(
    null,
  );
  const currentWidth = useRef(width);
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(widthKey));
      if (
        Number.isFinite(saved) &&
        saved >= minimumWidth &&
        saved <= maximumWidth
      ) {
        currentWidth.current = saved;
        // Hydrate the local appearance preference after the server's stable default.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWidth(saved);
      }
    } catch {
      // The default remains usable when browser storage is blocked.
    }
  }, []);
  const resize = (value: number) => {
    currentWidth.current = boundWidth(value);
    setWidth(currentWidth.current);
  };
  const finishDrag = (event: PointerEvent<HTMLDivElement>, cancel = false) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    drag.current = null;
    if (cancel) resize(start.width);
    else saveWidth(currentWidth.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboardResize = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 16;
    const keys: Record<string, number> = {
      ArrowLeft: width - step,
      ArrowRight: width + step,
      Home: minimumWidth,
      End: maximumWidth,
      Enter: minimumWidth,
    };
    const next = keys[event.key];
    if (next === undefined || drag.current) return;
    event.preventDefault();
    resize(next);
    saveWidth(currentWidth.current);
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, x: event.clientX, width };
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start?.pointer === event.pointerId)
      resize(start.width + event.clientX - start.x);
  };
  return { width, resize, finishDrag, keyboardResize, startDrag, moveDrag };
}

/** Keeping this boundary small lets ProductShell continue to render server children. */
export function MeriSidebarWorkspace({
  children,
  chat = false,
}: {
  children: ReactNode;
  /** Chat-first canvas: the workspace fills the visible viewport instead of the design frame. */
  chat?: boolean;
}) {
  const { expanded } = useMeriSidebarVisibility();
  const { width, resize, finishDrag, keyboardResize, startDrag, moveDrag } =
    useSidebarSizing();
  return (
    <div
      className={`${styles.workspace} ${chat ? styles.chatWorkspace : ""} ${expanded ? "" : styles.sidebarCollapsed}`}
      style={{ "--meri-sidebar-width": `${width}px` } as CSSProperties}
    >
      {children}
      {expanded && (
        <div
          className={styles.sidebarResize}
          role="separator"
          tabIndex={0}
          aria-label="Resize Meri sidebar"
          aria-orientation="vertical"
          aria-controls="meri-sidebar"
          aria-valuemin={minimumWidth}
          aria-valuemax={maximumWidth}
          aria-valuenow={width}
          aria-valuetext={`${width} pixels`}
          title="Drag to resize. Use arrow keys, Home or End. Enter resets the width."
          onKeyDown={keyboardResize}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={(event) => finishDrag(event)}
          onPointerCancel={(event) => finishDrag(event, true)}
          onLostPointerCapture={(event) => finishDrag(event, true)}
          onDoubleClick={() => {
            resize(minimumWidth);
            saveWidth(minimumWidth);
          }}
        />
      )}
    </div>
  );
}
