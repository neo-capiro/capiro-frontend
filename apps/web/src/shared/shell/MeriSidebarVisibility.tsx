"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import styles from "./shell.module.css";

type SidebarVisibility = {
  expanded: boolean;
  toggle: () => void;
};

const SidebarVisibilityContext = createContext<SidebarVisibility | null>(null);

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

/** Keeping this boundary small lets ProductShell continue to render server children. */
export function MeriSidebarWorkspace({ children }: { children: ReactNode }) {
  const { expanded } = useMeriSidebarVisibility();
  return (
    <div
      className={`${styles.workspace} ${expanded ? "" : styles.sidebarCollapsed}`}
    >
      {children}
    </div>
  );
}
